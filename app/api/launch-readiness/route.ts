import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../lib/access";
export async function GET(request: NextRequest) {
  const context = await authorize(request, "admin");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const [profile, subscription, backup, incidents, holds] = await env.DB.batch([
    env.DB.prepare(
      "SELECT onboarding_status AS status,terms_accepted_at AS terms,privacy_accepted_at AS privacy FROM academy_settings WHERE academy_id=? ORDER BY updated_at DESC LIMIT 1",
    ).bind(context.academyId),
    env.DB.prepare(
      "SELECT status,billing_provider AS provider FROM subscriptions WHERE academy_id=? ORDER BY updated_at DESC LIMIT 1",
    ).bind(context.academyId),
    env.DB.prepare(
      "SELECT status,verified_at AS verifiedAt FROM backup_runs WHERE academy_id=? ORDER BY created_at DESC LIMIT 1",
    ).bind(context.academyId),
    env.DB.prepare(
      "SELECT COUNT(*) AS open FROM service_incidents WHERE academy_id=? AND status='open' AND severity IN ('critical','high')",
    ).bind(context.academyId),
    env.DB.prepare(
      "SELECT COUNT(*) AS held FROM media_objects WHERE legal_hold=1 AND academy_id=?",
    ).bind(context.academyId),
  ]);
  const p = profile.results[0] as Record<string, unknown> | undefined,
    s = subscription.results[0] as Record<string, unknown> | undefined,
    b = backup.results[0] as Record<string, unknown> | undefined,
    i = incidents.results[0] as Record<string, unknown> | undefined;
  const gates = [
    {
      code: "G1_IDENTITY",
      name: "Academy onboarding",
      pass: Boolean(p && p.terms && p.privacy),
      evidence: p?.status || "not configured",
    },
    {
      code: "G2_BILLING",
      name: "Payment operations",
      pass: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && s?.status === "active"),
      evidence: env.STRIPE_SECRET_KEY
        ? String(s?.status || "no active subscription")
        : "provider credentials absent",
    },
    {
      code: "G3_AI",
      name: "AI provider",
      pass: Boolean(env.OPENAI_API_KEY),
      evidence: env.OPENAI_API_KEY ? "configured" : "provider key absent",
    },
    {
      code: "G4_BACKUP",
      name: "Verified backup",
      pass: Boolean(b?.status === "verified"),
      evidence: b?.status || "no verified export",
    },
    {
      code: "G5_AUTOMATION",
      name: "Scheduled operations",
      pass: Boolean(env.MATIQ_AUTOMATION_KEY),
      evidence: env.MATIQ_AUTOMATION_KEY ? "configured" : "automation key absent",
    },
    {
      code: "G6_RELIABILITY",
      name: "Critical incident posture",
      pass: Number(i?.open || 0) === 0,
      evidence: `${Number(i?.open || 0)} open high/critical incidents`,
    },
  ];
  return NextResponse.json({
    assessedAt: Date.now(),
    ready: gates.every((g) => g.pass),
    score: Math.round((gates.filter((g) => g.pass).length / gates.length) * 100),
    gates,
    legalHolds: Number((holds.results[0] as Record<string, unknown> | undefined)?.held || 0),
    assessedBy: identity(request),
  });
}
