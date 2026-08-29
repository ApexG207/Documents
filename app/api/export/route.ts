import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize } from "../../lib/access";
export async function GET(request: NextRequest) {
  const context = await authorize(request, "coach");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const athleteId = request.nextUrl.searchParams.get("athleteId");
  if (!athleteId) return NextResponse.json({ error: "athleteId_required" }, { status: 400 });
  const athlete = await env.DB.prepare(
    "SELECT id,alias,birth_year as birthYear,belt,consent_status as consentStatus,created_at as createdAt FROM athletes WHERE id=? AND academy_id=? AND active=1",
  )
    .bind(athleteId, context.academyId)
    .first();
  if (!athlete) return NextResponse.json({ error: "athlete_not_found" }, { status: 404 });
  const [training, skills, promotions, evaluations] = await env.DB.batch([
    env.DB.prepare(
      "SELECT session_type as sessionType,session_date as sessionDate,duration_minutes as durationMinutes,intensity,focus,notes FROM training_sessions WHERE academy_id=? AND athlete_id=? ORDER BY session_date",
    ).bind(context.academyId, athleteId),
    env.DB.prepare(
      "SELECT domain,skill_name as skillName,level,evidence,assessed_at as assessedAt FROM skill_progress WHERE academy_id=? AND athlete_id=? ORDER BY assessed_at",
    ).bind(context.academyId, athleteId),
    env.DB.prepare(
      "SELECT current_rank as currentRank,target_rank as targetRank,technical_score as technicalScore,attendance_score as attendanceScore,competition_score as competitionScore,character_score as characterScore,coach_status as coachStatus,coach_note as coachNote,reviewed_at as reviewedAt FROM promotion_progress WHERE academy_id=? AND athlete_id=? ORDER BY created_at",
    ).bind(context.academyId, athleteId),
    env.DB.prepare(
      "SELECT event_name as eventName,division,result,status,analysis_json as analysis,created_at as createdAt FROM video_evaluations WHERE academy_id=? AND athlete_id=? ORDER BY created_at",
    ).bind(context.academyId, athleteId),
  ]);
  const payload = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      athlete,
      training: training.results,
      skills: skills.results,
      promotions: promotions.results,
      evaluations: evaluations.results,
    },
    null,
    2,
  );
  return new NextResponse(payload, {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="matiq-athlete-${athleteId}.json"`,
      "cache-control": "no-store",
    },
  });
}
