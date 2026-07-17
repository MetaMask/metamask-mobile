# RN 0.85 Upgrade Spike (from 0.81.5)

**Date:** 2026-06-24  
**Branch:** feat/rn-0.85  
**Current version:** 0.81.5 → Target: 0.85.0

---

## Wins

| Version  | Win                                                                                |
| -------- | ---------------------------------------------------------------------------------- |
| **0.82** | Bridge fully removed → faster startup, cleaner JSI-only arch                       |
| **0.82** | Uncaught Promise Rejections now surface via `console.error` → surfaces silent bugs |
| **0.83** | React 19.2: `<Activity>` component + `useEffectEvent` hook                         |
| **0.83** | Web Performance APIs stable (`performance.now()`, `PerformanceObserver`)           |
| **0.84** | Hermes V1 default → better JS perf + memory                                        |
| **0.84** | iOS: ~20% faster builds + smaller app size (legacy arch stripped from pods)        |
| **0.85** | New Animation Backend: animate Flexbox/position props with `useNativeDriver: true` |
| **0.85** | Reanimated 4.x perf improvements unblocked by the new backend                      |
| **0.85** | Multiple CDP connections → VS Code + AI agents + DevTools simultaneously           |
| **0.85** | Metro TLS support                                                                  |

---

## Breaking Changes Across All 4 Versions

### 0.82 — BIGGEST JUMP

- **New Architecture mandatory** — `newArchEnabled=false` (Android) and `RCT_NEW_ARCH_ENABLED=0` (iOS) are now silently ignored. Good news: `android/gradle.properties` already has `newArchEnabled=true`.
- `Appearance.setColorScheme()` no longer accepts `null`/`undefined` — use `'unspecified'`
- Android: `JSONArguments` class removed, Gradle 8.x → 9.0.0 required
- C++ backward-compat headers deleted (only affects patched native libs)

### 0.83 — No breaking changes

- React 19.1.0 → 19.2.x peer dep bump

### 0.84

- Node.js 22+ required (already on 24.16.0 — no action needed)
- Many Android legacy bridge classes removed (`LazyReactPackage`, `CxxModuleWrapper`, `BridgeDevSupportManager`, etc.)
- iOS: Legacy arch stripped from pods by default — saves ~20% build time, but any third-party pod still using legacy C++ headers will break
- `XHRInterceptor`/`WebSocketInterceptor` deprecated (0 usages in codebase — fine)
- `MainApplication.kt` refactored: `ReactNativeHost` removed, simplified to `getDefaultReactHost`

### 0.85

- **`StyleSheet.absoluteFillObject` removed** — **28 files affected** (see Codebase Actions)
- Jest preset moved: `preset: 'react-native'` → `preset: '@react-native/jest-preset'` (new package, `jest.config.js:32`)
- `@react-native/babel-preset`/`metro-config`/`typescript-config` must match 0.85.0
- Gradle: 8.14.3 → 9.3.1
- React 19.2.3, `@types/react` → ^19.2.0
- iOS: `Podfile` and `MainApplication.kt` template changes

---

## Codebase Actions Required

| Item                                                        | Scope                        | Location                                           |
| ----------------------------------------------------------- | ---------------------------- | -------------------------------------------------- |
| `StyleSheet.absoluteFillObject` → `StyleSheet.absoluteFill` | **Must be in RN upgrade PR** | 28 files in `app/`                                 |
| `jest.config.js:32` preset change                           | Must be in RN upgrade PR     | `jest.config.js`                                   |
| `@react-native/babel-preset` 0.76.9 → 0.85.0                | Must                         | `package.json`                                     |
| `@react-native/metro-config` 0.81.5 → 0.85.0                | Must                         | `package.json`                                     |
| `@react-native/typescript-config` 0.76.9 → 0.85.0           | Must                         | `package.json`                                     |
| `metro-react-native-babel-preset` ~0.76.9 → ~0.84.x         | Must                         | `package.json`                                     |
| Add `@react-native/jest-preset` 0.85.0                      | Must                         | `package.json`                                     |
| `react`/`react-test-renderer` 19.1.0 → 19.2.3               | Must                         | `package.json`                                     |
| `@react-native-community/cli` 20.0.0 → 20.1.0               | Must                         | `package.json`                                     |
| Android `MainApplication.kt` refactor                       | Must                         | `android/app/src/main/java/.../MainApplication.kt` |
| iOS `Podfile` changes                                       | Must                         | `ios/Podfile`                                      |
| Gradle wrapper 8.14.3 → 9.3.1                               | Must                         | `android/gradle/wrapper/gradle-wrapper.properties` |
| Audit `Appearance.setColorScheme(null)` usage               | Must audit                   | `app/`                                             |

### Files using `StyleSheet.absoluteFillObject` (28 total)

```
app/components/UI/Tabs/TabThumbnail/TabThumbnail.styles.ts
app/components/UI/Card/components/DaimoPayModal/DaimoPayModal.tsx
app/components/UI/Card/Views/SpendingLimit/components/ShimmerOverlay.tsx
app/components/UI/Notification/TransactionNotification/index.js
app/components/UI/Bridge/components/TransactionDetails/PulsingCircle.tsx
app/components/UI/CollectibleMedia/CollectibleMedia.styles.ts
app/components/UI/WebviewError/index.js
app/components/UI/AssetOverview/PriceChart/PriceChart.styles.tsx
app/components/UI/AssetOverview/Price/Price.styles.tsx
app/components/UI/Predict/components/PredictDetailsChart/PredictDetailsChart.tsx
app/components/UI/HardwareWallet/Swaps/HwQrScanner.tsx
app/components/UI/HardwareWallet/Swaps/StepConnectorLine.tsx
app/components/UI/SlippageSlider/index.js
app/components/UI/Ramp/Aggregator/components/LoadingAnimation/index.tsx
app/components/UI/ButtonReveal/index.tsx
app/components/UI/ReusableModal/styles.ts
app/components/UI/UrlAutocomplete/styles.ts
app/components/Views/MediaPlayer/index.js
app/components/Views/Homepage/Sections/Perpetuals/components/PerpsMarketTileCard/PerpsMarketTileCard.styles.ts
app/components/Views/TradeWalletActions/TradeWalletActions.tsx
(+ 8 more)
```

---

## Library Updates

### Must update in the RN upgrade PR

| Package                | Current | Target  | Notes                                   |
| ---------------------- | ------- | ------- | --------------------------------------- |
| `react-native-screens` | ~4.16.0 | ~4.25.2 | Minor bump, low risk                    |
| `react-native-svg`     | 15.12.1 | 15.15.5 | Minor bump; 0.84 broke its observer API |
| `@shopify/flash-list`  | 2.0.3   | 2.3.2   | Minor bump                              |

### Can be separate PRs (update independently before or after)

| Package                            | Current | Target   | Risk       | Notes                                                                        |
| ---------------------------------- | ------- | -------- | ---------- | ---------------------------------------------------------------------------- |
| `react-native-gesture-handler`     | ~2.28.0 | ^3.0.2   | **HIGH**   | 3.x is new arch only, min RN 0.82; API changes expected                      |
| `react-native-reanimated`          | 3.19.0  | ^4.5.0   | **HIGH**   | 4.x integrates with new Animation Backend; wait for RN 0.85.1                |
| `react-native-mmkv`                | ^3.2.0  | ^4.3.2   | **MEDIUM** | 4.x is a Nitro Module; API changed                                           |
| `react-native-vision-camera`       | ^4.7.3  | ^5.0.11  | **HIGH**   | Full Nitro Module rewrite in v5                                              |
| `@sentry/react-native`             | ~7.2.0  | ~8.15.1  | **MEDIUM** | Major bump; verify init API changes                                          |
| `@react-native-firebase/app`       | ^20.5.0 | ^24.1.1  | **HIGH**   | 4 major versions; requires `forceStaticLinking` for iOS on RN 0.84+          |
| `expo`                             | 54.0.33 | SDK 56   | **HIGH**   | Skips SDK 55; SDK 56 = RN 0.85; all `expo-*` packages bump                   |
| `react-native-keyboard-controller` | ^1.20.3 | ^1.21.9  | **LOW**    | Minor bump                                                                   |
| `lottie-react-native`              | ~7.3.1  | ~7.3.8   | **LOW**    | Minor bump                                                                   |
| `@notifee/react-native`            | ^9.0.0  | ⚠️ 9.1.8 | **NOTE**   | Unmaintained; community suggests migrating to `expo-notifications` long-term |

---

## Suggested Order of Work

1. **Core RN upgrade PR**
   - `react-native` 0.81.5 → 0.85.0
   - All `@react-native/*` tooling (babel-preset, metro-config, typescript-config, eslint-config) → 0.85.0
   - Add `@react-native/jest-preset` 0.85.0
   - `react` + `react-test-renderer` → 19.2.3
   - `@types/react` → ^19.2.0
   - `@react-native-community/cli` → 20.1.0
   - Fix `jest.config.js` preset
   - Fix 28x `StyleSheet.absoluteFillObject` → `StyleSheet.absoluteFill`
   - Gradle wrapper → 9.3.1
   - Android `MainApplication.kt` + iOS `Podfile` template changes
   - Bump `react-native-screens`, `react-native-svg`, `flash-list`

2. **Parallel low-risk PRs** (can land with or before core)
   - `react-native-keyboard-controller` → ^1.21.9
   - `lottie-react-native` → ~7.3.8

3. **Follow-up PRs** (each its own PR — all major version bumps)
   - `react-native-gesture-handler` → 3.x
   - `@react-native-firebase` → 24.x (most complex)
   - `@sentry/react-native` → 8.x
   - `expo` → SDK 56

4. **After RN 0.85.1 is released**
   - `react-native-reanimated` → 4.x (new Animation Backend only available from 0.85.1)
   - `react-native-vision-camera` → 5.x (Nitro Module)
   - `react-native-mmkv` → 4.x (Nitro Module)
