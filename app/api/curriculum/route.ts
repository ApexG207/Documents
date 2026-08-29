import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize } from "../../lib/access";
import { safeText } from "../../lib/records";
export async function GET(r: NextRequest) {
  const context = await authorize(r, "viewer");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = await env.DB.prepare(
    "SELECT id,name,domain,rank_band as rankBand,required_level as requiredLevel FROM curriculum_items WHERE academy_id=? AND active=1 ORDER BY rank_band,domain,name",
  )
    .bind(context.academyId)
    .all();
  return NextResponse.json(rows.results);
}
export async function POST(r: NextRequest) {
  const context = await authorize(r, "admin");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = (await r.json()) as Record<string, unknown>;
  const name = safeText(b.name, 100),
    domain = safeText(b.domain, 50),
    rank = safeText(b.rankBand, 50),
    level = Math.min(5, Math.max(1, Number(b.requiredLevel || 1)));
  if (!name || !domain || !rank)
    return NextResponse.json({ error: "curriculum_fields_required" }, { status: 400 });
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO curriculum_items(id,academy_id,name,domain,rank_band,required_level,active,created_at)VALUES(?,?,?,?,?,?,1,?)",
  )
    .bind(id, context.academyId, name, domain, rank, level, Date.now())
    .run();
  return NextResponse.json({ id }, { status: 201 });
}
