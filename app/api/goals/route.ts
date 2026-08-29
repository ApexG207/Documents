import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../lib/access";
import { activeAthleteExists, safeText } from "../../lib/records";
export async function GET(request: NextRequest) {
  const context = await authorize(request, "viewer");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = await env.DB.prepare(
    "SELECT id,athlete_id AS athleteId,title,category,target_value AS targetValue,current_value AS currentValue,target_date AS targetDate,status,coach_note AS coachNote,updated_at AS updatedAt FROM athlete_goals WHERE academy_id=? ORDER BY status='active' DESC,target_date ASC,updated_at DESC LIMIT 300",
  )
    .bind(context.academyId)
    .all();
  return NextResponse.json(rows.results);
}
export async function POST(request: NextRequest) {
  const context = await authorize(request, "coach");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json()) as Record<string, unknown>,
    athleteId = safeText(body.athleteId, 80),
    title = safeText(body.title, 120),
    category = safeText(body.category, 40);
  if (!(await activeAthleteExists(athleteId, context.academyId)))
    return NextResponse.json({ error: "athlete_not_found" }, { status: 404 });
  if (!title || !category)
    return NextResponse.json({ error: "goal_fields_required" }, { status: 400 });
  const now = Date.now(),
    id = crypto.randomUUID(),
    targetDate = typeof body.targetDate === "string" ? Date.parse(body.targetDate) : null;
  await env.DB.prepare(
    "INSERT INTO athlete_goals (id,academy_id,athlete_id,title,category,target_value,current_value,target_date,status,coach_note,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      context.academyId,
      athleteId,
      title,
      category,
      Number(body.targetValue) || null,
      Number(body.currentValue) || 0,
      Number.isFinite(targetDate) ? targetDate : null,
      "active",
      safeText(body.coachNote, 800),
      identity(request) || "unknown",
      now,
      now,
    )
    .run();
  return NextResponse.json({ id, status: "active" }, { status: 201 });
}
export async function PATCH(request: NextRequest) {
  const context = await authorize(request, "coach");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json()) as { id?: string; currentValue?: number; status?: string };
  if (!body.id || !new Set(["active", "achieved", "paused", "cancelled"]).has(String(body.status)))
    return NextResponse.json({ error: "invalid_goal_update" }, { status: 400 });
  await env.DB.prepare(
    "UPDATE athlete_goals SET current_value=?,status=?,updated_at=? WHERE id=? AND academy_id=?",
  )
    .bind(
      Math.max(0, Number(body.currentValue) || 0),
      body.status,
      Date.now(),
      body.id,
      context.academyId,
    )
    .run();
  return NextResponse.json({ id: body.id, status: body.status });
}
