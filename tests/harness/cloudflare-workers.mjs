/**
 * Stand-in for the `cloudflare:workers` module so route handlers can be imported
 * and executed by `node --test`.
 *
 * `env.DB` is a D1-compatible facade over `node:sqlite`, so tests exercise the
 * real SQL the routes issue rather than a hand-written mock that agrees with
 * whatever the test expects. `env.BUCKET` is an in-memory R2 stand-in.
 *
 * The exported `env` object is mutated in place (never reassigned) because route
 * modules capture it as a live binding at import time.
 */
import { DatabaseSync } from "node:sqlite";

class D1Statement {
  constructor(db, sql, params = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }
  bind(...params) {
    return new D1Statement(this.db, this.sql, params);
  }
  #normalize(params) {
    // node:sqlite accepts null/number/string/bigint/Uint8Array. D1 callers pass
    // booleans and undefined; coerce them the way D1 does.
    return params.map((p) => {
      if (p === undefined) return null;
      if (typeof p === "boolean") return p ? 1 : 0;
      if (p instanceof Date) return p.getTime();
      return p;
    });
  }
  async all() {
    const stmt = this.db.prepare(this.sql);
    const results = stmt.all(...this.#normalize(this.params));
    return { results: results.map((r) => ({ ...r })), success: true, meta: { changes: 0 } };
  }
  async first(column) {
    const stmt = this.db.prepare(this.sql);
    const row = stmt.get(...this.#normalize(this.params));
    if (row === undefined) return null;
    const plain = { ...row };
    return column ? (plain[column] ?? null) : plain;
  }
  async run() {
    const stmt = this.db.prepare(this.sql);
    const info = stmt.run(...this.#normalize(this.params));
    return {
      success: true,
      meta: {
        changes: Number(info.changes ?? 0),
        last_row_id: Number(info.lastInsertRowid ?? 0),
      },
    };
  }
}

class D1Database {
  constructor(db) {
    this.db = db;
  }
  prepare(sql) {
    return new D1Statement(this.db, sql);
  }
  async batch(statements) {
    const out = [];
    this.db.exec("BEGIN");
    try {
      for (const s of statements) {
        // A batch member may be a SELECT or a write; run() covers both for the
        // callers here, but preserve rows when the statement returns them.
        const trimmed = s.sql.trim().toUpperCase();
        out.push(trimmed.startsWith("SELECT") ? await s.all() : await s.run());
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return out;
  }
  async exec(sql) {
    this.db.exec(sql);
    return { count: 0, duration: 0 };
  }
}

class R2Bucket {
  constructor() {
    this.objects = new Map();
  }
  async put(key, value, options = {}) {
    let body;
    if (value instanceof ArrayBuffer) body = Buffer.from(value);
    else if (typeof value === "string") body = Buffer.from(value);
    else if (value && typeof value.getReader === "function") {
      const chunks = [];
      const reader = value.getReader();
      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(chunk));
      }
      body = Buffer.concat(chunks);
    } else body = Buffer.from(value ?? "");
    const object = { key, body, size: body.byteLength, ...options };
    this.objects.set(key, object);
    return object;
  }
  async head(key) {
    return this.objects.get(key) ?? null;
  }
  async get(key) {
    const o = this.objects.get(key);
    if (!o) return null;
    return {
      ...o,
      text: async () => o.body.toString("utf8"),
      arrayBuffer: async () => o.body,
    };
  }
  async delete(key) {
    this.objects.delete(key);
  }
  async list() {
    return { objects: [...this.objects.values()] };
  }
}

export const env = {};

/** Reset `env` to a fresh in-memory database and bucket. Returns the raw handle. */
export function resetEnv(overrides = {}) {
  for (const key of Object.keys(env)) delete env[key];
  const db = new DatabaseSync(":memory:");
  Object.assign(env, {
    DB: new D1Database(db),
    BUCKET: new R2Bucket(),
    ...overrides,
  });
  return db;
}
