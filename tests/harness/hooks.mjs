/**
 * Module resolution hooks that let `node --test` import the application's route
 * handlers unchanged, with no build step and no Workers runtime.
 *
 * - `cloudflare:workers` is a Workers-runtime builtin with no Node equivalent,
 *   so it resolves to the in-memory stand-in in this directory.
 * - `next/server` has no ESM exports map in this Next build, so the bare
 *   specifier does not resolve under Node; point it at the real file.
 * - Application sources use bundler-style extensionless relative imports
 *   (`../../lib/access`), which Node ESM does not resolve on its own.
 *
 * Node 24 strips TypeScript types natively, so the `.ts` sources import directly.
 */
import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolvePath(here, "..", "..");

const REMAP = new Map([
  ["cloudflare:workers", pathToFileURL(resolvePath(here, "cloudflare-workers.mjs")).href],
  ["next/server", pathToFileURL(resolvePath(repoRoot, "node_modules/next/server.js")).href],
]);

const CANDIDATE_SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx", ".mjs", ".js"];

export async function resolve(specifier, context, nextResolve) {
  const mapped = REMAP.get(specifier);
  if (mapped) return { url: mapped, shortCircuit: true };

  if (specifier.startsWith(".") && context.parentURL) {
    const parentDir = dirname(fileURLToPath(context.parentURL));
    const base = resolvePath(parentDir, specifier);
    if (!existsSync(base)) {
      for (const suffix of CANDIDATE_SUFFIXES) {
        if (existsSync(base + suffix)) {
          return { url: pathToFileURL(base + suffix).href, shortCircuit: true };
        }
      }
    }
  }

  return nextResolve(specifier, context);
}
