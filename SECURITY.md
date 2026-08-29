# MatIQ Security Policy

## Supported release

The current controlled-beta and the current production release line are supported for security fixes. Unsupported snapshots, forks, exports, and abandoned beta builds are not maintained.

## Private vulnerability reporting

Do not report suspected vulnerabilities through public issues, discussions, social posts, screenshots, shared documents, or public pull requests. Use the private security contact established by the MatIQ product owner.

A useful report should include the affected component, release/version, reproduction conditions, observed and potential impact, affected roles or tenants, whether athlete/minor data may be exposed, and the minimum safe evidence necessary to reproduce the issue. Never include production credentials, access tokens, unnecessary personal information, real athlete records, private video, guardian information, or exploit payloads beyond what is necessary for coordinated remediation.

## Security response doctrine

MatIQ follows coordinated remediation: acknowledge, contain, preserve evidence, assess severity, eradicate, correct, verify, recover, communicate, and record lessons learned. Critical and high-severity defects block release or require immediate containment. Security fixes must pass the governed quality gate before promotion unless an emergency containment action is required to prevent active harm.

## Repository controls

All contributors must:

- use feature branches and pull requests for substantive changes;
- preserve CODEOWNERS review for security, governance, deployment, legal, database, API, and workflow controls;
- keep secrets out of source, history, issues, logs, test fixtures, screenshots, artifacts, and documentation;
- use synthetic or properly de-identified test data;
- preserve least-privilege access, tenant isolation, age-aware controls, consent controls, auditability, and release gates;
- keep dependencies pinned through the lockfile and remediate known production vulnerabilities;
- treat workflow files, dependency manifests, authentication, authorization, billing, data migrations, storage, backups, and deployment configuration as security-sensitive code;
- never bypass CI, release controls, or governance gates to accelerate deployment.

## Secrets and credentials

Production secrets must be stored only in approved encrypted secret-management facilities provided by the deployment platform or repository environment. Credentials must be scoped to the minimum permissions and rotated immediately upon suspected exposure. No secret may be embedded in client-side code or committed to Git history.

## Data protection

Athlete, guardian, academy, billing, media, and security-event data must be handled according to the applicable privacy policy, retention controls, legal holds, authorization model, and contractual requirements. Administrative or governance privileges do not waive protections for minors or protected participants.

## Dependency and supply-chain controls

MatIQ uses automated dependency monitoring, production dependency auditing, CodeQL analysis, locked dependency installation, and governed review of workflow changes. New dependencies should be justified, actively maintained, license-compatible, and necessary for the product mission. Dependency changes affecting cryptography, authentication, payments, storage, AI, or data processing require heightened review.

## Release security gate

A releasable commit must, at minimum, pass the repository quality gate, applicable static analysis, dependency security checks, build verification, release-control tests, and runtime readiness gates. A passing source build does not replace verification of production secrets, D1/R2 bindings, Stripe configuration, backup status, tenant isolation, incident status, or other runtime controls.

## Coordinated disclosure

Security researchers acting in good faith should avoid privacy violations, service disruption, destructive testing, persistence, lateral movement, data exfiltration, social engineering, denial-of-service testing, and access beyond what is necessary to demonstrate the issue. Public disclosure should occur only after coordinated remediation or an agreed disclosure date.

© 2026 Apex Governance Group. MatIQ is proprietary software. All rights reserved.
