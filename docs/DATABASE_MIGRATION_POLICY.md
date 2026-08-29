# Database Migration Policy

## Rules

- Every schema change uses a new numbered file under drizzle; applied migrations are immutable.
- Destructive changes require expand-migrate-contract sequencing across at least two releases.
- New application code must remain compatible with the prior production schema during rollout.
- Migrations must be idempotent where the platform supports it and must never embed credentials or user data.
- Production execution requires a verified backup, restore point, migration owner, rollback/forward-fix plan, and privacy review when data categories change.
- High-volume transforms run as bounded background jobs, not request-path migrations.
- Legal holds, consent records, audit evidence, financial ledgers, and deletion queues require explicit preservation analysis.

## Gate evidence

Record migration identifier, affected tables, estimated duration, lock behavior, data classification, backup identifier, validation query, rollback/forward-fix action, and approvers in the release record.
