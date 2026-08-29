import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { identity, selectedAcademy } from "../../../lib/access";
import { safeText } from "../../../lib/records";
async function hash(value: string) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function GET(request: NextRequest) {
  const context = await selectedAcademy(request, "admin");
  if (!context) return NextResponse.json({ error: "academy_admin_required" }, { status: 403 });
  const [members, invites] = await env.DB.batch([
    env.DB.prepare(
      "SELECT id,email,role,status,created_at AS createdAt FROM memberships WHERE academy_id=? ORDER BY role,email",
    ).bind(context.academyId),
    env.DB.prepare(
      "SELECT id,email,role,status,expires_at AS expiresAt,invited_by AS invitedBy,created_at AS createdAt FROM membership_invitations WHERE academy_id=? ORDER BY created_at DESC LIMIT 100",
    ).bind(context.academyId),
  ]);
  return NextResponse.json({
    academy: context,
    members: members.results,
    invitations: invites.results,
  });
}
export async function POST(request: NextRequest) {
  const context = await selectedAcademy(request, "admin"),
    actor = identity(request);
  if (!context || !actor)
    return NextResponse.json({ error: "academy_admin_required" }, { status: 403 });
  const b = (await request.json()) as Record<string, unknown>,
    email = safeText(b.email, 160).toLowerCase(),
    role = String(b.role || "");
  if (!email.includes("@") || !new Set(["admin", "coach", "parent", "viewer"]).has(role))
    return NextResponse.json({ error: "valid_invitation_required" }, { status: 400 });
  const token = crypto.randomUUID() + crypto.randomUUID(),
    id = crypto.randomUUID(),
    now = Date.now(),
    expires = now + 7 * 86400000;
  await env.DB.prepare(
    "INSERT INTO membership_invitations (id,academy_id,email,role,status,token_hash,expires_at,invited_by,created_at) VALUES (?,?,?,?,'pending',?,?,?,?)",
  )
    .bind(id, context.academyId, email, role, await hash(token), expires, actor, now)
    .run();
  return NextResponse.json(
    {
      id,
      email,
      role,
      status: "pending",
      expiresAt: expires,
      message:
        "Invitation recorded. Delivery integration remains required before external release.",
    },
    { status: 201 },
  );
}
