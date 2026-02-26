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

## Root Cause #2: Intermittent Corruption (Under Investigation)

**Observation**: Failures occur even with full builds from scratch, not just with cache+repack.

**What We Know:**
- Build job completes successfully
- Artifact uploads successfully  
- Artifact size looks correct (~126MB)
- All test shards download the same artifact
- All shards fail to install it with identical error

**What Causes Intermittent Corruption:** Unknown. Possibilities:
- Xcode build process edge case
- macOS/Xcode version inconsistency
- GitHub Actions artifact upload issue
- Bundle structure variation in build output
- Race condition or timing issue

**Why All Shards Fail Together:**
```
Build Job (1) → Artifact (corrupt or malformed)
                       ↓
      ┌────────────────┼────────────────┐
      ↓                ↓                ↓
   Shard 1          Shard 2          Shard 3
      ❌                ❌                ❌
All download SAME artifact = cascade failure
```

## Why This Works

1. **Validation Catches Corruption**: Pre-upload and post-repack checks detect bad bundles before upload
2. **No Variable Confusion**: Removes ambiguity of what `PREBUILT_IOS_APP_PATH` points to
3. **Explicit Copying**: Clear that we're extracting the nested bundle from download
4. **Default Path**: Uses Detox's built-in default from `.detoxrc.js`
5. **Same as Android**: Follows the working Android pattern
6. **Fail Fast**: Build fails if bundle is corrupt, preventing bad artifact upload

## Why Failures are Intermittent (Partial Understanding)

**Key Observation**: Path is always wrong, but failures are intermittent. Why?

**Honest Answer**: We don't fully understand the intermittency root cause yet.

### What We Know:
1. **Path is consistently wrong**: `PREBUILT_IOS_APP_PATH` points to wrapper folder
2. **Failures affect all shards**: When one build produces bad artifact, all shards fail
3. **Happens with fresh builds**: Not just cache+repack (per user report)
4. **Build always reports success**: No build failures, only test failures

### Hypotheses (Unconfirmed):
- Artifact upload/download inconsistency with GitHub Actions
- Xcode build occasionally produces malformed bundle structure  
- macOS runner environment variations
- Race condition or timing issue in build process
- Bundle symlink or permission handling edge case

### Why All Shards Fail Together
```
Build Job (1)  →  Artifact (sometimes malformed)
                       ↓
      ┌────────────────┼────────────────┐
      ↓                ↓                ↓
   Shard 1          Shard 2          Shard 3
      ❌                ❌                ❌
All download SAME artifact = cascade failure
```

One malformed artifact cascades to all test shards.

### The Fix (Defensive Programming)
Without knowing exact root cause, the fix uses multiple layers of defense:
1. **Validation**: Catches malformed bundles before upload
2. **Correct Path**: Extracts bundle correctly from nested structure
3. **Fail Fast**: Build fails immediately if bundle is invalid

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
