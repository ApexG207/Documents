import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../lib/access";
import { rateLimit } from "../../lib/rate-limit";
import { CONSENT_GRANTED, MEDIA_CONSENT_SCOPES } from "../../lib/consent";

export async function POST(request: NextRequest) {
  const context = await authorize(request, "coach");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const throttle = await rateLimit(request, "media-upload", 5, 3600000);
  if (!throttle.allowed)
    return NextResponse.json(
      { error: "rate_limited", resetAt: throttle.resetAt },
      {
        status: 429,
        headers: { "retry-after": String(Math.ceil((throttle.resetAt - Date.now()) / 1000)) },
      },
    );
  const form = await request.formData();
  const file = form.get("video");
  const athleteId = String(form.get("athleteId") || "");
  const eventName = String(form.get("eventName") || "Competition");
  if (!(file instanceof File) || !file.type.startsWith("video/"))
    return NextResponse.json({ error: "video_required" }, { status: 400 });
  if (file.size > 250 * 1024 * 1024)
    return NextResponse.json({ error: "video_too_large", maxMb: 250 }, { status: 413 });
  const athlete = await env.DB.prepare(
    "SELECT birth_year as birthYear FROM athletes WHERE id=? AND academy_id=? AND active=1",
  )
    .bind(athleteId, context.academyId)
    .first<{ birthYear: number }>();
  if (!athlete) return NextResponse.json({ error: "athlete_not_found" }, { status: 404 });
  const age = new Date().getUTCFullYear() - athlete.birthYear;
  if (age < 18) {
    const consent = await env.DB.prepare(
      `SELECT id FROM consents WHERE athlete_id=? AND academy_id=? AND status=? AND scope IN (${MEDIA_CONSENT_SCOPES.map(() => "?").join(",")}) AND (expires_at IS NULL OR expires_at>?) LIMIT 1`,
    )
      .bind(athleteId, context.academyId, CONSENT_GRANTED, ...MEDIA_CONSENT_SCOPES, Date.now())
      .first();
    if (!consent) return NextResponse.json({ error: "guardian_consent_required" }, { status: 409 });
  }
  const now = Date.now();
  const policy = await env.DB.prepare(
    "SELECT id,delete_after_days AS deleteAfterDays FROM storage_policies WHERE academy_id=? AND status='active' ORDER BY updated_at DESC LIMIT 1",
  )
    .bind(context.academyId)
    .first<{ id: string; deleteAfterDays: number }>();
  const policyId = policy?.id || "rcoa-default-v1";
  const retentionUntil = now + (policy?.deleteAfterDays || 365) * 86400000;
  const mediaId = crypto.randomUUID();
  const objectKey = `tenant/${context.academyId}/athlete/${athleteId}/source/${mediaId}`;
  await env.BUCKET.put(objectKey, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: {
      academyId: context.academyId,
      athleteId,
      policyId,
      retentionUntil: String(retentionUntil),
    },
  });
  const evaluationId = crypto.randomUUID(),
    jobId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO media_objects (id,academy_id,athlete_id,object_key,kind,consent_scope,retention_until,retention_policy_id,storage_class,lifecycle_state,legal_hold,byte_size,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
    ).bind(
      mediaId,
      context.academyId,
      athleteId,
      objectKey,
      "competition_video",
      age < 18 ? "guardian-approved" : "athlete-authorized",
      retentionUntil,
      policyId,
      "standard",
      "active",
      0,
      file.size,
      now,
    ),
    env.DB.prepare(
      "INSERT INTO video_evaluations (id,academy_id,media_id,athlete_id,event_name,division,result,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    ).bind(
      evaluationId,
      context.academyId,
      mediaId,
      athleteId,
      eventName.slice(0, 100),
      String(form.get("division") || "").slice(0, 80),
      String(form.get("result") || "").slice(0, 30),
      "queued",
      now,
    ),
    env.DB.prepare(
      "INSERT INTO analysis_jobs (id,academy_id,evaluation_id,job_type,status,attempts,priority,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
    ).bind(
      jobId,
      context.academyId,
      evaluationId,
      "competition_analysis",
      "queued",
      0,
      50,
      now,
      now,
    ),
    env.DB.prepare(
      "INSERT INTO usage_meters (id,academy_id,metric,quantity,period_key,recorded_at) VALUES (?,?,?,?,?,?)",
    ).bind(
      crypto.randomUUID(),
      context.academyId,
      "video_bytes",
      file.size,
      new Date(now).toISOString().slice(0, 7),
      now,
    ),
    env.DB.prepare(
      "INSERT INTO product_events (id,academy_id,actor_email,event_name,object_type,object_id,properties_json,occurred_at) VALUES (?,?,?,?,?,?,?,?)",
    ).bind(
      crypto.randomUUID(),
      context.academyId,
      identity(request),
      "video_uploaded",
      "evaluation",
      evaluationId,
      JSON.stringify({ byteSize: file.size, contentType: file.type }),
      now,
    ),
  ]);
  return NextResponse.json(
    {
      mediaId,
      evaluationId,
      status: "queued",
      message: "Video secured. AI-assisted evaluation is queued for coach verification.",
    },
    { status: 202 },
  );
}

export async function DELETE(request: NextRequest) {
  const context = await authorize(request, "admin");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "media_id_required" }, { status: 400 });
  const media = await env.DB.prepare(
    "SELECT object_key as objectKey,athlete_id as athleteId,retention_policy_id as policyId,legal_hold as legalHold FROM media_objects WHERE id=? LIMIT 1",
  )
    .bind(id)
    .first<{ objectKey: string; athleteId: string; policyId: string | null; legalHold: number }>();
  if (!media) return NextResponse.json({ error: "media_not_found" }, { status: 404 });
  const hold = await env.DB.prepare(
    "SELECT id FROM legal_holds WHERE media_id=? AND academy_id=? AND status='active' LIMIT 1",
  )
    .bind(id, context.academyId)
    .first();
  if (media.legalHold || hold)
    return NextResponse.json(
      { error: "legal_hold_active", message: "Release the authorized legal hold before deletion." },
      { status: 409 },
    );
  const derivatives = await env.DB.prepare(
    "SELECT object_key as objectKey FROM media_derivatives WHERE source_media_id=? AND academy_id=?",
  )
    .bind(id, context.academyId)
    .all<{ objectKey: string }>();
  await Promise.all([
    env.BUCKET.delete(media.objectKey),
    ...derivatives.results.map((row) => env.BUCKET.delete(row.objectKey)),
  ]);
  const keyHash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(media.objectKey)),
    ),
  )
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  await env.DB.batch([
    env.DB.prepare("DELETE FROM video_evaluations WHERE media_id=? AND academy_id=?").bind(
      id,
      context.academyId,
    ),
    env.DB.prepare("DELETE FROM media_derivatives WHERE source_media_id=? AND academy_id=?").bind(
      id,
      context.academyId,
    ),
    env.DB.prepare("DELETE FROM media_objects WHERE id=?").bind(id),
    env.DB.prepare(
      "INSERT INTO deletion_receipts (id,academy_id,media_id,object_key_hash,policy_id,reason,deleted_by,outcome,deleted_at) VALUES (?,?,?,?,?,?,?,?,?)",
    ).bind(
      crypto.randomUUID(),
      context.academyId,
      id,
      keyHash,
      media.policyId,
      "admin_request",
      identity(request) || "unknown",
      "completed",
      Date.now(),
    ),
    env.DB.prepare(
      "INSERT INTO audit_events (id,academy_id,actor_email,action,object_type,object_id,outcome,created_at) VALUES (?,?,?,?,?,?,?,?)",
    ).bind(
      crypto.randomUUID(),
      context.academyId,
      identity(request),
      "delete",
      "competition_video",
      id,
      "completed",
      Date.now(),
    ),
  ]);
  return NextResponse.json({ id, status: "deleted" });
}
