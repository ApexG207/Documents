import { NextRequest, NextResponse } from "next/server";
import { academyContexts, identity, selectedAcademy } from "../../lib/access";
export async function GET(request: NextRequest) {
  if (!identity(request)) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({
    selected: await selectedAcademy(request),
    academies: await academyContexts(request),
  });
}
export async function POST(request: NextRequest) {
  if (!identity(request)) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await request.json()) as { academyId?: string },
    allowed = (await academyContexts(request)).some((x) => x.academyId === body.academyId);
  if (!allowed) return NextResponse.json({ error: "membership_required" }, { status: 403 });
  const response = NextResponse.json({ academyId: body.academyId, status: "selected" });
  response.cookies.set("matiq_academy", String(body.academyId), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 31536000,
  });
  return response;
}
