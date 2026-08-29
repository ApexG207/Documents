/**
 * Migration integrity.
 *
 * Migrations 0013-0017 shipped as .sql files that were absent from the Drizzle
 * journal, so a freshly migrated database silently lacked athlete verification,
 * guardian consent, the Connect revenue pool, and store safety tables. The
 * previous check looped `for (i = 0; i <= 8; i++)` against the journal, so it
 * could not see any migration past 0008.
 *
 * These tests apply every registered migration to a real database and assert the
 * resulting schema, so the journal and the files cannot drift apart unnoticed.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { env, freshDatabase } from "./harness/setup.mjs";

const journal = JSON.parse(
  readFileSync(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"),
);
const files = readdirSync(new URL("../drizzle", import.meta.url))
  .filter((name) => /^\d{4}_.+\.sql$/.test(name))
  .sort();

test("every migration file is registered in the journal", () => {
  const tags = journal.entries.map((entry) => entry.tag);
  const missing = files.map((f) => f.replace(/\.sql$/, "")).filter((tag) => !tags.includes(tag));
  assert.deepEqual(missing, [], "migration files absent from the journal will never be applied");
});

test("every journal entry has a matching migration file", () => {
  const names = new Set(files);
  const dangling = journal.entries.map((e) => e.tag).filter((tag) => !names.has(`${tag}.sql`));
  assert.deepEqual(dangling, []);
});

test("journal indexes are unique and monotonic", () => {
  const idx = journal.entries.map((entry) => entry.idx);
  assert.equal(new Set(idx).size, idx.length, "duplicate idx values");
  for (let i = 1; i < idx.length; i += 1) {
    assert.ok(idx[i] > idx[i - 1], `idx must increase: ${idx[i - 1]} -> ${idx[i]}`);
  }
});

test("the full migration set applies cleanly to an empty database", () => {
  assert.doesNotThrow(() => freshDatabase());
});

test("the migrated schema contains the tables the product depends on", async () => {
  freshDatabase();
  const rows = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const tables = new Set(rows.results.map((row) => row.name));

  // One representative table per migration group that was missing from the journal.
  for (const table of [
    "academies",
    "memberships",
    "athletes",
    "training_sessions",
    "attendance",
    "consents",
    "media_objects",
    "athlete_verification_requests", // 0013
    "guardian_consents", // 0015
    "revenue_receipts", // 0016
    "academy_payout_accounts", // 0016
    "content_reports", // 0017
    "account_deletion_requests", // 0017
  ]) {
    assert.ok(tables.has(table), `missing table: ${table}`);
  }
});

test("tenant-scoped media and consent columns exist", async () => {
  freshDatabase();
  for (const table of ["media_objects", "consents"]) {
    const cols = await env.DB.prepare(`SELECT name FROM pragma_table_info('${table}')`).all();
    assert.ok(
      cols.results.some((c) => c.name === "academy_id"),
      `${table} must carry academy_id so it can be tenant-scoped`,
    );
  }
});
