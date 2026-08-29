import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize } from "../../lib/access";
export async function GET(r: NextRequest) {
  const context = await authorize(r, "viewer");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const athleteId = r.nextUrl.searchParams.get("athleteId");
  if (!athleteId) return NextResponse.json({ error: "athleteId_required" }, { status: 400 });
  const athlete = await env.DB.prepare(
    "SELECT id,alias,birth_year as birthYear,belt,consent_status as consentStatus,created_at as createdAt FROM athletes WHERE id=? AND academy_id=? AND active=1",
  )
    .bind(athleteId, context.academyId)
    .first();
  if (!athlete) return NextResponse.json({ error: "athlete_not_found" }, { status: 404 });
  const [training, skills, promotions, evaluations, markers, observations] = await env.DB.batch([
    env.DB.prepare(
      "SELECT id,session_date as at,'training' as type,session_type as title,focus as detail,duration_minutes as value FROM training_sessions WHERE academy_id=? AND athlete_id=?",
    ).bind(context.academyId, athleteId),
    env.DB.prepare(
      "SELECT id,assessed_at as at,'skill' as type,skill_name as title,evidence as detail,level as value FROM skill_progress WHERE academy_id=? AND athlete_id=?",
    ).bind(context.academyId, athleteId),
    env.DB.prepare(
      "SELECT id,created_at as at,'promotion' as type,target_rank as title,coach_note as detail,technical_score as value FROM promotion_progress WHERE academy_id=? AND athlete_id=?",
    ).bind(context.academyId, athleteId),
    env.DB.prepare(
      "SELECT id,created_at as at,'competition' as type,event_name as title,status as detail,0 as value FROM video_evaluations WHERE academy_id=? AND athlete_id=?",
    ).bind(context.academyId, athleteId),
    env.DB.prepare(
      "SELECT id,created_at as at,'marker' as type,category as title,note as detail,second as value FROM video_markers WHERE academy_id=? AND athlete_id=?",
    ).bind(context.academyId, athleteId),
    env.DB.prepare(
      "SELECT id,observed_at as at,'observation' as type,category as title,note as detail,rating as value FROM observations WHERE athlete_id=?",
    ).bind(athleteId),
  ]);
  const timeline = [
    ...training.results,
    ...skills.results,
    ...promotions.results,
    ...evaluations.results,
    ...markers.results,
    ...observations.results,
  ].sort((a, b) => Number(b.at) - Number(a.at));
  return NextResponse.json(
    {
      athlete,
      timeline,
      counts: {
        training: training.results.length,
        skills: skills.results.length,
        promotions: promotions.results.length,
        evaluations: evaluations.results.length,
        markers: markers.results.length,
        observations: observations.results.length,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
