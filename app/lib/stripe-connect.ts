import { env } from "cloudflare:workers";

type Json = Record<string, unknown>;
const secret = () => {
  if (!env.STRIPE_SECRET_KEY) throw new Error("stripe_not_configured");
  return env.STRIPE_SECRET_KEY;
};
export async function stripeRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${secret()}`,
      "content-type": "application/x-www-form-urlencoded",
      ...(init.headers || {}),
    },
  });
  const data = (await response.json()) as Json;
  if (!response.ok)
    throw new Error(String((data.error as Json | undefined)?.message || "stripe_request_failed"));
  return data;
}
const form = (input: Record<string, string>) => new URLSearchParams(input);
export async function createRecipientAccount(email: string, academyId: string) {
  return stripeRequest("/v1/accounts", {
    method: "POST",
    headers: { "Idempotency-Key": `academy-account-${academyId}` },
    body: form({
      email,
      "metadata[academy_id]": academyId,
      "controller[stripe_dashboard][type]": "express",
      "controller[fees][payer]": "application",
      "controller[losses][payments]": "application",
      "capabilities[transfers][requested]": "true",
    }),
  });
}
export async function createEmbeddedSession(accountId: string) {
  return stripeRequest("/v1/account_sessions", {
    method: "POST",
    body: form({
      account: accountId,
      "components[account_onboarding][enabled]": "true",
      "components[account_management][enabled]": "true",
      "components[notification_banner][enabled]": "true",
      "components[payouts][enabled]": "true",
      "components[balances][enabled]": "true",
    }),
  });
}
export async function createExpressLoginLink(accountId: string) {
  return stripeRequest(`/v1/accounts/${encodeURIComponent(accountId)}/login_links`, {
    method: "POST",
    body: form({}),
  });
}
export async function createTransfer(
  amount: number,
  currency: string,
  destination: string,
  cohortId: string,
  academyId: string,
) {
  return stripeRequest("/v1/transfers", {
    method: "POST",
    headers: { "Idempotency-Key": `pool-${cohortId}-${academyId}` },
    body: form({
      amount: String(amount),
      currency,
      destination,
      "metadata[cohort_id]": cohortId,
      "metadata[academy_id]": academyId,
    }),
  });
}
export async function retrieveBalanceTransaction(id: string) {
  return stripeRequest(`/v1/balance_transactions/${encodeURIComponent(id)}`);
}
