import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../lib/access";
import { activeAthleteExists, safeText } from "../../lib/records";
export async function GET(r: NextRequest) {
  const context = await authorize(r, "viewer");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = await env.DB.prepare(
    "SELECT id,athlete_id as athleteId,domain,skill_name as skillName,level,evidence,assessed_by as assessedBy,assessed_at as assessedAt FROM skill_progress WHERE academy_id=? ORDER BY assessed_at DESC LIMIT 200",
  )
    .bind(context.academyId)
    .all();
  return NextResponse.json(rows.results);
}
export async function POST(r: NextRequest) {
  const context = await authorize(r, "coach");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = (await r.json()) as Record<string, unknown>;
  const athleteId = safeText(b.athleteId, 80);
  if (!(await activeAthleteExists(athleteId, context.academyId)))
    return NextResponse.json({ error: "athlete_not_found" }, { status: 404 });
  const skill = safeText(b.skillName, 100),
    evidence = safeText(b.evidence, 1000),
    level = Math.min(5, Math.max(1, Number(b.level || 1)));
  if (!skill || !evidence)
    return NextResponse.json({ error: "skill_and_evidence_required" }, { status: 400 });
  const id = crypto.randomUUID(),
    now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO skill_progress (id,academy_id,athlete_id,domain,skill_name,level,evidence,assessed_by,assessed_at) VALUES (?,?,?,?,?,?,?,?,?)",
    ).bind(
      id,
      context.academyId,
      athleteId,
      safeText(b.domain, 50) || "Technical",
      skill,
      level,
      evidence,
      identity(r),
      now,
    ),
    env.DB.prepare(
      "INSERT INTO product_events (id,academy_id,actor_email,event_name,object_type,object_id,properties_json,occurred_at) VALUES (?,?,?,?,?,?,?,?)",
    ).bind(
      crypto.randomUUID(),
      context.academyId,
      identity(r),
      "skill_assessed",
      "skill_progress",
      id,
      JSON.stringify({ level, domain: safeText(b.domain, 50) }),
      now,
    ),
  ]);
  return NextResponse.json({ id }, { status: 201 });
}
