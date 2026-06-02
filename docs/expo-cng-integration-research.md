# Expo CNG (Continuous Native Generation) Integration Research

## Table of Contents

1. [What is CNG?](#what-is-cng)
2. [How CNG Works](#how-cng-works)
3. [Current State of MetaMask Mobile](#current-state-of-metamask-mobile)
4. [How CNG Will Improve React Native Upgrades](#how-cng-will-improve-react-native-upgrades)
5. [Benefits of CNG for MetaMask](#benefits-of-cng-for-metamask)
6. [Risks and Challenges](#risks-and-challenges)
7. [Full Inventory of Native Customizations](#full-inventory-of-native-customizations)
8. [Required Changes](#required-changes)
9. [Migration Timeline](#migration-timeline)
10. [Detailed Implementation Plan](#detailed-implementation-plan)

---

## What is CNG?

Continuous Native Generation (CNG) is an Expo paradigm where **native `android/` and `ios/` directories are generated on-demand** rather than maintained manually in source control. Instead of creating native projects once and accumulating manual edits over the lifetime of the codebase, CNG treats them as **short-lived build artifacts** produced from:

- **`app.config.js`** -- the declarative source of truth for all native configuration
- **Config plugins** -- functions that modify native projects during the generation step
- **Autolinking** -- automatic linking of native modules from `package.json` dependencies
- **The Expo prebuild template** -- the base native project scaffold (pinned to each Expo SDK version)

The generation is triggered by running:

```bash
npx expo prebuild          # generates android/ and ios/
npx expo prebuild --clean  # deletes existing native dirs first, then regenerates
```

The native directories are added to `.gitignore` and never committed. All native customizations live in JavaScript/TypeScript config plugins that are version-controlled alongside the rest of the app code.

---

## How CNG Works

### The Prebuild Pipeline

```
app.config.js + config plugins + autolinking + prebuild template
    |
    v
npx expo prebuild
    |
    v
Generated android/ and ios/ directories
    |
    v
Native build (Gradle / Xcode)
    |
    v
.apk / .ipa
```

### Key Components

1. **`app.config.js`** -- Declares app name, bundle identifiers, permissions, URL schemes, entitlements, and references config plugins.

2. **Config Plugins** -- JavaScript functions that receive the Expo config and modify native files (AndroidManifest.xml, build.gradle, Info.plist, Podfile, entitlements, source files, etc.) using the `@expo/config-plugins` API. Types:
   - **Built-in** -- Ship with Expo SDK packages (e.g., `expo-font`, `expo-splash-screen`)
   - **Community** -- Published npm packages (e.g., `@config-plugins/detox`, `@react-native-firebase/app`)
   - **Custom local** -- Project-specific plugins written in the repo

3. **Autolinking** -- `expo-modules-autolinking` scans `package.json` for React Native libraries and links them automatically. Already in use in this project.

4. **Prebuild Template** -- `expo-template-bare-minimum` provides the starting native project files. Aligned with each Expo SDK version.

### Build Integration

- **Local builds**: `npx expo run:android` / `npx expo run:ios` (runs prebuild if native dirs are absent)
- **EAS Build (cloud)**: Automatically runs prebuild before compilation when native dirs are absent
- **CI/CD**: Prebuild runs as a build step; native dirs are never cached or committed

---

## Current State of MetaMask Mobile

### Already Using Expo

MetaMask is **already significantly integrated with Expo** but is **not yet using CNG**. The native directories (`android/` and `ios/`) are committed to git and maintained manually.

| Component                | Status                                            |
| ------------------------ | ------------------------------------------------- |
| Expo SDK                 | `54.0.33` (SDK 54)                                |
| React Native             | `0.81.5`                                          |
| `app.config.js`          | Exists with plugins, OTA config, React Compiler   |
| Expo modules autolinking | Active in both Podfile and settings.gradle        |
| `expo-updates` (OTA)     | Configured with code signing                      |
| `expo-dev-client`        | Installed                                         |
| `expo-font`              | Managing custom fonts via config plugin           |
| `expo-build-properties`  | Configuring Maven repos, JS engine                |
| `@expo/fingerprint`      | Tracking native changes                           |
| `@expo/repack-app`       | Repacking support                                 |
| Metro config             | Using `expo/metro-config` as base                 |
| Babel preset             | Using `babel-preset-expo`                         |
| Native dirs in git       | **YES -- both `android/` and `ios/` are tracked** |

### Expo Packages in Use

```
expo                        54.0.33
expo-apple-authentication   ~8.0.8
expo-asset                  ~12.0.12
expo-auth-session           ~7.0.10
expo-build-properties       ~1.0.10
expo-dev-client             ~6.0.20
expo-file-system            ~19.0.21
expo-font                   ~14.0.11
expo-haptics                ~15.0.8
expo-image                  ~3.0.11
expo-local-authentication   ~17.0.8
expo-screen-orientation     ~9.0.8
expo-sensors                ~15.0.8
expo-splash-screen          ~31.0.13
expo-updates                ~29.0.16
expo-web-browser            ~15.0.10 (patched)
@expo/fingerprint           ~0.15.4
@expo/repack-app            ^0.2.9
@config-plugins/detox       ^9.0.0
```

---

## How CNG Will Improve React Native Upgrades

### The Current Reality: RN Upgrades Are Painful

React Native upgrades are the single most expensive recurring maintenance task in the MetaMask mobile codebase. The git history tells the full story.

### RN 0.81.5 Upgrade (Latest) -- By the Numbers

| Metric                                     | Value                                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **PR**                                     | #29195 -- `feat: React Native Upgrade / 0.81.5`                                           |
| **Branch active**                          | Feb 23 -- Apr 22, 2026 (~2 months of development)                                         |
| **Merged**                                 | May 8, 2026                                                                               |
| **Total files changed**                    | 357                                                                                       |
| **Total lines changed**                    | 7,263 insertions, 5,861 deletions (13,124 total)                                          |
| **Native files changed (android/ + ios/)** | 22 files, 2,238 insertions, 955 deletions                                                 |
| **Patch files changed**                    | 28 files, 491 insertions, 1,289 deletions                                                 |
| **Config files changed**                   | 5 (package.json, metro.config.js, babel.config.js, react-native.config.js, app.config.js) |
| **Follow-up fixup commits**                | 9+ (CMAKE overrides, Bridgeless inspector, Podfile alignment, etc.)                       |

#### Native files that had to be manually updated:

**Android (9 files):**

```
android/app/build.gradle                              3 changes
android/app/src/main/AndroidManifest.xml              5 additions
android/app/src/main/java/io/metamask/MainApplication.kt   13 changes (rewrite)
android/build.gradle                                  57 changes
android/gradle.properties                             9 changes
android/gradle.properties.github                      17 changes
android/gradle/wrapper/gradle-wrapper.properties      2 changes
android/gradlew                                       3 changes
android/settings.gradle                               16 changes
```

**iOS (13 files):**

```
ios/Gemfile                                           6 additions
ios/Gemfile.lock                                      6 additions
ios/MetaMask-Bridging-Header.h                        7 additions (new file)
ios/MetaMask.xcodeproj/project.pbxproj                50 changes
ios/MetaMask/AppDelegate.mm                           137 deletions (removed)
ios/MetaMask/AppDelegate.swift                        168 additions (new file -- ObjC to Swift rewrite)
ios/MetaMask/Base.lproj/LaunchScreen.xib              32 additions
ios/MetaMask/BrazeHelper.mm                           20 additions (new file)
ios/MetaMask/Info.plist                               10 changes
ios/MetaMask/PrivacyInfo.xcprivacy                    2 changes
ios/MetaMask/main.m                                   10 deletions (removed)
ios/Podfile                                           2 additions
ios/Podfile.lock                                      2,618 changes (regenerated)
```

#### Patch files that had to be created, updated, or removed:

```
CREATED (13 patches):
  @metamask-react-native-acm-npm-1.2.0.patch
  @metamask-react-native-button-npm-3.0.0.patch
  @metamask-react-native-payments-npm-2.0.2.patch
  @metamask-react-native-webview-npm-14.6.0.patch
  @react-native-community-viewpager-npm-3.3.0.patch
  detox-npm-20.51.0.patch
  expo-web-browser-patch-901cbe9795.patch
  react-native-aes-crypto-forked-https.patch
  react-native-gzip-npm-1.1.0.patch
  react-native-i18n-npm-2.0.15.patch
  react-native-os-npm-1.2.6.patch
  react-native-sensors-npm-5.3.0.patch
  reactotron-core-client-npm-2.9.7.patch

UPDATED (4 patches):
  expo-web-browser-npm-15.0.10.patch
  react-native-fast-crypto-npm-2.2.0.patch
  react-native-npm-0.81.5.patch (was 0.76.9)

REMOVED (7 patches):
  expo-updates-npm-0.27.4.patch
  react-native-npm-0.76.9.patch
  rive-react-native-npm-9.3.4.patch
  react-native+0.76.9.patch
  react-native-aes-crypto-forked+1.2.1.patch
  react-native-performance+5.1.2.patch
  react-native-qrcode-svg+5.1.2.patch
  react-native-view-shot+3.8.0.patch
```

#### Post-merge follow-up fixes required:

After the PR was merged to main, additional fixes were needed across branches:

```
fix: add CMAKE_VERSION override to bitrise.yml for RN 0.81 compatibility  (5 attempts)
fix: add CMAKE_VERSION override to build.yml for RN 0.81 compatibility
fix(agentic): match RN 0.81 Bridgeless inspector targets                   (3 attempts)
chore: podfile and pbxproj alignment
fix(ios): align Podfile.lock checksums with CI runner output
fix(ios): align project.pbxproj BrazeHelper.mm entries to sort order
```

### RN 0.76.6 Upgrade (Previous) -- Comparison

| Metric                   | Value                                                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PR**                   | #13771 -- `chore: Upgrade React Native to 0.76.6`                                                                                                         |
| **Merged**               | Apr 30, 2025                                                                                                                                              |
| **Total files changed**  | 378                                                                                                                                                       |
| **Total lines changed**  | 22,018 insertions, 20,334 deletions (42,352 total)                                                                                                        |
| **Native files changed** | 28 files, 2,696 insertions, 1,421 deletions                                                                                                               |
| **Language rewrites**    | Java to Kotlin (MainActivity.java -> .kt, MainApplication.java -> .kt)                                                                                    |
| **Files deleted**        | ReactNativeFlipper.java (debug+release), MainApplicationReactNativeHost.java, MainComponentsRegistry.java, MainApplicationTurboModuleManagerDelegate.java |

The 0.76.6 upgrade was even more invasive -- 42,000+ lines changed, including a full Java-to-Kotlin rewrite of `MainActivity` and `MainApplication`, and the removal of 5 legacy Java files that were part of the old architecture.

### Upgrade Timeline History

| Version   | Date         | Duration                            | Gap Between Upgrades |
| --------- | ------------ | ----------------------------------- | -------------------- |
| RN 0.71.6 | Jun 30, 2023 | Unknown                             | --                   |
| RN 0.76.6 | Apr 30, 2025 | Unknown                             | **22 months**        |
| RN 0.81.5 | May 8, 2026  | ~2.5 months (branch active Feb-May) | **12 months**        |

The 22-month gap between 0.71.6 and 0.76.6 illustrates the problem: upgrades are so painful that they get deferred, which makes the next upgrade even harder. Five major versions were skipped (0.72, 0.73, 0.74, 0.75, 0.76).

### What the Upgrade Work Actually Involves

Each RN upgrade today requires an engineer to:

1. **Create a long-lived branch** -- the 0.81.5 branch was active for ~2.5 months, requiring 30+ merge commits from main to stay current.
2. **Manually diff the RN upgrade helper** -- compare the old template vs new template at [react-native-community/rn-diff-purge](https://github.com/react-native-community/rn-diff-purge) and apply every change to MetaMask's heavily customized native projects.
3. **Rewrite native entry points** -- e.g., 0.81.5 required rewriting `AppDelegate.mm` (Obj-C++) to `AppDelegate.swift`, adding `BrazeHelper.mm`, creating a bridging header, and removing `main.m`.
4. **Update 9+ Gradle files** -- build.gradle, settings.gradle, gradle.properties, wrapper properties, all with MetaMask-specific customizations that must be carefully preserved during the merge.
5. **Regenerate Podfile.lock** -- 2,600+ lines of diff that can only be verified by running `pod install` on the correct macOS/Xcode version.
6. **Create/update/remove patches** -- 28 patch files changed in 0.81.5; each must be verified against the new RN version, recreated if the underlying package changed, or removed if no longer needed.
7. **Fix CI/CD breakage** -- CMAKE version overrides, Bridgeless inspector changes, Podfile.lock checksum alignment -- these only surface when CI runs the build.
8. **Resolve merge conflicts repeatedly** -- the long-lived branch accumulates conflicts with every main merge. The 0.81.5 branch had 30+ merge commits.
9. **Re-verify every integration** -- Branch.io, Braze, Sentry, Firebase, Detox, signing configs, push notifications all must be retested against the new native code.

### How CNG Eliminates This

With CNG, the native directories are **generated from config**, not maintained manually. An upgrade becomes:

```bash
# Step 1: Update dependencies
yarn add react-native@0.85.0 expo@57

# Step 2: Run prebuild
npx expo prebuild --clean

# Step 3: Build and test
npx expo run:ios
npx expo run:android
```

#### What changes with CNG:

| Current (Manual)                                          | With CNG                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 22 native files manually edited                           | 0 native files manually edited                                                       |
| ~3,200 lines of native code diffed and merged             | All native code regenerated from template                                            |
| AppDelegate.mm rewritten to AppDelegate.swift             | Template generates correct AppDelegate; config plugins apply customizations          |
| settings.gradle manually updated with source build config | Config plugin injects the same config into freshly generated settings.gradle         |
| Podfile.lock 2,600-line diff                              | `pod install` runs on fresh Podfile; no diff to review                               |
| project.pbxproj manual merge (notoriously conflict-prone) | Generated fresh; no merge conflicts possible                                         |
| 28 patch files audited, 13 created, 7 removed             | Patches that fix native template issues are no longer needed; only JS patches remain |
| 2.5-month branch with 30+ merge conflicts                 | Days, not months -- short-lived branch with minimal conflicts                        |
| Post-merge CMAKE/Bridgeless fixups                        | Template handles build tooling versions automatically                                |
| Java -> Kotlin rewrites when template language changes    | Template always generates the current language; plugins don't care                   |

#### What still requires manual work:

- **Updating config plugins** if the new RN version changes the structure of files that plugins modify (e.g., a plugin that modifies `MainApplication.kt` may need adjustment if a method signature changes). However, this is a targeted fix in a single `.js` file, not a diff across 22 native files.
- **Updating `app.config.js`** if new Expo SDK introduces new plugin API options.
- **Updating JS-only patches** that fix issues in third-party npm packages.
- **Testing** -- the E2E/QA verification cycle doesn't change.

#### Estimated upgrade effort comparison:

| Phase                      | Current              | With CNG                          |
| -------------------------- | -------------------- | --------------------------------- |
| Native code migration      | 2-4 weeks            | 0 (auto-generated)                |
| Patch audit and recreation | 1 week               | 2 days (JS patches only)          |
| CI/CD fixes                | 3-5 days             | 1 day (prebuild step is standard) |
| Build verification         | 1 week               | 1 week (unchanged)                |
| E2E/QA testing             | 1-2 weeks            | 1-2 weeks (unchanged)             |
| Merge conflict resolution  | Ongoing (~30 merges) | Minimal (short branch lifetime)   |
| **Total**                  | **6-10 weeks**       | **2-3 weeks**                     |

### Moving Forward: The Path to Faster Upgrades

Once CNG is adopted, MetaMask can realistically upgrade React Native **with every major release** instead of accumulating multi-version gaps:

1. **RN 0.82/0.83 (next upgrade)**: Still manual if CNG isn't ready. Expected same ~2 month effort.
2. **First CNG-powered upgrade**: After CNG migration is complete, the next RN upgrade is the validation -- expect 2-3 weeks including thorough testing.
3. **Steady state**: Each subsequent upgrade should take 1-2 weeks, mostly QA. Native code changes are absorbed by the Expo template automatically.
4. **Expo SDK upgrades**: These happen roughly every 3-4 months. With CNG, upgrading Expo SDK also upgrades the underlying RN version, making it a single coordinated step rather than two separate painful migrations.

The key insight: **the cost of upgrading is proportional to how many native files you maintain manually**. With 22+ native files, every upgrade is a multi-week project. With 0 native files (CNG), the upgrade cost approaches the cost of testing alone.

---

## Benefits of CNG for MetaMask

### 1. Dramatically Simplified React Native Upgrades

As detailed in the section above, RN upgrades drop from 6-10 weeks of manual native file surgery to 2-3 weeks of config updates and testing. With CNG, upgrading is:

```bash
yarn add react-native@new-version expo@new-sdk
npx expo prebuild --clean
```

No manual merge conflicts in hundreds of native files.

### 2. Elimination of Native Code Drift

Manual edits to native files accumulate over time. Some become orphaned (the library that needed them was removed). Some conflict with newer RN templates. CNG ensures native code is always generated fresh from a known template + explicit customizations.

### 3. Simplified Multi-Flavor Builds (Main + Flask)

Currently, the project maintains parallel native configs for `prod` and `flask` flavors (separate `Info.plist`, separate signing configs, separate build types). With CNG, flavors can be expressed as environment-driven `app.config.js` variations that generate the correct native project per build.

### 4. Reduced Patch Burden

23 patch files currently modify native dependencies. Some of these patches fix issues that a clean prebuild with the correct Expo SDK template would not have. CNG reduces (but does not eliminate) the need for patches that touch native code.

### 5. Onboarding Speed

New developers no longer need to understand the native project structure to get started. `npx expo prebuild && npx expo run:ios` just works.

### 6. Better OTA Update Alignment

Already using `expo-updates` for OTA. CNG ensures the native project is always aligned with the Expo SDK version that powers OTA, reducing fingerprint mismatches.

### 7. Deterministic CI Builds

No risk of CI building from stale native directories with leftover manual changes. Every build starts from a clean prebuild.

---

## Risks and Challenges

### Critical Risks

1. **Product Flavors (Main vs Flask)**: The project uses Gradle `productFlavors` (`prod` + `flask`) with different `applicationId`, signing configs, and build types. Expo Prebuild does not natively support product flavors. This requires a custom config plugin or a different approach (e.g., environment-driven `app.config.js` with separate prebuild passes).

2. **Signing Configurations**: 10+ signing configs with environment-specific keystores. These must be represented in config plugins that read from environment variables.

3. **Custom Native Modules**: 5 Android native modules and 1 iOS native module are hand-written in the project. These need to be converted to Expo Modules or kept as separate packages with proper autolinking.

4. **Complex Podfile/build.gradle**: Heavy post-install hooks, dependency substitution, manifest patching (Veriff SDK), BouncyCastle resolution, Kotlin stdlib pinning. Each must become a config plugin.

5. **Build Scripts**: The `scripts/build.sh` orchestration layer controls environment variables, signing, flavors. This needs to be reimagined for CNG.

6. **iOS Targets**: Two Xcode targets (`MetaMask` and `MetaMask-Flask`) share code via `common_target_logic` in the Podfile. CNG generates a single target by default.

### Medium Risks

7. **Patch Files**: 23 patches, some touching native code indirectly. Each must be verified to still be necessary after prebuild.

8. **Branch.io Integration**: Custom initialization code in both AppDelegate and MainApplication/MainActivity.

9. **Braze SDK Integration**: Custom `BrazeHelper.mm`, push notification service config, Firebase messaging service in Android manifest.

10. **Detox E2E Setup**: Custom Detox configuration in build.gradle, proguard rules, and settings.gradle.

11. **LavaMoat Lockdown**: `@lavamoat/react-native-lockdown` hooks into the Metro serializer. This is JS-side and should survive CNG, but needs verification.

### Low Risks

12. **Expo Modules Already Autolinked**: Most Expo modules already autolink and have their own config plugins.

13. **Font Management**: Already migrated to `expo-font` plugin.

14. **Metro/Babel Config**: These are JS-side and unaffected by CNG.

---

## Full Inventory of Native Customizations

### Android -- `android/app/build.gradle`

| Customization                                                                                                                  | Lines   | Config Plugin Strategy                                             |
| ------------------------------------------------------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------ |
| Sentry gradle plugin + config                                                                                                  | 80-113  | `@sentry/react-native` config plugin                               |
| Custom keystore password retrieval function                                                                                    | 115-139 | Custom config plugin (signing)                                     |
| Proguard enabled in release                                                                                                    | 144     | `expo-build-properties`                                            |
| `reactNativeArchitectures()` function                                                                                          | 164-167 | `expo-build-properties`                                            |
| `ndkVersion`, `buildToolsVersion`, `compileSdk`                                                                                | 171-174 | `expo-build-properties`                                            |
| `namespace "io.metamask"`                                                                                                      | 176     | `app.config.js` android.package                                    |
| `defaultConfig` (appId, versionName, versionCode, testRunner, manifestPlaceholders, Braze resValues, resourceConfigurations)   | 178-196 | Custom config plugin                                               |
| `packagingOptions` (excludes, pickFirst for libc++, libcrypto)                                                                 | 198-214 | Custom config plugin                                               |
| 10 signing configs (mainProd, mainBeta, mainRc, mainTest, mainE2e, mainExp, mainDev, flaskProd, flaskE2e, flaskTest, flaskDev) | 220-287 | Custom config plugin (signing)                                     |
| `buildTypes` (debug/release with manifestPlaceholders, proguard, crunchPngs)                                                   | 289-300 | Custom config plugin                                               |
| `productFlavors` (prod + flask with env-driven signing)                                                                        | 302-344 | **Major challenge** -- custom config plugin or multi-pass prebuild |
| `buildConfigField foxCode`                                                                                                     | 346-348 | Custom config plugin                                               |
| BouncyCastle dependency substitution (Veriff)                                                                                  | 356-362 | Custom config plugin                                               |
| Veriff SDK manifest patching (minSdkVersion 26 -> 24)                                                                          | 366-390 | Custom config plugin                                               |
| Dependencies (react-android, commons-compress, espresso, detox, guava, asm, jna)                                               | 392-421 | Custom config plugin                                               |

### Android -- `android/build.gradle` (project-level)

| Customization                                              | Config Plugin Strategy                                 |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| `ext` block (buildToolsVersion, SDK versions, NDK, Kotlin) | `expo-build-properties`                                |
| Notifee maven repo                                         | Already in `app.config.js` via `expo-build-properties` |
| JitPack, local libs, Veriff maven repos                    | Custom config plugin                                   |
| Sentry Android Gradle Plugin classpath                     | `@sentry/react-native` plugin                          |
| Google Services classpath                                  | `@react-native-firebase/app` plugin                    |
| Force NDK version across subprojects                       | Custom config plugin                                   |
| Kotlin stdlib version pinning (Braze)                      | Custom config plugin                                   |

### Android -- `android/settings.gradle`

| Customization                                                        | Config Plugin Strategy         |
| -------------------------------------------------------------------- | ------------------------------ |
| React Native from source build (includeBuild with hermes from Maven) | Custom config plugin or patch  |
| Detox from source build                                              | `@config-plugins/detox`        |
| `react-native-gesture-handler` explicit include                      | Autolinking should handle this |
| Expo autolinking                                                     | Built-in                       |

### Android -- `AndroidManifest.xml`

| Customization                                                                  | Config Plugin Strategy                                     |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Permissions (INTERNET, CAMERA, BLUETOOTH, etc.)                                | `expo-build-properties` or `android.permissions` in config |
| `<queries>` for UPI/payment schemes                                            | Custom config plugin                                       |
| Application attributes (hardwareAccelerated, largeHeap, networkSecurityConfig) | Custom config plugin                                       |
| MainActivity intent-filters (Branch app links, URL schemes)                    | Custom config plugin                                       |
| Branch meta-data keys                                                          | Custom config plugin                                       |
| Push notification meta-data (dieam, Firebase)                                  | Custom config plugin                                       |
| MLKit dependency conflict resolution                                           | Custom config plugin                                       |
| Braze Firebase messaging service                                               | Custom config plugin                                       |
| FileProvider                                                                   | Custom config plugin                                       |
| Notifee BlockStateBroadcastReceiver disable                                    | Custom config plugin                                       |

### Android -- `MainApplication.kt`

| Customization                                                               | Config Plugin Strategy                                        |
| --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Custom ReactPackages (PreventScreenshot, RCTMinimizer, RNTar, Notification) | Convert to Expo modules or local RN packages with autolinking |
| Branch initialization                                                       | Custom config plugin                                          |
| CursorWindow size increase                                                  | Custom config plugin (dangerous mod)                          |
| WebView debugging in debug                                                  | Custom config plugin (dangerous mod)                          |
| Braze lifecycle callbacks                                                   | Custom config plugin                                          |
| `ShareApplication` interface                                                | Custom config plugin (dangerous mod)                          |

### Android -- `MainActivity.kt`

| Customization                        | Config Plugin Strategy               |
| ------------------------------------ | ------------------------------------ |
| NotificationModule intent capture    | Custom config plugin (dangerous mod) |
| BrazeReactUtils initial push payload | Custom config plugin (dangerous mod) |
| AppTheme before onCreate             | Custom config plugin                 |
| Branch.io onStart/onNewIntent        | Custom config plugin (dangerous mod) |
| foxCode launch options               | Custom config plugin (dangerous mod) |
| Custom back button behavior          | Custom config plugin (dangerous mod) |

### Android -- Custom Native Modules (4 modules, 7 files)

| Module              | Files                                                 | Strategy                                    |
| ------------------- | ----------------------------------------------------- | ------------------------------------------- |
| `PreventScreenshot` | PreventScreenshot.java, PreventScreenshotPackage.java | Convert to local Expo module or npm package |
| `RCTMinimizer`      | RCTMinimizer.java, RCTMinimizerPackage.java           | Convert to local Expo module or npm package |
| `RNTar`             | RNTar/RNTar.java, RNTar/RNTarPackage.java             | Convert to local Expo module or npm package |
| `Notification`      | NotificationModule.kt, NotificationPackage.kt         | Convert to local Expo module or npm package |

### iOS -- `Podfile`

| Customization                                  | Config Plugin Strategy                      |
| ---------------------------------------------- | ------------------------------------------- |
| `platform :ios, '15.1'`                        | `expo-build-properties`                     |
| `deterministic_uuids => false`                 | Custom config plugin                        |
| `use_frameworks` conditional                   | `expo-build-properties`                     |
| `ReactNativePayments` pod                      | Custom config plugin                        |
| Firebase pods with modular_headers             | `@react-native-firebase/app` plugin         |
| `Permission-BluetoothPeripheral` pod           | `react-native-permissions` plugin           |
| `GzipSwift` pod                                | Custom config plugin                        |
| `OpenSSL-Universal` with modular_headers       | Custom config plugin                        |
| Two targets (MetaMask + MetaMask-Flask)        | **Major challenge** -- custom config plugin |
| `post_install` RCT-Folly coroutines patch      | Custom config plugin                        |
| `post_install` fmt consteval fix               | Custom config plugin                        |
| CODE_SIGNING_ALLOWED = NO for resource bundles | Custom config plugin                        |

### iOS -- `AppDelegate.swift`

| Customization                                    | Config Plugin Strategy               |
| ------------------------------------------------ | ------------------------------------ |
| ExpoAppDelegate + ExpoReactNativeFactoryDelegate | Already Expo-native                  |
| Firebase initialization                          | `@react-native-firebase/app` plugin  |
| Branch.io initialization                         | Custom config plugin                 |
| Braze SDK setup (configuration, push automation) | Custom config plugin                 |
| BrazeDelegate (deep link routing)                | Custom config plugin (source file)   |
| foxCode initial props                            | Custom config plugin (dangerous mod) |
| Detox rootViewFactory workaround                 | Custom config plugin (dangerous mod) |
| URL handling (debug vs release)                  | Custom config plugin (dangerous mod) |

### iOS -- `Info.plist` (MetaMask + MetaMask-Flask)

| Customization                                                         | Config Plugin Strategy                             |
| --------------------------------------------------------------------- | -------------------------------------------------- |
| URL schemes (ethereum, metamask, dapp, wc, expo-metamask)             | `app.config.js` `ios.infoPlist.CFBundleURLTypes`   |
| LSApplicationQueriesSchemes (twitter, itms-apps, upi, etc.)           | Custom config plugin                               |
| NSAppTransportSecurity (different for Main vs Flask)                  | Custom config plugin                               |
| Permission strings (Bluetooth, Camera, FaceID, Location, Mic, Photos) | `app.config.js` `ios.infoPlist`                    |
| UIAppFonts (26 fonts)                                                 | `expo-font` plugin (already handling custom fonts) |
| UIBackgroundModes (fetch, remote-notification)                        | `app.config.js` `ios.infoPlist`                    |
| UILaunchStoryboardName (SplashScreen)                                 | `expo-splash-screen`                               |
| Branch keys and universal link domains                                | Custom config plugin                               |
| fox_code, mixpanel_token, braze keys                                  | Custom config plugin                               |

### iOS -- Entitlements (MetaMask.entitlements + MetaMaskDebug.entitlements)

| Customization                                 | Config Plugin Strategy                  |
| --------------------------------------------- | --------------------------------------- |
| `aps-environment` (development)               | `app.config.js` or `expo-notifications` |
| Apple Sign In                                 | `expo-apple-authentication` plugin      |
| Associated domains (applinks, webcredentials) | `app.config.js` `ios.associatedDomains` |
| In-app payments (merchant IDs)                | Custom config plugin                    |
| Payment pass provisioning                     | Custom config plugin                    |

### iOS -- Custom Native Modules (1 module)

| Module         | Files                                         | Strategy                                    |
| -------------- | --------------------------------------------- | ------------------------------------------- |
| `RCTMinimizer` | NativeModules/RCTMinimizer/RCTMinimizer.h, .m | Convert to local Expo module or npm package |

### iOS -- Other Native Files

| File                         | Purpose               | Strategy                                |
| ---------------------------- | --------------------- | --------------------------------------- |
| `BrazeHelper.mm`             | Braze Obj-C++ helper  | Custom config plugin (copy source file) |
| `RCTScreenshotDetect.h/.m`   | Screenshot detection  | Convert to Expo module or config plugin |
| `RNTar.m`, `RnTar.swift`     | Tar file handling     | Convert to Expo module                  |
| `File.swift`                 | File utilities        | Convert to Expo module                  |
| `MetaMask-Bridging-Header.h` | Swift/ObjC bridge     | Generated by config plugin              |
| `SplashScreen.storyboard`    | Splash screen UI      | `expo-splash-screen` plugin             |
| `ThemeColors.xcassets`       | Theme color assets    | Custom config plugin                    |
| `Expo.plist`                 | Expo configuration    | Auto-generated by prebuild              |
| `Light-Swift-Untar-V2/`      | Untar library (Swift) | Custom config plugin (copy source)      |

### Patch Files (23 patches)

| Patch                                            | Native Impact                       | CNG Strategy                                     |
| ------------------------------------------------ | ----------------------------------- | ------------------------------------------------ |
| `react-native+0.81.5.patch`                      | Hermes from Maven (settings.gradle) | **Critical** -- custom template or config plugin |
| `@sentry+react-native+6.10.0.patch`              | Possible native                     | Verify after prebuild                            |
| `@react-native-clipboard+clipboard+1.16.1.patch` | Possible native                     | Verify after prebuild                            |
| `react-native-crypto+2.2.1.patch`                | Possible native                     | Verify after prebuild                            |
| `react-native-gzip+1.1.0.patch`                  | Possible native                     | Verify after prebuild                            |
| `react-native-svg+15.11.2.patch`                 | Possible native                     | Verify after prebuild                            |
| Other 17 patches                                 | Mostly JS-only                      | Should survive CNG                               |

---

## Required Changes

### Phase 0: Prerequisites

1. **Audit every patch file** to determine if it touches native code or is JS-only
2. **Create a feature branch** for CNG migration
3. **Document all environment variables** used in build scripts that affect native configuration
4. **Ensure all developers have Expo CLI** installed (`npx expo --version`)

### Phase 1: Config Plugin Development

1. **Create `plugins/` directory** in project root for custom config plugins
2. **Write config plugin: `withMetaMaskAndroid`** -- handles:
   - Signing configurations (reads from env vars)
   - Product flavors (prod/flask) -- or switch to env-driven single-flavor
   - Build types with proguard rules
   - AndroidManifest permissions and intent-filters
   - Branch.io, Braze, Firebase meta-data
   - packagingOptions (pickFirst, excludes)
   - BouncyCastle substitution
   - Veriff minSdkVersion patching
   - foxCode buildConfigField
3. **Write config plugin: `withMetaMaskIOS`** -- handles:
   - Info.plist entries (URL schemes, permissions, Branch, Braze, etc.)
   - Entitlements (associated domains, Apple Pay, push)
   - Podfile modifications (additional pods, post_install hooks)
   - AppDelegate customizations (Branch, Braze, Firebase, foxCode)
4. **Write config plugin: `withMetaMaskMainApplication`** -- handles:
   - Custom packages registration
   - Branch initialization
   - CursorWindow, WebView debug
   - Braze lifecycle
5. **Write config plugin: `withMetaMaskMainActivity`** -- handles:
   - Notification intent capture
   - Braze push payload
   - Branch onStart/onNewIntent
   - foxCode launch options
   - Back button behavior

### Phase 2: Native Module Migration

1. **Convert Android `PreventScreenshot`** to a local Expo module or standalone package
2. **Convert Android `RCTMinimizer`** to a local Expo module (shared with iOS)
3. **Convert Android `RNTar`** to a local Expo module (shared with iOS `RNTar.m`/`RnTar.swift`)
4. **Convert Android `NotificationModule`** to a local Expo module
5. **Convert iOS `RCTScreenshotDetect`** to a local Expo module
6. **Convert iOS `File.swift`** and `Light-Swift-Untar-V2` to a local Expo module
7. Move each module to a `modules/` directory with proper `expo-module.config.json`

### Phase 3: Build System Changes

1. **Update `app.config.js`** to include all new config plugins and full native config
2. **Add `android/` and `ios/` to `.gitignore`**
3. **Remove committed `android/` and `ios/` directories** (after backup)
4. **Update `scripts/build.sh`** to run `npx expo prebuild --clean` before builds
5. **Update CI/CD pipelines** to include prebuild step
6. **Update Fastlane** configuration if affected
7. **Update Detox** configuration for CNG-generated project structure

### Phase 4: Flask Variant Strategy

Two options:

**Option A: Environment-driven single prebuild** (recommended)

- `app.config.js` reads `METAMASK_BUILD_TYPE` env var
- Different prebuild runs produce different native projects
- Simpler but requires clean prebuild between flavor switches

**Option B: Custom config plugin for product flavors**

- A config plugin that injects Gradle product flavors after prebuild
- Preserves current multi-flavor build structure
- More complex but closer to current architecture

### Phase 5: Verification

1. **Run `npx expo prebuild --clean`** and compare generated native code against current committed code
2. **Build and run on both platforms** for all flavors (prod, flask) and environments (dev, test, e2e, exp, rc, production)
3. **Run full E2E test suite** (Detox)
4. **Verify OTA updates** still work
5. **Verify push notifications** (Firebase, Braze)
6. **Verify Branch.io deep linking**
7. **Verify code signing** for all environments
8. **Verify Sentry source map uploads**

---

## Migration Timeline

### Estimated Effort: 8-12 weeks (with dedicated team)

```
Week 1-2:  Phase 0 -- Audit & Planning
           - Audit all patches for native impact
           - Document all env vars and build configurations
           - Create CNG spike branch
           - Run initial `npx expo prebuild --clean` to see baseline diff
           - Identify gaps between generated and current native code

Week 3-4:  Phase 1a -- Core Android Config Plugins
           - withMetaMaskAndroidManifest (permissions, intent-filters, meta-data)
           - withMetaMaskAndroidBuildGradle (signing, packaging, dependencies)
           - withMetaMaskAndroidProjectGradle (maven repos, classpath, kotlin)
           - withMetaMaskAndroidSettings (detox, RN from source, gesture-handler)

Week 5-6:  Phase 1b -- Core iOS Config Plugins
           - withMetaMaskInfoPlist (URL schemes, permissions, Branch, Braze)
           - withMetaMaskEntitlements (associated domains, Apple Pay, push)
           - withMetaMaskPodfile (extra pods, post_install hooks)
           - withMetaMaskAppDelegate (Branch, Braze, Firebase, foxCode)

Week 7:    Phase 2 -- Native Module Migration
           - Convert 5 Android native modules to Expo modules
           - Convert iOS native modules to Expo modules
           - Set up modules/ directory with expo-module.config.json
           - Verify autolinking for all converted modules

Week 8-9:  Phase 3 -- Build System Integration
           - Update app.config.js with all plugins
           - Implement Flask variant strategy (Option A or B)
           - Update build.sh to use prebuild
           - Update CI/CD pipelines
           - Add android/ and ios/ to .gitignore

Week 10:   Phase 4 -- Signing & Security
           - Verify all 10+ signing configs work via env vars
           - Test code signing for all environments
           - Verify proguard/R8 with CNG-generated project
           - Verify Sentry symbol upload

Week 11:   Phase 5a -- Testing
           - Full Detox E2E suite on both platforms
           - Manual QA on all build variants
           - OTA update verification
           - Push notification verification (Firebase + Braze)
           - Branch deep linking verification

Week 12:   Phase 5b -- Rollout
           - Team training on CNG workflow
           - Update developer documentation
           - Gradual rollout (use CNG for dev/exp first, then test/e2e, then rc/production)
           - Monitor first CNG-built release candidate
```

---

## Detailed Implementation Plan

### Config Plugin Architecture

```
plugins/
  withMetaMask.js                    # Root plugin that composes all sub-plugins
  android/
    withAndroidManifest.js           # Permissions, intent-filters, meta-data, services
    withAndroidBuildGradle.js        # Signing, flavors, packaging, dependencies
    withAndroidProjectGradle.js      # Maven repos, classpath, kotlin pinning
    withAndroidSettings.js           # Source builds, extra includes
    withAndroidMainApplication.js    # Custom packages, Branch, Braze, CursorWindow
    withAndroidMainActivity.js       # Notifications, Branch, foxCode, back button
    withAndroidResources.js          # Colors, strings, styles
  ios/
    withIOSInfoPlist.js              # URL schemes, permissions, Branch, Braze, fonts
    withIOSEntitlements.js           # Associated domains, Apple Pay, push
    withIOSPodfile.js                # Extra pods, post_install hooks
    withIOSAppDelegate.js            # Branch, Braze, Firebase, foxCode
    withIOSSplashScreen.js           # SplashScreen.storyboard
    withIOSSourceFiles.js            # BrazeHelper.mm, bridging header
  shared/
    withBranch.js                    # Cross-platform Branch.io config
    withBraze.js                     # Cross-platform Braze config
    withSentry.js                    # Cross-platform Sentry config
    withDetox.js                     # Cross-platform Detox config (extends @config-plugins/detox)
```

### Updated `app.config.js` (Target State)

```js
const { RUNTIME_VERSION, PROJECT_ID, UPDATE_URL } = require('./ota.config.js');

module.exports = {
  name: 'MetaMask',
  displayName: 'MetaMask',
  experiments: {
    reactCompiler: { enabled: true },
  },
  plugins: [
    // Existing plugins
    ['expo-build-properties', { android: { ... }, ios: { ... } }],
    ['@config-plugins/detox', { subdomains: '*' }],
    'expo-apple-authentication',
    ['expo-screen-orientation', { initialOrientation: 'PORTRAIT' }],
    ['expo-font', { fonts: [...] }],
    'expo-asset',
    '@react-native-community/datetimepicker',

    // NEW: MetaMask-specific CNG plugins
    './plugins/withMetaMask',
  ],
  android: {
    package: process.env.METAMASK_BUILD_TYPE === 'flask'
      ? 'io.metamask.flask' : 'io.metamask',
    versionCode: 4532,
    permissions: [
      'INTERNET', 'ACCESS_NETWORK_STATE', 'SYSTEM_ALERT_WINDOW',
      'CAMERA', 'RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS',
      'BLUETOOTH_CONNECT', 'BLUETOOTH_SCAN',
    ],
  },
  ios: {
    bundleIdentifier: process.env.METAMASK_BUILD_TYPE === 'flask'
      ? 'io.metamask.MetaMask-Flask' : 'io.metamask.MetaMask',
    usesAppleSignIn: true,
    jsEngine: 'hermes',
    associatedDomains: [
      'applinks:metamask.io',
      'applinks:metamask.app.link',
      // ... all domains
    ],
    entitlements: {
      'com.apple.developer.in-app-payments': ['merchant.io.metamask.banxa', ...],
      'com.apple.developer.payment-pass-provisioning': true,
    },
    infoPlist: {
      CFBundleURLTypes: [{ CFBundleURLSchemes: ['ethereum', 'metamask', 'dapp', 'wc', 'expo-metamask'] }],
      UIBackgroundModes: ['fetch', 'remote-notification'],
      // ... all Info.plist entries
    },
  },
  expo: {
    owner: 'metamask',
    runtimeVersion: RUNTIME_VERSION,
    updates: { /* OTA config */ },
    extra: { eas: { projectId: PROJECT_ID } },
  },
};
```

### Example Config Plugin: `withAndroidManifest.js`

```js
const { withAndroidManifest } = require('@expo/config-plugins');

function withMetaMaskAndroidManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application[0];
    const mainActivity = application.activity[0];

    // Add Branch.io intent-filters
    mainActivity['intent-filter'] = mainActivity['intent-filter'] || [];
    mainActivity['intent-filter'].push({
      $: { 'android:autoVerify': 'true' },
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      category: [
        { $: { 'android:name': 'android.intent.category.DEFAULT' } },
        { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
      ],
      data: [
        {
          $: { 'android:scheme': 'https', 'android:host': 'metamask.app.link' },
        },
      ],
    });

    // Add meta-data for Branch, Firebase, Braze
    application['meta-data'] = application['meta-data'] || [];
    application['meta-data'].push(
      {
        $: {
          'android:name': 'io.branch.sdk.BranchKey',
          'android:value': '${MM_BRANCH_KEY_LIVE}',
        },
      },
      // ... more meta-data
    );

    return config;
  });
}

module.exports = withMetaMaskAndroidManifest;
```

### Expo Module Example: `modules/prevent-screenshot/`

```
modules/prevent-screenshot/
  expo-module.config.json
  src/
    index.ts                  # JS API
  android/
    src/main/java/io/metamask/preventscreenshot/
      PreventScreenshotModule.kt
  ios/
    PreventScreenshotModule.swift
```

### CI/CD Changes

**Before (current):**

```yaml
# Build uses committed android/ and ios/ directories
- run: yarn install
- run: cd ios && pod install
- run: ./scripts/build.sh android main production
```

**After (CNG):**

```yaml
# Build generates android/ and ios/ from config
- run: yarn install
- run: npx expo prebuild --clean --platform android
- run: ./scripts/build.sh android main production
```

### `.gitignore` Additions

```gitignore
# CNG: Native directories are generated by prebuild
/android/
/ios/
```

---

## Key Decisions Required

1. **Flask variant strategy**: Environment-driven single prebuild (simpler) vs product flavor config plugin (closer to current)?
2. **Native module migration**: Convert to Expo Modules API (cleaner, cross-platform) vs keep as separate RN packages with autolinking (faster migration)?
3. **React Native from source build**: Currently builds RN from source via `includeBuild` in settings.gradle. Does this need to continue with CNG?
4. **Custom prebuild template**: Use stock `expo-template-bare-minimum` (recommended) or maintain a custom template for MetaMask-specific base files?
5. **Migration strategy**: Big-bang (one PR) vs incremental (progressively move config to plugins while keeping native dirs committed)?
6. **Signing config ownership**: Keep signing in config plugins or move to EAS Build credentials management?

---

## References

- [Expo CNG Documentation](https://docs.expo.dev/workflow/continuous-native-generation/)
- [Config Plugins Introduction](https://docs.expo.dev/config-plugins/introduction/)
- [Expo Modules API](https://docs.expo.dev/modules/overview/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [expo-template-bare-minimum](https://github.com/expo/expo/tree/main/templates/expo-template-bare-minimum)
- [Expo Prebuild API](https://docs.expo.dev/workflow/prebuild/)
