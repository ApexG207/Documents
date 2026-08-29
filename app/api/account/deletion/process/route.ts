import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
const hash = async (value: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
export async function POST(request: NextRequest) {
  if (
    !env.MATIQ_AUTOMATION_KEY ||
    request.headers.get("authorization") !== `Bearer ${env.MATIQ_AUTOMATION_KEY}`
  )
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const now = Date.now(),
    due = await env.DB.prepare(
      "SELECT id,user_email AS email FROM account_deletion_requests WHERE status='scheduled' AND scheduled_for<=? LIMIT 25",
    )
      .bind(now)
      .all<{ id: string; email: string }>(),
    completed: string[] = [];
  for (const row of due.results) {
    const alias = `deleted-${(await hash(row.email)).slice(0, 16)}@deleted.matiq`;
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE account_deletion_requests SET status='processing',updated_at=? WHERE id=? AND status='scheduled'",
      ).bind(now, row.id),
      env.DB.prepare(
        "UPDATE user_profiles SET display_name='Deleted account',goals=NULL,concerns=NULL,strengths=NULL,weaknesses=NULL,opportunities=NULL,social_links_json='{}',team_affiliations_json='[]',visibility='private',booking_enabled=0,avatar_object_key=NULL,avatar_content_type=NULL,avatar_updated_at=NULL,updated_at=? WHERE lower(user_email)=?",
      ).bind(now, row.email),
      env.DB.prepare("UPDATE memberships SET email=?,status='deleted' WHERE lower(email)=?").bind(
        alias,
        row.email,
      ),
      env.DB.prepare(
        "UPDATE academy_connections SET requester_email=?,message=NULL,status='deleted',updated_at=? WHERE lower(requester_email)=?",
      ).bind(alias, now, row.email),
      env.DB.prepare(
        "UPDATE training_bookings SET athlete_email=?,message=NULL,status='deleted',updated_at=? WHERE lower(athlete_email)=?",
      ).bind(alias, now, row.email),
      env.DB.prepare(
        "UPDATE account_deletion_requests SET user_email=?,status='completed',completed_at=?,updated_at=? WHERE id=?",
      ).bind(alias, now, now, row.id),
    ]);
    completed.push(row.id);
  }
  return NextResponse.json({ considered: due.results.length, completed: completed.length });
}
