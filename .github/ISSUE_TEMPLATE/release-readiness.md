---
name: Commercial release readiness
about: Govern a matIQ beta or production release
title: "Release: matIQ vX.Y.Z"
labels: ["release"]
assignees: []
---

## Release identity

- Version:
- Commit:
- Channel:
- Change class: patch / minor / major / hotfix

## Evidence

- [ ] VERSION, package.json, and CHANGELOG agree.
- [ ] Quality, CodeQL, dependency audit, and release controls pass.
- [ ] Release manifest and archive checksum generated.
- [ ] Database migration/rollback evidence complete.
- [ ] Feature-flag defaults reviewed.
- [ ] Backup and restore evidence current.
- [ ] Authentication and tenant isolation tested.
- [ ] Guardian consent and minor-media controls tested.
- [ ] Stripe webhook, entitlements, refund/dispute, and 90/2/8 reconciliation tested.
- [ ] Mobile, tablet, desktop, accessibility, and adaptive-athlete tests pass.
- [ ] Product, technical, privacy, safeguarding, finance, and legal gates adjudicated.
