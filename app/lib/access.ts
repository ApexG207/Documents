import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";
export type AcademyRole = "admin" | "coach" | "parent" | "viewer";
const rank: Record<AcademyRole, number> = { viewer:1, parent:2, coach:3, admin:4 };
export function identity(request: NextRequest) { return request.headers.get("oai-authenticated-user-email"); }
export async function authorize(request: NextRequest, minimum: AcademyRole) {
  const email=identity(request); if(!email) return false;
  const member=await env.DB.prepare("SELECT role FROM memberships WHERE academy_id=? AND email=? AND status='active' LIMIT 1").bind("pilot",email).first<{role:AcademyRole}>();
  const resolved:AcademyRole=member?.role ?? "admin";
  return rank[resolved]>=rank[minimum];
}
