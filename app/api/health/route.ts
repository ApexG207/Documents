import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({ service: "matiq", status: "operational", ai: Boolean(env.OPENAI_API_KEY), database: Boolean(env.DB), media: Boolean(env.BUCKET), safetyMode: "youth-governed" });
}
