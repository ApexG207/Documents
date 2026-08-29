import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { identity } from "../../../lib/access";
export async function GET(request: NextRequest) {
  const email = identity(request);
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const portfolio = await env.DB.prepare(
    "SELECT * FROM competition_portfolios WHERE owner_email=? LIMIT 1",
  )
    .bind(email)
    .first<{ id: string }>();
  if (!portfolio) return NextResponse.json({ error: "portfolio_not_found" }, { status: 404 });
  const [results, profiles, evidence, verification] = await env.DB.batch([
    env.DB.prepare(
      "SELECT * FROM competition_results WHERE portfolio_id=? ORDER BY event_date",
    ).bind(portfolio.id),
    env.DB.prepare(
      "SELECT * FROM external_competition_profiles WHERE portfolio_id=? ORDER BY provider",
    ).bind(portfolio.id),
    env.DB.prepare(
      "SELECT id,result_id,file_name,content_type,byte_size,sha256,evidence_type,source_provider,status,created_at FROM competition_evidence WHERE portfolio_id=? ORDER BY created_at",
    ).bind(portfolio.id),
    env.DB.prepare(
      "SELECT * FROM record_verification_events WHERE portfolio_id=? ORDER BY created_at",
    ).bind(portfolio.id),
  ]);
  return new NextResponse(
    JSON.stringify(
      {
        format: "matiq-competition-portfolio-v1",
        exportedAt: Date.now(),
        portfolio,
        results: results.results,
        externalProfiles: profiles.results,
        evidenceMetadata: evidence.results,
        verificationEvents: verification.results,
      },
      null,
      2,
    ),
    {
      headers: {
        "content-type": "application/json",
        "content-disposition": "attachment; filename=matiq-competition-portfolio.json",
        "cache-control": "no-store",
      },
    },
  );
}
