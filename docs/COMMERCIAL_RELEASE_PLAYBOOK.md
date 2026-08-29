# matIQ Commercial Release Playbook

## Release objective

Promote an immutable, tested commit through development, preview, staging, beta, and production without exposing athlete, guardian, academy, payment, or media data.

## Release train

- Hotfix: containment or critical correction after focused regression testing.
- Maintenance: biweekly patch release.
- Feature: monthly minor release.
- Major: quarterly or when compatibility, data, entitlement, or operating-model changes require it.

## Standard execution

1. Create a feature branch and pull request.
2. Require quality, CodeQL, dependency, release-preflight, and reviewer gates.
3. Validate preview behavior with synthetic data.
4. Merge using squash or merge commit; never bypass the governed checks.
5. Update VERSION, package.json, CHANGELOG, store metadata, and migration notes.
6. Run Commercial Release for beta.
7. Validate staging, TestFlight/native source packages, Windows source package, payments, consent, deletion, backup, and restore.
8. Obtain product, technical, privacy, safeguarding, finance, and legal approvals as applicable.
9. Run Commercial Release for production and then Deploy Web Release using an immutable tag or SHA.
10. Monitor health, errors, authorization failures, billing reconciliation, moderation events, and user feedback.

## Stop conditions

Stop or roll back for cross-tenant exposure, unauthorized minor media, consent bypass, signature verification failure, incorrect entitlement, payout mismatch, destructive migration, unresolved critical/high incident, or sustained service-health breach.

## Measures

- Deployment success rate >= 95%.
- Change failure rate < 10%.
- Mean rollback decision <= 15 minutes for critical incidents.
- Restore evidence current within 90 days.
- Zero unauthorized minor-media or cross-tenant release defects.
