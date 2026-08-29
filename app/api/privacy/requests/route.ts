import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../../lib/access";
const allowed = new Set([
  "access",
  "correction",
  "export",
  "restriction",
  "deletion",
  "consent-withdrawal",
]);
export async function POST(request: NextRequest) {
  const context = await authorize(request, "parent");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const email = identity(request);
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const b = (await request.json()) as { athleteId?: string; requestType?: string };
  const requestType = String(b.requestType || "");
  if (!allowed.has(requestType))
    return NextResponse.json({ error: "invalid_request_type" }, { status: 400 });
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO rights_requests (id,academy_id,requester_email,athlete_id,request_type,status,due_at,created_at) VALUES (?,?,?,?,?,'received',?,?)",
  )
    .bind(
      id,
      context.academyId,
      email,
      b.athleteId || null,
      requestType,
      Date.now() + 30 * 86400000,
      Date.now(),
    )
    .run();
  await env.DB.prepare(
    "INSERT INTO audit_events (id,academy_id,actor_email,action,object_type,object_id,outcome,created_at) VALUES (?,?,?,?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      context.academyId,
      email,
      "privacy-request-created",
      "rights_request",
      id,
      "received",
      Date.now(),
    )
    .run();
  return NextResponse.json({ id, status: "received" }, { status: 201 });
}
