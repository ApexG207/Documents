import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";

export function GET() {
  const database = Boolean(env.DB);
  const media = Boolean(env.BUCKET);
  const identity = Boolean((env as unknown as Record<string, unknown>).MATIQ_BOOTSTRAP_OWNER_EMAIL);
  const email = Boolean((env as unknown as Record<string, unknown>).RESEND_API_KEY && (env as unknown as Record<string, unknown>).MATIQ_FROM_EMAIL);
  const ai = Boolean(env.OPENAI_API_KEY);
  const billing = Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
  const automation = Boolean(env.MATIQ_AUTOMATION_KEY);
  const tenantIsolation = (env as unknown as Record<string, string | undefined>).MATIQ_TENANT_ISOLATION_V2 === "enforced";

  const requiredCore = { database, media, identity, tenantIsolation };
  const operational = Object.values(requiredCore).every(Boolean);

  return NextResponse.json(
    {
      service: "matiq",
      product: "MatIQ Jiu-Jitsu Intelligence Training Aid",
      status: operational ? "operational" : "degraded",
      version: "3.0.0-beta.1",
      releaseChannel: "controlled-beta",
      checkedAt: new Date().toISOString(),
      core: requiredCore,
      integrations: { email, ai, billing, automation },
      safetyMode: "age-aware-governed",
    },
    {
      status: operational ? 200 : 503,
      headers: {
        "cache-control": "no-store, max-age=0",
        "content-type": "application/json; charset=utf-8",
      },
    },
  );
}
