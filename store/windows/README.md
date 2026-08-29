# matIQ Microsoft Store package

The hosted application is an installable PWA with an offline privacy-safe shell. Generate the final MSIX through PWABuilder or Windows Packaging tooling after Partner Center reserves the product identity.

Before packaging, replace the placeholder `Identity Name` and `Publisher` in `Package.appxmanifest` with the exact Partner Center values, generate required tile assets from the authoritative matIQ emblem, sign with the Partner Center-associated certificate, run Windows App Certification Kit, and upload the `.msixupload` package. Declare Stripe as the secure third-party commerce provider in the submission.
