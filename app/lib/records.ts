import { env } from "cloudflare:workers";
export async function activeAthleteExists(athleteId: string, academyId: string) {
  if (!athleteId || athleteId.length > 80) return false;
  const row = await env.DB.prepare(
    "SELECT id FROM athletes WHERE id=? AND academy_id=? AND active=1 LIMIT 1",
  )
    .bind(athleteId, academyId)
    .first();
  return Boolean(row);
}
export function boundedScore(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0;
}
export function safeText(value: unknown, max: number) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}
export function socialLinks(value: Record<string, unknown>) {
  const allowed = ["website", "instagram", "facebook", "tiktok", "youtube", "x"],
    result: Record<string, string> = {};
  for (const key of allowed) {
    const raw = safeText(value[`social${key[0].toUpperCase()}${key.slice(1)}`] ?? value[key], 300);
    if (!raw) continue;
    try {
      const url = new URL(raw);
      if (url.protocol === "https:" || url.protocol === "http:") result[key] = url.toString();
    } catch {}
  }
  return result;
}
export function affiliations(value: unknown) {
  const items = Array.isArray(value) ? value : String(value ?? "").split(/[\n,;]+/);
  return [...new Set(items.map((x) => safeText(x, 100)).filter(Boolean))].slice(0, 12);
}
export function parsedJson<T>(value: unknown, fallback: T): T {
  try {
    return typeof value === "string" ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
