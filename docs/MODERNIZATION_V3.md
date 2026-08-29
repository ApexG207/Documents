# MatIQ v3 Modernization Baseline

## Objective

Elevate MatIQ from a working controlled beta to a governed, production-oriented training aid with stronger deployment reliability, software quality, operational health, PWA resilience, security assurance, and release discipline.

## Modernization controls

### Architecture and identity

- Product identity is normalized as **MatIQ Jiu-Jitsu Intelligence Training Aid**.
- The package is proprietary and remains `UNLICENSED` for npm/open-source purposes.
- Production remains a full-stack Vinext/Cloudflare workload with D1 and R2 bindings.
- GitHub Pages remains a sanitized public showcase only; the full application is not statically exported to Pages.

### CI/CD

The quality gate now validates:

1. locked dependency installation;
2. production dependency audit at high severity or greater;
3. ESLint source quality;
4. TypeScript compilation without emit;
5. production Vinext build; and
6. governed release-control tests.

The generic Next.js Pages workflow was removed because it attempted to deploy the dynamic full-stack application as a static `out/` artifact and used an unsupported Node runtime for the current package requirements. The governed `pages.yml` showcase workflow remains authoritative for GitHub Pages.

### Reliability and observability

`/api/health` now returns a no-store operational-health contract with:

- product and release version;
- timestamp;
- core readiness for database, media, identity, and tenant isolation;
- integration visibility for email, AI, billing, and automation; and
- HTTP `503` when required core capabilities are unavailable.

This endpoint is intended for uptime checks and deployment smoke tests. It is not a substitute for the existing beta-readiness and launch-readiness gates.

### PWA resilience

The service worker now:

- uses a versioned v3 shell cache;
- tolerates a single optional shell-asset failure during installation;
- removes stale MatIQ shell caches during activation;
- uses a bounded network-first strategy for navigation with offline fallback;
- uses stale-while-revalidate for governed application assets; and
- bypasses API and authentication routes to prevent caching sensitive or user-specific responses.

### Release posture

MatIQ v3 remains a controlled beta until the runtime beta and launch-readiness gates return GO. Modernization does not bypass identity, guardian, tenant-isolation, billing, backup, automation, AI, incident, or executive-release controls.

## Promotion criteria

Promote this branch only after the pull-request quality gate passes in full. If type checking, audit, build, or release-control tests fail, remediate the branch and rerun CI before merge.
