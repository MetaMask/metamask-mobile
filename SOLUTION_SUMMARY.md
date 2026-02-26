# iOS E2E Test Failure - Solution Summary

## The Real Problem

The `PREBUILT_IOS_APP_PATH` environment variable was pointing to a **wrapper folder** instead of the actual `.app` bundle.

### Artifact Download Structure

When `actions/download-artifact@v4` downloads the iOS app artifact:

```bash
# Downloaded structure:
artifacts/
  └── main-qa-MetaMask.app/        # ← Regular folder (NOT an .app bundle)
      └── MetaMask.app/             # ← Actual iOS .app bundle
          ├── Info.plist
          ├── MetaMask              # ← Executable
          └── ...
```

### The Bug

The workflow set:
```yaml
env:
  PREBUILT_IOS_APP_PATH: artifacts/main-qa-MetaMask.app  # ← Points to wrapper folder!
```

Detox tried to install `artifacts/main-qa-MetaMask.app` which is just a folder, not a valid `.app` bundle.

The error message confirmed this:
```
main-qa-MetaMask.app is missing its bundle executable.
Please check your build settings to make sure that a bundle executable 
is produced at the path "main-qa-MetaMask.app/MetaMask".
```

## The Solution

**Stop using `PREBUILT_IOS_APP_PATH` and copy the bundle to Detox's default path instead.**

### Before (Broken)
```yaml
env:
  PREBUILT_IOS_APP_PATH: artifacts/main-qa-MetaMask.app  # Points to wrapper folder

# Detox tries to install artifacts/main-qa-MetaMask.app
# ❌ Fails: Not a valid .app bundle
```

### After (Fixed)
```yaml
# No PREBUILT_IOS_APP_PATH variable

- name: Setup iOS artifacts
  run: |
    # Copy the actual .app bundle to default Detox location
    cp -R artifacts/main-qa-MetaMask.app/MetaMask.app \
          ios/build/Build/Products/Release-iphonesimulator/MetaMask.app
    
    # Validate it has required files
    [ -f ios/build/.../MetaMask.app/Info.plist ] || exit 1
    [ -f ios/build/.../MetaMask.app/MetaMask ] || exit 1

# Detox uses default path from .detoxrc.js
# ✅ Works: Valid .app bundle at expected location
```

## Changes Made

### 1. `run-e2e-workflow.yml` (Main Fix)
- **Removed**: `PREBUILT_IOS_APP_PATH` environment variable
- **Added**: Copy step from `artifacts/main-qa-MetaMask.app/MetaMask.app` to `ios/build/.../MetaMask.app`
- **Added**: Validation of copied bundle (Info.plist, executable)

### 2. `build-ios-e2e.yml` (Prevention)
- **Added**: Pre-upload validation to catch invalid builds early
- **Added**: Post-repack validation to detect corruption
- **Checks**: Info.plist exists, executable exists, executable is valid Mach-O binary

### 3. `run-e2e-smoke-tests-ios-flask.yml` (Consistency)
- **Updated**: Already had similar logic, ensured it follows same pattern
- **Added**: Better validation and error messages

## Why This Works

1. **No Variable Confusion**: Removes ambiguity of what `PREBUILT_IOS_APP_PATH` points to
2. **Explicit Copying**: Clear that we're extracting the nested bundle
3. **Default Path**: Uses Detox's built-in default from `.detoxrc.js`
4. **Same as Android**: Follows the working Android pattern
5. **Validated**: Each step validates the bundle is complete and correct

## Verification

To verify the fix works, check the CI logs for:

```
✅ Found iOS app bundle at artifacts/main-qa-MetaMask.app/MetaMask.app
📦 Copying to ios/build/Build/Products/Release-iphonesimulator/MetaMask.app...
📊 iOS app bundle size: 120M
✅ iOS artifacts ready for E2E tests
```

Then Detox should successfully install the app without the previous error.

## Branch

`cursor/invalid-ios-app-artifacts-3a15`

## Commits

- `be90487809` - **Main fix**: Copy bundle to default path, remove PREBUILT variable
- `dd74e7e774` - Add validation after repack
- `4b4f10ae77` - Add validation before upload
- `f9a1047e36` - Update Flask workflow for consistency
- `6f975505be` - Updated investigation docs with correct analysis

---

**Status**: Ready for testing in CI
