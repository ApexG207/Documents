import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { identity } from "../../lib/access";
import { safeText } from "../../lib/records";
import { rateLimit } from "../../lib/rate-limit";
const digest = async (value: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
async function deliver(to: string, subject: string, html: string) {
  const runtime = env as unknown as Record<string, string | undefined>,
    key = runtime.RESEND_API_KEY,
    from = runtime.MATIQ_FROM_EMAIL;
  if (!key || !from) return { sent: false, reason: "email_provider_not_configured" };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  return response.ok
    ? { sent: true, reason: "accepted" }
    : { sent: false, reason: `provider_${response.status}` };
}
export async function GET(request: NextRequest) {
  const email = identity(request);
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const rows = await env.DB.prepare(
    "SELECT id,athlete_display_name AS athleteDisplayName,academy_name AS academyName,verifier_email AS verifierEmail,claimed_birth_year AS claimedBirthYear,claimed_belt AS claimedBelt,status,membership_confirmed AS membershipConfirmed,age_confirmed AS ageConfirmed,belt_confirmed AS beltConfirmed,verified_by_name AS verifiedByName,verified_by_title AS verifiedByTitle,responded_at AS respondedAt,verification_expires_at AS verificationExpiresAt,created_at AS createdAt FROM athlete_verification_requests WHERE athlete_email=? ORDER BY created_at DESC LIMIT 20",
  )
    .bind(email)
    .all();
  return NextResponse.json({
    requests: rows.results,
    verified: rows.results.some(
      (x) => x.status === "verified" && Number(x.verificationExpiresAt) > Date.now(),
    ),
  });
}
export async function POST(request: NextRequest) {
  const email = identity(request);
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const throttle = await rateLimit(request, "athlete-verification", 3, 86400000);
  if (!throttle.allowed)
    return NextResponse.json(
      { error: "verification_request_limit_reached", resetAt: throttle.resetAt },
      { status: 429 },
    );
  const profile = await env.DB.prepare(
    "SELECT display_name AS displayName,birth_year AS birthYear,belt FROM user_profiles WHERE user_email=?",
  )
    .bind(email)
    .first<{ displayName: string; birthYear: number | null; belt: string | null }>();
  if (!profile) return NextResponse.json({ error: "individual_profile_required" }, { status: 409 });
  const b = (await request.json()) as Record<string, unknown>,
    academyName = safeText(b.academyName, 120),
    verifierEmail = safeText(b.verifierEmail, 160).toLowerCase(),
    claimedBelt = safeText(b.claimedBelt || profile.belt, 40),
    claimedBirthYear = Number(b.claimedBirthYear || profile.birthYear),
    year = new Date().getUTCFullYear();
  if (
    !academyName ||
    !emailPattern.test(verifierEmail) ||
    !claimedBelt ||
    !Number.isInteger(claimedBirthYear) ||
    claimedBirthYear < 1920 ||
    claimedBirthYear > year
  )
    return NextResponse.json({ error: "academy_contact_age_and_belt_required" }, { status: 400 });
  const recent = await env.DB.prepare(
    "SELECT id FROM athlete_verification_requests WHERE athlete_email=? AND verifier_email=? AND status IN ('pending_delivery','pending_confirmation') AND created_at>?",
  )
    .bind(email, verifierEmail, Date.now() - 86400000)
    .first();
  if (recent) return NextResponse.json({ error: "verification_already_pending" }, { status: 409 });
  const id = crypto.randomUUID(),
    token = crypto.randomUUID() + crypto.randomUUID(),
    tokenHash = await digest(token),
    now = Date.now(),
    expires = now + 7 * 86400000,
    origin = new URL(request.url).origin,
    url = `${origin}/verify-athlete?token=${encodeURIComponent(token)}`;
  await env.DB.prepare(
    "INSERT INTO athlete_verification_requests (id,athlete_email,athlete_display_name,academy_name,verifier_email,claimed_birth_year,claimed_belt,claimed_membership_status,status,token_hash,token_expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'active','pending_delivery',?,?,?,?)",
  )
    .bind(
      id,
      email,
      profile.displayName,
      academyName,
      verifierEmail,
      claimedBirthYear,
      claimedBelt,
      tokenHash,
      expires,
      now,
      now,
    )
    .run();
  const delivery = await deliver(
      verifierEmail,
      `Verify ${profile.displayName}'s athlete profile for MatIQ`,
      `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto"><h1 style="color:#541224">MatIQ Athlete Verification</h1><p>${profile.displayName} has asked you to confirm active membership at ${academyName}, their birth-year/age record, and current belt color (${claimedBelt}).</p><p><a style="display:inline-block;background:#c8a349;color:#111;padding:12px 18px;text-decoration:none;font-weight:bold" href="${url}">Review verification request</a></p><p>This link expires in seven days. Confirm only records you are authorized to validate. MatIQ does not publish the athlete's email or exact birth date.</p></div>`,
    ),
    status = delivery.sent ? "pending_confirmation" : "pending_delivery";
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE athlete_verification_requests SET status=?,updated_at=? WHERE id=?",
    ).bind(status, Date.now(), id),
    env.DB.prepare(
      "INSERT INTO athlete_verification_events (id,request_id,event_type,outcome,actor_email,metadata_json,created_at) VALUES (?,?,'verification_requested',?,?,?,?)",
    ).bind(
      crypto.randomUUID(),
      id,
      status,
      email,
      JSON.stringify({ delivery: delivery.reason }),
      Date.now(),
    ),
  ]);
  return NextResponse.json(
    {
      id,
      status,
      emailSent: delivery.sent,
      expiresAt: expires,
      message: delivery.sent
        ? "Verification email sent to the academy contact."
        : "Verification request saved; email delivery requires provider configuration.",
    },
    { status: delivery.sent ? 201 : 202 },
  );
}
export async function PATCH(request: NextRequest) {
  const email = identity(request);
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const b = (await request.json()) as Record<string, unknown>,
    id = safeText(b.id, 80),
    reason = safeText(b.reason, 500),
    action = String(b.action || "");
  const owned = await env.DB.prepare(
    "SELECT id FROM athlete_verification_requests WHERE id=? AND athlete_email=?",
  )
    .bind(id, email)
    .first();
  if (!owned) return NextResponse.json({ error: "verification_not_owned" }, { status: 404 });
  if (action === "report") {
    await env.DB.prepare(
      "INSERT INTO athlete_verification_events(id,request_id,event_type,outcome,actor_email,metadata_json,created_at)VALUES(?,?,'fraud_reported','review_required',?,?,?)",
    )
      .bind(crypto.randomUUID(), id, email, JSON.stringify({ reason }), Date.now())
      .run();
    return NextResponse.json({ status: "review_required" });
  }
  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
export async function DELETE(request: NextRequest) {
  const email = identity(request);
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const id = safeText(request.nextUrl.searchParams.get("id"), 80),
    now = Date.now();
  const result = await env.DB.prepare(
    "UPDATE athlete_verification_requests SET status='revoked',verification_expires_at=?,updated_at=? WHERE id=? AND athlete_email=?",
  )
    .bind(now, now, id, email)
    .run();
  return NextResponse.json({ status: "revoked", changed: result.meta.changes });
}
