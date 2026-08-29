# MatIQ Event Intelligence v1

## Purpose
Provide one governed competition-event feed for IBJJF, ADCC, World Jiu-Jitsu League (WJJL), and American Grappling Federation (AGF) events.

## Operating doctrine
- Public pages only. No credentialed areas, CAPTCHA bypass, access-control bypass, or private athlete data collection.
- Source allowlist prevents arbitrary-server requests and redirect-based SSRF.
- Fifteen-second outbound request timeout and five-megabyte document ceiling.
- Prefer structured JSON-LD Event records; use conservative same-domain anchor discovery only as a fallback.
- Preserve source URL and source organization for attribution and user verification.
- Normalize into `external_events` without overwriting MatIQ academy-created tournament records.
- Hash canonical identity for deduplication and hash normalized event content for change detection.
- Log each ingestion run and source health in D1.
- Governance unlock is required to trigger ingestion. Reading normalized event listings does not trigger remote collection.

## Sources
The migration seeds source profiles for `ibjjf`, `adcc`, `wjjl`, and `agf`. Source URLs are operational configuration and may be changed in `event_sources` if an organization changes its public event path. MatIQ should prefer official APIs, feeds, calendars, or written data-access agreements when a source offers them.

## API
`GET /api/event-intelligence` returns normalized events. Optional query parameters: `source`, `future`, and `limit` (maximum 500).

`POST /api/event-intelligence` triggers a governed refresh for all active sources. Body `{ "source": "ibjjf" }` restricts refresh to one configured source.

## Next increments
1. Add source-specific parser fixtures and contract tests from sanitized public HTML samples.
2. Add scheduled Cloudflare refresh after source-specific robots/terms review and rate policy approval.
3. Add academy watchlists, distance/geography filtering, event registration deadlines, and calendar integration.
4. Add event change alerts when date, venue, registration deadline, or status changes.
5. Add source confidence, stale-data indicators, and manual adjudication for low-confidence parses.
6. Where permitted, ingest divisions, rulesets, pricing windows, weigh-in details, and registration state from structured public data.
