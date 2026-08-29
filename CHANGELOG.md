# Changelog

All notable matIQ changes are recorded here. Versions follow Semantic Versioning.

## [3.0.0-beta.1] - 2026-08-27

### Fixed
- Registered migrations 0013-0017 in the Drizzle journal. They shipped as `.sql`
  files absent from the journal, so a freshly migrated database silently lacked
  athlete verification, guardian consent, the Connect revenue pool, and store
  safety and deletion tables.
- Aligned guardian-consent vocabulary between the recording route and media
  intake. `/api/consents` wrote `granted` while enforcement required
  `approved`, so no minor upload could ever be authorised.
- Resolved academy context from the caller's active membership across the API.
  Thirty-two routes previously bound a hard-coded `pilot` tenant, and
  `authorize()` itself only ever consulted that one academy.
- R2 object keys, storage telemetry, retention enforcement, and Stripe checkout
  metadata are now tenant-partitioned.
- The health endpoint reports the approved build version instead of a hard-coded
  literal, and README no longer advertises a stale product version.

### Added
- Migration 0018 adds `academy_id` to `media_objects` and `consents`, the two
  tables that carried no tenant column.
- Executable test suite (31 tests) covering cross-tenant isolation, guardian
  consent enforcement, revenue allocation arithmetic, and migration integrity.
  Tests run real route handlers against a real SQL engine.
- Prettier formatting with a CI gate.

### Changed
- CodeQL findings upload to code scanning and error-severity results fail the
  job; previously results went to a throwaway artifact with `upload: never`.
- Deployment health verification is mandatory and asserts `operational`;
  previously it was skipped entirely when the secret was unset.
- `release:preflight` now enforces journal/migration parity, version parity
  across VERSION, package.json, CHANGELOG, README and the app, and rejects
  hard-coded tenant identifiers in API routes.

### Previously in this release

### Added
- Commercial release governance, feature flags, deployment environments, release manifests, rollback controls, and native-store package preparation.
- Existing governed beta capabilities consolidated under a controlled release train.

### Security
- High-risk commercial capabilities default off until runtime, privacy, safeguarding, financial, and store-specific gates pass.
