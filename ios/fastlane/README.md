# Fastlane TestFlight Deployment

This Fastlane configuration handles uploading iOS builds to TestFlight via GitHub Actions.

## Overview

The `upload_to_testflight_only` lane uploads pre-built IPA files to TestFlight and distributes them to external testing groups.

## GitHub Actions

Use the **Upload to TestFlight** workflow (`.github/workflows/upload-to-testflight.yml`) to build iOS and upload to TestFlight. Run it manually from the Actions tab (**workflow_dispatch**).

- **Environment:** `exp`, `beta`, `rc`, or `rc-nightly` (builds `main-exp`, `main-beta`, `main-rc`, or `main-rc-nightly`)
- **TestFlight group:** e.g. MetaMask BETA & Release Candidates, MM Card Team, Ramp Provider Testing

`rc-nightly` is Main nightly from `main` (Mixpanel `*-rc-nightly`, LaunchDarkly ReleaseCandidate). Official Runway / `release/*` Auto RC stays on `rc` / `main-rc`. See [docs/rc-nightly.md](../../docs/rc-nightly.md).

The workflow runs the Build Mobile App workflow (build.yml) for the iOS build and version bump, then uploads the resulting IPA to TestFlight.

## Documentation

- [Fastlane Documentation](https://docs.fastlane.tools)
- [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi)
