/**
 * Guardian consent enforcement for minor media.
 *
 * The recording route and the enforcement point previously disagreed on the
 * affirmative status value ("granted" written, "approved" required), so no minor
 * upload could ever be authorised. The mismatch failed closed, so it never
 * produced an incident -- it silently disabled the safeguarding feature instead.
 * These tests exercise the full round trip so the two sides cannot drift again.
 */
import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
  env,
  freshDatabase,
  readResponse,
  request,
  seedAcademy,
  seedAthlete,
  seedMembership,
} from "./harness/setup.mjs";

const ALPHA = "alpha";
const BRAVO = "bravo";
const coach = "coach@alpha.test";
const guardian = "guardian@alpha.test";
const bravoCoach = "coach@bravo.test";

let minor;
let adult;

const CURRENT_YEAR = new Date().getUTCFullYear();

function videoUpload(athleteId) {
  const form = new FormData();
  form.set("video", new File([new Uint8Array([0, 1, 2, 3])], "match.mp4", { type: "video/mp4" }));
  form.set("athleteId", athleteId);
  form.set("eventName", "Regional Open");
  form.set("division", "Youth");
  form.set("result", "Win");
  return form;
}

async function grantConsent(email, athleteId, status, scope = "Internal match video") {
  const { POST } = await import("../app/api/consents/route.ts");
  return readResponse(
    await POST(
      request("/api/consents", { email, method: "POST", body: { athleteId, scope, status } }),
    ),
  );
}

beforeEach(async () => {
  freshDatabase();
  await seedAcademy(ALPHA, "Alpha Academy");
  await seedAcademy(BRAVO, "Bravo Academy");
  await seedMembership(ALPHA, coach, "coach");
  await seedMembership(ALPHA, guardian, "parent");
  await seedMembership(BRAVO, bravoCoach, "coach");
  minor = await seedAthlete(ALPHA, { alias: "Minor Athlete", birthYear: CURRENT_YEAR - 11 });
  adult = await seedAthlete(ALPHA, { alias: "Adult Athlete", birthYear: CURRENT_YEAR - 28 });
});

test("a minor's footage is refused when no consent is on file", async () => {
  const { POST } = await import("../app/api/media/route.ts");
  const { status, body } = await readResponse(
    await POST(request("/api/media", { email: coach, method: "POST", body: videoUpload(minor) })),
  );
  assert.equal(status, 409);
  assert.equal(body.error, "guardian_consent_required");
});

test("granted guardian consent authorises a minor's footage end to end", async () => {
  const consent = await grantConsent(guardian, minor, "granted");
  assert.equal(consent.status, 201);

  const { POST } = await import("../app/api/media/route.ts");
  const { status, body } = await readResponse(
    await POST(request("/api/media", { email: coach, method: "POST", body: videoUpload(minor) })),
  );
  assert.equal(status, 202, "granted consent must authorise the upload");
  assert.equal(body.status, "queued");

  const media = await env.DB.prepare(
    "SELECT academy_id AS academyId,consent_scope AS consentScope FROM media_objects WHERE id=?",
  )
    .bind(body.mediaId)
    .first();
  assert.equal(media.academyId, ALPHA, "media must be written to the caller's tenant");
  assert.equal(media.consentScope, "guardian-approved");
});

test("declined guardian consent does not authorise a minor's footage", async () => {
  const consent = await grantConsent(guardian, minor, "declined");
  assert.equal(consent.status, 201);

  const { POST } = await import("../app/api/media/route.ts");
  const { status, body } = await readResponse(
    await POST(request("/api/media", { email: coach, method: "POST", body: videoUpload(minor) })),
  );
  assert.equal(status, 409);
  assert.equal(body.error, "guardian_consent_required");
});

test("consent recorded for an unrelated scope does not authorise media", async () => {
  await grantConsent(guardian, minor, "granted", "Newsletter");

  const { POST } = await import("../app/api/media/route.ts");
  const { status } = await readResponse(
    await POST(request("/api/media", { email: coach, method: "POST", body: videoUpload(minor) })),
  );
  assert.equal(status, 409, "consent scope must be specific to media");
});

test("an adult athlete's footage does not require guardian consent", async () => {
  const { POST } = await import("../app/api/media/route.ts");
  const { status, body } = await readResponse(
    await POST(request("/api/media", { email: coach, method: "POST", body: videoUpload(adult) })),
  );
  assert.equal(status, 202);

  const media = await env.DB.prepare(
    "SELECT consent_scope AS consentScope FROM media_objects WHERE id=?",
  )
    .bind(body.mediaId)
    .first();
  assert.equal(media.consentScope, "athlete-authorized");
});

test("consent is recorded against the guardian's own tenant", async () => {
  const consent = await grantConsent(guardian, minor, "granted");
  const row = await env.DB.prepare("SELECT academy_id AS academyId FROM consents WHERE id=?")
    .bind(consent.body.id)
    .first();
  assert.equal(row.academyId, ALPHA);
});

test("a coach in another academy cannot upload footage for this academy's athlete", async () => {
  await grantConsent(guardian, minor, "granted");

  const { POST } = await import("../app/api/media/route.ts");
  const { status, body } = await readResponse(
    await POST(
      request("/api/media", { email: bravoCoach, method: "POST", body: videoUpload(minor) }),
    ),
  );
  assert.equal(status, 404);
  assert.equal(body.error, "athlete_not_found");
});

test("uploaded media is stored under a tenant-partitioned object key", async () => {
  await grantConsent(guardian, minor, "granted");
  const { POST } = await import("../app/api/media/route.ts");
  const { body } = await readResponse(
    await POST(request("/api/media", { email: coach, method: "POST", body: videoUpload(minor) })),
  );

  const row = await env.DB.prepare("SELECT object_key AS objectKey FROM media_objects WHERE id=?")
    .bind(body.mediaId)
    .first();
  assert.ok(
    row.objectKey.startsWith(`tenant/${ALPHA}/`),
    `object key must be tenant-partitioned, got ${row.objectKey}`,
  );
  assert.ok(await env.BUCKET.head(row.objectKey), "object must exist in storage");
});
