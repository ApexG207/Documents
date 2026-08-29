import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../lib/access";
import { activeAthleteExists, boundedScore, safeText } from "../../lib/records";
export async function GET(r: NextRequest) {
  const context = await authorize(r, "viewer");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = await env.DB.prepare(
    "SELECT id,athlete_id as athleteId,current_rank as currentRank,target_rank as targetRank,technical_score as technicalScore,attendance_score as attendanceScore,competition_score as competitionScore,character_score as characterScore,coach_status as coachStatus,coach_note as coachNote,reviewed_by as reviewedBy,reviewed_at as reviewedAt FROM promotion_progress WHERE academy_id=? ORDER BY created_at DESC",
  )
    .bind(context.academyId)
    .all();
  return NextResponse.json(rows.results);
}
export async function POST(r: NextRequest) {
  const context = await authorize(r, "coach");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = (await r.json()) as Record<string, unknown>;
  const athleteId = safeText(b.athleteId, 80);
  if (!(await activeAthleteExists(athleteId, context.academyId)))
    return NextResponse.json({ error: "athlete_not_found" }, { status: 404 });
  const current = safeText(b.currentRank, 40),
    target = safeText(b.targetRank, 40);
  if (!current || !target)
    return NextResponse.json({ error: "rank_path_required" }, { status: 400 });
  const id = crypto.randomUUID(),
    now = Date.now();
  await env.DB.prepare(
    "INSERT INTO promotion_progress (id,academy_id,athlete_id,current_rank,target_rank,technical_score,attendance_score,competition_score,character_score,coach_status,coach_note,reviewed_by,reviewed_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      context.academyId,
      athleteId,
      current,
      target,
      boundedScore(b.technicalScore),
      boundedScore(b.attendanceScore),
      boundedScore(b.competitionScore),
      boundedScore(b.characterScore),
      safeText(b.coachStatus, 30) || "developing",
      safeText(b.coachNote, 1000),
      identity(r),
      now,
      now,
    )
    .run();
  return NextResponse.json({ id }, { status: 201 });
}
