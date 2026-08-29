/**
 * Test fixtures: apply the real migrations to a fresh in-memory database, seed
 * tenants and memberships, and build requests the way the platform delivers them.
 */
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { env, resetEnv } from "./cloudflare-workers.mjs";

const journal = JSON.parse(
  readFileSync(new URL("../../drizzle/meta/_journal.json", import.meta.url), "utf8"),
);

/** Apply every migration registered in the Drizzle journal, in order. */
export function migrate(db) {
  for (const entry of journal.entries) {
    const sql = readFileSync(new URL(`../../drizzle/${entry.tag}.sql`, import.meta.url), "utf8");
    const cleaned = sql.split("--> statement-breakpoint").join("\n");
    try {
      db.exec(cleaned);
    } catch (error) {
      throw new Error(`migration ${entry.tag} failed: ${error.message}`);
    }
  }
}

/** Fresh environment with all migrations applied. */
export function freshDatabase(secrets = {}) {
  const db = resetEnv(secrets);
  migrate(db);
  return db;
}

let counter = 0;
const nextId = (prefix) => `${prefix}-${(counter += 1)}`;

export async function seedAcademy(id, name = `Academy ${id}`) {
  await env.DB.prepare("INSERT INTO academies(id,name,plan,created_at) VALUES (?,?,?,?)")
    .bind(id, name, "pilot", Date.now())
    .run();
  return id;
}

export async function seedMembership(academyId, email, role = "coach") {
  const id = nextId("member");
  await env.DB.prepare(
    "INSERT INTO memberships(id,academy_id,email,role,status,created_at) VALUES (?,?,?,?,'active',?)",
  )
    .bind(id, academyId, email.toLowerCase(), role, Date.now())
    .run();
  return id;
}

export async function seedAthlete(
  academyId,
  { alias = "Athlete", birthYear = 1995, belt = "blue" } = {},
) {
  const id = nextId("athlete");
  await env.DB.prepare(
    "INSERT INTO athletes(id,academy_id,alias,birth_year,belt,consent_status,active,created_at) VALUES (?,?,?,?,?,'pending',1,?)",
  )
    .bind(id, academyId, alias, birthYear, belt, Date.now())
    .run();
  return id;
}

/** Build a request carrying the platform's authenticated-identity header. */
export function request(url, { email, method = "GET", body, academyId, headers = {} } = {}) {
  const merged = { ...headers };
  if (email) merged["oai-authenticated-user-email"] = email;
  if (academyId) merged["x-matiq-academy-id"] = academyId;
  const init = { method, headers: merged };
  if (body instanceof FormData) {
    // Let undici set the multipart boundary; an explicit content-type breaks it.
    init.body = body;
  } else if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
    merged["content-type"] = merged["content-type"] ?? "application/json";
  }
  return new NextRequest(new URL(url, "https://matiq.test"), init);
}

/** Read a route response as { status, body }. */
export async function readResponse(response) {
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

export { env };
