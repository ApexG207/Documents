import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
export async function POST(request: NextRequest) {
  const body = await request.json() as { focus?: string; days?: number };
  const approvedFocuses = new Set(["positional control","guard retention","passing chains","top control","reset discipline","competition composure","decision quality"]);
  const requestedFocus = String(body.focus ?? "positional control").toLowerCase();
  const focus = approvedFocuses.has(requestedFocus) ? requestedFocus : "positional control";
  const days = Math.min(Math.max(Number(body.days ?? 7), 3), 14);
  const fallback = `${days}-day emphasis: establish one measurable ${focus} behavior, use constraint rounds at age-appropriate intensity, capture two coach observations, and conduct a short athlete reflection. Maintain normal hydration and nutrition; require coach and parent approval.`;
  if (!env.OPENAI_API_KEY) return NextResponse.json({ brief: fallback, mode: "baseline" });
  try {
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: "gpt-5.4-mini", input: [{ role: "system", content: "You are a youth jiu-jitsu coaching assistant. Produce one concise, development-first intervention. Do not give medical advice, weight-cut instructions, diagnoses, or guarantees. Use anonymized performance data only. Require adult coach approval." }, { role: "user", content: `Build a ${days}-day intervention for the performance focus: ${focus}. Include objective, two drills, one constraint round, one measure, and a parent-facing note.` }], max_output_tokens: 260 }) });
    if (!response.ok) throw new Error("provider_error");
    const data = await response.json() as { output_text?: string };
    return NextResponse.json({ brief: data.output_text || fallback, mode: "ai", review: "coach-required" });
  } catch { return NextResponse.json({ brief: fallback, mode: "baseline" }); }
}
