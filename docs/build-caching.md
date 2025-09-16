# Build Caching with Fingerprinting

## Overview

The MetaMask Mobile CI/CD pipeline uses [Expo Fingerprint](https://docs.expo.dev/build-reference/fingerprint/) to optimize build times by detecting when native code has changed. When only JavaScript/TypeScript code changes occur, the system reuses previously built artifacts and updates the JavaScript bundle, significantly reducing build time by avoiding native compilation.

> **✅ Current Status**: This feature is implemented for **both Android and iOS** platforms.

## How It Works

### Fingerprinting
Generates a unique hash representing native code dependencies (modules, configs, build files) but excludes JavaScript code, assets, and test files.

### Build Decision Flow
1. **Skip**: No mobile code changes detected
2. **Repack**: Native code unchanged - reuse cached APK/.app bundle with new JS bundle
3. **Full Build**: Native code changed - build from scratch and cache artifacts

### Build Methods
- **Full Build**: Complete APK/IPA build when native code changes
- **Repack Build**: Reuse cached artifacts + update JS bundle (much faster)
- **Skip Build**: No build needed for non-mobile changes

## Implementation Details

### Key Components

- **Scripts**: `generate-fingerprint.js`, `check-fingerprint.js`, `repack-app.js` (unified cross-platform tool)
- **GitHub Actions**: `fingerprint-build-check` and `save-build-fingerprint` (cross-platform)
- **Workflow Integration**: Android and iOS E2E build workflows with conditional logic

### Cache Strategy
Cache keys: `{platform}-artifacts-{pr_number}-{fingerprint_hash}`
- Platform-specific: Separate caches for Android/iOS
- PR-specific: Avoid conflicts between PRs
- Fingerprint-based: Auto-invalidation on native code changes

## Validation & Error Handling

### Artifact Validation
- **Android**: Validates APK existence, size (>1MB), and structure
- **iOS**: Validates .app bundle existence, size (>10MB), and Info.plist
- **Fallback**: Restores backup and falls back to full build on validation failure

## Performance Impact

- **JS-only changes**: Repack method avoids native compilation (significant time savings)
- **Native changes**: Full build required
- **Non-mobile changes**: Build skipped entirely

## Troubleshooting

**Common Issues:**
- Fingerprint mismatches: Ensure clean hash output, consistent environment
- Repacking fails: Check bundle paths, verify @expo/repack-app installation
- Cache not found: Verify PR number, check GitHub Actions cache limits

**Debug Commands:**
```bash
yarn fingerprint:generate  # Generate hash
yarn fingerprint:check     # Compare hashes
```

## Current Limitations

- Subject to GitHub Actions 10GB cache limit and automatic cleanup

## References

- [Expo Fingerprint](https://docs.expo.dev/build-reference/fingerprint/)
- [@expo/repack-app](https://www.npmjs.com/package/@expo/repack-app)
