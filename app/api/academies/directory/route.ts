import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { identity } from "../../../lib/access";
import { safeText } from "../../../lib/records";

export async function GET(request: NextRequest) {
  if (!identity(request)) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const q = safeText(request.nextUrl.searchParams.get("q"), 80),
    like = `%${q}%`;
  const rows = await env.DB.prepare(
    "SELECT p.academy_id AS academyId,p.display_name AS displayName,p.description,p.city,p.region,p.country_code AS countryCode,p.website,p.social_links_json AS socialLinksJson,p.team_affiliations_json AS teamAffiliationsJson,p.hours_json AS hoursJson,ROUND(AVG(CASE WHEN r.status='published' THEN r.rating END),1) AS rating,COUNT(CASE WHEN r.status='published' THEN 1 END) AS reviewCount FROM academy_profiles p LEFT JOIN academy_reviews r ON r.academy_id=p.academy_id WHERE p.public_status='published' AND (?='' OR p.display_name LIKE ? OR p.city LIKE ? OR p.region LIKE ?) GROUP BY p.academy_id ORDER BY p.display_name LIMIT 100",
  )
    .bind(q, like, like, like)
    .all();
  return NextResponse.json(rows.results);
}
