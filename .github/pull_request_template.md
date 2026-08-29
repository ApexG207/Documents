## Purpose
Describe the operational outcome and why the change is required.

## Scope
List the components, routes, workflows, schemas, dependencies, or documentation changed.

## Security and privacy impact
- [ ] No secrets, credentials, tokens, private keys, or production configuration are committed.
- [ ] No real athlete, guardian, academy, billing, video, or incident data is included.
- [ ] Authentication, authorization, tenant isolation, minor safeguards, consent, audit, and retention impacts were assessed.
- [ ] Dependency and third-party license impacts were assessed.

## Validation
- [ ] `npm ci`
- [ ] `npm audit --omit=dev --audit-level=high`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] Applicable runtime readiness checks completed

## Deployment and rollback
Describe deployment target, migrations, feature flags, environment requirements, rollback method, and recovery risk.

## Governance
- [ ] CODEOWNERS review obtained where required.
- [ ] Proprietary MatIQ licensing and third-party notices remain intact.
- [ ] No production gate, security control, legal control, or safeguarding control is bypassed.

## Evidence
Attach only synthetic/redacted evidence. Do not attach credentials, private athlete data, or sensitive security material.
