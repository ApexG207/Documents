import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize } from "../../lib/access";

/**
 * Measure actual tenant-scoping violations in stored data.
 *
 * G3 previously passed when the operator set MATIQ_TENANT_ISOLATION_V2="enforced",
 * which asserted nothing about the code: the gate reported GO whether or not the
 * API resolved academies from membership, and reported HOLD once it did. Academy
 * context is now membership-derived on every route and covered by cross-tenant
 * tests in CI, so the build proves the property this gate used to claim.
 *
 * What a running system can still add is whether the data itself is well-formed:
 * rows that carry no tenant, or memberships pointing at academies that no longer
 * exist, are the residue that would let a scoped query miss or leak records.
 */
async function tenantIntegrity() {
  const row = await env.DB.prepare(
    "SELECT (SELECT COUNT(*) FROM media_objects WHERE academy_id IS NULL) AS orphanMedia,(SELECT COUNT(*) FROM consents WHERE academy_id IS NULL) AS orphanConsents,(SELECT COUNT(*) FROM memberships m WHERE NOT EXISTS (SELECT 1 FROM academies a WHERE a.id=m.academy_id)) AS orphanMemberships",
  ).first<{ orphanMedia: number; orphanConsents: number; orphanMemberships: number }>();
  const orphanMedia = Number(row?.orphanMedia || 0);
  const orphanConsents = Number(row?.orphanConsents || 0);
  const orphanMemberships = Number(row?.orphanMemberships || 0);
  const total = orphanMedia + orphanConsents + orphanMemberships;
  return {
    pass: total === 0,
    evidence:
      total === 0
        ? "all media, consent and membership records carry a resolvable academy"
        : `untenanted records: ${orphanMedia} media, ${orphanConsents} consent, ${orphanMemberships} membership`,
  };
}

export async function GET(r: NextRequest) {
  if (!(await authorize(r, "admin")))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const e = env as unknown as Record<string, string | undefined>;
  const isolation = await tenantIntegrity();
  const checks = [
    {
      gate: "G1",
      name: "Identity, guardian and access control",
      pass: Boolean(e.MATIQ_BOOTSTRAP_OWNER_EMAIL),
      evidence: e.MATIQ_BOOTSTRAP_OWNER_EMAIL
        ? "bootstrap authority configured"
        : "bootstrap owner not configured",
    },
    {
      gate: "G2",
      name: "Verification email operations",
      pass: Boolean(e.RESEND_API_KEY && e.MATIQ_FROM_EMAIL),
      evidence:
        e.RESEND_API_KEY && e.MATIQ_FROM_EMAIL
          ? "provider and sender configured"
          : "transactional email incomplete",
    },
    {
      gate: "G3",
      name: "Multi-tenant isolation",
      pass: isolation.pass,
      evidence: isolation.evidence,
    },
    {
      gate: "G4",
      name: "Revenue and legal operations",
      pass: Boolean(e.STRIPE_SECRET_KEY && e.STRIPE_WEBHOOK_SECRET),
      evidence:
        e.STRIPE_SECRET_KEY && e.STRIPE_WEBHOOK_SECRET
          ? "billing configured"
          : "billing credentials incomplete",
    },
    {
      gate: "G5",
      name: "Controlled beta authority",
      pass: e.MATIQ_BETA_APPROVED === "true",
      evidence: e.MATIQ_BETA_APPROVED === "true" ? "beta approved" : "cohort approval not recorded",
    },
  ];
  const ready = checks.every((x) => x.pass);
  return NextResponse.json(
    {
      decision: ready ? "GO" : "HOLD",
      ready,
      score: Math.round((checks.filter((x) => x.pass).length / checks.length) * 100),
      checks,
      assessedAt: Date.now(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
