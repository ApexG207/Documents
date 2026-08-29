/**
 * The governed 90/2/8 community-revenue allocation.
 *
 * This was previously asserted by grepping the source for the literals `net*90/100`
 * and `RESERVE_DAYS=60`, which proves the characters exist but says nothing about
 * whether the arithmetic conserves money. These tests run the function.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { RESERVE_DAYS, allocation, periodKey } from "../app/lib/revenue-pool.ts";

test("the reserve window is 60 days", () => {
  assert.equal(RESERVE_DAYS, 60);
});

test("allocation splits 90/2/8 and conserves every cent", () => {
  const result = allocation(1_000_000, 4);
  assert.equal(result.operations, 900_000);
  assert.equal(result.founder, 20_000);
  assert.equal(result.pool, 80_000);
  assert.equal(result.share, 20_000);
  assert.equal(result.remainder, 0);
  assert.equal(
    result.operations + result.founder + result.pool,
    result.net,
    "the three tranches must sum to net revenue",
  );
});

test("no cent is created or destroyed at awkward amounts", () => {
  for (const amount of [1, 7, 99, 101, 3333, 99_999, 1_234_567]) {
    for (const academies of [1, 2, 3, 7, 11]) {
      const r = allocation(amount, academies);
      assert.equal(
        r.operations + r.founder + r.pool,
        r.net,
        `tranches must sum to net for ${amount}/${academies}`,
      );
      assert.equal(
        r.share * academies + r.remainder,
        r.pool,
        `distributed shares plus remainder must equal the pool for ${amount}/${academies}`,
      );
      assert.ok(r.remainder >= 0 && r.remainder < academies, "remainder must be a true remainder");
      assert.ok(r.operations >= 0 && r.founder >= 0 && r.pool >= 0, "no negative tranche");
    }
  }
});

test("zero eligible academies leaves the pool undistributed rather than dividing by zero", () => {
  const r = allocation(500_000, 0);
  assert.equal(r.share, 0);
  assert.equal(r.remainder, r.pool);
  assert.ok(Number.isFinite(r.share));
});

test("negative and fractional input is clamped rather than propagated", () => {
  assert.equal(allocation(-100, 3).net, 0);
  assert.equal(allocation(-100, 3).pool, 0);
  assert.equal(allocation(10.9, 1).net, 10, "fractional cents are truncated, not rounded up");
});

test("periodKey buckets by calendar month in UTC", () => {
  assert.equal(periodKey(Date.UTC(2026, 0, 1)), "2026-01");
  assert.equal(periodKey(Date.UTC(2026, 11, 31, 23, 59, 59)), "2026-12");
});
