import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const pkg = JSON.parse(read("package.json"));
const version = read("VERSION").trim();
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

assert.match(version, semver, "VERSION must be valid SemVer");
assert.equal(pkg.version, version, "package.json and VERSION must match");
assert.ok(read("CHANGELOG.md").includes("[" + version + "]"), "CHANGELOG must contain current version");

for (const path of [
  "docs/COMMERCIAL_RELEASE_PLAYBOOK.md",
  "docs/DATABASE_MIGRATION_POLICY.md",
  "docs/ROLLBACK_RUNBOOK.md",
  "docs/GITHUB_ENVIRONMENT_SETUP.md",
  "config/feature-flags.json",
]) assert.ok(existsSync(path), "required release control missing: " + path);

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
assert.equal(tracked.filter((path) => /(^|\/)\.env(?:\.|$)/.test(path)).length, 0, "environment files must not be tracked");

const productionPaths = tracked.filter((path) =>
  /^(app|worker|config|store)\//.test(path) && /\.(?:ts|tsx|js|mjs|json|ya?ml|swift|xml)$/.test(path)
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
]) assert.equal(flags[name]?.default, false, name + " must fail closed");

const migrations = readdirSync("drizzle")
  .filter((name) => /^\d{4}_.+\.sql$/.test(name))
  .sort();
assert.ok(migrations.length > 0, "no governed database migrations found");
const ids = migrations.map((name) => Number(name.slice(0, 4)));
assert.equal(new Set(ids).size, ids.length, "migration identifiers must be unique");
for (let i = 1; i < ids.length; i += 1) {
  assert.ok(ids[i] > ids[i - 1], "migration identifiers must increase monotonically");
}

console.log(JSON.stringify({
  status: "PASS",
  version,
  trackedFiles: tracked.length,
  migrations: migrations.length,
  highRiskFlagsDefaultOff: 6,
}, null, 2));
