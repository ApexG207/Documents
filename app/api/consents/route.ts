import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../lib/access";
import { normalizeConsentStatus } from "../../lib/consent";
export async function POST(request: NextRequest) {
  const context = await authorize(request, "parent");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = (await request.json()) as { athleteId: string; scope: string; status: string };
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO consents (id,academy_id,athlete_id,parent_email,scope,status,recorded_by,created_at) VALUES (?,?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      context.academyId,
      String(b.athleteId),
      identity(request),
      String(b.scope).slice(0, 80),
      normalizeConsentStatus(b.status),
      identity(request),
      Date.now(),
    )
    .run();
  return NextResponse.json({ id }, { status: 201 });
}
