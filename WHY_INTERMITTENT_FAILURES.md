# Why iOS E2E Failures are Intermittent (Answering Your Questions)

## Question 1: Why Not 100% Failure?

You're right - if `PREBUILT_IOS_APP_PATH` was always wrong, we'd see consistent failures. Here's what's actually happening:

### Two Separate Issues Compound

**Issue #1: Download Structure (Consistent)**
- `actions/download-artifact@v4` always creates: `artifacts/main-qa-MetaMask.app/MetaMask.app`
- `PREBUILT_IOS_APP_PATH` always points to: `artifacts/main-qa-MetaMask.app` (wrong)
- But this alone doesn't always cause failure...

**Issue #2: Repack Corruption (Intermittent)**
The build has two code paths:

```yaml
if cache miss:
  - Full Xcode build from scratch
  - Produces valid .app bundle ✅
  - Uploaded artifact is good
  - Tests work (despite path issue being latent)

if cache hit:
  - Restore .app from cache
  - Run @expo/repack-app to update JS
  - Occasionally corrupts bundle structure ⚠️
  - Missing executable inside bundle
  - Uploaded artifact is bad
  - All tests fail to install
```

### Why It's Intermittent
- **Cache miss builds** → Valid artifacts → Tests usually pass
- **Cache hit + repack** → Sometimes corrupt → **All shards fail**

The wrong path was always there, but only became visible when the repack process produced corrupt bundles.

## Question 2: Why Do ALL Shards Fail Together?

This is the smoking gun that it's a **build artifact problem**, not a test problem.

### The Flow
```
1. Build Job (ONE job)
   ↓
   Produces ONE artifact
   ↓
   Uploads to GitHub Actions
   ↓
2. Test Shards (MANY jobs)
   ├─ Shard 1 downloads SAME artifact
   ├─ Shard 2 downloads SAME artifact  
   ├─ Shard 3 downloads SAME artifact
   └─ ...all download SAME artifact
   
3. If artifact is corrupt:
   ├─ Shard 1: ❌ "missing bundle executable"
   ├─ Shard 2: ❌ "missing bundle executable"
   ├─ Shard 3: ❌ "missing bundle executable"
   └─ ...all fail with IDENTICAL error
```

### Evidence from Run 22441737582

**Build Job:** SUCCESS (uploaded corrupt artifact)
```
✅ iOS App repack completed in 179s
📦 Final app size: 273M
```

**Test Shards:** ALL FAILED (same error)
```
Shard wallet-platform-ios-smoke-1: ❌ "missing its bundle executable"
Shard wallet-platform-ios-smoke-2: ❌ "missing its bundle executable"  
Shard wallet-platform-ios-smoke-3: ❌ "missing its bundle executable"
...
```

This is NOT test flakiness - it's **one build failure cascading** to all test shards.

## The Fix: Defensive Approach Without Full Root Cause

Since we don't fully understand WHY corruption occurs, the fix uses multiple defensive layers:

### 1. Validation (Catch Corruption Early)
```yaml
# In build-ios-e2e.yml
- name: Validate iOS app bundle integrity
  run: |
    # Check for Info.plist
    [ -f "${APP_PATH}/Info.plist" ] || exit 1
    
    # Check for executable
    [ -f "${APP_PATH}/MetaMask" ] || exit 1
    
    # Verify it's a valid Mach-O binary
    file "${APP_PATH}/MetaMask" | grep -q "Mach-O" || exit 1
```

**Effect**: Build job FAILS if bundle is malformed. No bad artifact uploaded.

### 2. Correct Path (Handle Nested Structure)
```yaml
# In run-e2e-workflow.yml  
- name: Setup iOS artifacts
  run: |
    # Copy from downloaded nested structure to Detox default path
    cp -R artifacts/main-qa-MetaMask.app/MetaMask.app \
          ios/build/.../MetaMask.app
    
    # Validate copied bundle
    [ -f ios/build/.../MetaMask.app/Info.plist ] || exit 1
```

**Effect**: Explicitly extract bundle from nested download structure. No PREBUILT variable ambiguity.

## Expected Outcome (Not Proven, But Defensive)

**Current State:**
- Build occasionally produces malformed bundle (cause unknown)
- Build reports SUCCESS
- Bad artifact uploaded
- All shards download bad artifact
- All shards fail → cascade failure

**After Fix:**
- Build occasionally produces malformed bundle (cause still unknown)
- **Build validation catches it** → Build reports FAILURE
- No artifact uploaded
- No cascade to test shards
- Clear error message in build logs

**Also Fixed:** Even when artifact is valid, correct path ensures proper extraction and use.

## Summary

**Why intermittent?** Cache+repack occasionally corrupts, cache miss builds usually work.

**Why all shards fail?** One bad build artifact downloaded by all shards = cascade failure.

**The fix:** Validation + correct path = fail fast at build time + handle downloads correctly.
