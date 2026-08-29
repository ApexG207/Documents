/**
 * Assertions about the built deployable artifact. These require `npm run build`,
 * so they run separately from the unit and integration suites.
 *
 * The migration coverage check that used to live here looped
 * `for (i = 0; i <= 8; i++)`, so it silently ignored every migration past 0008 --
 * which is why five unregistered migrations went unnoticed. Journal integrity is
 * now asserted properly in tests/migrations.test.mjs; this file checks only what
 * is specific to the build output.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("production bundle preserves MatIQ identity and removes preview metadata", () => {
  const server = read("dist/server/index.js");
  assert.match(server, /MatIQ Jiu-Jitsu Intelligence/);
  assert.doesNotMatch(server, /name=["']codex-preview["']/i);
});

test("production artifact declares the D1 and R2 bindings", () => {
  const hosting = JSON.parse(read("dist/.openai/hosting.json"));
  assert.equal(hosting.d1, "DB");
  assert.equal(hosting.r2, "BUCKET");
});

test("the built application reports the approved version", () => {
  const version = read("VERSION").trim();
  assert.match(read("app/lib/version.ts"), new RegExp(`APP_VERSION = "${escapeRegExp(version)}"`));
});
