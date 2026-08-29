import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize } from "../../lib/access";

export async function GET(request: NextRequest) {
  const context = await authorize(request, "viewer");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const athleteId = request.nextUrl.searchParams.get("athleteId");
  if (!athleteId) return NextResponse.json({ error: "athleteId_required" }, { status: 400 });
  const athlete = await env.DB.prepare(
    "SELECT id,alias,birth_year as birthYear,belt,consent_status as consentStatus FROM athletes WHERE id=? AND academy_id=? AND active=1",
  )
    .bind(athleteId, context.academyId)
    .first();
  if (!athlete) return NextResponse.json({ error: "athlete_not_found" }, { status: 404 });
  const [training, skills, promotion, evaluations] = await env.DB.batch([
    env.DB.prepare(
      "SELECT COUNT(*) as sessions,COALESCE(SUM(duration_minutes),0) as minutes,COALESCE(AVG(intensity),0) as avgIntensity FROM training_sessions WHERE academy_id=? AND athlete_id=?",
    ).bind(context.academyId, athleteId),
    env.DB.prepare(
      "SELECT domain,ROUND(AVG(level)*20) as score,COUNT(*) as evidenceCount FROM skill_progress WHERE academy_id=? AND athlete_id=? GROUP BY domain ORDER BY domain",
    ).bind(context.academyId, athleteId),
    env.DB.prepare(
      "SELECT current_rank as currentRank,target_rank as targetRank,technical_score as technicalScore,attendance_score as attendanceScore,competition_score as competitionScore,character_score as characterScore,coach_status as coachStatus FROM promotion_progress WHERE academy_id=? AND athlete_id=? ORDER BY created_at DESC LIMIT 1",
    ).bind(context.academyId, athleteId),
    env.DB.prepare(
      "SELECT COUNT(*) as reviews,SUM(CASE WHEN status='complete' THEN 1 ELSE 0 END) as completed FROM video_evaluations WHERE academy_id=? AND athlete_id=?",
    ).bind(context.academyId, athleteId),
  ]);
  return NextResponse.json({
    athlete,
    training: training.results[0] || {},
    skills: skills.results,
    promotion: promotion.results[0] || null,
    competition: evaluations.results[0] || {},
  });
}
