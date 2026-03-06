# Fastlane TestFlight Deployment

This Fastlane configuration handles uploading iOS builds to TestFlight via Bitrise CI/CD or GitHub Actions.

## Overview

The `upload_to_testflight_only` lane uploads pre-built IPA files to TestFlight and distributes them to external testing groups.

## GitHub Actions

The **Build Mobile App** workflow (`.github/workflows/build.yml`) can upload to TestFlight when you run it with:

- **Version bump applied:** do not use “Skip version bump” (upload runs only when version bump is applied)
- **Platform:** `ios` or `both`
- **Build name:** `main-rc`, `main-exp`, or `main-prod` (device builds only)

Required **environment secrets** (per GitHub Environment: `build-rc`, `build-exp`, `build-production`):

| Secret | Description |
|--------|-------------|
| `APP_STORE_CONNECT_API_KEY_ISSUER_ID` | App Store Connect API Key Issuer ID |
| `APP_STORE_CONNECT_API_KEY_KEY_ID` | App Store Connect API Key ID |
| `APP_STORE_CONNECT_API_KEY_KEY_CONTENT` | Full contents of the `.p8` private key file |

## Documentation

- [Fastlane Documentation](https://docs.fastlane.tools)
- [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi)
