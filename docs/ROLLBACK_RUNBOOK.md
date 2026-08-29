# Production Rollback Runbook

## Trigger

Declare rollback for critical security/privacy exposure, minor-safety control failure, broken authentication or tenant isolation, billing/entitlement failure, destructive migration behavior, or material availability regression.

## Sequence

1. Freeze further deployments and name the incident commander.
2. Disable the affected capability with a server-side feature flag when containment is sufficient.
3. Preserve logs, release manifest, commit SHA, migration state, and payment-provider event identifiers.
4. Roll web traffic back to the last approved immutable deployment.
5. For native releases, pause phased rollout and ship a corrected build when binary rollback is unavailable.
6. Do not reverse an applied destructive migration. Use the preapproved forward-fix or restore plan.
7. Validate authentication, tenant isolation, guardian consent, media access, checkout/webhooks, account deletion, backups, and health checks.
8. Communicate status without exposing personal or security-sensitive information.
9. Close only after recovery evidence, reconciliation, corrective action, and lessons learned are recorded.

## Authority

The incident commander may halt release. Product, technical, privacy, safeguarding, and finance authorities approve return to service for their respective gates.
