import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../lib/access";
import { activeAthleteExists, safeText } from "../../lib/records";
export async function GET(r: NextRequest) {
  const context = await authorize(r, "viewer");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = await env.DB.prepare(
    "SELECT id,athlete_id as athleteId,session_date as sessionDate,class_type as classType,status,recorded_by as recordedBy FROM attendance WHERE academy_id=? ORDER BY session_date DESC LIMIT 500",
  )
    .bind(context.academyId)
    .all();
  return NextResponse.json(rows.results);
}
export async function POST(r: NextRequest) {
  const context = await authorize(r, "coach");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = (await r.json()) as Record<string, unknown>,
    athleteId = safeText(b.athleteId, 80);
  if (!(await activeAthleteExists(athleteId, context.academyId)))
    return NextResponse.json({ error: "athlete_not_found" }, { status: 404 });
  const date =
      typeof b.sessionDate === "string" ? Date.parse(b.sessionDate) : Number(b.sessionDate),
    status = safeText(b.status, 20);
  if (!Number.isFinite(date) || !["present", "late", "excused", "absent"].includes(status))
    return NextResponse.json({ error: "invalid_attendance" }, { status: 400 });
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO attendance(id,academy_id,athlete_id,session_date,class_type,status,recorded_by,created_at)VALUES(?,?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      context.academyId,
      athleteId,
      date,
      safeText(b.classType, 50) || "class",
      status,
      identity(r),
      Date.now(),
    )
    .run();
  return NextResponse.json({ id }, { status: 201 });
}
