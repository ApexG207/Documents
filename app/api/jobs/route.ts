import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../lib/access";
export async function GET(request: NextRequest) {
  const context = await authorize(request, "coach");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = await env.DB.prepare(
    "SELECT id,evaluation_id AS evaluationId,job_type AS jobType,status,attempts,priority,error_code AS errorCode,created_at AS createdAt,updated_at AS updatedAt,completed_at AS completedAt FROM analysis_jobs WHERE academy_id=? ORDER BY created_at DESC LIMIT 100",
  )
    .bind(context.academyId)
    .all();
  return NextResponse.json(rows.results);
}
export async function PATCH(request: NextRequest) {
  const context = await authorize(request, "admin");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json()) as { id?: string; action?: string };
  if (!body.id || !new Set(["retry", "cancel"]).has(String(body.action)))
    return NextResponse.json({ error: "invalid_job_action" }, { status: 400 });
  const status = body.action === "retry" ? "queued" : "cancelled",
    now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE analysis_jobs SET status=?,lease_until=NULL,error_code=NULL,updated_at=? WHERE id=? AND academy_id=?",
    ).bind(status, now, body.id, context.academyId),
    env.DB.prepare(
      "INSERT INTO audit_events (id,academy_id,actor_email,action,object_type,object_id,outcome,created_at) VALUES (?,?,?,?,?,?,?,?)",
    ).bind(
      crypto.randomUUID(),
      context.academyId,
      identity(request) || "unknown",
      String(body.action),
      "analysis_job",
      body.id,
      "completed",
      now,
    ),
  ]);
  return NextResponse.json({ id: body.id, status });
}
