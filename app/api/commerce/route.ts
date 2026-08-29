import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../lib/access";

const plans = {
  starter: { athleteLimit: 10, storageLimitBytes: 10 * 1024 ** 3, monthlyCents: 4900 },
  academy: { athleteLimit: 75, storageLimitBytes: 100 * 1024 ** 3, monthlyCents: 14900 },
  enterprise: { athleteLimit: 500, storageLimitBytes: 1024 * 1024 ** 3, monthlyCents: 39900 },
};
export async function GET(request: NextRequest) {
  const context = await authorize(request, "admin");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const subscription = await env.DB.prepare(
    "SELECT id,plan_code AS planCode,status,billing_provider AS billingProvider,athlete_limit AS athleteLimit,storage_limit_bytes AS storageLimitBytes,current_period_end AS currentPeriodEnd,updated_at AS updatedAt FROM subscriptions WHERE academy_id=? ORDER BY updated_at DESC LIMIT 1",
  )
    .bind(context.academyId)
    .first();
  const invoices = await env.DB.prepare(
    "SELECT id,amount_cents AS amountCents,currency,status,due_at AS dueAt,paid_at AS paidAt,created_at AS createdAt FROM invoices WHERE academy_id=? ORDER BY created_at DESC LIMIT 12",
  )
    .bind(context.academyId)
    .all();
  return NextResponse.json({
    subscription: subscription || {
      planCode: "pilot",
      status: "internal",
      athleteLimit: 10,
      storageLimitBytes: 10 * 1024 ** 3,
    },
    plans,
    invoices: invoices.results,
    paymentAutomation: Boolean(env.STRIPE_SECRET_KEY),
  });
}
export async function POST(request: NextRequest) {
  const context = await authorize(request, "admin");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json()) as { planCode?: keyof typeof plans };
  const plan = body.planCode && plans[body.planCode];
  if (!plan) return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  const now = Date.now(),
    id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE subscriptions SET status='superseded',updated_at=? WHERE academy_id=? AND status IN ('trialing','active')",
    ).bind(now, context.academyId),
    env.DB.prepare(
      "INSERT INTO subscriptions (id,academy_id,plan_code,status,billing_provider,athlete_limit,storage_limit_bytes,current_period_end,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    ).bind(
      id,
      context.academyId,
      body.planCode,
      "trialing",
      "manual",
      plan.athleteLimit,
      plan.storageLimitBytes,
      now + 14 * 86400000,
      now,
      now,
    ),
    env.DB.prepare(
      "INSERT INTO product_events (id,academy_id,actor_email,event_name,object_type,object_id,properties_json,occurred_at) VALUES (?,?,?,?,?,?,?,?)",
    ).bind(
      crypto.randomUUID(),
      context.academyId,
      identity(request),
      "trial_started",
      "subscription",
      id,
      JSON.stringify({ planCode: body.planCode, monthlyCents: plan.monthlyCents }),
      now,
    ),
  ]);
  return NextResponse.json(
    { id, status: "trialing", planCode: body.planCode, checkoutRequired: !env.STRIPE_SECRET_KEY },
    { status: 201 },
  );
}
