/**
 * Beta-readiness gates.
 *
 * G3 ("Multi-tenant isolation") used to pass when an operator set
 * MATIQ_TENANT_ISOLATION_V2="enforced". That asserted nothing about the running
 * system: it reported GO whether or not routes resolved academies from
 * membership, and reported HOLD once they did. It now measures stored data, so
 * these tests seed the violations it claims to detect and assert it reacts.
 */
import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
  env,
  freshDatabase,
  readResponse,
  request,
  seedAcademy,
  seedMembership,
} from "./harness/setup.mjs";

const ALPHA = "alpha";
const admin = "admin@alpha.test";

async function readiness(email = admin) {
  const { GET } = await import("../app/api/beta-readiness/route.ts");
  return readResponse(await GET(request("/api/beta-readiness", { email })));
}

const gateG3 = (body) => body.checks.find((c) => c.gate === "G3");

beforeEach(async () => {
  freshDatabase();
  await seedAcademy(ALPHA, "Alpha Academy");
  await seedMembership(ALPHA, admin, "admin");
});

test("G3 passes when every record carries a resolvable academy", async () => {
  const { status, body } = await readiness();
  assert.equal(status, 200);
  assert.equal(gateG3(body).pass, true, gateG3(body).evidence);
});

test("G3 fails when media carries no tenant", async () => {
  await env.DB.prepare(
    "INSERT INTO media_objects(id,academy_id,athlete_id,object_key,kind,consent_scope,created_at) VALUES(?,NULL,?,?,?,?,?)",
  )
    .bind(
      "m1",
      "athlete-x",
      "tenant/unknown/x",
      "competition_video",
      "athlete-authorized",
      Date.now(),
    )
    .run();

  const { body } = await readiness();
  assert.equal(gateG3(body).pass, false, "an untenanted media row must fail the gate");
  assert.match(gateG3(body).evidence, /1 media/);
});

test("G3 fails when consent carries no tenant", async () => {
  await env.DB.prepare(
    "INSERT INTO consents(id,academy_id,athlete_id,parent_email,scope,status,recorded_by,created_at) VALUES(?,NULL,?,?,?,?,?,?)",
  )
    .bind("c1", "athlete-x", "p@x.test", "Internal match video", "granted", "p@x.test", Date.now())
    .run();

  const { body } = await readiness();
  assert.equal(gateG3(body).pass, false);
  assert.match(gateG3(body).evidence, /1 consent/);
});

test("G3 fails when a membership points at an academy that does not exist", async () => {
  await env.DB.prepare(
    "INSERT INTO memberships(id,academy_id,email,role,status,created_at) VALUES(?,?,?,?,'active',?)",
  )
    .bind("m-orphan", "deleted-academy", "ghost@x.test", "coach", Date.now())
    .run();

  const { body } = await readiness();
  assert.equal(gateG3(body).pass, false);
  assert.match(gateG3(body).evidence, /1 membership/);
});

test("the overall decision is HOLD while any gate fails", async () => {
  const { body } = await readiness();
  // G1/G2/G4/G5 depend on secrets that are unset in this environment, so the
  // decision must be HOLD regardless of G3.
  assert.equal(body.decision, "HOLD");
  assert.equal(body.ready, false);
  assert.ok(body.score < 100);
});

test("beta readiness is refused to non-admins", async () => {
  await seedMembership(ALPHA, "coach@alpha.test", "coach");
  const { status } = await readiness("coach@alpha.test");
  assert.equal(status, 403);
});
