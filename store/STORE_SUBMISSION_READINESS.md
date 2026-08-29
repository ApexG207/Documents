# matIQ store submission control register

## Release identity

- Product name: matIQ Jiu-Jitsu Intelligence
- Publisher: Apex Governance Group
- Apple bundle ID: `com.apexgovernance.matiq`
- Microsoft product identity: reserve in Partner Center before packaging
- Initial release: United States, English

## Completed engineering controls

- Installable PWA manifest, offline privacy-safe shell, icons, theme metadata, and service worker
- iOS native project source with biometric/device authentication, native navigation, sharing, camera/photo permission declarations, and universal-link entitlement
- Windows PWA/MSIX source manifest
- In-app account deletion request, cancellation, hold handling, and automated anonymization process
- Community report and user block APIs with urgent minor-safety prioritization
- Existing guardian consent, athlete verification, role-based authorization, audit, retention, and legal-hold controls

## External publisher gates

1. Enroll Apex Governance Group in the Apple Developer Program as an organization.
2. Reserve the app in App Store Connect and configure certificates, identifiers, profiles, agreements, tax, and banking.
3. Create StoreKit subscription products and implement verified App Store transaction/entitlement synchronization before enabling iOS digital subscription purchase.
4. Complete Apple privacy nutrition labels, age rating, export-compliance answers, review notes, demo credentials, screenshots, support URL, and privacy URL.
5. Reserve matIQ in Microsoft Partner Center using a company account and replace package identity placeholders.
6. Generate and sign the MSIX on Windows, run certification, and declare Stripe commerce.
7. Upload iOS archive to TestFlight and Windows package to Partner Center; adjudicate reviewer findings before general availability.

## Release decision

Do not enable paid iOS digital feature unlocks through Stripe inside the iOS application. Use StoreKit or ship the first iOS build as a free companion for existing accounts with no purchase calls to action. Web and Windows subscriptions may remain Stripe-backed. All channel proceeds must normalize to reconciled net revenue before the governed 90/2/8 allocation.
