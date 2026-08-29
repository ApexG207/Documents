import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../../lib/access";
import { allocation, periodKey, RESERVE_DAYS } from "../../../lib/revenue-pool";
const allowed = async (r: NextRequest) =>
  r.headers.get("authorization") === `Bearer ${env.MATIQ_AUTOMATION_KEY}` ||
  (await authorize(r, "admin"));
export async function POST(request: NextRequest) {
  if (!(await allowed(request))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { periodKey?: string },
    period = body.periodKey || periodKey(Date.now() - 86400000);
  if (!/^\d{4}-\d{2}$/.test(period))
    return NextResponse.json({ error: "invalid_period" }, { status: 400 });
  const exists = await env.DB.prepare(
    "SELECT id FROM revenue_pool_cohorts WHERE period_key=? AND currency='usd'",
  )
    .bind(period)
    .first();
  if (exists) return NextResponse.json({ error: "period_already_closed" }, { status: 409 });
  const receipts = await env.DB.prepare(
    "SELECT id,net_cents AS netCents FROM revenue_receipts WHERE period_key=? AND currency='usd' AND status='reconciled' AND cohort_id IS NULL",
  )
    .bind(period)
    .all<{ id: string; netCents: number }>();
  const eligible = await env.DB.prepare(
    "SELECT p.academy_id AS academyId,p.stripe_account_id AS stripeAccountId FROM academy_payout_accounts p JOIN academy_claims c ON c.academy_id=p.academy_id AND c.status='approved' WHERE p.good_standing=1 AND p.transfers_status='active' AND p.payouts_status='active' AND EXISTS(SELECT 1 FROM memberships m WHERE m.academy_id=p.academy_id AND m.status='active') GROUP BY p.academy_id,p.stripe_account_id ORDER BY p.academy_id",
  ).all<{ academyId: string; stripeAccountId: string }>();
  const total = receipts.results.reduce((n, row) => n + Number(row.netCents || 0), 0),
    split = allocation(total, eligible.results.length),
    now = Date.now(),
    cohortId = crypto.randomUUID(),
    availableAt = now + RESERVE_DAYS * 86400000,
    actor = identity(request) || "automation";
  const statements = [
    env.DB.prepare(
      "INSERT INTO revenue_pool_cohorts(id,period_key,currency,net_revenue_cents,operations_cents,founder_cents,academy_pool_cents,eligible_academy_count,remainder_cents,reserve_days,available_at,status,closed_by,closed_at)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    ).bind(
      cohortId,
      period,
      "usd",
      split.net,
      split.operations,
      split.founder,
      split.pool,
      eligible.results.length,
      split.remainder,
      RESERVE_DAYS,
      availableAt,
      "reserved",
      actor,
      now,
    ),
    env.DB.prepare(
      "INSERT INTO founder_distributions(id,cohort_id,amount_cents,currency,status,created_at,updated_at)VALUES(?,?,?,'usd','payable',?,?)",
    ).bind(crypto.randomUUID(), cohortId, split.founder, now, now),
  ];
  for (const row of eligible.results)
    statements.push(
      env.DB.prepare(
        "INSERT INTO academy_pool_allocations(id,cohort_id,academy_id,stripe_account_id,amount_cents,currency,status,created_at,updated_at)VALUES(?,?,?,?,?,'usd','reserved',?,?)",
      ).bind(
        crypto.randomUUID(),
        cohortId,
        row.academyId,
        row.stripeAccountId,
        split.share,
        now,
        now,
      ),
    );
  for (const row of receipts.results)
    statements.push(
      env.DB.prepare(
        "UPDATE revenue_receipts SET cohort_id=?,status='allocated',updated_at=? WHERE id=? AND cohort_id IS NULL",
      ).bind(cohortId, now, row.id),
    );
  await env.DB.batch(statements);
  return NextResponse.json(
    {
      cohortId,
      period,
      availableAt,
      eligibleAcademies: eligible.results.length,
      allocation: split,
    },
    { status: 201 },
  );
}
