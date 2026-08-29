import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize } from "../../lib/access";
export async function GET(request: NextRequest) {
  const context = await authorize(request, "admin");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const now = Date.now(),
    month = new Date(now).toISOString().slice(0, 7);
  const [athletes, engagement, jobs, storage, subscription, events, incidents, goals] =
    await env.DB.batch([
      env.DB.prepare("SELECT COUNT(*) AS total FROM athletes WHERE academy_id=? AND active=1").bind(
        context.academyId,
      ),
      env.DB.prepare(
        "SELECT COUNT(DISTINCT athlete_id) AS monthlyActive FROM training_sessions WHERE academy_id=? AND session_date>=?",
      ).bind(context.academyId, now - 30 * 86400000),
      env.DB.prepare(
        "SELECT COUNT(*) AS total,SUM(CASE WHEN status='queued' THEN 1 ELSE 0 END) AS queued,SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed FROM analysis_jobs WHERE academy_id=?",
      ).bind(context.academyId),
      env.DB.prepare(
        "SELECT COALESCE(SUM(byte_size),0) AS bytes,COUNT(*) AS objects,SUM(CASE WHEN legal_hold=1 THEN 1 ELSE 0 END) AS held FROM media_objects WHERE lifecycle_state<>'deleted'",
      ),
      env.DB.prepare(
        "SELECT plan_code AS planCode,status,athlete_limit AS athleteLimit,storage_limit_bytes AS storageLimitBytes FROM subscriptions WHERE academy_id=? ORDER BY updated_at DESC LIMIT 1",
      ).bind(context.academyId),
      env.DB.prepare(
        "SELECT COUNT(*) AS total,COUNT(DISTINCT actor_email) AS activeUsers FROM product_events WHERE academy_id=? AND occurred_at>=?",
      ).bind(context.academyId, now - 30 * 86400000),
      env.DB.prepare(
        "SELECT COUNT(*) AS open FROM service_incidents WHERE academy_id=? AND status='open'",
      ).bind(context.academyId),
      env.DB.prepare(
        "SELECT COUNT(*) AS active,SUM(CASE WHEN status='achieved' THEN 1 ELSE 0 END) AS achieved FROM athlete_goals WHERE academy_id=?",
      ).bind(context.academyId),
    ]);
  const sub = subscription.results[0] || {
    planCode: "pilot",
    status: "internal",
    athleteLimit: 10,
    storageLimitBytes: 10 * 1024 ** 3,
  };
  return NextResponse.json({
    asOf: now,
    period: month,
    athletes: athletes.results[0] || {},
    engagement: engagement.results[0] || {},
    jobs: jobs.results[0] || {},
    storage: storage.results[0] || {},
    subscription: sub,
    events: events.results[0] || {},
    incidents: incidents.results[0] || {},
    goals: goals.results[0] || {},
  });
}
