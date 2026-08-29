import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { identity } from "../../../lib/access";
const kinds = new Set(["profile", "academy", "review", "message", "media", "competition_result"]),
  reasons = new Set([
    "harassment",
    "bullying",
    "sexual_content",
    "violence",
    "hate",
    "impersonation",
    "privacy",
    "spam",
    "minor_safety",
    "other",
  ]);
export async function POST(request: NextRequest) {
  const email = identity(request);
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>,
    subjectType = String(body.subjectType || ""),
    subjectId = String(body.subjectId || "").slice(0, 120),
    reason = String(body.reason || "");
  if (!kinds.has(subjectType) || !subjectId || !reasons.has(reason))
    return NextResponse.json({ error: "invalid_report" }, { status: 400 });
  const now = Date.now(),
    id = crypto.randomUUID(),
    priority =
      reason === "minor_safety" || reason === "sexual_content" || reason === "violence"
        ? "urgent"
        : "standard";
  await env.DB.prepare(
    "INSERT INTO content_reports(id,reporter_email,subject_type,subject_id,reason,details,status,priority,created_at,updated_at)VALUES(?,?,?,?,?,?,'received',?,?,?)",
  )
    .bind(
      id,
      email,
      subjectType,
      subjectId,
      reason,
      String(body.details || "").slice(0, 1500) || null,
      priority,
      now,
      now,
    )
    .run();
  return NextResponse.json({ id, status: "received", priority }, { status: 201 });
}
