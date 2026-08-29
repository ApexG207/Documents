import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { governanceUnlocked } from "../../lib/governance";
import { eventKey, scrapePublicEvents, sha256, type ScrapedEvent } from "../../lib/event-scraper";

async function upsertEvent(e: ScrapedEvent, now: number) {
  const key = await sha256(eventKey(e)),
    fingerprint = await sha256(JSON.stringify(e));
  await env.DB.prepare(
    `INSERT INTO external_events(id,source_code,source_event_id,canonical_key,name,start_at,end_at,registration_deadline,venue_name,address,city,region,country,ruleset,event_format,registration_url,source_url,status,raw_fingerprint,first_seen_at,last_seen_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'published',?,?,?,?) ON CONFLICT(canonical_key) DO UPDATE SET name=excluded.name,start_at=excluded.start_at,end_at=excluded.end_at,registration_deadline=excluded.registration_deadline,venue_name=excluded.venue_name,address=excluded.address,city=excluded.city,region=excluded.region,country=excluded.country,ruleset=excluded.ruleset,event_format=excluded.event_format,registration_url=excluded.registration_url,source_url=excluded.source_url,status='published',raw_fingerprint=excluded.raw_fingerprint,last_seen_at=excluded.last_seen_at,updated_at=excluded.updated_at`,
  )
    .bind(
      crypto.randomUUID(),
      e.sourceCode,
      e.sourceEventId || null,
      key,
      e.name,
      e.startAt || null,
      e.endAt || null,
      e.registrationDeadline || null,
      e.venueName || null,
      e.address || null,
      e.city || null,
      e.region || null,
      e.country || null,
      e.ruleset || null,
      e.eventFormat || null,
      e.registrationUrl || null,
      e.sourceUrl,
      fingerprint,
      now,
      now,
      now,
    )
    .run();
}

export async function GET(request: NextRequest) {
  const u = new URL(request.url),
    source = u.searchParams.get("source"),
    futureOnly = u.searchParams.get("future") !== "false",
    limit = Math.min(Math.max(Number(u.searchParams.get("limit") || 100), 1), 500),
    where = [futureOnly ? "(start_at IS NULL OR start_at>=?)" : "1=1"],
    binds: unknown[] = [];
  if (futureOnly) binds.push(Date.now() - 86400000);
  if (source) {
    where.push("source_code=?");
    binds.push(source);
  }
  const q = `SELECT id,source_code AS sourceCode,name,start_at AS startAt,end_at AS endAt,registration_deadline AS registrationDeadline,venue_name AS venueName,address,city,region,country,ruleset,event_format AS eventFormat,registration_url AS registrationUrl,source_url AS sourceUrl,status,last_seen_at AS lastSeenAt FROM external_events WHERE ${where.join(" AND ")} ORDER BY COALESCE(start_at,9223372036854775807),name LIMIT ?`;
  binds.push(limit);
  const rows = await env.DB.prepare(q)
    .bind(...binds)
    .all();
  return NextResponse.json({ events: rows.results, count: rows.results.length });
}

export async function POST(request: NextRequest) {
  if (!(await governanceUnlocked(request)))
    return NextResponse.json({ error: "governance_required" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { source?: string },
    sources = await env.DB.prepare(
      "SELECT code,events_url AS eventsUrl FROM event_sources WHERE status='active'",
    ).all<{ code: string; eventsUrl: string }>(),
    selected = body.source
      ? sources.results.filter((x) => x.code === body.source)
      : sources.results;
  if (!selected.length) return NextResponse.json({ error: "source_not_found" }, { status: 404 });
  const results = [];
  for (const source of selected) {
    const runId = crypto.randomUUID(),
      started = Date.now();
    try {
      const out = await scrapePublicEvents(source.code, source.eventsUrl);
      for (const e of out.events) await upsertEvent(e, Date.now());
      const done = Date.now();
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE event_sources SET last_attempt_at=?,last_success_at=?,last_status_code=?,last_error=NULL,updated_at=? WHERE code=?",
        ).bind(started, done, out.httpStatus, done, source.code),
        env.DB.prepare(
          "INSERT INTO event_ingestion_runs(id,source_code,status,http_status,discovered_count,upserted_count,duration_ms,started_at,completed_at) VALUES(?,?,'success',?,?,?,?,?,?)",
        ).bind(
          runId,
          source.code,
          out.httpStatus,
          out.events.length,
          out.events.length,
          out.durationMs,
          started,
          done,
        ),
      ]);
      results.push({
        source: source.code,
        status: "success",
        discovered: out.events.length,
        durationMs: out.durationMs,
      });
    } catch (error) {
      const done = Date.now(),
        message = error instanceof Error ? error.message : "ingestion_failed";
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE event_sources SET last_attempt_at=?,last_error=?,updated_at=? WHERE code=?",
        ).bind(started, message.slice(0, 240), done, source.code),
        env.DB.prepare(
          "INSERT INTO event_ingestion_runs(id,source_code,status,error_code,duration_ms,started_at,completed_at) VALUES(?,?,'failed',?,?,?,?)",
        ).bind(runId, source.code, message.slice(0, 120), done - started, started, done),
      ]);
      results.push({ source: source.code, status: "failed", error: message });
    }
  }
  return NextResponse.json(
    { results, completedAt: Date.now() },
    { status: results.some((x) => x.status === "success") ? 200 : 502 },
  );
}
