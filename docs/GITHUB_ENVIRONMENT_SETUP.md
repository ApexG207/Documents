# GitHub Environment Setup

Create four GitHub environments: staging, production, app-store, and microsoft-store.

## Required controls

- staging: at least one technical reviewer.
- production: product and technical approval; add privacy/safeguarding review for data or minor-facing changes.
- app-store: product, privacy, and store-submission approval.
- microsoft-store: product and store-submission approval.
- Prevent self-review where the plan supports it.
- Restrict production deployments to main and immutable version tags.
- Set deployment branch protection and required status checks on main.

## Environment secrets

- staging/production: WEB_DEPLOY_HOOK_URL and optional WEB_HEALTHCHECK_URL.
- app-store: Apple signing and App Store Connect credentials only after organizational enrollment.
- microsoft-store: Partner Center signing/publisher credentials only after identity reservation.
- Runtime application secrets remain in the hosting provider, not workflow files.

## Main branch rules

Require pull requests, CODEOWNERS review, quality gate, CodeQL, conversation resolution, linear or governed merge history, and no force pushes or deletions. The GitHub connector cannot safely create these account-level rules; an owner must enable them in repository settings.
