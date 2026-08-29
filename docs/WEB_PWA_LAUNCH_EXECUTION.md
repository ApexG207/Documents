# matIQ Web/PWA Launch Execution Register

## Decision

Self-publish matIQ as an installable Progressive Web App before native-store enrollment. The public web deployment is the initial distribution authority. Native iOS and Windows packages remain Phase II.

## Gate status

| Gate | Requirement | Status | Release evidence / remaining action |
| --- | --- | --- | --- |
| 1 | Domain | CONDITIONAL | Public Sites URL is operational. No custom domain is attached. Owner must supply a domain already controlled or acquire one before DNS connection. |
| 2 | Domain connection | BLOCKED BY G1 | Add and verify the chosen domain; preserve the Sites URL as rollback access. |
| 3 | Legal publication | IMPLEMENTED / COUNSEL HOLD | Privacy Notice, Terms of Service, Community Standards, and Revenue Sharing Terms are published. Independent Alabama/U.S. counsel review remains required before unrestricted commercial launch. |
| 4 | Stripe production | HOLD | Apex Governance Group Stripe account exists in test mode only. Live business verification, bank account, restricted live key, webhook secret, three live recurring prices, and Connect platform profile are required. |
| 5 | Device validation | TECHNICAL PASS / HUMAN TEST DUE | Manifest, service worker, offline shell, icons, install route, responsive UI, and automated controls are implemented. Complete the device matrix below on owner-controlled devices. |
| 6 | Pilot | READY TO INITIATE AFTER G4 | Use 1–2 academies, 10–30 athletes each, for 60–90 days. Do not ingest minor media before guardian consent and academy safeguarding POC confirmation. |
| 7 | Native stores | DEFERRED | Apple and Microsoft publisher accounts are not required for the PWA. Reassess after pilot evidence and revenue justify enrollment. |

## Production Stripe configuration

Configure secrets only through managed Site environment settings; never commit them:

- `STRIPE_SECRET_KEY`: preferably a least-privilege restricted live key.
- `STRIPE_WEBHOOK_SECRET`: signing secret for `/api/webhooks/stripe`.
- `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_ACADEMY`, `STRIPE_PRICE_ENTERPRISE`: live recurring Price IDs.
- `MATIQ_AUTOMATION_KEY`: strong secret for scheduled close, release, retention, and deletion jobs.
- `MATIQ_BOOTSTRAP_OWNER_EMAIL`: verified owner identity.

The Connect platform must use recipient accounts, embedded onboarding, Express dashboard access, and separate charges and transfers. Transfer capability must be active immediately before release. Community allocations follow the 90% operations / 2% founder / 8% equal eligible-academy pool model after adjustments and the 60-day reserve.

## Device acceptance matrix

| Device | Browser | Acceptance criteria |
| --- | --- | --- |
| iPhone | Safari | Add to Home Screen succeeds; standalone launch; login, registration, upload, account deletion, and legal links work. |
| Windows 11 | Edge | Install prompt succeeds; pinned launch; offline shell; login, checkout redirect, and safe recovery work. |
| Android | Chrome | Install succeeds; standalone launch; core athlete and academy routes remain responsive. |

## Pilot GO criteria

- No open critical/high incidents.
- Production identity and tenant authorization pass.
- Guardian consent passes for every minor media record.
- Stripe webhook, subscription state, refund/dispute adjustment, 60-day reserve, and transfer idempotency tests pass.
- Verified backup and restore exercise completes.
- Privacy, safeguarding, technical, and product release authorities approve.

## Stop conditions

Immediately pause affected collection or release for cross-tenant data exposure, unauthorized minor media, signature-verification failure, payout-capability regression, unresolved high/critical incident, or a refund/dispute condition that can make a cohort insolvent.
