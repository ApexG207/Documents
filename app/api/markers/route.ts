import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../lib/access";
import { safeText } from "../../lib/records";
export async function GET(r: NextRequest) {
  const context = await authorize(r, "viewer");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = r.nextUrl.searchParams.get("evaluationId");
  if (!id) return NextResponse.json({ error: "evaluationId_required" }, { status: 400 });
  const rows = await env.DB.prepare(
    "SELECT id,evaluation_id as evaluationId,second,category,outcome,note,created_by as createdBy,created_at as createdAt FROM video_markers WHERE academy_id=? AND evaluation_id=? ORDER BY second",
  )
    .bind(context.academyId, id)
    .all();
  return NextResponse.json(rows.results);
}
export async function POST(r: NextRequest) {
  const context = await authorize(r, "coach");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = (await r.json()) as Record<string, unknown>;
  const evaluationId = safeText(b.evaluationId, 80);
  const evaluation = await env.DB.prepare(
    "SELECT athlete_id as athleteId FROM video_evaluations WHERE id=? AND academy_id=?",
  )
    .bind(evaluationId, context.academyId)
    .first<{ athleteId: string }>();
  if (!evaluation) return NextResponse.json({ error: "evaluation_not_found" }, { status: 404 });
  const second = Math.max(0, Math.min(21600, Number(b.second || 0)));
  const category = safeText(b.category, 40),
    outcome = safeText(b.outcome, 30);
  if (!category || !outcome)
    return NextResponse.json({ error: "category_and_outcome_required" }, { status: 400 });
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO video_markers(id,academy_id,evaluation_id,athlete_id,second,category,outcome,note,created_by,created_at)VALUES(?,?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      context.academyId,
      evaluationId,
      evaluation.athleteId,
      second,
      category,
      outcome,
      safeText(b.note, 500),
      identity(r),
      Date.now(),
    )
    .run();
  return NextResponse.json({ id }, { status: 201 });
}
