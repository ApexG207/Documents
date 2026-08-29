import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { APP_VERSION } from "../../lib/version";

export function GET() {
  const database = Boolean(env.DB);
  const media = Boolean(env.BUCKET);
  const identity = Boolean((env as unknown as Record<string, unknown>).MATIQ_BOOTSTRAP_OWNER_EMAIL);
  const email = Boolean(
    (env as unknown as Record<string, unknown>).RESEND_API_KEY &&
      (env as unknown as Record<string, unknown>).MATIQ_FROM_EMAIL,
  );
  const ai = Boolean(env.OPENAI_API_KEY);
  const billing = Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
  const automation = Boolean(env.MATIQ_AUTOMATION_KEY);
  // Tenant isolation is a property of the code, proven by the cross-tenant tests
  // in CI, not a runtime binding. It was previously gated on an environment
  // variable, so an unset value reported the service degraded while isolation was
  // in fact enforced. Data-level tenant integrity is reported by /api/beta-readiness.
  const requiredCore = { database, media, identity };
  const operational = Object.values(requiredCore).every(Boolean);

  return NextResponse.json(
    {
      service: "matiq",
      product: "MatIQ Jiu-Jitsu Intelligence Training Aid",
      status: operational ? "operational" : "degraded",
      version: APP_VERSION,
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
