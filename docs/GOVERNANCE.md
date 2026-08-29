# MatIQ Product Governance

## Authority

- Product owner: approves strategy, funding, pricing, release, and risk acceptance.
- Product manager: owns requirements, backlog, measures, and release evidence.
- Safeguarding lead: owns child-safety controls, escalation, and training.
- Privacy lead: owns notices, consent, rights requests, retention, and vendor review.
- Technical lead: owns architecture, secure delivery, recovery, monitoring, and incidents.
- Academy administrator: owns local user authorization and operational compliance.

## Source control

- `main` is the approved production baseline.
- `development` is the integration branch.
- Feature work uses `feature/<issue>-<description>`.
- Releases use semantic tags and a signed release checklist.
- Secrets, real child records, credentials, videos, and exported production data are prohibited in Git.

## Decision gates

1. Concept approval.
2. Architecture and threat-model approval.
3. Privacy and safeguarding approval.
4. Pilot readiness review.
5. Paid pilot authorization.
6. Commercial launch authorization.

No gate may be self-certified by the implementer when legal, security, or safeguarding review is required.
