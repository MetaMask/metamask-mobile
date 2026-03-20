# Fastlane TestFlight Deployment

This Fastlane configuration handles uploading iOS builds to TestFlight via Bitrise CI/CD or GitHub Actions.

## Overview

The `upload_to_testflight_only` lane uploads pre-built IPA files to TestFlight and, by default, distributes them to external testing groups (same as historical Bitrise behavior). Set `TESTFLIGHT_DISTRIBUTE_EXTERNAL=false` (or `0`, `no`, `off`) for upload-only when the App Store Connect API key cannot manage external beta groups.

## GitHub Actions

Use the **Upload to TestFlight** workflow (`.github/workflows/upload-to-testflight.yml`) to build iOS and upload to TestFlight. Run it manually from the Actions tab (**workflow_dispatch**).

- **Environment:** `exp`, `beta`, or `rc` (builds `main-exp`, `main-beta`, or `main-rc`)
- **TestFlight group:** e.g. MetaMask BETA & Release Candidates, MM Card Team, Ramp Provider Testing

The workflow runs the Build Mobile App workflow (build.yml) for the iOS build and version bump, then uploads the resulting IPA to TestFlight.

## Documentation

- [Fastlane Documentation](https://docs.fastlane.tools)
- [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi)
