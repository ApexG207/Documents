import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { safeText } from "../../../lib/records";
const hash = async (v: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v))))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
async function row(t: string) {
  return env.DB.prepare(
    "SELECT id,scope_json AS scopeJson,status,token_expires_at AS tokenExpiresAt FROM guardian_consents WHERE token_hash=?",
  )
    .bind(await hash(t))
    .first<Record<string, unknown>>();
}
export async function GET(r: NextRequest) {
  const x = await row(r.nextUrl.searchParams.get("token") || "");
  if (!x) return NextResponse.json({ error: "consent_not_found" }, { status: 404 });
  if (Number(x.tokenExpiresAt) < Date.now())
    return NextResponse.json({ error: "consent_expired" }, { status: 410 });
  return NextResponse.json(x);
}
export async function POST(r: NextRequest) {
  const b = (await r.json()) as Record<string, unknown>,
    x = await row(String(b.token || ""));
  if (!x) return NextResponse.json({ error: "consent_not_found" }, { status: 404 });
  if (Number(x.tokenExpiresAt) < Date.now())
    return NextResponse.json({ error: "consent_expired" }, { status: 410 });
  const name = safeText(b.guardianName, 100),
    relationship = safeText(b.relationship, 60),
    decision = b.decision === "grant" ? "granted" : "declined",
    now = Date.now();
  if (!name || !relationship)
    return NextResponse.json({ error: "guardian_identity_required" }, { status: 400 });
  await env.DB.prepare(
    "UPDATE guardian_consents SET guardian_name=?,relationship=?,status=?,responded_at=?,expires_at=?,updated_at=? WHERE id=?",
  )
    .bind(
      name,
      relationship,
      decision,
      now,
      decision === "granted" ? now + 365 * 86400000 : now,
      now,
      x.id,
    )
    .run();
  return NextResponse.json({
    status: decision,
    expiresAt: decision === "granted" ? now + 365 * 86400000 : now,
  });
}
