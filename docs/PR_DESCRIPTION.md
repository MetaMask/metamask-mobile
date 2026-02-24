# PR: Build-time Feature Flag Defaults + GH Actions Artifact Improvements

**Branch:** `build/test-gh-actions-feature-flags`

---

## Summary

This PR has two distinct scopes:

1. **Build-time feature flag defaults for GitHub Actions builds** — seeds `RemoteFeatureFlagController` with production-accurate LD values from `builds.yml` so GH Actions builds behave correctly before the first remote fetch.
2. **GH Actions artifact upload improvements** — mirrors Bitrise's artifact deployment behavior: scoped paths (no more full-directory dumps), zipped `.app` for simulator builds, and separate dev/release handling for Android.

---

## Motivation

### Feature flag defaults

GH Actions builds (e.g. `main-dev`, `main-exp`) previously had no seed values for `RemoteFeatureFlagController`. On first launch, before the controller fetched from LaunchDarkly, all flags would be `undefined` — causing features like Earn, Perps, and Predict to behave as disabled regardless of their actual production state. Bitrise handled this differently because it used a static env injection step.

### Artifact uploads

The `Upload iOS artifacts` step was uploading `ios/build/Build/Products/` — the entire Xcode build output (~180 frameworks, `.a` static libs, intermediate objects) — when developers only need the `.app` bundle. Similarly, Android was uploading the entire `android/app/build/outputs/` directory. This mismatched Bitrise's behavior which scopes to renamed files only.

---

## Changes

### `builds.yml`

- Migrated `_remote_feature_flags` from flat booleans to `VersionGated` `{ enabled, minimumVersion }` objects matching actual LaunchDarkly production values.
- Added all missing flags: `bitcoinAccounts`, `tronAccounts`, `enableMultichainAccounts`, `perpsHip3Enabled`, `perpsFeedback`, `homepageRedesignV1`, `otaUpdatesEnabled`, token details A/B flags, and more.
- These values are serialized as `REMOTE_FEATURE_FLAG_DEFAULTS` JSON by `apply-build-config.js` during the "Apply build config" CI step.

### `scripts/apply-build-config.js`

Already serialized `remote_feature_flags` into `REMOTE_FEATURE_FLAG_DEFAULTS`. No changes needed — the updated `builds.yml` structure flows through automatically.

### `app/core/Engine/controllers/remote-feature-flag-controller-init.ts`

- Added `getInitialState()`: merges build-time defaults (from `REMOTE_FEATURE_FLAG_DEFAULTS`) with persisted state. Persisted state always wins.
- Guard: only applies when `GITHUB_ACTIONS=true` and `E2E!=true`. Bitrise and local dev are unaffected.

### `app/core/Engine/controllers/remote-feature-flag-build-time-defaults-config.ts` _(new)_

- Injectable `shouldApply()` config module so tests can mock the GH Actions guard without touching `process.env`.

### `app/selectors/featureFlagController/legalNotices/index.ts`

- Added `useRemoteOnly` guard: in GH Actions (non-E2E), skip the `MM_*` env override and use the remote flag value directly (seeded from `builds.yml`).

### `app/selectors/featureFlagController/networkBlacklist/index.ts`

- Same `GITHUB_ACTIONS` guard as above.

### `app/components/UI/Earn/selectors/featureFlags/index.ts`

### `app/components/UI/Perps/selectors/featureFlags/index.ts`

### `app/components/UI/Predict/selectors/featureFlags/index.ts`

- Removed redundant inline comments (no logic changes).

### `app/components/Views/Settings/AppInformation/index.js`

- Added debug display of build-time flags under Settings → App Information (reads `REMOTE_FEATURE_FLAG_DEFAULTS`). Useful for verifying the correct flags are seeded in a given build.

### `babel.config.tests.js`

- Added `app/components/UI/Predict/selectors/featureFlags/index.ts`, `legalNotices/index.ts`, and `networkBlacklist/index.ts` to the `process.env` guard exclusion list so tests can read env vars without Babel stripping them.

### `.github/workflows/build.yml`

- **Rename step**: added `id: rename` so subsequent steps can reference `steps.rename.outputs.*`.
- **iOS simulator**: uploads `steps.rename.outputs.ios_deploy_path` (a single zipped `.app`) instead of entire `Build/Products/`.
- **iOS device**: uploads `ios_deploy_path` (`.ipa`) + `ios_archive_path` (`.xcarchive`) instead of entire `build/output/` + glob.
- **Android dev** (`CONFIGURATION=Debug`): uploads only the renamed `.apk`.
- **Android release**: uploads renamed `.apk` + `.aab`.
- Removed separate "Zip iOS simulator app" shell step (moved into `rename-artifacts.js`).

### `scripts/rename-artifacts.js`

- Added `setGithubOutput(key, value)`: writes to `$GITHUB_OUTPUT` (mirrors Bitrise's `envman add`). No-ops outside GH Actions.
- iOS simulator: calls `ditto -c -k --sequesterRsrc --keepParent` to zip `.app`, writes `ios_deploy_path` (zip path).
- iOS device: writes `ios_deploy_path` (`.ipa`) and `ios_archive_path` (renamed `.xcarchive`).
- Android: writes `android_apk_path` (renamed `.apk`) and `android_aab_path` (renamed `.aab`, release builds only).

---

## How it works end-to-end

```
builds.yml
  └─ remote_feature_flags: { perpsPerpTradingEnabled: { enabled: true, minimumVersion: '7.56.2' }, ... }
       │
       ▼ (apply-build-config.js --export-github-env)
REMOTE_FEATURE_FLAG_DEFAULTS='{"perpsPerpTradingEnabled":{"enabled":true,...},...}'
       │
       ▼ (remoteFeatureFlagControllerInit, GITHUB_ACTIONS=true, E2E!=true)
getInitialState() → merges defaults with persistedState (persisted wins)
       │
       ▼
RemoteFeatureFlagController initialized with production-accurate seed values
       │
       ▼ (async, a few seconds after launch)
controller.updateRemoteFeatureFlags() → fetches live LD values, overwrites seed
```

---

## Artifact flow (iOS simulator)

```
Xcode build → ios/build/Build/Products/Debug-iphonesimulator/MetaMask.app
                      │
                      ▼ rename-artifacts.js
             metamask-simulator-dev-main-X.Y.Z-N.app  (cp -r)
                      │
                      ▼ ditto (inside rename-artifacts.js)
             metamask-simulator-dev-main-X.Y.Z-N.zip
                      │
                      ▼ setGithubOutput('ios_deploy_path', zipPath)
                      │
                      ▼ Upload iOS simulator artifacts
             GH Actions artifact: ios-main-dev
               └─ metamask-simulator-dev-main-X.Y.Z-N.zip
```

---

## Testing

- **Unit tests**: `304 passed, 304 total` across 9 test suites
  - `remote-feature-flag-controller-init.test.ts`
  - `Earn/selectors/featureFlags/index.test.ts`
  - `Perps/selectors/featureFlags/index.test.ts`
  - `Predict/selectors/featureFlags/index.test.ts`
  - `featureFlagController/legalNotices/index.test.ts`
  - `featureFlagController/networkBlacklist/index.test.ts`

- **Script**: `node scripts/rename-artifacts.js` — syntax valid, usage guard works correctly.

---

## Checklist

- [x] No `any` TypeScript types introduced
- [x] `setGithubOutput` is clearly named (not `setOutput`) to signal it's GH Actions-specific
- [x] Build-time defaults guard (`shouldApply()`) is injectable for tests — no `process.env` hacks in tests
- [x] Persisted state always wins over build-time defaults (correct merge order)
- [x] E2E builds explicitly excluded from defaults seeding (`E2E !== 'true'`)
- [x] Bitrise and local dev unaffected (guard only activates in GH Actions)
- [x] Artifact upload paths match Bitrise's scoped `deploy_path` behavior
- [x] `ditto` used for `.app` zip (preserves resource forks and symlinks required by macOS app bundles)

---

## Related

- Bitrise equivalent: `_ios_build_template` → `deploy-to-bitrise-io` with `deploy_path: $BINARY_DEPLOY_PATH` + `is_compress: true`
- Bitrise equivalent: `_android_build_template` → `deploy-to-bitrise-io` with `run_if: IS_DEV_BUILD != true` for AAB
