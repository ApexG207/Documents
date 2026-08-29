/**
 * Cross-tenant isolation.
 *
 * These tests execute the real route handlers against a real SQL engine with the
 * real migrations applied. PRODUCT_REQUIREMENTS section 9 blocks production
 * release until every route resolves the academy from the caller's active
 * membership; this file is the check that claim is measured against.
 *
 * Every list assertion is two-sided: each tenant must see its OWN row and NOT the
 * other's. A one-sided "must not see the other tenant" assertion is satisfied by
 * a route that returns nothing at all -- which is exactly what a hard-coded
 * tenant filter does -- so it cannot detect the bug it exists to catch.
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
const alphaCoach = "coach@alpha.test";
const bravoCoach = "coach@bravo.test";
const outsider = "nobody@elsewhere.test";

let alphaAthlete;
let bravoAthlete;

beforeEach(async () => {
  freshDatabase();
  await seedAcademy(ALPHA, "Alpha Academy");
  await seedAcademy(BRAVO, "Bravo Academy");
  await seedMembership(ALPHA, alphaCoach, "coach");
  await seedMembership(BRAVO, bravoCoach, "coach");
  alphaAthlete = await seedAthlete(ALPHA, { alias: "Alpha Athlete" });
  bravoAthlete = await seedAthlete(BRAVO, { alias: "Bravo Athlete" });
});

test("each coach sees exactly their own academy's athletes", async () => {
  const { GET } = await import("../app/api/athletes/route.ts");

  const alpha = await readResponse(await GET(request("/api/athletes", { email: alphaCoach })));
  assert.equal(alpha.status, 200);
  assert.deepEqual(
    alpha.body.map((row) => row.alias),
    ["Alpha Athlete"],
  );

  const bravo = await readResponse(await GET(request("/api/athletes", { email: bravoCoach })));
  assert.equal(bravo.status, 200);
  assert.deepEqual(
    bravo.body.map((row) => row.alias),
    ["Bravo Athlete"],
  );
});

test("requesting another tenant by header does not grant access to it", async () => {
  const { GET } = await import("../app/api/athletes/route.ts");
  const { status, body } = await readResponse(
    await GET(request("/api/athletes", { email: alphaCoach, academyId: BRAVO })),
  );
  assert.equal(status, 200);
  assert.deepEqual(
    body.map((row) => row.alias),
    ["Alpha Athlete"],
    "a requested academy id outside the caller's membership set must be ignored",
  );
});

test("a member of two academies can select between them", async () => {
  await seedMembership(BRAVO, alphaCoach, "coach");
  const { GET } = await import("../app/api/athletes/route.ts");

  const asBravo = await readResponse(
    await GET(request("/api/athletes", { email: alphaCoach, academyId: BRAVO })),
  );
  assert.deepEqual(
    asBravo.body.map((row) => row.alias),
    ["Bravo Athlete"],
    "an academy inside the membership set must be selectable",
  );
});

test("an authenticated user with no membership is refused", async () => {
  const { GET } = await import("../app/api/athletes/route.ts");
  const { status } = await readResponse(await GET(request("/api/athletes", { email: outsider })));
  assert.equal(status, 403);
});

test("an anonymous caller is refused", async () => {
  const { GET } = await import("../app/api/athletes/route.ts");
  const { status } = await readResponse(await GET(request("/api/athletes")));
  assert.equal(status, 403);
});

test("a viewer cannot create an athlete", async () => {
  await seedMembership(ALPHA, "viewer@alpha.test", "viewer");
  const { POST } = await import("../app/api/athletes/route.ts");
  const { status } = await readResponse(
    await POST(
      request("/api/athletes", {
        email: "viewer@alpha.test",
        method: "POST",
        body: { alias: "New", birthYear: 2000, belt: "white" },
      }),
    ),
  );
  assert.equal(status, 403);
});

test("a created athlete is written to the caller's own academy", async () => {
  const { POST } = await import("../app/api/athletes/route.ts");
  const { status, body } = await readResponse(
    await POST(
      request("/api/athletes", {
        email: alphaCoach,
        method: "POST",
        body: { alias: "Fresh Athlete", birthYear: 2001, belt: "white" },
      }),
    ),
  );
  assert.equal(status, 201);
  assert.equal(body.academyId, ALPHA);
  const row = await env.DB.prepare("SELECT academy_id AS academyId FROM athletes WHERE id=?")
    .bind(body.id)
    .first();
  assert.equal(row.academyId, ALPHA);
});

test("training records are partitioned by tenant", async () => {
  const training = await import("../app/api/training/route.ts");

  for (const [email, athleteId] of [
    [alphaCoach, alphaAthlete],
    [bravoCoach, bravoAthlete],
  ]) {
    const created = await readResponse(
      await training.POST(
        request("/api/training", {
          email,
          method: "POST",
          body: { athleteId, sessionType: "class", durationMinutes: 60, intensity: 5 },
        }),
      ),
    );
    assert.equal(created.status, 201);
  }

  const alphaView = await readResponse(
    await training.GET(request("/api/training", { email: alphaCoach })),
  );
  assert.equal(alphaView.status, 200);
  assert.equal(alphaView.body.length, 1, "Alpha must see its own training session");
  assert.equal(alphaView.body[0].athleteId, alphaAthlete, "Alpha must see only its own");

  const bravoView = await readResponse(
    await training.GET(request("/api/training", { email: bravoCoach })),
  );
  assert.equal(bravoView.body.length, 1, "Bravo must see its own training session");
  assert.equal(bravoView.body[0].athleteId, bravoAthlete, "Bravo must see only its own");
});

test("a coach cannot log training against another tenant's athlete", async () => {
  const { POST } = await import("../app/api/training/route.ts");
  const { status, body } = await readResponse(
    await POST(
      request("/api/training", {
        email: alphaCoach,
        method: "POST",
        body: { athleteId: bravoAthlete, sessionType: "class", durationMinutes: 60, intensity: 5 },
      }),
    ),
  );
  assert.equal(status, 404);
  assert.equal(body.error, "athlete_not_found");
});

test("attendance is partitioned by tenant", async () => {
  const attendance = await import("../app/api/attendance/route.ts");

  for (const [email, athleteId] of [
    [alphaCoach, alphaAthlete],
    [bravoCoach, bravoAthlete],
  ]) {
    const created = await readResponse(
      await attendance.POST(
        request("/api/attendance", {
          email,
          method: "POST",
          body: { athleteId, sessionDate: Date.now(), status: "present" },
        }),
      ),
    );
    assert.equal(created.status, 201);
  }

  const alphaView = await readResponse(
    await attendance.GET(request("/api/attendance", { email: alphaCoach })),
  );
  assert.equal(alphaView.body.length, 1, "Alpha must see its own attendance row");
  assert.equal(alphaView.body[0].athleteId, alphaAthlete);

  const bravoView = await readResponse(
    await attendance.GET(request("/api/attendance", { email: bravoCoach })),
  );
  assert.equal(bravoView.body.length, 1, "Bravo must see its own attendance row");
  assert.equal(bravoView.body[0].athleteId, bravoAthlete);
});

test("a coach cannot record attendance against another tenant's athlete", async () => {
  const { POST } = await import("../app/api/attendance/route.ts");
  const own = await readResponse(
    await POST(
      request("/api/attendance", {
        email: alphaCoach,
        method: "POST",
        body: { athleteId: alphaAthlete, sessionDate: Date.now(), status: "present" },
      }),
    ),
  );
  assert.equal(own.status, 201, "own-tenant athlete should be accepted");

  const cross = await readResponse(
    await POST(
      request("/api/attendance", {
        email: alphaCoach,
        method: "POST",
        body: { athleteId: bravoAthlete, sessionDate: Date.now(), status: "present" },
      }),
    ),
  );
  assert.equal(cross.status, 404, "cross-tenant athlete must not be found");
});
