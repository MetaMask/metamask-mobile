# Library Updates Strategy Research: Reducing RN Upgrade Friction Through Continuous Dependency Maintenance

> **Author:** Mobile Platform Team  
> **Date:** May 21, 2026  
> **Status:** Research / RFC  
> **Scope:** Establishing a regular dependency update cadence to prevent compound upgrade debt  
> **Related:** [Expo Library Migration](./expo-library-migration-research.md) (Strategy A), [Expo CNG](./expo-cng-integration-research.md) (Strategy B)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [The Problem: Compound Upgrade Debt](#the-problem-compound-upgrade-debt)
3. [Current Staleness Audit](#current-staleness-audit)
4. [Why Stale Libraries Make RN Upgrades Harder](#why-stale-libraries-make-rn-upgrades-harder)
5. [Prioritized Update Plan](#prioritized-update-plan)
6. [Libraries That Must Wait for the Next RN Upgrade](#libraries-that-must-wait-for-the-next-rn-upgrade)
7. [Ongoing Maintenance Strategy](#ongoing-maintenance-strategy)
8. [Automation & Tooling](#automation--tooling)
9. [Effort Estimation](#effort-estimation)
10. [Risk Assessment](#risk-assessment)
11. [Recommendation](#recommendation)
12. [References](#references)

---

## Executive Summary

MetaMask Mobile has **72 outdated native dependencies**, including **33 that are one or more major versions behind**. Twelve libraries are **2-6 major versions behind** their latest release. This staleness is not a cosmetic problem -- it directly inflates the cost of every React Native version upgrade.

When an RN upgrade forces bumping a library from v9 to v15, the team is debugging six major versions of breaking changes _simultaneously_ with the RN migration itself. This is why our upgrades take 6-10 weeks instead of 2-3.

**This document proposes three things:**

1. **Immediate catchup sprint:** Update the 29 minor/patch-behind libraries in a single coordinated effort (~3-5 eng-days, low risk)
2. **Staged major updates:** Update the 33 major-behind libraries in priority order over 4-6 weeks, independent of any RN upgrade
3. **Ongoing cadence:** Establish a monthly dependency review cycle to prevent staleness from re-accumulating

**Expected impact:** The next RN upgrade inherits a codebase where most libraries are already on versions that support the target RN version, reducing the "dependency compatibility" phase from 1-2 weeks to 1-2 days.

---

## The Problem: Compound Upgrade Debt

### The Vicious Cycle

```
Libraries fall behind  →  Individual updates seem risky ("why touch it if it works?")
        ↓
Months pass, gap widens  →  Each library is now 2-3+ major versions behind
        ↓
RN upgrade arrives  →  Old library versions don't support new RN version
        ↓
Forced to upgrade 30+ libraries simultaneously  →  Explosion of breaking changes
        ↓
Upgrade takes 6-10 weeks  →  Team dreads next upgrade  →  Libraries fall behind again
```

### A Concrete Example: `react-native-device-info`

Current version: **9.0.2** (released ~2023)  
Latest version: **15.0.2** (released 2026)  
Gap: **6 major versions**

When the next RN upgrade lands, `react-native-device-info` v9 almost certainly won't compile against it. The team will need to jump to v15 as part of the RN upgrade PR, inheriting six versions of breaking changes:

- v10: Dropped iOS 12 support, new peer dependency requirements
- v11: API removals (deprecated methods removed)
- v12: New Architecture (TurboModules) support, API changes
- v13: Android namespace migration
- v14: Kotlin rewrite of Android module
- v15: RN 0.81+ support, dropped old architecture

Each of these would be a straightforward 1-hour update if done individually. Done together during an RN upgrade, they become a multi-day debugging session interleaved with 30 other library upgrades.

### The Math

If updating one major version of one library takes ~2 hours (read changelog, update, test, fix breakage), then:

- **12 libraries × average 3 major versions behind = 36 major bumps**
- **36 bumps × 2 hours = 72 hours = ~9 eng-days**

That's 9 eng-days of pure library update work that gets folded into the RN upgrade, making the upgrade branch bigger, longer-lived, and harder to review.

If those same updates had been done incrementally over the preceding months, the RN upgrade would only need to handle the final hop to RN-compatible versions -- often just a minor or patch bump.

---

## Current Staleness Audit

_Data captured May 21, 2026 against npm registry latest versions._

### Summary

| Severity           | Count  | Description                                     |
| ------------------ | ------ | ----------------------------------------------- |
| Patch behind       | 10     | Bug fixes only. Zero risk to update.            |
| Minor behind       | 19     | New features, backward-compatible. Low risk.    |
| Major behind       | 33     | Breaking API changes. Needs per-library review. |
| 0.x behind         | 10     | Pre-1.0 libraries. Anything may change.         |
| **Total outdated** | **72** |                                                 |

### Patch Behind (10 libraries) -- Update Immediately

These are bug fix releases. No API changes. Should be updated in a single PR.

| Library                              | Current | Latest |
| ------------------------------------ | ------- | ------ |
| `@react-native-clipboard/clipboard`  | 1.16.1  | 1.16.3 |
| `@walletconnect/core`                | 2.23.0  | 2.23.9 |
| `@walletconnect/react-native-compat` | 2.23.0  | 2.23.9 |
| `@walletconnect/types`               | 2.23.0  | 2.23.9 |
| `@walletconnect/utils`               | 2.23.0  | 2.23.9 |
| `react-native-confetti-cannon`       | 1.5.0   | 1.5.2  |
| `react-native-default-preference`    | 1.4.3   | 1.4.4  |
| `react-native-inappbrowser-reborn`   | 3.7.0   | 3.7.1  |
| `react-native-storybook-loader`      | 2.0.4   | 2.0.5  |
| `react-native-swipe-gestures`        | 1.0.3   | 1.0.5  |

### Minor Behind (19 libraries) -- Update This Sprint

Backward-compatible feature additions and improvements. Low risk, should be batched in small groups.

| Library                                   | Current | Latest  | Notes                            |
| ----------------------------------------- | ------- | ------- | -------------------------------- |
| `@ledgerhq/react-native-hw-transport-ble` | 6.37.0  | 6.40.2  | Ledger BLE transport             |
| `@notifee/react-native`                   | 9.0.0   | 9.1.8   | Notification improvements        |
| `react-native-aes-crypto`                 | 3.0.3   | 3.3.0   | Crypto -- test carefully         |
| `react-native-animatable`                 | 1.3.3   | 1.4.0   | Animation helpers                |
| `react-native-background-timer`           | 2.1.1   | 2.4.1   | Background timer                 |
| `react-native-ble-plx`                    | 3.4.0   | 3.5.1   | BLE -- test with Ledger hardware |
| `react-native-fade-in-image`              | 1.4.1   | 1.6.1   | Image fade-in                    |
| `react-native-gesture-handler`            | 2.25.0  | 2.31.2  | Core navigation dep              |
| `react-native-in-app-review`              | 4.3.3   | 4.4.2   | App store review                 |
| `react-native-keyboard-controller`        | 1.20.3  | 1.21.8  | Keyboard handling                |
| `react-native-launch-arguments`           | 4.0.1   | 4.1.1   | Detox launch args                |
| `react-native-randombytes`                | 3.5.3   | 3.6.2   | Crypto -- test carefully         |
| `react-native-safe-area-context`          | 5.4.0   | 5.8.0   | Safe area insets                 |
| `react-native-skeleton-placeholder`       | 5.0.0   | 5.2.4   | Loading skeletons                |
| `react-native-svg`                        | 15.11.1 | 15.15.5 | SVG rendering                    |
| `react-native-svg-transformer`            | 1.0.0   | 1.5.3   | SVG build tooling                |
| `react-native-tcp-socket`                 | 6.3.0   | 6.4.1   | TCP networking                   |
| `react-native-vector-icons`               | 10.2.0  | 10.3.0  | Icons                            |
| `react-native-video`                      | 6.10.1  | 6.19.2  | Video playback                   |

### Major Behind (33 libraries) -- Staged Updates Required

Each requires changelog review, potential API migration, and targeted testing.

#### Critical Priority (blocks next RN upgrade or has security implications)

| Library                            | Current | Latest | Gap          | Why Critical                                                          |
| ---------------------------------- | ------- | ------ | ------------ | --------------------------------------------------------------------- |
| `react-native-device-info`         | 9.0.2   | 15.0.2 | **6 majors** | Won't compile on newer RN; 6 versions of accumulated breaking changes |
| `react-native-share`               | 7.3.7   | 12.3.1 | **5 majors** | Extremely stale; likely incompatible with next RN                     |
| `@react-native-firebase/app`       | 20.5.0  | 24.0.0 | **4 majors** | Push notifications, analytics -- critical infrastructure              |
| `@react-native-firebase/messaging` | 20.5.0  | 24.0.0 | **4 majors** | Must be updated together with firebase/app                            |
| `react-native-quick-crypto`        | 0.7.15  | 1.1.4  | **1 major**  | Wallet-critical crypto; v1.0 is a stability milestone                 |
| `react-native-fast-crypto`         | 2.2.0   | 3.0.0  | **1 major**  | Wallet-critical crypto                                                |
| `react-native-keychain`            | 9.0.0   | 10.0.0 | **1 major**  | Vault security; needs security review                                 |
| `react-native-mmkv`                | 3.2.0   | 4.3.1  | **1 major**  | High-performance storage; used heavily                                |

#### High Priority (significant version gap or native code changes)

| Library                                     | Current | Latest | Gap          | Notes                                    |
| ------------------------------------------- | ------- | ------ | ------------ | ---------------------------------------- |
| `@react-native-async-storage/async-storage` | 1.23.1  | 3.0.3  | **2 majors** | Storage layer; may need API changes      |
| `react-native-permissions`                  | 3.7.2   | 5.5.1  | **2 majors** | Permission handling; scattered usage     |
| `react-native-pager-view`                   | 6.7.0   | 8.0.2  | **2 majors** | View pager component                     |
| `react-native-view-shot`                    | 3.1.2   | 5.1.0  | **2 majors** | Screenshot capture                       |
| `react-native-sensors`                      | 5.3.0   | 7.3.6  | **2 majors** | Sensor access (also has Expo equivalent) |
| `@veriff/react-native-sdk`                  | 11.2.0  | 13.1.0 | **2 majors** | KYC verification; third-party SDK        |
| `react-native-branch`                       | 5.6.2   | 6.10.0 | **1 major**  | Deep linking infrastructure              |
| `react-native-vision-camera`                | 4.6.4   | 5.0.10 | **1 major**  | Camera; v5 is New Architecture rewrite   |
| `react-native-reanimated`                   | 3.17.2  | 4.3.1  | **1 major**  | Animation engine; v4 requires New Arch   |
| `lottie-react-native`                       | 6.7.2   | 7.3.8  | **1 major**  | Lottie animations                        |

#### Medium Priority (less impact on upgrades)

| Library                                | Current | Latest | Gap          | Notes                    |
| -------------------------------------- | ------- | ------ | ------------ | ------------------------ |
| `react-native-get-random-values`       | 1.8.0   | 2.0.0  | **1 major**  | Crypto polyfill          |
| `react-native-quick-base64`            | 2.2.0   | 3.0.0  | **1 major**  | Base64 utility           |
| `react-native-performance`             | 5.1.2   | 6.0.0  | **1 major**  | Performance monitoring   |
| `react-native-confirmation-code-field` | 7.6.1   | 9.0.0  | **2 majors** | Code input UI            |
| `react-native-progress`                | 3.5.0   | 5.0.1  | **2 majors** | Progress bars            |
| `react-native-url-polyfill`            | 1.3.0   | 3.0.0  | **2 majors** | JS-only polyfill (safe)  |
| `react-native-qrcode-svg`              | 5.1.2   | 6.3.21 | **1 major**  | QR code generation       |
| `@ledgerhq/hw-app-eth`                 | 6.42.0  | 7.8.3  | **1 major**  | Ledger ETH app interface |

#### Tied to RN Version (update during next RN upgrade only)

| Library                                        | Current | Latest | Why It Must Wait     |
| ---------------------------------------------- | ------- | ------ | -------------------- |
| `@react-native-community/cli`                  | 15.0.1  | 20.1.3 | Pinned to RN version |
| `@react-native-community/cli-platform-android` | 15.0.1  | 20.1.3 | Pinned to RN version |
| `@react-native-community/cli-platform-ios`     | 15.0.1  | 20.1.3 | Pinned to RN version |
| `@react-native-community/cli-server-api`       | 17.0.0  | 20.1.3 | Pinned to RN version |
| `@react-native/babel-preset`                   | 0.76.9  | 0.85.3 | Pinned to RN version |
| `@react-native/metro-config`                   | 0.76.9  | 0.85.3 | Pinned to RN version |
| `@react-native/typescript-config`              | 0.76.9  | 0.85.3 | Pinned to RN version |
| `@react-native/eslint-config`                  | 0.82.0  | 0.85.3 | Pinned to RN version |

### 0.x Libraries (10 libraries)

| Library                                 | Current | Latest | Notes                                          |
| --------------------------------------- | ------- | ------ | ---------------------------------------------- |
| `@react-native-masked-view/masked-view` | 0.3.1   | 0.3.2  | Patch bump, safe                               |
| `react-native-blob-util`                | 0.19.9  | 0.24.9 | 5 minor bumps; likely contains RN compat fixes |
| `react-native-nitro-modules`            | 0.29.6  | 0.35.7 | JSI framework; fast-moving                     |
| `react-native-release-profiler`         | 0.4.0   | 0.4.4  | Dev-only; safe                                 |
| `react-native-size-matters`             | 0.4.0   | 0.4.2  | JS-only; safe                                  |
| `react-native-svg-asset-plugin`         | 0.5.0   | 0.6.1  | Build tooling; test build pipeline             |

---

## Why Stale Libraries Make RN Upgrades Harder

### 1. Version Compatibility Cliff

Libraries declare peer dependencies on React Native. When the peer range doesn't cover the target RN version, the library won't install cleanly. When you're 1 version behind, the fix is usually a minor bump. When you're 6 versions behind, you're jumping across breaking changes, API removals, and architecture rewrites all at once.

```
react-native-device-info@9:   peerDependencies: "react-native": ">= 0.60"    (may work)
react-native-device-info@15:  peerDependencies: "react-native": ">= 0.73"    (tested & supported)

If upgrading to RN 0.85, which would you rather debug from?
```

### 2. Patch File Accumulation

Several of our 11 patch files exist because an **old version of a library has a bug or incompatibility** that the latest version already fixed upstream. Every patch file is tech debt that must be audited during each RN upgrade.

Current RN-related patches:

```
@braze-react-native-sdk-npm-19.1.0-076-reactmoduleinfo.patch   → May be fixed in latest Braze SDK
react-native-npm-0.76.9-1c25352097.patch                       → RN version-specific
react-native-patch-d76d50a92f.patch                             → RN version-specific
rive-react-native-npm-9.3.4-8082feca90.patch                   → May be fixed in latest rive
```

Updating libraries to their latest versions often eliminates patches entirely, because the upstream maintainer has already fixed the issue we patched.

### 3. Native Code Compilation Failures

Older library versions may use deprecated Android/iOS APIs, older Gradle plugin syntax, or outdated CocoaPods patterns. These compile against the current RN version but **silently break** when the build tooling changes:

- Gradle 8.x deprecates APIs that old library versions use
- Xcode 16+ enforces stricter Swift/ObjC interop
- Android SDK 35 requires `namespace` in build.gradle (old libraries use `package` in AndroidManifest)

Libraries that are regularly updated incorporate these changes incrementally. Libraries 3+ years behind may need significant native code patches.

### 4. The "30 Libraries at Once" Problem

During the 0.81.5 upgrade, **28 patch files** were created, updated, or removed. Many of these patches compensated for library versions that were too old for the new RN version. If those libraries had been current, many patches would have been unnecessary.

The multiplier effect:

- 1 stale library during an upgrade = a few hours of debugging
- 30 stale libraries during an upgrade = weeks of interleaved debugging, where fixing one break reveals another

### 5. Changelog Archaeology

When jumping 6 major versions, the engineer must read 6 changelogs, understand 6 sets of breaking changes, and verify none of them affect MetaMask's specific usage. This is pure overhead that doesn't exist when libraries are updated incrementally (1 changelog per update).

---

## Prioritized Update Plan

### Wave 1: Zero-Risk Batch (~0.5 eng-days)

**All 10 patch-behind libraries in a single PR.**

These are bug fixes with no API changes. Update, run tests, merge.

```bash
yarn up @react-native-clipboard/clipboard@^1.16.3 \
       @walletconnect/core@^2.23.9 \
       @walletconnect/react-native-compat@^2.23.9 \
       @walletconnect/types@^2.23.9 \
       @walletconnect/utils@^2.23.9 \
       react-native-confetti-cannon@^1.5.2 \
       react-native-default-preference@^1.4.4 \
       react-native-inappbrowser-reborn@^3.7.1 \
       react-native-storybook-loader@^2.0.5 \
       react-native-swipe-gestures@1.0.5
```

### Wave 2: Low-Risk Minor Updates (~2-3 eng-days)

**19 minor-behind libraries in 3-4 grouped PRs**, organized by domain.

**PR A -- Navigation & UI (1 PR, ~0.5 days):**

```
react-native-gesture-handler       2.25.0 → 2.31.2
react-native-safe-area-context     5.4.0  → 5.8.0
react-native-skeleton-placeholder  5.0.0  → 5.2.4
react-native-animatable            1.3.3  → 1.4.0
react-native-fade-in-image         1.4.1  → 1.6.1
react-native-keyboard-controller   1.20.3 → 1.21.8
```

**PR B -- Media & Graphics (1 PR, ~0.5 days):**

```
react-native-svg                   15.11.1 → 15.15.5
react-native-svg-transformer       1.0.0   → 1.5.3
react-native-video                 6.10.1  → 6.19.2
react-native-vector-icons          10.2.0  → 10.3.0
```

**PR C -- Infrastructure (1 PR, ~1 day, needs more testing):**

```
@notifee/react-native                       9.0.0  → 9.1.8
@ledgerhq/react-native-hw-transport-ble     6.37.0 → 6.40.2
react-native-ble-plx                        3.4.0  → 3.5.1
react-native-background-timer               2.1.1  → 2.4.1
react-native-tcp-socket                     6.3.0  → 6.4.1
react-native-launch-arguments               4.0.1  → 4.1.1
```

**PR D -- Crypto (1 PR, ~0.5 days, test wallet operations):**

```
react-native-aes-crypto            3.0.3 → 3.3.0
react-native-randombytes           3.5.3 → 3.6.2
```

**PR E -- Misc (1 PR, ~0.5 days):**

```
react-native-in-app-review         4.3.3 → 4.4.2
```

### Wave 3: Major Version Updates (~4-6 eng-weeks, staged)

Each major update is its own PR with dedicated testing. Ordered by **impact on next RN upgrade**.

#### Batch 3a -- Highest Impact (do first, ~2 weeks)

| PR   | Library                                    | Current → Latest | Effort   | Notes                                                                                      |
| ---- | ------------------------------------------ | ---------------- | -------- | ------------------------------------------------------------------------------------------ |
| PR 1 | `react-native-device-info`                 | 9 → 15           | 2 days   | 6 majors; read all changelogs, test `getModel`, `getVersion`, `getBundleId`, `getUniqueId` |
| PR 2 | `react-native-share`                       | 7 → 12           | 1 day    | 5 majors; API likely changed significantly                                                 |
| PR 3 | `@react-native-firebase/app` + `messaging` | 20 → 24          | 3 days   | Must update together; test push notifications end-to-end, verify FCM token registration    |
| PR 4 | `react-native-mmkv`                        | 3 → 4            | 1-2 days | Storage engine; test data migration, verify no data loss on upgrade                        |
| PR 5 | `react-native-permissions`                 | 3 → 5            | 2-3 days | 2 majors; permission API changes, test all permission flows                                |

#### Batch 3b -- High Impact (second priority, ~2 weeks)

| PR    | Library                                     | Current → Latest | Effort   | Notes                                          |
| ----- | ------------------------------------------- | ---------------- | -------- | ---------------------------------------------- |
| PR 6  | `@react-native-async-storage/async-storage` | 1 → 3            | 1-2 days | 2 majors; storage interface, test persistence  |
| PR 7  | `react-native-branch`                       | 5 → 6            | 2 days   | Deep linking; test all deep link scenarios     |
| PR 8  | `react-native-pager-view`                   | 6 → 8            | 1 day    | 2 majors; UI component, visual regression test |
| PR 9  | `react-native-view-shot`                    | 3 → 5            | 0.5 days | 2 majors; screenshot feature                   |
| PR 10 | `@veriff/react-native-sdk`                  | 11 → 13          | 1 day    | KYC; test verification flow end-to-end         |
| PR 11 | `lottie-react-native`                       | 6 → 7            | 0.5 days | Animation; visual check                        |
| PR 12 | `@ledgerhq/hw-app-eth`                      | 6 → 7            | 1 day    | Ledger; test with hardware device              |

#### Batch 3c -- Crypto & Security (needs careful testing, ~1 week)

| PR    | Library                          | Current → Latest | Effort   | Notes                                                                |
| ----- | -------------------------------- | ---------------- | -------- | -------------------------------------------------------------------- |
| PR 13 | `react-native-quick-crypto`      | 0.7 → 1.1        | 2 days   | v1.0 milestone; test all crypto operations, wallet creation, signing |
| PR 14 | `react-native-fast-crypto`       | 2 → 3            | 1 day    | scrypt/PBKDF2; test vault unlock                                     |
| PR 15 | `react-native-keychain`          | 9 → 10           | 2 days   | Security-critical; test biometric flows, vault access                |
| PR 16 | `react-native-get-random-values` | 1 → 2            | 0.5 days | Polyfill; verify global availability                                 |
| PR 17 | `react-native-quick-base64`      | 2 → 3            | 0.5 days | Utility; test encoding/decoding                                      |

#### Batch 3d -- Defer to Next RN Upgrade

These libraries require the new RN version to update, or their latest version **only supports** newer RN:

| Library                        | Current → Latest | Why Defer                                                 |
| ------------------------------ | ---------------- | --------------------------------------------------------- |
| `react-native-reanimated`      | 3 → 4            | v4 requires New Architecture + RN 0.78+ (current: 0.76.9) |
| `react-native-vision-camera`   | 4 → 5            | v5 is a New Architecture rewrite                          |
| `react-native-blob-util`       | 0.19 → 0.24      | May require newer RN peer                                 |
| `react-native-nitro-modules`   | 0.29 → 0.35      | JSI framework; tied to RN internals                       |
| `@react-native-community/cli*` | 15 → 20          | Pinned to RN version                                      |
| `@react-native/*`              | 0.76.9 → 0.85.3  | Pinned to RN version                                      |

#### Batch 3e -- Low Priority (minimal upgrade impact)

| Library                                | Current → Latest | Effort   | Notes                                       |
| -------------------------------------- | ---------------- | -------- | ------------------------------------------- |
| `react-native-confirmation-code-field` | 7 → 9            | 0.5 days | UI component                                |
| `react-native-progress`                | 3 → 5            | 0.5 days | UI component                                |
| `react-native-url-polyfill`            | 1 → 3            | 0.5 days | JS-only; safe                               |
| `react-native-qrcode-svg`              | 5 → 6            | 0.5 days | QR generation                               |
| `react-native-performance`             | 5 → 6            | 0.5 days | Perf monitoring                             |
| `react-native-sensors`                 | 5 → 7            | 0.5 days | Also candidate for expo-sensors replacement |

---

## Libraries That Must Wait for the Next RN Upgrade

Some libraries are **pinned to the RN version** or have latest versions that require a newer RN than we're on (0.76.9). These cannot be updated independently.

### RN-Pinned (8 libraries)

The `@react-native-community/cli*` and `@react-native/*` packages are released in lockstep with React Native. Their version must match the RN version.

### New Architecture Required (2 libraries)

| Library                      | Current | Latest | Requirement                             |
| ---------------------------- | ------- | ------ | --------------------------------------- |
| `react-native-reanimated`    | 3.17.2  | 4.3.1  | v4 requires New Architecture + RN 0.78+ |
| `react-native-vision-camera` | 4.6.4   | 5.0.10 | v5 is a Fabric-only rewrite             |

These updates are effectively part of the next RN upgrade scope. When we upgrade RN to 0.85+, we can simultaneously adopt Reanimated 4 and Vision Camera 5.

**Planning note:** This means the next RN upgrade will also be a New Architecture adoption moment. The library update strategy should ensure all _other_ libraries are current before that upgrade starts, so the upgrade scope is limited to RN + New Arch + these 2 libraries.

---

## Ongoing Maintenance Strategy

### Monthly Dependency Review (2 hours/month)

**When:** First Monday of each month  
**Who:** Rotating mobile platform engineer  
**What:**

1. Run `npx npm-check-updates --filter '/^react-native-|^@react-native|^expo/' --format group`
2. Update all **patch** versions immediately (single PR)
3. Review **minor** version changelogs; batch into a PR if safe
4. Flag **major** version bumps for sprint planning
5. Check `npx expo doctor` for Expo SDK compatibility issues

### Quarterly Deep Review (1 day/quarter)

**When:** End of each quarter  
**Who:** Mobile platform team  
**What:**

1. Full dependency audit including non-RN packages
2. Review all patch files -- are any now unnecessary because upstream fixed the issue?
3. Check library health (last commit date, open issues, maintainer activity)
4. Identify libraries approaching end-of-life or maintainer abandonment
5. Update this document with current staleness metrics

### Rules of Thumb

1. **Patch updates:** Merge same day. No sprint planning needed.
2. **Minor updates:** Merge within the sprint. Group by domain (UI, crypto, infra).
3. **Major updates:** One library per PR. Require changelog review + targeted test plan. Schedule in sprint planning.
4. **Never let a library fall more than 1 major version behind.** If a major version is released, create a ticket within 2 weeks.

### Ownership

| Domain             | Libraries                                                    | Owner                         |
| ------------------ | ------------------------------------------------------------ | ----------------------------- |
| Crypto & Security  | quick-crypto, fast-crypto, aes-crypto, keychain, randombytes | Security team review required |
| Push Notifications | firebase/app, firebase/messaging, notifee                    | Notifications squad           |
| Hardware Wallets   | ble-plx, ledgerhq/\*                                         | Hardware wallet squad         |
| Navigation & UI    | gesture-handler, screens, reanimated, safe-area              | Platform team                 |
| Deep Linking       | branch                                                       | Growth/engagement team        |
| KYC                | veriff                                                       | Identity team                 |
| Storage            | async-storage, mmkv                                          | Platform team                 |
| All others         | \*                                                           | Rotating platform duty        |

---

## Automation & Tooling

### Renovate / Dependabot Configuration

Recommended: Set up Renovate bot with MetaMask-specific rules:

```json
{
  "extends": ["config:base"],
  "packageRules": [
    {
      "matchPackagePatterns": ["^react-native-", "^@react-native"],
      "groupName": "react-native-community",
      "schedule": ["before 9am on Monday"],
      "automerge": false,
      "labels": ["dependencies", "mobile-platform"]
    },
    {
      "matchPackagePatterns": ["^expo-", "^@expo/"],
      "groupName": "expo-sdk",
      "schedule": ["before 9am on Monday"],
      "automerge": false,
      "labels": ["dependencies", "expo"]
    },
    {
      "matchPackagePatterns": [
        "react-native-quick-crypto",
        "react-native-fast-crypto",
        "react-native-aes-crypto",
        "react-native-keychain"
      ],
      "groupName": "crypto-security",
      "labels": ["dependencies", "security"],
      "reviewers": ["security-team"]
    },
    {
      "matchUpdateTypes": ["patch"],
      "matchPackagePatterns": ["^react-native-"],
      "automerge": true,
      "automergeType": "pr"
    }
  ],
  "ignoreDeps": [
    "@react-native-community/cli",
    "@react-native-community/cli-platform-android",
    "@react-native-community/cli-platform-ios",
    "@react-native/babel-preset",
    "@react-native/metro-config",
    "@react-native/typescript-config"
  ]
}
```

Key rules:

- **Auto-merge patch updates** after CI passes (zero risk, maximum freshness)
- **Weekly PRs** for minor/major updates (visibility without noise)
- **Security team review** required for crypto libraries
- **Ignore RN-pinned packages** (updated only during RN upgrades)

### `expo doctor` Integration

Add to CI pipeline:

```bash
npx expo doctor --non-interactive
```

This checks all Expo packages for version compatibility with the installed Expo SDK and flags mismatches before they become build failures.

### Patch File Audit Script

Add a quarterly check:

```bash
#!/bin/bash
# Check if patches are still needed against latest library versions
for patch in .yarn/patches/*.patch; do
  pkg=$(echo "$patch" | sed 's/.*\///' | sed 's/-npm-.*//')
  echo "Patch: $patch"
  echo "  Package: $pkg"
  echo "  Consider: is this fixed upstream in the latest version?"
  echo ""
done
```

---

## Effort Estimation

### Total Catchup Effort

| Wave                          | Scope               | Effort                      | Risk                         |
| ----------------------------- | ------------------- | --------------------------- | ---------------------------- |
| Wave 1: Patches               | 10 libraries        | 0.5 days                    | None                         |
| Wave 2: Minors                | 19 libraries, 5 PRs | 2-3 days                    | Low                          |
| Wave 3a: Critical majors      | 5 libraries         | 2 weeks                     | Medium                       |
| Wave 3b: High-priority majors | 7 libraries         | 2 weeks                     | Medium                       |
| Wave 3c: Crypto majors        | 5 libraries         | 1 week                      | High (needs security review) |
| Wave 3d: Deferred             | 10 libraries        | 0 (bundled with RN upgrade) | --                           |
| Wave 3e: Low-priority majors  | 6 libraries         | 1.5 days                    | Low                          |
| **Total catchup**             | **62 libraries**    | **~6-8 eng-weeks**          |                              |

### Ongoing Maintenance Effort

| Activity                     | Frequency   | Effort                  |
| ---------------------------- | ----------- | ----------------------- |
| Monthly dependency review    | Monthly     | 2 hours                 |
| Patch update PRs             | Monthly     | 1 hour                  |
| Minor update PRs             | Monthly     | 2-4 hours               |
| Major update PRs             | As released | 0.5-2 days each         |
| Quarterly deep review        | Quarterly   | 1 day                   |
| **Total annual maintenance** |             | **~3-4 eng-weeks/year** |

### Net Impact on RN Upgrades

| Scenario                           | Upgrade Effort | Library Compat Phase                         |
| ---------------------------------- | -------------- | -------------------------------------------- |
| **Current state (72 outdated)**    | 6-10 weeks     | 1-2 weeks debugging library compat           |
| **After catchup (all current)**    | 5-8 weeks      | 1-2 days (most libraries already compatible) |
| **Steady state (regular updates)** | 4-7 weeks      | 0.5-1 day                                    |

---

## Risk Assessment

### Risks of Updating

| Risk                                 | Likelihood      | Impact   | Mitigation                                                                    |
| ------------------------------------ | --------------- | -------- | ----------------------------------------------------------------------------- |
| Breaking change in major update      | High (expected) | Medium   | One library per PR; changelog review; targeted tests                          |
| Data migration needed (storage libs) | Medium          | High     | Test on real devices with existing user data; staged rollout                  |
| Crypto library behavioral change     | Low             | Critical | Security team review; test all wallet operations (create, sign, send, import) |
| Native compilation failure           | Medium          | Low      | CI catches this; fix or revert the PR                                         |
| Regression in production             | Low             | High     | Feature flags for risky updates; staged rollout via OTA                       |

### Risks of NOT Updating

| Risk                                  | Likelihood    | Impact   | Mitigation                                                  |
| ------------------------------------- | ------------- | -------- | ----------------------------------------------------------- |
| Library won't compile on next RN      | **Very High** | High     | None -- forced to update during upgrade under time pressure |
| Security vulnerability in old version | Medium        | Critical | None -- unpatched until forced update                       |
| Library becomes unmaintained          | Medium        | High     | Must fork or find alternative (more expensive)              |
| Patch files multiply                  | **Very High** | Medium   | None -- more patches = more audit work per upgrade          |
| 6-10 week upgrade cycles continue     | **Certain**   | High     | This is the current reality                                 |

**The risk of not updating is higher than the risk of updating.** The difference is that update risk is _controlled_ (one PR at a time, with tests) while no-update risk is _uncontrolled_ (everything breaks at once during an RN upgrade).

---

## Recommendation

### Verdict: Start Immediately, Maintain Continuously

Library updates are the **highest-ROI, lowest-risk initiative** on Andre's list. Unlike CNG (which requires architectural changes) or Expo library migration (which requires API rewrites), most library updates are straightforward version bumps with well-documented changelogs.

### Execution Plan

```
Week 1:     Wave 1 (patches) + Wave 2 PRs A-B (UI/media minors)
Week 2:     Wave 2 PRs C-E (infra/crypto/misc minors)
Week 3-4:   Wave 3a (device-info, share, firebase, mmkv, permissions)
Week 5-6:   Wave 3b (async-storage, branch, pager-view, veriff, lottie, ledger)
Week 7:     Wave 3c (crypto -- with security review)
Week 8:     Wave 3e (low priority) + set up monthly cadence
```

### How This Relates to the Other Three Initiatives

Andre listed four initiatives. Here's how they interact:

```
                        ┌─────────────────────────┐
                        │   Libraries Updates      │ ← THIS DOCUMENT
                        │   (keep deps current)    │    Do first. Standalone value.
                        └────────────┬────────────┘
                                     │ enables
                        ┌────────────▼────────────┐
                        │   Switch to Expo Libs    │ ← expo-library-migration-research.md
                        │   (replace RN→Expo)      │    Do second. Fewer deps to maintain.
                        └────────────┬────────────┘
                                     │ enables
                        ┌────────────▼────────────┐
                        │   Expo CNG               │ ← expo-cng-integration-research.md
                        │   (auto-generate native) │    Do third. Transformational win.
                        └────────────┬────────────┘
                                     │ validates
                        ┌────────────▼────────────┐
                        │   E2E/Unit Tests         │
                        │   (testing frameworks)   │    Parallel track. Validates all above.
                        └─────────────────────────┘
```

**Library Updates is the foundation.** You can't safely migrate to Expo libraries if those libraries are 6 versions behind. You can't adopt CNG if half your dependencies need patches to compile. And better tests validate that every update is safe.

**Start here. It costs the least. It de-risks everything else.**

---

## References

- [npm-check-updates](https://github.com/raineorshine/npm-check-updates) -- CLI tool for checking outdated dependencies
- [Renovate Bot](https://docs.renovatebot.com/) -- Automated dependency update PRs
- [Expo Doctor](https://docs.expo.dev/more/expo-cli/#doctor) -- Expo SDK compatibility checker
- [Semantic Versioning](https://semver.org/) -- Major.Minor.Patch version contract
- [React Native Upgrade Helper](https://react-native-community.github.io/upgrade-helper/) -- Diff tool for RN version upgrades
- [`expo-library-migration-research.md`](./expo-library-migration-research.md) -- Companion: switching community libs to Expo equivalents
- [`expo-cng-integration-research.md`](./expo-cng-integration-research.md) -- Companion: adopting Continuous Native Generation
