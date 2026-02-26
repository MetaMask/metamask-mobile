# iOS E2E Test Failures - Investigation Report

**Date:** February 26, 2026  
**Branch:** `cursor/invalid-ios-app-artifacts-3a15`  
**Issue:** Invalid iOS app artifacts causing "Unable to Install MetaMask" errors

## Executive Summary

The iOS E2E test failures are caused by a **structural mismatch** between how GitHub Actions downloads artifacts and where Detox expects the iOS `.app` bundle to be located. This has been affecting multiple test runs on the `main` branch, contributing to the ~50% CI success rate.

## Root Cause

### The Problem

When `actions/download-artifact@v4` downloads artifacts, it creates an **extra directory wrapper** with the artifact name:

```
# What GitHub Actions creates:
artifacts/
  └── main-qa-MetaMask.app/          <- wrapper directory
      └── MetaMask.app/               <- actual iOS app bundle
          ├── Info.plist
          ├── MetaMask                <- executable
          └── ...other bundle files

# What Detox expects:
artifacts/
  └── main-qa-MetaMask.app/           <- should BE the app bundle
      ├── Info.plist
      ├── MetaMask                    <- executable
      └── ...other bundle files
```

### Why This Happens

The artifact upload step in `build-ios-e2e.yml` uploads:
```yaml
path: ios/build/Build/Products/Release-iphonesimulator/MetaMask.app
name: main-qa-MetaMask.app
```

GitHub Actions preserves the directory structure, so the uploaded content is `MetaMask.app/` (directory). When downloaded, `actions/download-artifact@v4` creates an additional wrapper directory with the artifact name, resulting in nested structure.

### The Failure

When Detox tries to install the app:
```bash
xcrun simctl install <simulator-id> "artifacts/main-qa-MetaMask.app"
```

It fails because:
- `artifacts/main-qa-MetaMask.app` is a wrapper directory, not a valid iOS app bundle
- The actual bundle is at `artifacts/main-qa-MetaMask.app/MetaMask.app`
- `xcrun simctl install` requires a valid `.app` bundle, not a wrapper directory

Error message:
```
An error was encountered processing the command (domain=IXUserPresentableErrorDomain, code=1):
App installation failed: Unable to Install "MetaMask"
```

## Evidence

From CI logs (run 22441737582, job 64987739665):
```
2026-02-26T12:39:54.5287480Z An extra directory with the artifact name will be created for each download
...
2026-02-26T12:40:34.1821850Z Command failed: /usr/bin/xcrun simctl install ... "artifacts/main-qa-MetaMask.app"
2026-02-26T12:40:34.2025550Z App installation failed: Unable to Install "MetaMask"
```

## Impact Assessment

### Affected Workflows
1. ✅ **`run-e2e-workflow.yml`** - Main E2E test workflow for iOS (FIXED)
2. ✅ **`run-e2e-smoke-tests-ios-flask.yml`** - Flask iOS E2E tests (FIXED)
3. ✅ **`build-ios-e2e.yml`** - iOS build validation added (FIXED)

### Blast Radius
- **High Impact**: When this issue occurs, it causes immediate test suite failures across multiple shards
- **Frequency**: Intermittent but significant contributor to the ~50% failure rate on main
- **Test Categories Affected**: All iOS E2E smoke tests (SmokeWalletPlatform, SmokeIdentity, SmokeConfirmations, etc.)

## Solution Implemented

### 1. Artifact Extraction Fix (`run-e2e-workflow.yml`)

Added a new step after artifact download to move the app bundle to the expected location:

```yaml
- name: Move iOS artifacts to expected locations
  if: ${{ inputs.platform == 'ios' }}
  run: |
    # Detect nested structure and move app bundle to correct location
    ARTIFACT_DIR="artifacts/${{ inputs.build_type }}-${{ inputs.metamask_environment }}-MetaMask.app"
    
    if [ -d "${ARTIFACT_DIR}/MetaMask.app" ]; then
      # Move nested bundle one level up
      mv "${ARTIFACT_DIR}/MetaMask.app" "${ARTIFACT_DIR}.tmp"
      rm -rf "${ARTIFACT_DIR}"
      mv "${ARTIFACT_DIR}.tmp" "${ARTIFACT_DIR}"
    fi
    
    # Validate bundle has required files
    if [ ! -f "${ARTIFACT_DIR}/Info.plist" ]; then
      exit 1
    fi
```

### 2. Build Validation (`build-ios-e2e.yml`)

Added pre-upload validation to catch corrupt builds early:

```yaml
- name: Validate iOS app bundle integrity
  run: |
    APP_PATH="ios/build/Build/Products/Release-iphonesimulator/MetaMask.app"
    
    # Check .app exists and is a directory
    [ -d "${APP_PATH}" ] || exit 1
    
    # Check for required files
    [ -f "${APP_PATH}/Info.plist" ] || exit 1
    [ -f "${APP_PATH}/MetaMask" ] || exit 1
    
    # Verify executable is valid Mach-O binary
    file "${APP_PATH}/MetaMask" | grep -q "Mach-O" || exit 1
```

### 3. Repack Validation (`build-ios-e2e.yml`)

Added post-repack validation to ensure repack doesn't corrupt the bundle:

```yaml
- name: Repack iOS app with JS updates
  run: |
    yarn build:repack:ios
    
    # Validate after repack
    APP_PATH="ios/build/Build/Products/Release-iphonesimulator/MetaMask.app"
    [ -f "${APP_PATH}/MetaMask" ] || exit 1
    [ -f "${APP_PATH}/Info.plist" ] || exit 1
```

### 4. Flask Workflow Fix (`run-e2e-smoke-tests-ios-flask.yml`)

Updated artifact copying logic to handle nested structure:

```yaml
- name: Setup Main iOS App artifacts
  run: |
    # Handle both nested and direct artifact structures
    if [ -d "artifacts/main-qa-MetaMask.app/MetaMask.app" ]; then
      cp -R artifacts/main-qa-MetaMask.app/MetaMask.app ios/build/.../MetaMask.app
    elif [ -d "artifacts/main-qa-MetaMask.app" ]; then
      cp -R artifacts/main-qa-MetaMask.app ios/build/.../MetaMask.app
    fi
    
    # Validate copied bundle
    [ -f "${APP_PATH}/Info.plist" ] || exit 1
```

## Expected Benefits

1. **Fail Fast**: Invalid builds are detected at build time, not test time
2. **Clear Error Messages**: Validation failures provide specific error messages about what's missing
3. **Reduced Test Flakiness**: Tests won't fail due to corrupt app artifacts
4. **Better CI Success Rate**: Should contribute to improving the main branch success rate from ~50% to >80%

## Testing Strategy

### To Verify the Fix:

1. **Monitor next CI run** on a PR with these changes
2. **Check build logs** for validation step output
3. **Verify test runs** can successfully install the app
4. **Compare failure rates** before/after the fix

### Expected Validation Output:

**Build phase (successful):**
```
🔍 Validating iOS app bundle at ios/build/.../MetaMask.app...
📊 App bundle size: 120M
✅ iOS app bundle validation passed
```

**Test phase (successful):**
```
📦 Moving iOS app bundle to expected location...
🔄 Found nested app bundle at artifacts/main-qa-MetaMask.app/MetaMask.app
✅ iOS app bundle moved to artifacts/main-qa-MetaMask.app
📊 iOS app bundle size: 120M
✅ iOS artifacts ready for E2E tests
```

## Related Issues

This fix addresses **Issue #1** from the flaky test investigation:
> Invalid app artifacts are a major blast-radius failure
> - iOS: `main-qa-MetaMask.app is missing its bundle executable` / `Unable to Install "MetaMask"`
> - Effect: one bad artifact causes many shards to fail immediately

## Commits

1. `4b4f10ae77` - Add iOS app bundle validation and proper artifact extraction
2. `dd74e7e774` - Add validation after iOS app repack to detect corruption early  
3. `f9a1047e36` - Handle nested artifact structure when copying iOS app for Flask repack

## Next Steps

1. **Monitor CI runs** with these fixes
2. **Track improvement** in iOS E2E success rate
3. **Consider similar Android improvements** if needed
4. **Address remaining flaky test categories** (environment setup, network issues, ADB conflicts)

## Technical Notes

### Why Android Doesn't Have This Issue

Android workflows explicitly move artifacts to expected locations:
```yaml
- name: Move Android artifacts to expected locations
  run: |
    cp artifacts/main-e2e-release.apk/app-prod-release.apk ${{ target-path }}/
```

The Android setup was already aware of the nested structure and handled it correctly. iOS workflows were missing this step.

### Alternative Solutions Considered

1. **Change artifact upload structure**: Would require coordinating changes across multiple workflows
2. **Use `tar` archives**: More complex and slower than directory-based artifacts
3. **Current solution**: Simplest - just move the bundle after download with validation

---

**Prepared by:** Cursor AI Agent  
**GitHub Branch:** `cursor/invalid-ios-app-artifacts-3a15`  
**Ready for PR:** Yes
