# MatIQ Product Requirements Document

## 1. Product objective

MatIQ is an all-athlete jiu-jitsu intelligence platform that converts governed athlete observations, competition records, match media, and institutional knowledge into coach-verified development decisions. Age-aware protections apply whenever the athlete is a minor. MatIQ does not replace coaches, guardians, medical professionals, or safeguarding authorities.

## 2. Primary users

- Academy administrator: tenancy, personnel, policy, reporting, retention, and subscription control.
- Coach: observations, assessments, plans, tournament preparation, match review, and approved AI support.
- Parent or guardian: consent, child-record visibility, correction, export, and deletion requests.
- Reviewer: explicitly authorized read-only oversight.

## 3. Pilot scope

The governed pilot includes academy administration, identity and roles, athlete records, development observations, competition planning, match-video review, parent consent, AI decision briefs, auditability, and academy reporting. Public profiles, social feeds, public rankings, direct child-to-AI interaction, medical guidance, weight-cut guidance, and autonomous plan release are out of scope.

## 4. Functional requirements

1. Each record is scoped to one academy and one authorized actor.
2. Parent consent is recorded by purpose and may be declined or withdrawn.
3. Coaches approve all athlete-facing AI outputs.
4. Media requires explicit performance-review scope and bounded retention.
5. Administrators can export, correct, restrict, and delete governed records.
6. System actions create immutable audit events.
7. Academy tenants cannot access another tenant's data.
8. The platform provides readable mobile and desktop workflows.

## 5. Nonfunctional requirements

- Zero critical security findings at pilot launch.
- 99.5% pilot availability objective.
- Recovery-point objective: 24 hours; recovery-time objective: 8 hours.
- WCAG 2.2 AA target for core flows.
- Structured logs without child personal data or secret material.
- Encryption in transit and provider-managed encryption at rest.

## 6. Release gates

Pilot release requires verified authentication, tenant isolation, authorization tests, consent withdrawal, deletion workflow, audit trail, backup restoration, incident response, parent-facing notices, coach training, and signed pilot agreement.

## 7. Commercial success

Success requires at least 70% weekly active coaches, 60% weekly athlete-record coverage, 30% reduction in coach administrative time, 100% consent compliance, zero unauthorized disclosures, and 80% academy renewal intent.

## 8. Athlete and academy network

MatIQ operates as a governed two-sided network. Academies register as verifiable entities with legal and display names, physical location, address, description, operating hours, staff, and designated points of contact. Public directory publication requires entity verification. Members may publish moderated reviews and academies may respond without altering the originating review.

Individuals maintain athlete-controlled profiles containing goals, concerns, strengths, weaknesses, opportunities, rank, location, and visibility preferences. The longitudinal performance record includes training progress, skill evidence, promotion progress, competition video review, and coach-verified analysis. Direct communication, cross-training requests, and booking requests are attributable and auditable; direct messaging involving minors remains adult-controlled.

MatIQ allocates reconciled net revenue using a governed 90/2/8 model: 90 percent to operations, 2 percent to a monthly founder distribution payable, and 8 percent to a community pool divided equally among eligible academy owners. Net revenue excludes taxes, refunds, chargebacks, disputes, processing fees, fraudulent transactions, and non-qualifying revenue. Academy eligibility requires verified ownership, completed Stripe onboarding, active transfers and payouts, good standing, and at least one active member during the monthly period. Each monthly academy cohort is subject to a 60-day rolling reserve, has no matIQ-imposed minimum payout, and is recorded with its accruals, adjustments, transfers, reversals, retries, and audit evidence.

## 9. Entity authority and tenant isolation

Authentication identifies an individual; it does not grant academy authority. Academy registration and claiming require evidence, independent review, and an explicit approval event before an administrative membership may be created. Academy context is resolved only from active server-side memberships. A requested academy identifier is accepted only when it matches an academy in the authenticated user's active membership set.

Academy administrators may invite staff under least-privilege roles. Invitations are hashed, time-bounded, status-controlled, and do not become active memberships until accepted by the matching authenticated identity. Every claim, verification decision, invitation, acceptance, role change, suspension, and removal requires an audit event. Production release remains blocked until all legacy pilot-scoped routes use the resolved academy context and cross-tenant regression tests pass.

## 10. Competition portfolio and external provenance

Each authenticated athlete may maintain a longitudinal competition portfolio containing identity data, academy and rank context, events, divisions, placements, wins, losses, draws, submission wins, competition footage, official-source links, uploaded evidence, and verification status. The portfolio must distinguish self-reported, evidence-submitted, source-matched, coach-verified, independently verified, and conflict states.

Initial external-source support includes Smoothcomp, IBJJF, Jiu-Jitsu World League, Grappling Industries, ADCC, NAGA, AJP Tour, and governed links to other official sources. MatIQ stores official profile and result URLs, external record identifiers, user-provided exports, cryptographic evidence hashes, match confidence, and adjudication events. It does not represent a source link as verified merely because the URL exists.

Cross-referencing follows a consent- and provenance-first adapter model. User uploads and official public links are supported at launch. Automated retrieval, synchronization, or redistribution requires an authorized API, contractual integration, or documented permission from the source platform. Unauthorized scraping, credential reuse, evasion of access controls, and silent identity matching are prohibited.
