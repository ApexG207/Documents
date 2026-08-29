import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { identity } from "../../lib/access";
import { safeText } from "../../lib/records";
import { rateLimit } from "../../lib/rate-limit";
const hash = async (v: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v))))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
async function send(to: string, url: string, name: string) {
  const e = env as unknown as Record<string, string | undefined>;
  if (!e.RESEND_API_KEY || !e.MATIQ_FROM_EMAIL) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${e.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: e.MATIQ_FROM_EMAIL,
      to: [to],
      subject: `Guardian consent for ${name}'s MatIQ account`,
      html: `<h1>MatIQ Guardian Consent</h1><p>${name} has requested guardian authorization for profile participation, training records, competition media, and approved coach sharing.</p><p><a href="${url}">Review consent request</a></p><p>This link expires in seven days. Consent can be revoked.</p>`,
    }),
  });
  return r.ok;
}
export async function GET(r: NextRequest) {
  const email = identity(r);
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const rows = await env.DB.prepare(
    "SELECT id,guardian_email AS guardianEmail,guardian_name AS guardianName,relationship,scope_json AS scopeJson,status,expires_at AS expiresAt,created_at AS createdAt FROM guardian_consents WHERE minor_email=? ORDER BY created_at DESC",
  )
    .bind(email)
    .all();
  return NextResponse.json({
    consents: rows.results,
    active: rows.results.some((x) => x.status === "granted" && Number(x.expiresAt) > Date.now()),
  });
}
export async function POST(r: NextRequest) {
  const email = identity(r);
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const limit = await rateLimit(r, "guardian-consent", 3, 86400000);
  if (!limit.allowed)
    return NextResponse.json({ error: "consent_request_limit_reached" }, { status: 429 });
  const profile = await env.DB.prepare(
    "SELECT display_name AS name,birth_year AS birthYear FROM user_profiles WHERE user_email=?",
  )
    .bind(email)
    .first<{ name: string; birthYear: number | null }>();
  if (!profile || !profile.birthYear || new Date().getUTCFullYear() - profile.birthYear < 18)
    return NextResponse.json({ error: "minor_profile_required" }, { status: 409 });
  const b = (await r.json()) as Record<string, unknown>,
    guardianEmail = safeText(b.guardianEmail, 160).toLowerCase();
  if (!guardianEmail.includes("@") || guardianEmail === email)
    return NextResponse.json({ error: "valid_guardian_email_required" }, { status: 400 });
  const token = crypto.randomUUID() + crypto.randomUUID(),
    id = crypto.randomUUID(),
    now = Date.now(),
    expires = now + 7 * 86400000,
    url = `${new URL(r.url).origin}/guardian-consent?token=${encodeURIComponent(token)}`,
    scopes = JSON.stringify(["profile", "training", "competition_media", "approved_coach_sharing"]);
  await env.DB.prepare(
    "INSERT INTO guardian_consents(id,minor_email,guardian_email,scope_json,status,token_hash,token_expires_at,created_at,updated_at)VALUES(?,?,?,?,'pending_delivery',?,?,?,?)",
  )
    .bind(id, email, guardianEmail, scopes, await hash(token), expires, now, now)
    .run();
  const sent = await send(guardianEmail, url, profile.name);
  await env.DB.prepare("UPDATE guardian_consents SET status=?,updated_at=? WHERE id=?")
    .bind(sent ? "pending_confirmation" : "pending_delivery", Date.now(), id)
    .run();
  return NextResponse.json(
    {
      id,
      emailSent: sent,
      status: sent ? "pending_confirmation" : "pending_delivery",
      message: sent
        ? "Guardian consent email sent."
        : "Consent request recorded; email provider configuration is required.",
    },
    { status: sent ? 201 : 202 },
  );
}
export async function DELETE(r: NextRequest) {
  const email = identity(r);
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  await env.DB.prepare(
    "UPDATE guardian_consents SET status='revoked',expires_at=?,updated_at=? WHERE minor_email=? AND status='granted'",
  )
    .bind(Date.now(), Date.now(), email)
    .run();
  return NextResponse.json({ status: "revoked" });
}
