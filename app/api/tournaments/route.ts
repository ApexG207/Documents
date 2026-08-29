import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize } from "../../lib/access";
export async function POST(request: NextRequest) {
  const context = await authorize(request, "coach");
  if (!context) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = (await request.json()) as { name: string; date: string; ruleset: string };
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO tournaments (id,academy_id,name,event_date,ruleset,status,created_at) VALUES (?,?,?,?,?,'planned',?)",
  )
    .bind(
      id,
      context.academyId,
      String(b.name).slice(0, 100),
      new Date(b.date).getTime(),
      String(b.ruleset).slice(0, 60),
      Date.now(),
    )
    .run();
  return NextResponse.json({ id }, { status: 201 });
}
