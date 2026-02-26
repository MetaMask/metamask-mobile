# iOS E2E Test Failure - Investigation & Solution

## Why All Shards Fail Simultaneously

When iOS E2E tests fail, **ALL shards fail at once**, not just one. This is the key insight: the problem is with the **uploaded artifact** from the build job, not with how individual test shards download or handle it.

### The Pattern
- Build job succeeds and uploads artifact  
- All test shards download the SAME artifact
- All test shards fail to install it
- Error: `"main-qa-MetaMask.app is missing its bundle executable"`

## Root Cause #1: PREBUILT_IOS_APP_PATH Points to Wrong Location

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

## Root Cause #2: Intermittent Corruption from Cache+Repack

The build has two code paths:
1. **Full build** (cache miss) - consistently works ✅
2. **Restore + Repack** (cache hit) - occasionally corrupts the bundle ⚠️

When cache is hit, the workflow:
1. Restores cached `.app` bundle from previous build
2. Runs `@expo/repack-app` to update JavaScript
3. Sometimes this repack process corrupts the bundle structure
4. Build job still succeeds and uploads corrupt artifact
5. All test shards download the corrupt artifact  
6. All shards fail to install it

### Evidence from Failing Run
```
Cache hits: 2 (XCode + iOS app)
📦 Repacking iOS app with updated JavaScript bundle using @expo/repack-app...
✅ 🎉 iOS App repack completed in 179s
📦 Final app size: 273M

# Build job: SUCCESS ✅
# But artifact is corrupt - missing executable inside bundle
# All test shards fail: "main-qa-MetaMask.app is missing its bundle executable"
```

## Why This Works

1. **Validation Catches Corruption**: Pre-upload and post-repack checks detect bad bundles before upload
2. **No Variable Confusion**: Removes ambiguity of what `PREBUILT_IOS_APP_PATH` points to
3. **Explicit Copying**: Clear that we're extracting the nested bundle from download
4. **Default Path**: Uses Detox's built-in default from `.detoxrc.js`
5. **Same as Android**: Follows the working Android pattern
6. **Fail Fast**: Build fails if bundle is corrupt, preventing bad artifact upload

## Why Failures Were Intermittent

**Question**: If `PREBUILT_IOS_APP_PATH` always points to the wrong location, why don't we have 100% failure?

**Answer**: Two compounding issues create intermittent failures:

### Issue #1: Path Always Wrong
`PREBUILT_IOS_APP_PATH=artifacts/main-qa-MetaMask.app` points to wrapper folder, not bundle.

### Issue #2: Sometimes the Artifact is Corrupt  
- When **cache miss** → full build → artifact is valid → **path issue is masked** (test failure is rare/different)
- When **cache hit** → repack occasionally corrupts bundle → **both path AND corruption** → consistent failure

### Why All Shards Fail Together
```
Build Job (1)  →  Bad Artifact
                       ↓
      ┌────────────────┼────────────────┐
      ↓                ↓                ↓
   Shard 1          Shard 2          Shard 3
      ❌                ❌                ❌
   (same bad artifact downloaded by all)
```

One corrupt artifact from build = cascading failure across all test shards.

### The Fix Addresses Both Issues
1. **Validation**: Catches corrupt bundles before upload (build fails fast)
2. **Correct Path**: Copies actual bundle to default location (no PREBUILT variable needed)

## Verification

To verify the fix works, check the CI logs for:

**Build phase:**
```
🔍 Validating iOS app bundle...
✅ iOS app bundle validation passed
```

**Test phase:**
```
✅ Found iOS app bundle at artifacts/main-qa-MetaMask.app/MetaMask.app
📦 Copying to ios/build/Build/Products/Release-iphonesimulator/MetaMask.app...
📊 iOS app bundle size: 120M
✅ iOS artifacts ready for E2E tests
```

Then Detox should successfully install the app without errors.

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
