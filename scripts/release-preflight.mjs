import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const pkg = JSON.parse(read("package.json"));
const version = read("VERSION").trim();
const semver =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

assert.match(version, semver, "VERSION must be valid SemVer");
assert.equal(pkg.version, version, "package.json and VERSION must match");
assert.ok(
  read("CHANGELOG.md").includes("[" + version + "]"),
  "CHANGELOG must contain current version",
);

// The running application must report the approved version. app/lib/version.ts is
// generated from VERSION by scripts/sync-version.mjs; drift means a deployed
// health endpoint would advertise a version nobody approved.
assert.ok(
  read("app/lib/version.ts").includes('APP_VERSION = "' + version + '"'),
  "app/lib/version.ts is stale -- run: node scripts/sync-version.mjs",
);
assert.ok(
  read("README.md").includes("Product version: " + version),
  "README.md product version must match VERSION",
);

for (const path of [
  "docs/COMMERCIAL_RELEASE_PLAYBOOK.md",
  "docs/DATABASE_MIGRATION_POLICY.md",
  "docs/ROLLBACK_RUNBOOK.md",
  "docs/GITHUB_ENVIRONMENT_SETUP.md",
  "config/feature-flags.json",
])
  assert.ok(existsSync(path), "required release control missing: " + path);

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
assert.equal(
  tracked.filter((path) => /(^|\/)\.env(?:\.|$)/.test(path)).length,
  0,
  "environment files must not be tracked",
);

const productionPaths = tracked.filter(
  (path) =>
    /^(app|worker|config|store)\//.test(path) &&
    /\.(?:ts|tsx|js|mjs|json|ya?ml|swift|xml)$/.test(path),
);
const forbidden = /BB5893|SEG5565|dropin2026/g;
for (const path of productionPaths) {
  const value = read(path);
  assert.equal(forbidden.test(value), false, "legacy shared credential found in " + path);
  forbidden.lastIndex = 0;
}

const flags = JSON.parse(read("config/feature-flags.json")).flags;
for (const name of [
  "ai_video_analysis",
  "minor_media_upload",
  "academy_payouts",
  "community_forum",
  "native_store_payments",
  "automated_agent_actions",
])
  assert.equal(flags[name]?.default, false, name + " must fail closed");

const migrations = readdirSync("drizzle")
  .filter((name) => /^\d{4}_.+\.sql$/.test(name))
  .sort();
assert.ok(migrations.length > 0, "no governed database migrations found");
const ids = migrations.map((name) => Number(name.slice(0, 4)));
assert.equal(new Set(ids).size, ids.length, "migration identifiers must be unique");
for (let i = 1; i < ids.length; i += 1) {
  assert.ok(ids[i] > ids[i - 1], "migration identifiers must increase monotonically");
}

// Every migration file must be registered in the Drizzle journal. Migrations
// 0013-0017 once shipped as .sql files absent from the journal, so a freshly
// migrated database silently lacked athlete verification, guardian consent, the
// Connect revenue pool, and store safety tables.
const journal = JSON.parse(read("drizzle/meta/_journal.json"));
const journalTags = journal.entries.map((entry) => entry.tag);
const migrationTags = migrations.map((name) => name.replace(/\.sql$/, ""));
for (const tag of migrationTags)
  assert.ok(journalTags.includes(tag), "migration missing from journal: " + tag);
for (const tag of journalTags)
  assert.ok(migrationTags.includes(tag), "journal references a missing migration file: " + tag);
assert.equal(
  new Set(journal.entries.map((entry) => entry.idx)).size,
  journal.entries.length,
  "journal entries must have unique idx values",
);

// Every declared dependency must be present in the lockfile that CI installs
// from. A dependency can be added to package.json and then lost -- for example by
// restoring the file from the index -- while node_modules keeps the package on
// disk, so every local check passes and CI fails with "command not found".
const lock = JSON.parse(read("package-lock.json"));
const lockRoot = lock.packages?.[""] ?? {};
for (const field of ["dependencies", "devDependencies"]) {
  for (const name of Object.keys(pkg[field] ?? {})) {
    assert.ok(
      lockRoot[field]?.[name],
      name + " is in package.json " + field + " but missing from package-lock.json",
    );
    assert.ok(
      lock.packages?.["node_modules/" + name],
      name + " has no resolved entry in package-lock.json; run npm install",
    );
  }
}

// Tools invoked by npm scripts must be declared dependencies, not ambient.
for (const tool of ["prettier", "eslint", "typescript"]) {
  assert.ok(
    pkg.devDependencies?.[tool],
    tool + " is used by an npm script but is not a declared devDependency",
  );
}

// Every test file must be listed in the test:unit script. The script names files
// explicitly rather than relying on shell or Node glob expansion, so a new suite
// that nobody adds to the list would silently never run -- the same failure mode
// that let five unregistered migrations ship.
const unitScript = pkg.scripts["test:unit"] ?? "";
const testFiles = readdirSync("tests")
  .filter((name) => name.endsWith(".test.mjs"))
  .sort();
assert.ok(testFiles.length > 0, "no test suites found in tests/");
for (const file of testFiles) {
  assert.ok(
    unitScript.includes("tests/" + file),
    "tests/" + file + " is not referenced by the test:unit script and would never run",
  );
}

// Tenancy regression guard: an API route may not bind a hard-coded tenant
// identifier. Academy context is resolved from the caller's active membership.
const allowedTenantLiterals = new Set([
  "app/api/commerce/route.ts", // planCode: a subscription tier name, not a tenant
  "app/api/operations/route.ts", // planCode: a subscription tier name, not a tenant
]);
const tenantOffenders = tracked.filter(
  (file) =>
    /^app\/api\/.*\.ts$/.test(file) &&
    !allowedTenantLiterals.has(file) &&
    read(file).includes('"pilot"'),
);
assert.deepEqual(tenantOffenders, [], "API routes must not hard-code a tenant identifier");

console.log(
  JSON.stringify(
    {
      status: "PASS",
      version,
      trackedFiles: tracked.length,
      migrations: migrations.length,
      highRiskFlagsDefaultOff: 6,
      journalEntries: journal.entries.length,
      testSuites: testFiles.length,
    },
    null,
    2,
  ),
);
