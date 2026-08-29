import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { selectedAcademy } from "../../../lib/access";
import { createExpressLoginLink } from "../../../lib/stripe-connect";
export async function POST(request: NextRequest) {
  const context = await selectedAcademy(request, "admin");
  if (!context) return NextResponse.json({ error: "academy_admin_required" }, { status: 403 });
  if (!env.STRIPE_SECRET_KEY)
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  const row = await env.DB.prepare(
    "SELECT stripe_account_id AS accountId FROM academy_payout_accounts WHERE academy_id=?",
  )
    .bind(context.academyId)
    .first<{ accountId: string }>();
  if (!row) return NextResponse.json({ error: "connected_account_required" }, { status: 409 });
  const link = await createExpressLoginLink(row.accountId);
  return NextResponse.json({ url: link.url });
}
