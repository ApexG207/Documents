import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../../lib/access";
import { rateLimit } from "../../../lib/rate-limit";
const price: Record<string, string | undefined> = {
  starter: env.STRIPE_PRICE_STARTER,
  academy: env.STRIPE_PRICE_ACADEMY,
  enterprise: env.STRIPE_PRICE_ENTERPRISE,
};
export async function POST(request: NextRequest) {
  const context = await authorize(request, "admin");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const throttle = await rateLimit(request, "checkout", 5, 3600000);
  if (!throttle.allowed)
    return NextResponse.json({ error: "rate_limited", resetAt: throttle.resetAt }, { status: 429 });
  if (!env.STRIPE_SECRET_KEY)
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  const body = (await request.json()) as { planCode?: string },
    priceId = price[String(body.planCode || "")];
  if (!priceId) return NextResponse.json({ error: "plan_price_not_configured" }, { status: 409 });
  const origin = new URL(request.url).origin,
    form = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${origin}/?billing=success`,
      cancel_url: `${origin}/?billing=cancelled`,
      client_reference_id: context.academyId,
      customer_email: identity(request) || "",
      "metadata[academy_id]": context.academyId,
      "subscription_data[metadata][academy_id]": context.academyId,
    });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
      "idempotency-key": crypto.randomUUID(),
    },
    body: form,
  });
  const result = (await response.json()) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };
  if (!response.ok || !result.url)
    return NextResponse.json(
      {
        error: "checkout_creation_failed",
        message: result.error?.message || "Payment provider rejected the request.",
      },
      { status: 502 },
    );
  await env.DB.prepare(
    "INSERT INTO product_events (id,academy_id,actor_email,event_name,object_type,object_id,properties_json,occurred_at) VALUES (?,?,?,?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      context.academyId,
      identity(request),
      "checkout_created",
      "checkout_session",
      result.id,
      JSON.stringify({ planCode: body.planCode }),
      Date.now(),
    )
    .run();
  return NextResponse.json({ checkoutUrl: result.url, sessionId: result.id });
}
