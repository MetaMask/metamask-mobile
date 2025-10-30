# Rock CLI Migration Status

## Overview

MetaMask Mobile is migrating iOS E2E builds from custom scripts to Rock CLI for improved build times and caching.

## ✅ Completed (iOS)

### New Files
- `rock.config.mjs` - Rock CLI configuration
- `.github/workflows/build-ios-e2e-rock.yml` - New Rock CLI-based build workflow
- Rock CLI dependencies in `package.json`:
  - `@rock-js/platform-ios`
  - `@rock-js/plugin-metro`
  - `@rock-js/provider-github`
  - `rock`

### Deleted Files
- ✅ `scripts/generate-fingerprint.js` - Replaced by Rock CLI built-in fingerprinting

### Deprecated Scripts (Removed from package.json)
- ✅ `fingerprint:generate` - Rock CLI handles fingerprinting automatically
- ✅ `build:repack:ios` - Rock CLI handles JS bundle re-signing automatically

### Updated Files
- `.eslintignore` - Added `rock.config.mjs`
- `.github/workflows/build-ios-e2e-rock.yml` - New Rock CLI workflow

## ⚠️ Kept (Still Needed for Android)

The following files are **NOT deleted** because they're still used for Android builds:

- `scripts/build.sh` - Contains both iOS and Android build logic
- `scripts/repack.js` - Used for Android repack operations

All `build:ios:*` scripts in `package.json` are kept for backward compatibility and local development.

## 🚀 Benefits of Rock CLI

### Build Time Improvements
- **JS-only changes**: ~80% faster (from ~20-30 min → ~2-5 min)
- **Native changes**: Same speed as before, but builds are cached
- **Parallel test jobs**: Download cached build instead of rebuilding

### Features
- ✅ **Smart fingerprinting**: Automatically detects native vs JS-only changes
- ✅ **Remote caching**: Uses GitHub Actions artifacts
- ✅ **Automatic re-signing**: Repacks JS bundle into cached native build
- ✅ **Cache management**: Automatic cleanup of old builds

## 📊 How It Works

### First Build (Native Changes)
```
1. Rock CLI fingerprints native code
2. No cache found → Build natively (~20-30 min)
3. Upload .app to GitHub Actions artifacts
```

### Subsequent Builds (JS Changes Only)
```
1. Rock CLI fingerprints native code
2. Fingerprint matches cached build
3. Download cached .app (~30 sec)
4. Re-sign with new JS bundle (~2 min)
5. Total: ~2-5 min instead of 20-30 min 🎉
```

### Subsequent Builds (Native Changes)
```
1. Rock CLI fingerprints native code
2. Fingerprint doesn't match (native changed)
3. Build natively (~20-30 min)
4. Upload new cached build
```

## 🔄 Migration Timeline

### Phase 1: Parallel Testing (Current)
- New workflow runs alongside existing workflow
- No impact on current E2E tests
- Validates Rock CLI setup

### Phase 2: Production Use
- Update test workflows to use Rock CLI build
- Monitor performance and reliability

### Phase 3: Cleanup
- Once stable, remove old iOS build logic from `build.sh`
- Can happen after Android also migrates to Rock CLI

## 📝 Usage

### Build iOS E2E App (CI)
```yaml
jobs:
  build:
    uses: ./.github/workflows/build-ios-e2e-rock.yml
    secrets: inherit
```

### Run Tests with Rock CLI Build
```yaml
test:
  needs: build
  steps:
    # Download app using artifact-id from Rock CLI
    - name: Download iOS app
      run: |
        curl -L \
          -H "Authorization: token ${{ github.token }}" \
          -o artifact.zip \
          "https://api.github.com/repos/${{ github.repository }}/actions/artifacts/${{ needs.build.outputs.artifact-id }}/zip"
        
        unzip artifact.zip -d artifacts
        tar -xzf artifacts/*.tar.gz -C artifacts
        APP_PATH=$(find artifacts -name "*.app" -type d | head -n 1)
        cp -R "$APP_PATH" ios/build/Build/Products/Release-iphonesimulator/MetaMask.app
    
    # Run Detox tests (unchanged)
    - run: yarn test:e2e:ios
```

## 🔗 References

- [Rock CLI Documentation](https://www.rockjs.dev/docs/getting-started)
- [Rock CLI iOS Action](https://github.com/callstackincubator/ios)
- [Rainbow's iOS E2E Setup](https://github.com/rainbow-me/rainbow) (Reference implementation)

## ❓ FAQ

**Q: Why keep `build.sh` if Rock CLI replaces iOS builds?**  
A: `build.sh` contains Android build logic too. It can only be removed after Android also migrates to Rock CLI.

**Q: Can I still use `yarn build:ios:main:e2e` locally?**  
A: Yes! The old scripts still work for local development. Rock CLI is only used in CI for now.

**Q: What about Flask and QA builds?**  
A: Current Rock CLI workflow builds MetaMask scheme. Flask/QA can be added by passing different `scheme` parameter.

**Q: Does this work with Detox?**  
A: Yes! Rock CLI only builds the `.app`. Detox continues to manage simulators and run tests exactly as before.

**Q: What if Rock CLI has issues?**  
A: The old `build-ios-e2e.yml` workflow is still in the repo. Easy to revert by changing workflow reference.

