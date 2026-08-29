import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { identity } from "../../lib/access";
import { safeText } from "../../lib/records";
export async function POST(request: NextRequest) {
  const email = identity(request);
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const b = (await request.json()) as Record<string, unknown>,
    academyId = safeText(b.academyId, 80),
    rating = Math.round(Number(b.rating)),
    title = safeText(b.title, 100),
    body = safeText(b.body, 1500),
    visitType = safeText(b.visitType, 40);
  if (!academyId || rating < 1 || rating > 5 || !title || body.length < 20 || !visitType)
    return NextResponse.json({ error: "valid_review_required" }, { status: 400 });
  const duplicate = await env.DB.prepare(
    "SELECT id FROM academy_reviews WHERE academy_id=? AND author_email=? AND created_at>? LIMIT 1",
  )
    .bind(academyId, email, Date.now() - 30 * 86400000)
    .first();
  if (duplicate) return NextResponse.json({ error: "review_frequency_limited" }, { status: 409 });
  const id = crypto.randomUUID(),
    now = Date.now();
  await env.DB.prepare(
    "INSERT INTO academy_reviews (id,academy_id,author_email,rating,title,body,visit_type,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'pending',?,?)",
  )
    .bind(id, academyId, email, rating, title, body, visitType, now, now)
    .run();
  return NextResponse.json({ id, status: "pending_moderation" }, { status: 201 });
}
