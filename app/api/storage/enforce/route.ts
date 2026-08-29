import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../../lib/access";

const hash = async (value: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
export async function POST(request: NextRequest) {
  const context = await authorize(request, "admin");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const now = Date.now(),
    actor = identity(request) || "unknown";
  const due = await env.DB.prepare(
    "SELECT id,object_key AS objectKey,retention_policy_id AS policyId FROM media_objects WHERE retention_until IS NOT NULL AND retention_until<=? AND legal_hold=0 AND lifecycle_state<>'deleted' AND NOT EXISTS (SELECT 1 FROM legal_holds WHERE legal_holds.media_id=media_objects.id AND legal_holds.status='active') AND media_objects.academy_id=? LIMIT 100",
  )
    .bind(now, context.academyId)
    .all<{ id: string; objectKey: string; policyId: string | null }>();
  const deleted: string[] = [];
  const failed: string[] = [];
  for (const media of due.results) {
    try {
      const derivatives = await env.DB.prepare(
        "SELECT object_key AS objectKey FROM media_derivatives WHERE source_media_id=?",
      )
        .bind(media.id)
        .all<{ objectKey: string }>();
      await Promise.all([
        env.BUCKET.delete(media.objectKey),
        ...derivatives.results.map((row) => env.BUCKET.delete(row.objectKey)),
      ]);
      await env.DB.batch([
        env.DB.prepare("DELETE FROM media_derivatives WHERE source_media_id=?").bind(media.id),
        env.DB.prepare(
          "UPDATE media_objects SET lifecycle_state='deleted',deleted_at=? WHERE id=? AND academy_id=?",
        ).bind(now, media.id),
        env.DB.prepare(
          "INSERT INTO deletion_receipts (id,academy_id,media_id,object_key_hash,policy_id,reason,deleted_by,outcome,deleted_at) VALUES (?,?,?,?,?,?,?,?,?)",
        ).bind(
          crypto.randomUUID(),
          context.academyId,
          media.id,
          await hash(media.objectKey),
          media.policyId,
          "retention_expired",
          actor,
          "completed",
          now,
        ),
      ]);
      deleted.push(media.id);
    } catch {
      failed.push(media.id);
    }
  }
  await env.DB.prepare(
    "INSERT INTO audit_events (id,academy_id,actor_email,action,object_type,object_id,outcome,created_at) VALUES (?,?,?,?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      context.academyId,
      actor,
      "enforce_retention",
      "storage_batch",
      null,
      failed.length ? "partial" : "completed",
      now,
    )
    .run();
  return NextResponse.json({
    scanned: due.results.length,
    deleted: deleted.length,
    failed: failed.length,
    deletedIds: deleted,
    failedIds: failed,
  });
}
