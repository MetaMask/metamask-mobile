# Expo Library Migration Research: Strategic Analysis for MetaMask Mobile

> **Author:** Mobile Platform Team  
> **Date:** May 21, 2026  
> **Status:** Research / RFC  
> **Scope:** Evaluating the replacement of community `react-native-*` libraries with Expo SDK equivalents

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [The Upgrade Problem: By the Numbers](#the-upgrade-problem-by-the-numbers)
4. [What "Switching to Expo Libraries" Means](#what-switching-to-expo-libraries-means)
5. [Full Library Audit: 84 Native Dependencies](#full-library-audit-84-native-dependencies)
6. [Migration Candidates: Detailed Analysis](#migration-candidates-detailed-analysis)
7. [Libraries That Cannot Be Replaced](#libraries-that-cannot-be-replaced)
8. [Industry Case Studies](#industry-case-studies)
9. [ROI Analysis: Does It Make Sense?](#roi-analysis-does-it-make-sense)
10. [Long-Term Upgrade Time Savings](#long-term-upgrade-time-savings)
11. [Migration Strategy](#migration-strategy)
12. [Implementation Timeline & Effort](#implementation-timeline--effort)
13. [Risk Assessment](#risk-assessment)
14. [Recommendation](#recommendation)
15. [References](#references)

---

## Executive Summary

MetaMask Mobile currently maintains **84 `react-native-*` community libraries** alongside **17 Expo packages**. React Native version upgrades are the single most expensive recurring maintenance task, with the 0.76.6 upgrade touching 42,000+ lines and the 0.81.5 upgrade taking ~2.5 months of active development.

This document evaluates whether migrating community libraries to their Expo SDK equivalents would reduce long-term upgrade cost. The analysis finds:

- **18 libraries** have direct Expo SDK replacements (6 are already migrated)
- **21 libraries** already work seamlessly with Expo and need no change
- **19 libraries** are JS-only and unaffected by native upgrades
- **26 libraries** have no Expo equivalent and must remain as-is (crypto, BLE, forks)

**Key finding:** Migrating the remaining 12 replaceable libraries would reduce the native dependency surface by ~14%, saving an estimated **1-2 weeks per major RN upgrade** and eliminating a class of patch files. Combined with CNG adoption (analyzed separately in `expo-cng-integration-research.md`), total upgrade time could drop from **6-10 weeks to 2-3 weeks**.

**Estimated migration effort:** 4-6 weeks for the library swap, achievable incrementally across normal sprint work without a dedicated migration branch.

---

## Current State Analysis

### Framework Versions

| Component    | Version                  |
| ------------ | ------------------------ |
| React Native | 0.76.9 (double-patched)  |
| React        | 18.3.1                   |
| Expo SDK     | 52.0.47                  |
| Hermes       | Enabled (both platforms) |

### Dependency Profile

| Category                             | Count                |
| ------------------------------------ | -------------------- |
| Total `dependencies`                 | 322                  |
| Total `devDependencies`              | 153                  |
| `react-native-*` libraries           | 84                   |
| `expo-*` libraries                   | 17                   |
| Patched packages (`.yarn/patches/`)  | 11                   |
| Custom native modules (hand-written) | 6 (4 Android, 2 iOS) |
| Build flavors                        | 3 (prod, qa, flask)  |
| Signing configurations               | 10+                  |

### Expo Already In Use

MetaMask is not starting from zero. The project already uses Expo in a **bare workflow with Expo modules** pattern:

```
Already adopted:         expo-file-system, expo-image, expo-haptics,
                         expo-local-authentication, expo-sensors,
                         expo-font, expo-apple-authentication,
                         expo-auth-session, expo-screen-orientation,
                         expo-updates (OTA), expo-dev-client,
                         expo-build-properties, expo-web-browser
```

This means the Expo autolinking infrastructure, `app.config.js`, and the module resolution pipeline are already in place. Adding more Expo libraries is incremental, not a paradigm shift.

---

## The Upgrade Problem: By the Numbers

### Historical Upgrade Data

| Upgrade         | PR     | Date Merged  | Duration                     | Files Changed | Lines Changed |
| --------------- | ------ | ------------ | ---------------------------- | ------------- | ------------- |
| 0.71.x → 0.76.6 | #13771 | Apr 30, 2025 | Unknown (skipped 5 versions) | 378           | 42,352        |
| 0.76.9 → 0.81.5 | #29195 | May 8, 2026  | ~2.5 months                  | 357           | 13,124        |

### Where the Time Goes (0.81.5 Upgrade Breakdown)

| Activity                                                      | Estimated Time | Root Cause                                                   |
| ------------------------------------------------------------- | -------------- | ------------------------------------------------------------ |
| Manual native file surgery (22 files, 3,200 lines)            | 2-4 weeks      | Manually maintained `android/` and `ios/`                    |
| Patch audit & recreation (28 patches created/updated/removed) | 1 week         | Dependencies with native code that breaks across RN versions |
| CI/CD breakage fixes (CMAKE, Bridgeless, Podfile checksums)   | 3-5 days       | Native build tooling drift                                   |
| Merge conflict resolution (~30 merges from main)              | Ongoing        | Long-lived branch required by scope of changes               |
| Build verification + E2E testing                              | 1-2 weeks      | Unchanged regardless of approach                             |
| **Total**                                                     | **6-10 weeks** |                                                              |

### The Compounding Cost

The 22-month gap between 0.71.6 and 0.76.6 illustrates a vicious cycle:

```
Upgrades are painful → Teams defer them → More versions accumulate →
Next upgrade is even more painful → Teams defer even longer → ...
```

Five major versions were skipped (0.72-0.75), making the eventual 0.76.6 upgrade a 42,000-line change. Each community library that has broken or changed native APIs across those versions multiplied the work.

---

## What "Switching to Expo Libraries" Means

There are two related but distinct strategies. This document focuses on **Strategy A**. Strategy B is covered in `expo-cng-integration-research.md`.

### Strategy A: Library-Level Migration (This Document)

Replace individual `react-native-*` community libraries with Expo SDK equivalents where they exist. The native directories (`android/`, `ios/`) remain committed and manually maintained.

**Impact:** Reduces the number of independent native dependencies, shrinks the patch surface, and ensures more libraries are tested together as part of a single SDK release.

### Strategy B: CNG Adoption (Separate Document)

Adopt Expo's Continuous Native Generation to stop committing `android/` and `ios/` entirely, generating them from `app.config.js` + config plugins.

**Impact:** Eliminates manual native file maintenance entirely.

### Why Strategy A First

Strategy A is a prerequisite for Strategy B and delivers standalone value:

- Each Expo library replaced is one fewer dependency to audit during upgrades
- Expo SDK libraries ship with config plugins, making future CNG adoption easier
- The migration can be done incrementally without a feature branch
- No build system changes required -- the app continues building the same way

---

## Full Library Audit: 84 Native Dependencies

### Category 1: Already Expo-Compatible (21 libraries)

These libraries are first-class Expo ecosystem citizens with official Expo documentation pages, config plugins, and are tested against each Expo SDK release. **No action needed.**

| Library                                     | Version | Notes                      |
| ------------------------------------------- | ------- | -------------------------- |
| `react-native-gesture-handler`              | 2.25.0  | Core navigation dependency |
| `react-native-reanimated`                   | 3.17.2  | Animation engine           |
| `react-native-screens`                      | 3.37.0  | Native screen primitives   |
| `react-native-safe-area-context`            | 5.4.0   | Safe area insets           |
| `react-native-svg`                          | 15.11.1 | SVG rendering              |
| `react-native-pager-view`                   | 6.7.0   | View pager                 |
| `react-native-mmkv`                         | 3.2.0   | Fast key-value storage     |
| `react-native-vision-camera`                | 4.6.4   | Camera (has config plugin) |
| `react-native-video`                        | 6.10.1  | Video playback             |
| `react-native-view-shot`                    | 3.1.2   | Screenshot capture         |
| `react-native-keyboard-controller`          | 1.20.3  | Keyboard management        |
| `react-native-blob-util`                    | 0.19.9  | Binary data handling       |
| `react-native-nitro-modules`                | 0.29.6  | JSI module framework       |
| `@react-native-async-storage/async-storage` | 1.23.1  | Async storage              |
| `@react-native-community/netinfo`           | 11.4.1  | Network info               |
| `@react-native-community/datetimepicker`    | 8.5.1   | Date/time picker           |
| `@react-native-community/slider`            | 4.4.3   | Slider component           |
| `@react-native-community/checkbox`          | 0.5.20  | Checkbox component         |
| `@react-native-clipboard/clipboard`         | 1.16.1  | Clipboard access           |
| `@react-native-masked-view/masked-view`     | 0.3.1   | Masked views               |
| `@react-native-cookies/cookies`             | 6.2.1   | Cookie management          |

### Category 2: Have Expo SDK Replacements (18 libraries)

These can be replaced with Expo SDK equivalents. **6 are already migrated** (marked ✅), **12 remain**.

| Library                            | Version | Expo Replacement                        | Status               | Migration Complexity                                 |
| ---------------------------------- | ------- | --------------------------------------- | -------------------- | ---------------------------------------------------- |
| `react-native-fs`                  | 2.20.0  | `expo-file-system`                      | ✅ Already installed | Dual-use: audit remaining `react-native-fs` imports  |
| `react-native-sensors`             | 5.3.0   | `expo-sensors`                          | ✅ Already installed | Audit remaining `react-native-sensors` imports       |
| `react-native-inappbrowser-reborn` | 3.7.0   | `expo-web-browser`                      | ✅ Already installed | Audit remaining imports                              |
| `expo-local-authentication`        | 15.0.2  | --                                      | ✅ Already primary   | No `react-native-biometrics` in deps                 |
| `expo-image`                       | 2.0.7   | --                                      | ✅ Already primary   | Replaces `Image` from RN core                        |
| `expo-haptics`                     | 14.0.1  | --                                      | ✅ Already primary   | No community haptics dep                             |
| `react-native-device-info`         | 9.0.2   | `expo-device` + `expo-application`      | ❌ Needs migration   | **Low** -- API mapping is straightforward            |
| `react-native-keychain`            | 9.0.0   | `expo-secure-store`                     | ❌ Needs migration   | **High** -- security-critical, biometric-gated flows |
| `react-native-permissions`         | 3.7.2   | Per-module Expo permission APIs         | ❌ Needs migration   | **Medium** -- scattered usage, many permission types |
| `react-native-linear-gradient`     | 2.8.3   | `expo-linear-gradient`                  | ❌ Needs migration   | **Low** -- drop-in API compatibility                 |
| `react-native-vector-icons`        | 10.2.0  | `@expo/vector-icons`                    | ❌ Needs migration   | **Low** -- same icon sets, similar API               |
| `react-native-share`               | 7.3.7   | `expo-sharing`                          | ❌ Needs migration   | **Low** -- simple API surface                        |
| `react-native-in-app-review`       | 4.3.3   | `expo-store-review`                     | ❌ Needs migration   | **Low** -- minimal API surface                       |
| `react-native-default-preference`  | 1.4.3   | `expo-secure-store` or `expo-constants` | ❌ Needs migration   | **Low** -- few call sites                            |
| `react-native-get-random-values`   | 1.8.0   | `expo-crypto`                           | ❌ Needs migration   | **Medium** -- used as polyfill, audit all consumers  |
| `react-native-background-timer`    | 2.1.1   | `expo-task-manager`                     | ❌ Needs migration   | **Medium** -- background execution model differs     |
| `react-native-quick-base64`        | 2.2.0   | `expo-crypto` (base64 utilities)        | ❌ Needs migration   | **Low** -- utility replacement                       |
| `react-native-launch-arguments`    | 4.0.1   | `expo-constants`                        | ❌ Needs migration   | **Low** -- used primarily by Detox                   |

### Category 3: JS-Only / No Native Code (19 libraries)

These have no native code and are **unaffected by RN upgrades**. No action needed.

| Library                                   | Purpose                             |
| ----------------------------------------- | ----------------------------------- |
| `react-native-browser-polyfill`           | Browser API polyfills               |
| `react-native-url-polyfill`               | URL API polyfill                    |
| `react-native-level-fs`                   | LevelDB filesystem adapter          |
| `react-native-size-matters`               | Responsive sizing utilities         |
| `react-native-material-textfield`         | Material text input (JS)            |
| `react-native-step-indicator`             | Step indicator UI (JS)              |
| `react-native-progress`                   | Progress bar (JS)                   |
| `react-native-confetti`                   | Confetti animation (JS)             |
| `react-native-confetti-cannon`            | Confetti cannon (JS)                |
| `react-native-jazzicon`                   | Jazzicon avatar generation (JS)     |
| `react-native-fade-in-image`              | Fade-in image wrapper (JS)          |
| `react-native-elevated-view`              | Elevation shadow (JS)               |
| `react-native-swipe-gestures`             | Swipe gesture detection (JS)        |
| `react-native-animatable`                 | Animation helpers (JS)              |
| `react-native-skeleton-placeholder`       | Loading skeletons (JS)              |
| `react-native-keyboard-aware-scroll-view` | Keyboard-aware scroll (JS)          |
| `react-native-render-html`                | HTML renderer (JS)                  |
| `react-native-qrcode-svg`                 | QR code generator (JS, uses RN SVG) |
| `react-native-confirmation-code-field`    | Code input field (JS)               |

### Category 4: Crypto & Security -- Cannot Replace (11 libraries)

These are **critical wallet infrastructure** with no Expo equivalents. They implement low-level cryptographic primitives that Expo's higher-level abstractions cannot replace.

| Library                          | Version         | Why It Can't Be Replaced                             |
| -------------------------------- | --------------- | ---------------------------------------------------- |
| `react-native-quick-crypto`      | 0.7.15          | OpenSSL-backed crypto via JSI; wallet key derivation |
| `react-native-fast-crypto`       | 2.2.0           | scrypt, PBKDF2 for wallet encryption                 |
| `react-native-aes-crypto`        | 3.0.3           | AES encryption/decryption                            |
| `react-native-aes-crypto-forked` | (MetaMask fork) | Custom AES variant for vault operations              |
| `react-native-crypto`            | 2.2.1           | Node.js `crypto` polyfill                            |
| `react-native-randombytes`       | 3.5.3           | Cryptographic random number generation               |
| `react-native-gzip`              | 1.1.0           | Native gzip compression                              |
| `react-native-tcp-socket`        | 6.3.0           | Raw TCP for P2P networking                           |
| `react-native-ble-plx`           | 3.4.0           | Bluetooth LE for Ledger hardware wallets             |
| `react-native-performance`       | 5.1.2           | Native performance marks/measures                    |
| `react-native-release-profiler`  | 0.4.0           | Release build profiling                              |

### Category 5: Third-Party SDK Integrations (8 libraries)

These wrap specific third-party SDKs and have no generic Expo replacement.

| Library                            | Version     | Purpose                  |
| ---------------------------------- | ----------- | ------------------------ |
| `react-native-branch`              | 5.6.2       | Branch.io deep linking   |
| `@react-native-firebase/app`       | 20.5.0      | Firebase core            |
| `@react-native-firebase/messaging` | 20.5.0      | Push notifications (FCM) |
| `react-native-svg-charts`          | 5.4.0       | SVG-based charting       |
| `react-native-modal`               | 14.0.0-rc.1 | Enhanced modal component |
| `react-native-i18n`                | 2.0.15      | Legacy i18n              |
| `react-native-os`                  | 1.2.6       | OS info utilities        |
| `react-native-storybook-loader`    | 2.0.4       | Dev-only: Storybook      |

### Category 6: MetaMask Custom Forks (7 libraries)

These are MetaMask-maintained forks with custom modifications. Cannot be replaced with Expo equivalents.

| Library                              | Purpose                                     |
| ------------------------------------ | ------------------------------------------- |
| `@metamask/react-native-payments`    | Custom payment integration                  |
| `@metamask/react-native-webview`     | Enhanced WebView with dApp browser features |
| `@metamask/react-native-acm`         | Account management                          |
| `@metamask/react-native-actionsheet` | Custom action sheet                         |
| `@metamask/react-native-button`      | Custom button component                     |
| `@metamask/react-native-search-api`  | Search functionality                        |
| `@lavamoat/react-native-lockdown`    | LavaMoat JS security sandbox                |

---

## Migration Candidates: Detailed Analysis

### High-Value Migrations (significant native footprint reduction)

#### 1. `react-native-device-info` → `expo-device` + `expo-application`

| Aspect              | Detail                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Current usage**   | Device model, OS version, app version, bundle ID, build number                                                                            |
| **Expo equivalent** | `expo-device` (hardware) + `expo-application` (app metadata)                                                                              |
| **API mapping**     | `getModel()` → `Device.modelName`, `getVersion()` → `Application.nativeApplicationVersion`, `getBundleId()` → `Application.applicationId` |
| **Native impact**   | Removes one Android native module and one iOS native module                                                                               |
| **Effort**          | 1-2 days -- find-and-replace API calls, regression test                                                                                   |
| **Risk**            | Low -- well-documented API equivalents                                                                                                    |

#### 2. `react-native-permissions` → Expo per-module permissions

| Aspect              | Detail                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Current usage**   | Camera, Bluetooth, location, notifications, biometric                                                                                         |
| **Expo equivalent** | Each Expo module exposes `requestPermissionsAsync()` / `getPermissionsAsync()`                                                                |
| **API mapping**     | `check(PERMISSIONS.IOS.CAMERA)` → `Camera.getCameraPermissionsAsync()`, etc.                                                                  |
| **Native impact**   | Removes a complex native module with platform-specific permission manifest entries                                                            |
| **Effort**          | 3-5 days -- scattered across many files, each permission type needs individual migration                                                      |
| **Risk**            | Medium -- permission handling is subtle; iOS Info.plist strings and Android manifest permissions must still be declared (via `app.config.js`) |

#### 3. `react-native-keychain` → `expo-secure-store` (High Risk)

| Aspect              | Detail                                                                                                                                                                                                                                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Current usage**   | Vault password storage, biometric-gated keychain access, secure credential storage                                                                                                                                                                                                                                                                          |
| **Expo equivalent** | `expo-secure-store` uses iOS Keychain and Android EncryptedSharedPreferences                                                                                                                                                                                                                                                                                |
| **API mapping**     | `setGenericPassword()` → `SecureStore.setItemAsync()`, `getGenericPassword()` → `SecureStore.getItemAsync()`                                                                                                                                                                                                                                                |
| **Native impact**   | Removes iOS Keychain and Android Keystore native bridges                                                                                                                                                                                                                                                                                                    |
| **Effort**          | 8-10 days -- migration logic + extensive real-device QA across all auth paths                                                                                                                                                                                                                                                                               |
| **Risk**            | **High** -- biometric access control differs between libraries; `react-native-keychain` supports `accessControl: BIOMETRY_CURRENT_SET` and Keychain access groups, which `expo-secure-store` handles differently. Migration must be backward-compatible with existing vault data. **Recommend deferring this migration until a dedicated security review.** |

##### What's at stake

MetaMask adds an extra encryption layer on top of the OS keychain (`SecureKeychain.ts`). The vault password is stored encrypted under `service: 'com.metamask'`, `username: 'metamask-user'`, with `ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY` and `ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE` for biometric users.

If the library is swapped without a data migration:

- The existing keychain entry becomes **unreachable** — `expo-secure-store` uses a different storage backend and cannot read entries written by `react-native-keychain`
- On iOS: different Keychain service identifier and access group format
- On Android: `react-native-keychain` uses Android Keystore (hardware-backed); `expo-secure-store` uses `EncryptedSharedPreferences` — a completely different system
- Every user with biometric unlock enabled would launch after the update and find their stored credentials gone, requiring manual password re-entry

> **No wallet funds are at risk** — private keys live in the encrypted vault, not the keychain. The keychain only stores the password used to unlock the vault. But the UX impact is severe and could appear to users as data loss.

##### Safe migration approach

A one-time migration function must run on first launch after the update:

```typescript
async function migrateKeychainToExpoSecureStore() {
  const alreadyMigrated = await AsyncStorage.getItem('keychain_migrated');
  if (alreadyMigrated) return;

  try {
    // Read from old library
    const existing = await ReactNativeKeychain.getGenericPassword({
      service: 'com.metamask',
    });

    if (existing) {
      // Write to new library before deleting old entry
      await ExpoSecureStore.setItemAsync('metamask-user', existing.password, {
        requireAuthentication: true,
      });
    }

    // Mark migration complete ONLY after successful write
    await AsyncStorage.setItem('keychain_migrated', 'true');

    // Clean up old entry
    await ReactNativeKeychain.resetGenericPassword({ service: 'com.metamask' });
  } catch (error) {
    // Do NOT mark as migrated — retry next launch
    // Log but do not crash
  }
}
```

##### Three rules for a safe migration

1. **Never mark migration complete until the write succeeds** — if it fails halfway, retry on next launch
2. **Never delete the old entry until the new one is confirmed written** — no state where data exists in neither store
3. **If migration fails repeatedly, fall back gracefully** — prompt user to re-enter password rather than crashing

##### Known hard problems

- **Biometric re-enrollment**: iOS may invalidate biometric access when the app binary changes. Users may need to re-enable Face ID/Touch ID in MetaMask settings regardless of how clean the migration is
- **Android access control differences**: `react-native-keychain` Android Keystore vs `expo-secure-store` EncryptedSharedPreferences have different security guarantees and access semantics — must test on real Android hardware, not emulators
- **Multi-scope credentials**: `SecureKeychain.ts` uses `setSecureItem`/`getSecureItem` with arbitrary `scopeOptions` in addition to the primary `setGenericPassword`/`getGenericPassword` flow — all scopes need migration, not just the main vault password

**Realistic effort: 8-10 days** — migration logic is 1-2 days; the remainder is manual QA on real devices across all auth paths (biometric, passcode, password-only) on both platforms with both fresh installs and existing users.

#### 4. `react-native-linear-gradient` → `expo-linear-gradient`

| Aspect              | Detail                                                     |
| ------------------- | ---------------------------------------------------------- |
| **Current usage**   | Background gradients across UI components                  |
| **Expo equivalent** | `expo-linear-gradient` -- near-identical API               |
| **API mapping**     | `<LinearGradient colors={[...]} />` -- same prop interface |
| **Native impact**   | Removes one native view module per platform                |
| **Effort**          | 0.5 days -- import path change only                        |
| **Risk**            | Low                                                        |

#### 5. `react-native-vector-icons` → `@expo/vector-icons`

| Aspect              | Detail                                                                             |
| ------------------- | ---------------------------------------------------------------------------------- |
| **Current usage**   | Icon rendering throughout the app                                                  |
| **Expo equivalent** | `@expo/vector-icons` wraps the same icon sets (MaterialIcons, Ionicons, etc.)      |
| **API mapping**     | `<Icon name="..." size={24} />` -- same API                                        |
| **Native impact**   | Removes native font linking (vector-icons requires font assets in native projects) |
| **Effort**          | 1-2 days -- import path changes + verify all icon sets used are available          |
| **Risk**            | Low -- same underlying icon fonts                                                  |

### Medium-Value Migrations

#### 6. `react-native-share` → `expo-sharing`

| Aspect     | Detail                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| **Effort** | 0.5 days                                                                                                      |
| **Risk**   | Low -- `expo-sharing` has a slightly different API (`shareAsync` vs `open`) but covers the same functionality |

#### 7. `react-native-in-app-review` → `expo-store-review`

| Aspect     | Detail                              |
| ---------- | ----------------------------------- |
| **Effort** | 0.5 days                            |
| **Risk**   | Low -- single call site, simple API |

#### 8. `react-native-get-random-values` → `expo-crypto`

| Aspect              | Detail                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------- |
| **Current usage**   | `crypto.getRandomValues()` polyfill, imported at app entry                               |
| **Expo equivalent** | `expo-crypto` provides `getRandomBytes()` and `getRandomBytesAsync()`                    |
| **Effort**          | 1 day -- need to verify all consumers of `getRandomValues` work with the Expo polyfill   |
| **Risk**            | Medium -- this is a global polyfill; must verify it's loaded before any crypto code runs |

#### 9. `react-native-background-timer` → `expo-task-manager`

| Aspect              | Detail                                                                     |
| ------------------- | -------------------------------------------------------------------------- |
| **Current usage**   | Background timer intervals                                                 |
| **Expo equivalent** | `expo-task-manager` + `expo-background-fetch`                              |
| **Effort**          | 2-3 days -- different programming model (task-based vs timer-based)        |
| **Risk**            | Medium -- background execution semantics differ between platforms and APIs |

### Low-Value Migrations (minimal native impact)

| Library                           | Expo Replacement    | Effort   | Notes            |
| --------------------------------- | ------------------- | -------- | ---------------- |
| `react-native-default-preference` | `expo-secure-store` | 0.5 days | Few call sites   |
| `react-native-quick-base64`       | `expo-crypto`       | 0.5 days | Utility function |
| `react-native-launch-arguments`   | `expo-constants`    | 0.5 days | Detox-only usage |

### Already Migrated (Dual-Use Cleanup)

Three libraries have Expo equivalents already installed but both versions remain in `package.json`:

| Community Library                          | Expo Equivalent             | Action                                                                     |
| ------------------------------------------ | --------------------------- | -------------------------------------------------------------------------- |
| `react-native-fs` (2.20.0)                 | `expo-file-system` (18.0.7) | Audit imports; remove `react-native-fs` if fully replaced                  |
| `react-native-sensors` (5.3.0)             | `expo-sensors` (14.0.2)     | Audit imports; remove `react-native-sensors` if fully replaced             |
| `react-native-inappbrowser-reborn` (3.7.0) | `expo-web-browser` (14.0.2) | Audit imports; remove `react-native-inappbrowser-reborn` if fully replaced |

---

## Libraries That Cannot Be Replaced

### Crypto Libraries (Non-Negotiable)

MetaMask is a cryptocurrency wallet. The cryptographic libraries implement:

- **Key derivation** (scrypt, PBKDF2) for wallet vault encryption
- **AES encryption** for at-rest secret storage
- **Random number generation** for key creation
- **OpenSSL primitives** via JSI for performance-critical signing

Expo's `expo-crypto` provides high-level hashing and random bytes but does **not** expose:

- scrypt or PBKDF2 key derivation functions
- AES-CBC/AES-GCM encryption/decryption
- Direct OpenSSL binding via JSI
- The specific algorithm parameters MetaMask's vault uses

**These libraries must remain as native dependencies.** Any upgrade friction they cause must be addressed through patches or upstream contributions, not replacement.

### BLE (Ledger Hardware Wallet)

`react-native-ble-plx` is the only mature React Native BLE library. There is no Expo-native BLE library. A community config plugin (`@config-plugins/react-native-ble-plx`) exists for CNG compatibility, but the library itself must remain.

**Risk flag:** The official `react-native-ble-plx` does **not** support Expo SDK 54+ / RN 0.81+. A community fork with TypeScript conversion exists for newer versions. This is a known pain point that will recur with each RN upgrade regardless of Expo library adoption.

### MetaMask Forks

The `@metamask/react-native-webview` fork contains dApp browser security modifications that the upstream `react-native-webview` does not have. These cannot be replaced with a generic Expo package.

---

## Industry Case Studies

### Alan (Health Insurance, France) -- 90 Engineers, 4 Apps

| Aspect                            | Detail                                                                      |
| --------------------------------- | --------------------------------------------------------------------------- |
| **Migration duration**            | ~6 months                                                                   |
| **Custom config plugins written** | ~30                                                                         |
| **Quantified savings**            | ~30 hours/month across team (ongoing, not just upgrades)                    |
| **Build time**                    | Reduced from 7 minutes locally to <2 minutes via S3                         |
| **Onboarding**                    | New engineer setup reduced to 2 commands                                    |
| **Key quote**                     | Developers who previously could not do native work can now perform upgrades |

### Ornikar (Driver Education, France) -- 2 Apps

| Aspect                     | Detail                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| **Migration duration**     | 10 months (incremental, "brick-by-brick" deployment)                                        |
| **Post-migration upgrade** | Upgraded Expo 50 → 52 with developers who had **never done native upgrades before**         |
| **Key insight**            | Native configuration centralized in a single `app.config.ts` file, reducing bus-factor risk |

### Callstack Client (Major North American Retailer) -- 6-Year-Old Codebase

| Aspect                | Detail                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------- |
| **Build speed**       | Improved **6x** (60 min → 10 min per platform)                                         |
| **Build reliability** | **63% → 97%** success rate                                                             |
| **Approach**          | Gradual migration to Expo bare workflow; replaced legacy modules with Expo equivalents |
| **Key decision**      | Used `expo-doctor` for dependency auditing to find compatible versions                 |

### Common Themes

1. All three companies migrated **incrementally**, not as a big-bang rewrite
2. The primary motivation was **reducing native expertise requirements**, not just upgrade speed
3. Build reliability improved as much or more than build speed
4. The library migration (Strategy A) was done first, CNG (Strategy B) came after
5. None of them used EAS Build -- all kept their existing CI/CD and ran `expo prebuild` locally

---

## ROI Analysis: Does It Make Sense?

### Cost of Doing Nothing

Based on historical data from this project:

| Cost Factor                           | Annual Estimate                                |
| ------------------------------------- | ---------------------------------------------- |
| RN major version upgrade              | 6-10 weeks × 1/year = **6-10 eng-weeks**       |
| Patch maintenance (11 active patches) | ~1 week/quarter = **4 eng-weeks**              |
| Native dependency breakage (ad-hoc)   | ~2 weeks/year = **2 eng-weeks**                |
| Onboarding friction (native setup)    | ~2 days × ~4 new devs/year = **1.5 eng-weeks** |
| **Total annual cost**                 | **~14-18 eng-weeks**                           |

### Cost of Migration (One-Time)

| Phase                                 | Effort             |
| ------------------------------------- | ------------------ |
| Library audit & planning              | 0.5 weeks          |
| High-value migrations (5 libraries)   | 2-3 weeks          |
| Medium-value migrations (4 libraries) | 1-1.5 weeks        |
| Low-value migrations (3 libraries)    | 0.5 weeks          |
| Dual-use cleanup (3 libraries)        | 0.5 weeks          |
| Testing & regression                  | 1 week             |
| **Total one-time cost**               | **~5-6 eng-weeks** |

### Annual Savings Post-Migration

| Improvement                                      | Saving             |
| ------------------------------------------------ | ------------------ |
| Fewer native deps to audit per upgrade           | 1-2 weeks/upgrade  |
| Fewer patches to maintain                        | 0.5 weeks/quarter  |
| Expo `install` command handles version alignment | 0.5 weeks/upgrade  |
| Reduced onboarding friction                      | 0.5 days/new dev   |
| **Total annual savings**                         | **~4-6 eng-weeks** |

### Payback Period

```
One-time cost:    ~5-6 eng-weeks
Annual savings:   ~4-6 eng-weeks
Payback period:   ~1 year (first upgrade cycle)
```

The investment pays for itself during the **next React Native upgrade**. Each subsequent year delivers 4-6 weeks of saved engineering time.

### Comparison: Library Migration vs CNG vs Both

| Strategy                      | One-Time Cost     | Annual Savings | Payback    | Upgrade Time (Steady State) |
| ----------------------------- | ----------------- | -------------- | ---------- | --------------------------- |
| **Do nothing**                | 0                 | 0              | --         | 6-10 weeks                  |
| **A: Library migration only** | 5-6 weeks         | 4-6 weeks      | ~1 year    | 4-7 weeks                   |
| **B: CNG only**               | 8-12 weeks        | 8-12 weeks     | ~1 year    | 2-4 weeks                   |
| **A + B: Libraries then CNG** | 13-18 weeks total | 10-14 weeks    | ~1.5 years | **2-3 weeks**               |

Strategy A is the lower-risk, lower-effort first step that delivers immediate value and de-risks Strategy B.

---

## Long-Term Upgrade Time Savings

### How Expo SDK Releases Reduce Upgrade Friction

Expo SDK versions are **curated compatibility sets**. When Expo releases SDK 54, every `expo-*` package in that release is tested together against a specific React Native version. This means:

1. **Version alignment is automatic:** `npx expo install` resolves compatible versions for all Expo packages simultaneously
2. **Breaking changes are documented together:** One changelog covers all packages in the SDK release
3. **Config plugins are updated in lockstep:** Native configuration changes are handled by plugin updates, not manual edits
4. **The community tests it first:** Expo SDK releases go through EAS Build across thousands of projects before GA

For community `react-native-*` libraries, version compatibility is **every-library-for-itself**:

- Each library has its own release cycle
- Compatibility with new RN versions is discovered by trial and error
- Breaking native changes require reading each library's changelog individually
- Patches are often needed to bridge compatibility gaps

### Projected Upgrade Timeline With Expo Libraries

| Phase                            | Current (Manual) | With Expo Libraries                       | Savings       |
| -------------------------------- | ---------------- | ----------------------------------------- | ------------- |
| Dependency version resolution    | 2-3 days         | `npx expo install` + manual for remaining | 1-2 days      |
| Native dependency breakage fixes | 1-2 weeks        | Fewer native deps to break                | 3-5 days      |
| Patch recreation                 | 1 week           | Fewer patches needed                      | 2-3 days      |
| Native file surgery              | 2-4 weeks        | Unchanged (without CNG)                   | 0             |
| Testing                          | 1-2 weeks        | Unchanged                                 | 0             |
| **Total**                        | **6-10 weeks**   | **4-7 weeks**                             | **1-2 weeks** |

### The Compounding Effect

Each Expo library you adopt is one fewer library that can:

- Break on a new RN version
- Require a patch file
- Have a stale native configuration that conflicts with new templates
- Block a CI build with an obscure native compilation error

Over 3 years (3 RN upgrades), migrating 12 libraries saves an estimated **3-6 eng-weeks** cumulative -- and that's the conservative estimate without CNG.

---

## Migration Strategy

### Approach: Incremental, PR-per-Library

Each library migration should be a **single, self-contained PR** that can be reviewed, tested, and merged independently. No feature branch. No big-bang migration.

```
Week 1-2:  Audit + quick wins (linear-gradient, vector-icons, share, in-app-review)
Week 3:    Medium complexity (device-info, permissions, get-random-values)
Week 4:    Dual-use cleanup (remove react-native-fs, sensors, inappbrowser if fully replaced)
Week 5:    Complex migrations (background-timer, launch-arguments, quick-base64)
Week 6:    Defer keychain migration -- create separate RFC for security review
```

### Migration Template (Per Library)

For each library replacement:

1. **Install Expo equivalent:** `npx expo install expo-<package>`
2. **Create adapter module** (if API differs significantly):

   ```typescript
   // src/util/device-info.ts -- thin adapter to isolate the migration
   import * as Device from 'expo-device';
   import * as Application from 'expo-application';

   export const getDeviceModel = () => Device.modelName;
   export const getAppVersion = () => Application.nativeApplicationVersion;
   export const getBundleId = () => Application.applicationId;
   ```

3. **Find and replace imports** across the codebase
4. **Remove old library:** `yarn remove react-native-<old-package>`
5. **Remove any patch files** associated with the old library
6. **Update `app.config.js`** if the new library has a config plugin
7. **Run full test suite** (unit + E2E for affected features)

### What NOT to Migrate

| Library                    | Reason to Keep                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `react-native-keychain`    | Security-critical; requires dedicated RFC with security team review                      |
| All crypto libraries       | No Expo equivalent; wallet-core dependency                                               |
| `react-native-ble-plx`     | No Expo equivalent; Ledger hardware wallet support                                       |
| `@metamask/react-native-*` | MetaMask forks with custom modifications                                                 |
| `@react-native-firebase/*` | Firebase SDK integration; no Expo equivalent (Expo Notifications uses different backend) |
| `react-native-branch`      | Branch.io SDK; no generic replacement                                                    |

---

## Implementation Timeline & Effort

### Phase 1: Quick Wins (Week 1-2, ~3 eng-days)

| PR   | Library Out                       | Library In             | Effort   |
| ---- | --------------------------------- | ---------------------- | -------- |
| PR 1 | `react-native-linear-gradient`    | `expo-linear-gradient` | 0.5 days |
| PR 2 | `react-native-vector-icons`       | `@expo/vector-icons`   | 1 day    |
| PR 3 | `react-native-share`              | `expo-sharing`         | 0.5 days |
| PR 4 | `react-native-in-app-review`      | `expo-store-review`    | 0.5 days |
| PR 5 | `react-native-default-preference` | `expo-secure-store`    | 0.5 days |

**Impact:** 5 native dependencies removed. Minimal risk. High signal for team confidence.

### Phase 2: Medium Complexity (Week 3-4, ~6 eng-days)

| PR   | Library Out                      | Library In                         | Effort   |
| ---- | -------------------------------- | ---------------------------------- | -------- |
| PR 6 | `react-native-device-info`       | `expo-device` + `expo-application` | 1.5 days |
| PR 7 | `react-native-permissions`       | Expo per-module permissions        | 3 days   |
| PR 8 | `react-native-get-random-values` | `expo-crypto`                      | 1 day    |
| PR 9 | `react-native-quick-base64`      | `expo-crypto`                      | 0.5 days |

**Impact:** 4 more native dependencies removed, including the complex `react-native-permissions` module.

### Phase 3: Cleanup (Week 5, ~3 eng-days)

| PR    | Action                                                                                | Effort               |
| ----- | ------------------------------------------------------------------------------------- | -------------------- |
| PR 10 | Remove `react-native-fs` (verify all imports use `expo-file-system`)                  | 1 day                |
| PR 11 | Remove `react-native-sensors` (verify all imports use `expo-sensors`)                 | 0.5 days             |
| PR 12 | Remove `react-native-inappbrowser-reborn` (verify all imports use `expo-web-browser`) | 0.5 days             |
| PR 13 | `react-native-background-timer` → `expo-task-manager`                                 | 2 days (if feasible) |
| PR 14 | `react-native-launch-arguments` → `expo-constants`                                    | 0.5 days             |

**Impact:** 3-5 more native dependencies removed. Total native dependency reduction: **12-14 libraries**.

### Phase 4: Security Review (Separate Track)

| Item                    | Action                              | Timeline                                |
| ----------------------- | ----------------------------------- | --------------------------------------- |
| `react-native-keychain` | Create RFC for security team review | Separate 2-week effort after Phases 1-3 |

### Total Effort Summary

| Phase                      | Duration       | Eng-Days        | Libraries Removed |
| -------------------------- | -------------- | --------------- | ----------------- |
| Phase 1: Quick wins        | Week 1-2       | 3 days          | 5                 |
| Phase 2: Medium complexity | Week 3-4       | 6 days          | 4                 |
| Phase 3: Cleanup           | Week 5         | 3 days          | 3-5               |
| Phase 4: Security review   | Separate       | 8-10 days       | 0-1               |
| **Total**                  | **~5-6 weeks** | **~20-22 days** | **12-14**         |

This work can be distributed across the team and interleaved with normal sprint work. It does not require a dedicated migration sprint.

---

## Risk Assessment

### Low Risk

| Risk                                                   | Mitigation                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| API incompatibility between community and Expo library | Create thin adapter modules that isolate the migration                           |
| Regression in migrated features                        | Each PR includes targeted E2E test verification                                  |
| Team unfamiliarity with Expo APIs                      | Expo documentation is comprehensive; APIs are simpler than community equivalents |

### Medium Risk

| Risk                                                         | Mitigation                                                           |
| ------------------------------------------------------------ | -------------------------------------------------------------------- |
| `react-native-permissions` migration breaks permission flows | Migrate one permission type at a time; test on both platforms        |
| `react-native-get-random-values` polyfill ordering issue     | Verify Expo crypto polyfill loads before any wallet code             |
| `react-native-background-timer` has different semantics      | Spike the migration first; defer if the task-based model doesn't fit |
| Expo SDK version pinning constrains library versions         | Already constrained by Expo SDK 52; this is existing behavior        |

### High Risk

| Risk                                                  | Mitigation                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `react-native-keychain` migration breaks vault access | **Defer to separate RFC with security team review.** Do not migrate in the main effort. |
| Expo drops support for a critical library             | Extremely unlikely for core SDK packages; community libraries face this risk more       |

### Risks of NOT Migrating

| Risk                                   | Impact                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| Community library becomes unmaintained | Stuck on an old version; must fork or find alternative under time pressure        |
| Patch file count continues growing     | Each RN upgrade requires more patch audit work                                    |
| Native dependency conflicts compound   | More native libraries = more chances for Gradle/CocoaPods resolution failures     |
| Version misalignment across libraries  | No coordinated release; each library may or may not support the target RN version |

---

## Recommendation

### Verdict: Yes, Migrate -- Incrementally

The library migration is a **high-confidence, moderate-effort investment** that pays for itself within one RN upgrade cycle.

### Recommended Execution Order

1. **Immediate (this quarter):** Phase 1 quick wins -- 5 libraries, 3 eng-days, negligible risk
2. **Next sprint cycle:** Phase 2 medium complexity -- 4 libraries, 6 eng-days
3. **Following sprint:** Phase 3 cleanup -- remove dual-use libraries, migrate background-timer
4. **Separate track:** Phase 4 `react-native-keychain` RFC -- only after security team review
5. **Future:** Evaluate CNG adoption (Strategy B) once library migration is complete

### What This Enables

After migrating 12 libraries:

- **29 of 84** native dependencies will be Expo SDK packages (up from 17)
- **Expo SDK coverage** of native dependencies rises from 20% to 34%
- `npx expo install` will manage version alignment for 1/3 of all native deps
- Patch file count is expected to drop by 2-4 files
- The path to CNG becomes significantly smoother (more libraries have config plugins)

### What This Does NOT Solve

- Manual `android/` and `ios/` maintenance (requires CNG -- Strategy B)
- Crypto library upgrade friction (inherent to wallet architecture)
- BLE compatibility across RN versions (upstream `react-native-ble-plx` issue)
- Long-lived upgrade branches (requires CNG or faster upgrade execution)

Library migration is **necessary but not sufficient**. It is the foundation for CNG, which delivers the transformational upgrade time reduction. The recommended path is **A then B**, not A or B.

---

## References

- [Expo SDK Documentation](https://docs.expo.dev/versions/latest/) -- API reference for all Expo packages
- [Expo CNG Documentation](https://docs.expo.dev/workflow/continuous-native-generation/) -- Continuous Native Generation overview
- [Adopt Prebuild Guide](https://docs.expo.dev/guides/adopting-prebuild/) -- Migration guide for bare RN projects
- [Alan: Journey from React Native to Expo](https://medium.com/alan/our-journey-from-react-native-to-expo-for-mobile-app-development-at-alan-%EF%B8%8F-3b1569e8ab7c) -- 90-engineer case study
- [Ornikar: Taking Back Control with Expo CNG](https://medium.com/ornikar/taking-back-control-of-native-code-with-expos-cng-bfd60ae6b54b) -- Incremental migration case study
- [Callstack: Legacy RN to Expo Migration](https://www.callstack.com/case-studies/migrating-a-legacy-react-native-app-to-expo-for-faster-builds-and-simplified-releases) -- Build speed case study
- [Expo Config Plugins Introduction](https://docs.expo.dev/config-plugins/introduction/) -- How config plugins work
- [Expo Modules API](https://docs.expo.dev/modules/overview/) -- Building custom native modules with Expo
- [`expo-cng-integration-research.md`](./expo-cng-integration-research.md) -- Companion document covering CNG adoption (Strategy B)
