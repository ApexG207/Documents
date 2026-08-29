import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const output = process.argv[2] || "release/release-manifest.json";
const version = readFileSync("VERSION", "utf8").trim();
const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .sort();

const records = files.map((path) => {
  const bytes = readFileSync(path);
  return {
    path,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
});

const payload = {
  schemaVersion: 1,
  product: "matIQ",
  publisher: "Apex Governance Group",
  version,
  commit,
  generatedAt: new Date().toISOString(),
  trackedFileCount: records.length,
  files: records,
  exclusions: [
    "runtime secrets",
    "user records",
    "uploaded media",
    "database contents",
    "build caches",
  ],
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(payload, null, 2) + "\n");
console.log(output);
