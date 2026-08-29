import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { identity } from "../../../lib/access";
const allowed = new Set(["image/jpeg", "image/png", "image/webp"]),
  maxBytes = 5 * 1024 * 1024;
async function record(email: string) {
  return env.DB.prepare(
    "SELECT avatar_object_key AS objectKey,avatar_content_type AS contentType FROM user_profiles WHERE user_email=?",
  )
    .bind(email)
    .first<{ objectKey: string | null; contentType: string | null }>();
}
export async function GET(request: NextRequest) {
  const email = identity(request);
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const row = await record(email);
  if (!row?.objectKey)
    return NextResponse.json({ error: "profile_photo_not_found" }, { status: 404 });
  const object = await env.BUCKET.get(row.objectKey);
  if (!object) return NextResponse.json({ error: "profile_photo_not_found" }, { status: 404 });
  return new NextResponse(object.body, {
    headers: {
      "content-type": row.contentType || "image/jpeg",
      "cache-control": "private, max-age=300",
      "x-content-type-options": "nosniff",
    },
  });
}
export async function PUT(request: NextRequest) {
  const email = identity(request);
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const profile = await env.DB.prepare(
    "SELECT user_email AS email,avatar_object_key AS objectKey FROM user_profiles WHERE user_email=?",
  )
    .bind(email)
    .first<{ email: string; objectKey: string | null }>();
  if (!profile) return NextResponse.json({ error: "individual_profile_required" }, { status: 409 });
  const form = await request.formData(),
    photo = form.get("photo");
  if (
    !(photo instanceof File) ||
    !allowed.has(photo.type) ||
    photo.size < 1 ||
    photo.size > maxBytes
  )
    return NextResponse.json({ error: "jpeg_png_or_webp_under_5mb_required" }, { status: 400 });
  const bytes = await photo.arrayBuffer(),
    key = `individual-profiles/${await crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(email))
      .then((x) =>
        Array.from(new Uint8Array(x))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
      )}/avatar-${crypto.randomUUID()}`;
  await env.BUCKET.put(key, bytes, {
    httpMetadata: { contentType: photo.type },
    customMetadata: { owner: email, kind: "profile-photo" },
  });
  const now = Date.now();
  await env.DB.prepare(
    "UPDATE user_profiles SET avatar_object_key=?,avatar_content_type=?,avatar_updated_at=?,updated_at=? WHERE user_email=?",
  )
    .bind(key, photo.type, now, now, email)
    .run();
  if (profile.objectKey && profile.objectKey !== key) await env.BUCKET.delete(profile.objectKey);
  return NextResponse.json(
    { status: "saved", avatarUrl: `/api/profile/photo?v=${now}` },
    { status: 201 },
  );
}
export async function DELETE(request: NextRequest) {
  const email = identity(request);
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const row = await record(email);
  if (row?.objectKey) await env.BUCKET.delete(row.objectKey);
  await env.DB.prepare(
    "UPDATE user_profiles SET avatar_object_key=NULL,avatar_content_type=NULL,avatar_updated_at=NULL,updated_at=? WHERE user_email=?",
  )
    .bind(Date.now(), email)
    .run();
  return NextResponse.json({ status: "removed" });
}
