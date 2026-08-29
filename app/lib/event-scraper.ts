type ScrapedEvent = {
  sourceCode: string;
  sourceEventId?: string;
  name: string;
  startAt?: number;
  endAt?: number;
  registrationDeadline?: number;
  venueName?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  ruleset?: string;
  eventFormat?: string;
  registrationUrl?: string;
  sourceUrl: string;
};

const SOURCE_HOSTS: Record<string, string[]> = {
  ibjjf: ["ibjjf.com", "www.ibjjf.com"],
  adcc: ["adcombat.com", "www.adcombat.com"],
  wjjl: ["wjjiujitsuleague.com", "www.wjjiujitsuleague.com"],
  agf: ["americangrapplingfederation.com", "www.americangrapplingfederation.com"],
};
function clean(v: unknown) {
  return String(v ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function epoch(v: unknown) {
  const t = Date.parse(String(v ?? ""));
  return Number.isFinite(t) ? t : undefined;
}
function abs(base: string, v: unknown) {
  try {
    return new URL(String(v ?? ""), base).toString();
  } catch {
    return undefined;
  }
}
function hostAllowed(code: string, url: string) {
  try {
    return SOURCE_HOSTS[code]?.includes(new URL(url).hostname.toLowerCase()) ?? false;
  } catch {
    return false;
  }
}
function jsonLd(html: string) {
  const out: unknown[] = [];
  for (const m of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const x = JSON.parse(m[1]);
      out.push(...(Array.isArray(x) ? x : [x]));
    } catch {}
  }
  return out;
}
function flatten(nodes: unknown[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const walk = (x: unknown) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) {
      x.forEach(walk);
      return;
    }
    const r = x as Record<string, unknown>;
    out.push(r);
    if (r["@graph"]) walk(r["@graph"]);
  };
  nodes.forEach(walk);
  return out;
}
function fromLd(code: string, base: string, html: string): ScrapedEvent[] {
  return flatten(jsonLd(html))
    .filter((x) =>
      String(x["@type"] || "")
        .toLowerCase()
        .includes("event"),
    )
    .map((x) => {
      const loc = (x.location || {}) as Record<string, unknown>,
        addr = (loc.address || {}) as Record<string, unknown>,
        offers = (Array.isArray(x.offers) ? x.offers[0] : x.offers || {}) as Record<
          string,
          unknown
        >;
      return {
        sourceCode: code,
        sourceEventId: clean(x.identifier) || undefined,
        name: clean(x.name),
        startAt: epoch(x.startDate),
        endAt: epoch(x.endDate),
        venueName: clean(loc.name) || undefined,
        address: clean(addr.streetAddress) || undefined,
        city: clean(addr.addressLocality) || undefined,
        region: clean(addr.addressRegion) || undefined,
        country: clean(addr.addressCountry) || undefined,
        registrationUrl: abs(base, offers.url || x.url),
        sourceUrl: abs(base, x.url) || base,
      };
    })
    .filter((e) => e.name && hostAllowed(code, e.sourceUrl));
}
function fromAnchors(code: string, base: string, html: string): ScrapedEvent[] {
  const seen = new Set<string>(),
    out: ScrapedEvent[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = abs(base, m[1]),
      name = clean(m[2]);
    if (!href || !hostAllowed(code, href) || name.length < 6 || name.length > 180) continue;
    if (!/(championship|open|classic|tournament|jiu.?jitsu|grappling|adcc|ibjjf)/i.test(name))
      continue;
    const key = `${name}|${href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ sourceCode: code, name, sourceUrl: href, registrationUrl: href });
  }
  return out.slice(0, 250);
}
export async function scrapePublicEvents(code: string, url: string) {
  if (!SOURCE_HOSTS[code] || !hostAllowed(code, url)) throw new Error("source_not_allowlisted");
  const started = Date.now();
  const response = await fetch(url, {
    headers: {
      "user-agent": "MatIQ-EventIntelligence/1.0 (+public-event-indexing)",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`source_http_${response.status}`);
  const finalUrl = response.url || url;
  if (!hostAllowed(code, finalUrl)) throw new Error("redirect_not_allowlisted");
  const html = await response.text();
  if (html.length > 5_000_000) throw new Error("source_document_too_large");
  const primary = fromLd(code, finalUrl, html),
    fallback = primary.length ? [] : fromAnchors(code, finalUrl, html);
  return {
    events: primary.length ? primary : fallback,
    httpStatus: response.status,
    durationMs: Date.now() - started,
  };
}
export function eventKey(e: ScrapedEvent) {
  return [
    e.sourceCode,
    e.sourceEventId || "",
    e.name.toLowerCase(),
    e.startAt || 0,
    e.city?.toLowerCase() || "",
  ].join("|");
}
export async function sha256(v: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(b))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export type { ScrapedEvent };
