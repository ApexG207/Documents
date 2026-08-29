import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../lib/access";
import { activeAthleteExists, safeText } from "../../lib/records";
export async function GET(request: NextRequest) {
  const context = await authorize(request, "viewer");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = await env.DB.prepare(
    "SELECT id,athlete_id AS athleteId,name,objective,start_date AS startDate,end_date AS endDate,weekly_sessions AS weeklySessions,status,created_at AS createdAt FROM training_blocks WHERE academy_id=? ORDER BY start_date DESC LIMIT 200",
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
    name = safeText(body.name, 100),
    objective = safeText(body.objective, 800),
    start = Date.parse(String(body.startDate || "")),
    end = Date.parse(String(body.endDate || "")),
    weekly = Math.max(1, Math.min(14, Number(body.weeklySessions) || 3));
  if (!(await activeAthleteExists(athleteId, context.academyId)))
    return NextResponse.json({ error: "athlete_not_found" }, { status: 404 });
  if (!name || !objective || !Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return NextResponse.json({ error: "invalid_training_block" }, { status: 400 });
  const id = crypto.randomUUID(),
    now = Date.now();
  await env.DB.prepare(
    "INSERT INTO training_blocks (id,academy_id,athlete_id,name,objective,start_date,end_date,weekly_sessions,status,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      context.academyId,
      athleteId,
      name,
      objective,
      start,
      end,
      weekly,
      start <= now && end >= now ? "active" : "planned",
      identity(request) || "unknown",
      now,
    )
    .run();
  return NextResponse.json(
    { id, status: start <= now && end >= now ? "active" : "planned" },
    { status: 201 },
  );
}
