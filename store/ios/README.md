# matIQ iOS distribution project

1. Install Xcode 16+ and XcodeGen on macOS.
2. Copy the 1024×1024 matIQ icon into `matIQ/Assets.xcassets/AppIcon.appiconset`.
3. Run `xcodegen generate`, select the Apex Governance Apple Developer team, and validate the bundle identifier.
4. Configure StoreKit subscription products in App Store Connect before enabling iOS purchases.
5. Archive with the Release configuration, validate, upload to App Store Connect, and distribute through TestFlight first.

The native shell adds device authentication, native navigation/share behavior, camera/photo permissions, deep-link entitlement, and background-upload authority. Production signing, StoreKit product identifiers, privacy nutrition labels, and App Store agreements remain publisher-controlled gates.
