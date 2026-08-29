/**
 * Minimal Cloudflare runtime declarations used by matIQ.
 *
 * Keep these interfaces intentionally narrow. They provide strict CI coverage
 * without coupling application code to a transitive dependency.
 */
interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
  error?: string;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(): Promise<T[]>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
  dump(): Promise<ArrayBuffer>;
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  uploaded: Date;
  customMetadata?: Record<string, string>;
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
}

interface R2Bucket {
  head(key: string): Promise<R2Object | null>;
  get(key: string): Promise<R2ObjectBody | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | string | null, options?: Record<string, unknown>): Promise<R2Object>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: Record<string, unknown>): Promise<{ objects: R2Object[]; truncated: boolean; cursor?: string }>;
}

interface MatIQCloudflareEnv {
  DB: D1Database;
  // Cloudflare bindings may be secrets, queues, buckets, or service objects.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [binding: string]: any;
}

declare module "cloudflare:workers" {
  export const env: MatIQCloudflareEnv;
}
