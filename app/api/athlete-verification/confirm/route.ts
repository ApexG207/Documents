import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { safeText } from "../../../lib/records";
const digest = async (value: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
async function requestFor(token: string) {
  return env.DB.prepare(
    "SELECT id,athlete_display_name AS athleteDisplayName,academy_name AS academyName,claimed_birth_year AS claimedBirthYear,claimed_belt AS claimedBelt,claimed_membership_status AS claimedMembershipStatus,status,token_expires_at AS tokenExpiresAt FROM athlete_verification_requests WHERE token_hash=? LIMIT 1",
  )
    .bind(await digest(token))
    .first<Record<string, unknown>>();
}
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  if (token.length < 60)
    return NextResponse.json({ error: "invalid_verification_token" }, { status: 400 });
  const row = await requestFor(token);
  if (!row) return NextResponse.json({ error: "verification_not_found" }, { status: 404 });
  if (Number(row.tokenExpiresAt) < Date.now())
    return NextResponse.json({ error: "verification_expired" }, { status: 410 });
  return NextResponse.json({
    athleteDisplayName: row.athleteDisplayName,
    academyName: row.academyName,
    claimedBirthYear: row.claimedBirthYear,
    claimedBelt: row.claimedBelt,
    claimedMembershipStatus: row.claimedMembershipStatus,
    status: row.status,
  });
}
export async function POST(request: NextRequest) {
  const b = (await request.json()) as Record<string, unknown>,
    token = String(b.token || "");
  if (token.length < 60)
    return NextResponse.json({ error: "invalid_verification_token" }, { status: 400 });
  const row = await requestFor(token);
  if (!row) return NextResponse.json({ error: "verification_not_found" }, { status: 404 });
  if (Number(row.tokenExpiresAt) < Date.now()) {
    await env.DB.prepare(
      "UPDATE athlete_verification_requests SET status='expired',updated_at=? WHERE id=?",
    )
      .bind(Date.now(), row.id)
      .run();
    return NextResponse.json({ error: "verification_expired" }, { status: 410 });
  }
  if (row.status === "verified" || row.status === "disputed")
    return NextResponse.json({ error: "verification_already_completed" }, { status: 409 });
  const verifierName = safeText(b.verifierName, 100),
    verifierTitle = safeText(b.verifierTitle, 100),
    note = safeText(b.note, 800),
    membership = b.membershipConfirmed === true,
    age = b.ageConfirmed === true,
    belt = b.beltConfirmed === true;
  if (!verifierName || !verifierTitle)
    return NextResponse.json({ error: "verifier_identity_required" }, { status: 400 });
  const status = membership && age && belt ? "verified" : "disputed",
    now = Date.now(),
    validUntil = status === "verified" ? now + 365 * 86400000 : null;
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE athlete_verification_requests SET status=?,membership_confirmed=?,age_confirmed=?,belt_confirmed=?,verified_by_name=?,verified_by_title=?,verifier_note=?,responded_at=?,verification_expires_at=?,updated_at=? WHERE id=?",
    ).bind(
      status,
      membership ? 1 : 0,
      age ? 1 : 0,
      belt ? 1 : 0,
      verifierName,
      verifierTitle,
      note || null,
      now,
      validUntil,
      now,
      row.id,
    ),
    env.DB.prepare(
      "INSERT INTO athlete_verification_events (id,request_id,event_type,outcome,actor_email,metadata_json,created_at) VALUES (?,?,'academy_response',?,NULL,?,?)",
    ).bind(
      crypto.randomUUID(),
      row.id,
      status,
      JSON.stringify({ membership, age, belt, verifierTitle }),
      now,
    ),
  ]);
  return NextResponse.json({ status, verified: status === "verified", validUntil });
}
