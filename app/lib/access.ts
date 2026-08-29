import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";
import { governanceUnlocked } from "./governance";
export type AcademyRole = "admin" | "coach" | "parent" | "viewer";
const rank: Record<AcademyRole, number> = { viewer: 1, parent: 2, coach: 3, admin: 4 };
function isAcademyRole(value: unknown): value is AcademyRole {
  return typeof value === "string" && value in rank;
}
export function identity(request: NextRequest) {
  return request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase() || null;
}
export type AcademyContext = { academyId: string; academyName: string; role: AcademyRole };
export async function academyContexts(request: NextRequest) {
  const email = identity(request);
  if (!email) return [] as AcademyContext[];
  const rows = await env.DB.prepare(
    "SELECT m.academy_id AS academyId,a.name AS academyName,m.role FROM memberships m JOIN academies a ON a.id=m.academy_id WHERE m.email=? AND m.status='active' ORDER BY a.name",
  )
    .bind(email)
    .all<{ academyId: string; academyName: string; role: string }>();
  return rows.results.filter((row): row is AcademyContext => isAcademyRole(row.role));
}
export async function selectedAcademy(request: NextRequest, minimum: AcademyRole = "viewer") {
  const requested =
    request.headers.get("x-matiq-academy-id") || request.cookies.get("matiq_academy")?.value;
  if (await governanceUnlocked(request)) {
    const row = requested
      ? await env.DB.prepare(
          "SELECT id AS academyId,name AS academyName FROM academies WHERE id=? LIMIT 1",
        )
          .bind(requested)
          .first<{ academyId: string; academyName: string }>()
      : await env.DB.prepare(
          "SELECT id AS academyId,name AS academyName FROM academies ORDER BY created_at LIMIT 1",
        ).first<{ academyId: string; academyName: string }>();
    if (row) return { ...row, role: "admin" as AcademyRole };
  }
  const contexts = await academyContexts(request),
    selected = (requested && contexts.find((x) => x.academyId === requested)) || contexts[0];
  return selected && rank[selected.role] >= rank[minimum] ? selected : null;
}
const BOOTSTRAP_ACADEMY_ID = "pilot";

/**
 * Tenant identifier for platform-level records that belong to no single academy
 * (for example the summary row a scheduled sweep writes once per run). It is
 * deliberately not a real academy id so per-tenant queries never return it.
 */
export const PLATFORM_ACADEMY_ID = "system";

/**
 * First-run seeding for a private Site whose owner is authenticated but has no
 * tenant row yet. Only the configured bootstrap owner can trigger it, and the
 * membership insert is guarded by NOT EXISTS so it can create the first active
 * member exactly once. Every later access decision is membership-governed.
 */
async function bootstrapOwnerAcademy(email: string) {
  const bootstrapOwner = (
    env as unknown as Record<string, string | undefined>
  ).MATIQ_BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
  if (bootstrapOwner !== email) return;
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT OR IGNORE INTO academies(id,name,plan,created_at) VALUES (?,'Apex Training Center','pilot',?)",
    ).bind(BOOTSTRAP_ACADEMY_ID, now),
    env.DB.prepare(
      "INSERT INTO memberships(id,academy_id,email,role,status,created_at) SELECT ?,?,?,'admin','active',? WHERE NOT EXISTS (SELECT 1 FROM memberships WHERE academy_id=? AND status='active')",
    ).bind(crypto.randomUUID(), BOOTSTRAP_ACADEMY_ID, email, now, BOOTSTRAP_ACADEMY_ID),
  ]);
}

/**
 * Resolve the caller's academy context and assert a minimum role.
 *
 * Returns the resolved {@link AcademyContext} so callers can scope their queries
 * to `context.academyId` instead of a hard-coded tenant, and `null` when the
 * caller is anonymous, has no active membership, or is under-privileged. The
 * object/null shape keeps existing `if (!(await authorize(...)))` guards correct
 * while making the tenant available to every route that needs it.
 */
export async function authorize(
  request: NextRequest,
  minimum: AcademyRole,
): Promise<AcademyContext | null> {
  const email = identity(request);
  if (!email) return null;
  const context = await selectedAcademy(request, minimum);
  if (context) return context;
  await bootstrapOwnerAcademy(email);
  return selectedAcademy(request, minimum);
}
