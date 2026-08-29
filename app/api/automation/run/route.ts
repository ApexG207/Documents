import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { PLATFORM_ACADEMY_ID } from "../../../lib/access";
const authorized = (request: NextRequest) =>
  Boolean(
    env.MATIQ_AUTOMATION_KEY &&
      request.headers.get("x-matiq-automation-key") === env.MATIQ_AUTOMATION_KEY,
  );
const hash = async (value: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const now = Date.now(),
    coldBefore = now - 90 * 86400000,
    expired = now;
  const cold = await env.DB.prepare(
    "UPDATE media_objects SET storage_class='infrequent' WHERE created_at<=? AND lifecycle_state='active' AND storage_class='standard'",
  )
    .bind(coldBefore)
    .run();
  const due = await env.DB.prepare(
    "SELECT id,academy_id AS academyId,object_key AS objectKey,retention_policy_id AS policyId FROM media_objects WHERE retention_until<=? AND legal_hold=0 AND lifecycle_state<>'deleted' AND NOT EXISTS (SELECT 1 FROM legal_holds WHERE legal_holds.media_id=media_objects.id AND legal_holds.status='active') LIMIT 100",
  )
    .bind(expired)
    .all<{ id: string; academyId: string | null; objectKey: string; policyId: string | null }>();
  let deleted = 0,
    failed = 0;
  for (const item of due.results) {
    try {
      await env.BUCKET.delete(item.objectKey);
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE media_objects SET lifecycle_state='deleted',deleted_at=? WHERE id=?",
        ).bind(now, item.id),
        env.DB.prepare(
          "INSERT INTO deletion_receipts (id,academy_id,media_id,object_key_hash,policy_id,reason,deleted_by,outcome,deleted_at) VALUES (?,?,?,?,?,?,?,?,?)",
        ).bind(
          crypto.randomUUID(),
          item.academyId ?? PLATFORM_ACADEMY_ID,
          item.id,
          await hash(item.objectKey),
          item.policyId,
          "retention_expired",
          "system:automation",
          "completed",
          now,
        ),
      ]);
      deleted++;
    } catch {
      failed++;
    }
  }
  const staleJobs = await env.DB.prepare(
    "UPDATE analysis_jobs SET status='queued',lease_until=NULL,updated_at=?,error_code='lease_recovered' WHERE status='processing' AND lease_until<? AND attempts<3",
  )
    .bind(now, now)
    .run();
  await env.DB.prepare(
    "INSERT INTO product_events (id,academy_id,actor_email,event_name,object_type,object_id,properties_json,occurred_at) VALUES (?,?,?,?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      PLATFORM_ACADEMY_ID,
      "system:automation",
      "scheduled_operations_completed",
      "automation_run",
      null,
      JSON.stringify({
        cold: Number(cold.meta.changes || 0),
        deleted,
        failed,
        recoveredJobs: Number(staleJobs.meta.changes || 0),
      }),
      now,
    )
    .run();
  return NextResponse.json({
    status: failed ? "partial" : "completed",
    coldTransitioned: Number(cold.meta.changes || 0),
    deleted,
    failed,
    recoveredJobs: Number(staleJobs.meta.changes || 0),
  });
}
