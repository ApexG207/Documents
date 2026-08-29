import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { identity } from "../../lib/access";
import { affiliations, parsedJson, safeText, socialLinks } from "../../lib/records";

export async function GET(request: NextRequest) {
  const email = identity(request);
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const profile = await env.DB.prepare(
    "SELECT user_email AS userEmail,display_name AS displayName,home_academy_id AS homeAcademyId,birth_year AS birthYear,belt,location_text AS locationText,goals,concerns,strengths,weaknesses,opportunities,social_links_json AS socialLinksJson,team_affiliations_json AS teamAffiliationsJson,visibility,booking_enabled AS bookingEnabled,avatar_object_key AS avatarObjectKey,avatar_updated_at AS avatarUpdatedAt,updated_at AS updatedAt FROM user_profiles WHERE user_email=?",
  )
    .bind(email)
    .first<Record<string, unknown>>();
  if (profile) {
    profile.avatarUrl = profile.avatarObjectKey
      ? `/api/profile/photo?v=${Number(profile.avatarUpdatedAt || 0)}`
      : null;
    profile.socialLinks = parsedJson(profile.socialLinksJson, {});
    profile.teamAffiliations = parsedJson(profile.teamAffiliationsJson, []);
    delete profile.avatarObjectKey;
    delete profile.socialLinksJson;
    delete profile.teamAffiliationsJson;
  }
  return NextResponse.json(
    profile || {
      userEmail: email,
      visibility: "private",
      bookingEnabled: false,
      avatarUrl: null,
      socialLinks: {},
      teamAffiliations: [],
    },
  );
}
export async function PUT(request: NextRequest) {
  const email = identity(request);
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const b = (await request.json()) as Record<string, unknown>,
    displayName = safeText(b.displayName, 80);
  if (displayName.length < 2)
    return NextResponse.json({ error: "display_name_required" }, { status: 400 });
  const year = Number(b.birthYear),
    currentYear = new Date().getUTCFullYear(),
    birthYear = Number.isInteger(year) && year >= 1920 && year <= currentYear ? year : null,
    now = Date.now(),
    visibility = new Set(["private", "connections", "public"]).has(String(b.visibility))
      ? String(b.visibility)
      : "private",
    links = JSON.stringify(socialLinks(b)),
    teams = JSON.stringify(affiliations(b.teamAffiliations));
  await env.DB.prepare(
    "INSERT INTO user_profiles (user_email,display_name,home_academy_id,birth_year,belt,location_text,goals,concerns,strengths,weaknesses,opportunities,social_links_json,team_affiliations_json,visibility,booking_enabled,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_email) DO UPDATE SET display_name=excluded.display_name,home_academy_id=excluded.home_academy_id,birth_year=excluded.birth_year,belt=excluded.belt,location_text=excluded.location_text,goals=excluded.goals,concerns=excluded.concerns,strengths=excluded.strengths,weaknesses=excluded.weaknesses,opportunities=excluded.opportunities,social_links_json=excluded.social_links_json,team_affiliations_json=excluded.team_affiliations_json,visibility=excluded.visibility,booking_enabled=excluded.booking_enabled,updated_at=excluded.updated_at",
  )
    .bind(
      email,
      displayName,
      safeText(b.homeAcademyId, 80) || null,
      birthYear,
      safeText(b.belt, 40) || null,
      safeText(b.locationText, 120) || null,
      safeText(b.goals, 1500) || null,
      safeText(b.concerns, 1500) || null,
      safeText(b.strengths, 1500) || null,
      safeText(b.weaknesses, 1500) || null,
      safeText(b.opportunities, 1500) || null,
      links,
      teams,
      visibility,
      b.bookingEnabled === true || b.bookingEnabled === "true" ? 1 : 0,
      now,
      now,
    )
    .run();
  return NextResponse.json({
    userEmail: email,
    status: "active",
    academyApprovalRequired: false,
    socialLinks: JSON.parse(links),
    teamAffiliations: JSON.parse(teams),
    updatedAt: now,
  });
}
