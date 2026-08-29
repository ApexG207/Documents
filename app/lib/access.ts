import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";
import { governanceUnlocked } from "./governance";
export type AcademyRole = "admin" | "coach" | "parent" | "viewer";
const rank: Record<AcademyRole, number> = { viewer:1, parent:2, coach:3, admin:4 };
function isAcademyRole(value: unknown): value is AcademyRole {
  return typeof value === "string" && value in rank;
}
export function identity(request: NextRequest) {
  return request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase() || null;
}
export type AcademyContext={academyId:string;academyName:string;role:AcademyRole};
export async function academyContexts(request:NextRequest){const email=identity(request);if(!email)return [] as AcademyContext[];const rows=await env.DB.prepare("SELECT m.academy_id AS academyId,a.name AS academyName,m.role FROM memberships m JOIN academies a ON a.id=m.academy_id WHERE m.email=? AND m.status='active' ORDER BY a.name").bind(email).all<{academyId:string;academyName:string;role:string}>();return rows.results.filter((row):row is AcademyContext=>isAcademyRole(row.role));}
export async function selectedAcademy(request:NextRequest,minimum:AcademyRole="viewer"){const requested=request.headers.get("x-matiq-academy-id")||request.cookies.get("matiq_academy")?.value;if(await governanceUnlocked(request)){const row=requested?await env.DB.prepare("SELECT id AS academyId,name AS academyName FROM academies WHERE id=? LIMIT 1").bind(requested).first<{academyId:string;academyName:string}>():await env.DB.prepare("SELECT id AS academyId,name AS academyName FROM academies ORDER BY created_at LIMIT 1").first<{academyId:string;academyName:string}>();if(row)return {...row,role:"admin" as AcademyRole};}const contexts=await academyContexts(request),selected=(requested&&contexts.find(x=>x.academyId===requested))||contexts[0];return selected&&rank[selected.role]>=rank[minimum]?selected:null;}
export async function authorize(request: NextRequest, minimum: AcademyRole) {
  const email=identity(request); if(!email) return false;
  if(await governanceUnlocked(request))return true;
  let member=await env.DB.prepare("SELECT role FROM memberships WHERE academy_id=? AND lower(email)=? AND status='active' LIMIT 1").bind("pilot",email).first<{role:string}>();
  // A newly created private Site has an authenticated owner but no tenant row.
  // Atomically bootstrap only the first active member; all later access remains
  // membership- and role-governed.
  const bootstrapOwner=(env as unknown as Record<string,string|undefined>).MATIQ_BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
  if(!member&&bootstrapOwner===email){
    const now=Date.now();
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO academies(id,name,plan,created_at) VALUES ('pilot','Apex Training Center','pilot',?)").bind(now),
      env.DB.prepare("INSERT INTO memberships(id,academy_id,email,role,status,created_at) SELECT ?,'pilot',?,'admin','active',? WHERE NOT EXISTS (SELECT 1 FROM memberships WHERE academy_id='pilot' AND status='active')").bind(crypto.randomUUID(),email,now)
    ]);
    member=await env.DB.prepare("SELECT role FROM memberships WHERE academy_id=? AND lower(email)=? AND status='active' LIMIT 1").bind("pilot",email).first<{role:string}>();
  }
  if (!isAcademyRole(member?.role)) return false;
  return rank[member.role]>=rank[minimum];
}
