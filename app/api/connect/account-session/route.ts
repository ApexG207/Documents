import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { selectedAcademy } from "../../../lib/access";
import { createEmbeddedSession } from "../../../lib/stripe-connect";
export async function POST(request: NextRequest) {
  const context = await selectedAcademy(request, "admin");
  if (!context) return NextResponse.json({ error: "academy_admin_required" }, { status: 403 });
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PUBLISHABLE_KEY)
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  const row = await env.DB.prepare(
    "SELECT stripe_account_id AS accountId FROM academy_payout_accounts WHERE academy_id=?",
  )
    .bind(context.academyId)
    .first<{ accountId: string }>();
  if (!row) return NextResponse.json({ error: "connected_account_required" }, { status: 409 });
  const session = await createEmbeddedSession(row.accountId);
  return NextResponse.json({
    clientSecret: session.client_secret,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    accountId: row.accountId,
  });
}
