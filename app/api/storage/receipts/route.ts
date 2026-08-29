import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize } from "../../../lib/access";
export async function GET(request: NextRequest) {
  const context = await authorize(request, "admin");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = await env.DB.prepare(
    "SELECT id,media_id AS mediaId,object_key_hash AS objectKeyHash,policy_id AS policyId,reason,deleted_by AS deletedBy,outcome,deleted_at AS deletedAt FROM deletion_receipts WHERE academy_id=? ORDER BY deleted_at DESC LIMIT 200",
  )
    .bind(context.academyId)
    .all();
  return NextResponse.json({ receipts: rows.results });
}
