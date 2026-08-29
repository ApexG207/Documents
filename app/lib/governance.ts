import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

const encoder = new TextEncoder(),
  cookieName = "matiq_governance";
const config = () => env as unknown as Record<string, string | undefined>;
const identity = (request: NextRequest) =>
  request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase() || null;
const digest = async (value: string) =>
  new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
async function equal(left: string, right: string) {
  const [a, b] = await Promise.all([digest(left), digest(right)]);
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a[i] || 0) ^ (b[i] || 0);
  return difference === 0;
}
const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
const decode = (value: string) =>
  Uint8Array.from(
    atob(
      value
        .replaceAll("-", "+")
        .replaceAll("_", "/")
        .padEnd(Math.ceil(value.length / 4) * 4, "="),
    ),
    (c) => c.charCodeAt(0),
  );
async function signature(payload: string) {
  const secret = config().MATIQ_GOVERNANCE_SESSION_SECRET || "",
    key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
}
export function isFounder(request: NextRequest) {
  const email = identity(request),
    owner = config().MATIQ_BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(email && owner && email === owner);
}
export async function governanceCodeAccepted(candidate: string) {
  const codes = (config().MATIQ_GOVERNANCE_CODES || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (!candidate || !codes.length) return false;
  const matches = await Promise.all(codes.map((code) => equal(candidate, code)));
  return matches.some(Boolean);
}
export async function createGovernanceToken(request: NextRequest, ttlMs = 30 * 60 * 1000) {
  const email = identity(request);
  if (!email || !isFounder(request) || !config().MATIQ_GOVERNANCE_SESSION_SECRET) return null;
  const payload = base64url(
    encoder.encode(
      JSON.stringify({ email, expiresAt: Date.now() + ttlMs, nonce: crypto.randomUUID() }),
    ),
  );
  return `${payload}.${await signature(payload)}`;
}
export async function governanceUnlocked(request: NextRequest) {
  if (!isFounder(request) || !config().MATIQ_GOVERNANCE_SESSION_SECRET) return false;
  const token = request.cookies.get(cookieName)?.value;
  if (!token) return false;
  const [payload, provided, ...extra] = token.split(".");
  if (!payload || !provided || extra.length) return false;
  if (!(await equal(provided, await signature(payload)))) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(decode(payload))) as {
      email?: string;
      expiresAt?: number;
    };
    return data.email === identity(request) && Number(data.expiresAt) > Date.now();
  } catch {
    return false;
  }
}
export const governanceCookie = cookieName;
