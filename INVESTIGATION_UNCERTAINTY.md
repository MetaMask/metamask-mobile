# Investigation Status: Uncertainties Remaining

## What We Know FOR SURE

### 1. The Error Message
```
main-qa-MetaMask.app is missing its bundle executable.
Please check your build settings to make sure that a bundle executable 
is produced at the path "main-qa-MetaMask.app/MetaMask".
```

### 2. The Download Structure  
`actions/download-artifact@v4` creates:
```
artifacts/main-qa-MetaMask.app/     <- Wrapper folder
  └── MetaMask.app/                  <- Actual .app bundle
      └── MetaMask                   <- Executable
```

### 3. The Path Variable
```yaml
env:
  PREBUILT_IOS_APP_PATH: artifacts/main-qa-MetaMask.app
```
This points to the wrapper folder, not the `.app` bundle.

### 4. All Shards Fail Together
When failures occur, ALL test shards fail simultaneously with the identical error, confirming it's a build artifact issue, not test-level flakiness.

## What We DON'T Fully Understand

### Why Is It Intermittent?

**Your observation is correct**: If the path was always wrong, we'd see 100% failure. But iOS E2E has been "quite stable" with only occasional failures.

**Possible Explanations (Hypotheses):**

1. **Artifact Upload Variation?**
   - Maybe sometimes the upload preserves structure differently
   - Need to inspect actual uploaded artifact contents

2. **Build Output Location Varies?**
   - Maybe the Xcode build sometimes puts executable in different location
   - Could be Xcode version or configuration dependent

3. **Race Condition in Upload?**
   - Maybe symlinks or bundle structure inconsistently captured
   - GitHub Actions artifact upload might have edge cases

4. **Cache Restore Corruption?**
   - Even though you said failures happen with fresh builds
   - Maybe cache restore of DerivedData affects bundle structure?

5. **Permissions or Symlink Issues?**
   - macOS .app bundles can have symlinks
   - Upload might not always preserve them correctly

## What We Need to Investigate

1. **Compare a working vs failing artifact**
   - Download both and inspect internal structure
   - Check if executable location differs
   - Verify symlinks and permissions

2. **Check build logs for pattern**
   - Do failures correlate with specific runner versions?
   - Xcode version differences?
   - macOS version differences?

3. **Inspect uploaded artifact metadata**
   - Size comparison between working and failing
   - Creation timestamps
   - Compression methods

## Why The Fix Should Still Work

Even without understanding the root cause of intermittency, the fix should prevent the failures:

### Defense Layer 1: Validation Before Upload
```yaml
- name: Validate iOS app bundle integrity
  run: |
    [ -f "${APP_PATH}/MetaMask" ] || exit 1
    file "${APP_PATH}/MetaMask" | grep -q "Mach-O" || exit 1
```
**Effect**: Build fails if bundle is corrupt, no bad artifact uploaded.

### Defense Layer 2: Copy to Correct Location
```yaml
- name: Setup iOS artifacts
  run: |
    # Extract from download wrapper to Detox default path
    cp -R artifacts/main-qa-MetaMask.app/MetaMask.app \
          ios/build/.../MetaMask.app
```
**Effect**: Even if nested structure varies, we explicitly extract the bundle.

### Defense Layer 3: Validation After Copy
```yaml
[ -f ios/build/.../MetaMask.app/Info.plist ] || exit 1
[ -f ios/build/.../MetaMask.app/MetaMask ] || exit 1
```
**Effect**: Test shard fails fast if bundle is incomplete.

## Next Steps for Complete Understanding

1. Download and compare artifacts from:
   - A successful run 
   - A failed run with the "missing executable" error

2. Check if the uploaded artifact itself is corrupt or if download extracts it incorrectly

3. Determine if this is:
   - An Xcode build issue
   - A GitHub Actions artifact issue  
   - Something else entirely

## Current Status

**Fix is implemented** but based on defensive programming rather than full root cause understanding. It should work by:
- Validating before upload
- Extracting correctly regardless of nesting
- Using explicit paths instead of variables

**Testing needed** to confirm the fix resolves the intermittent failures.
