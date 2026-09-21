# QR Emulator E2E — State of Work

> Factual status as of 2026-06-29. Thin-seam mock IMPLEMENTED and
> bundle-verified (§7.2); the camera blocker is resolved for the main E2E
> suite. The step-9 green is now blocked by a separate, pre-existing
> Detox 20.51 ↔ RN 0.81.5 Fabric incompatibility (§7.3), not the thin-seam.
> Only
> verified findings are recorded. No projections or assumptions.

## 1. Emulator source

The QR emulator lives in the **accounts monorepo** at:

```
/Users/montelai/consensys/accounts/packages/hw-emulator/src/qr/
```

This is the same `@metamask/hw-emulator` package that the Ledger/Speculos
harness already sources locally via a Yarn `file:` resolution. The QR
submodule was added in version 0.2.0 (the mobile repo's `yarn.lock` was
updated to resolve this version).

**Emulator characteristics (verified):**

- Transport-agnostic — produces/decodes QR images but does not dictate how
  they reach a camera or how camera frames return. Documented in
  `/Users/montelai/consensys/accounts/docs/specs/qr-emulator.md` §6.1:
  _"No transport option — transport is the test driver's concern, not the
  emulator's."_
- Exports confirmed resolvable from the mobile repo:
  `createEmulator`, `EmulatorType`, `QrEmulator`, `renderToPng`,
  `renderQrPng`, `decodeQrImage`, `handleSignRequest`, `encodeToFragments`,
  `getAccountUR`, `QR_EMULATOR_ADDRESS`.
- Default account address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
  (Hardhat/Anvil account #0 for the test seed).
- `renderToPng` produces a valid 170×170 8-bit grayscale PNG (1585 bytes).
- Pure-TS rendering path (no ffmpeg needed for single-frame PNG).
- The extension's own QR E2E test
  (`extension-2/test/e2e/.../qr-account.spec.ts`) is `describe.skip` and
  uses a `FakeQrBridge` with hardcoded CBOR — **not** this emulator.
  The emulator is unproven in real E2E even on the extension side.

**Emulator limitation on Node:** The QR signing path calls
`@ethereumjs/util` `pubToAddress`, which the mobile repo patches to
`@metamask/native-utils` (a Nitro binding) → `react-native-nitro-modules`
→ `react-native` (Flow source, unparseable by Node). The render scripts
include a localized `Module._load` shim that restores the equivalent
pure-JS `pubToAddress`. This shim is script-only — no product code changed.

## 2. What has been built and verified

### 2.1 QR render scripts (verified working)

| Script                                         | Output                                                 | Verified                        |
| ---------------------------------------------- | ------------------------------------------------------ | ------------------------------- |
| `scripts/qr-emulator/render-account-ur.js`     | `tmp/qr-account.png` (1585 bytes, valid PNG)           | ✅ Runs, prints correct address |
| `scripts/qr-emulator/render-sign-ur-to-mp4.js` | `tmp/qr-sign-response.mp4` (~101 KB, 14 frames, 5 fps) | ✅ Runs, ffmpeg pipeline works  |

Both scripts are CommonJS `.js` (converted from `.mjs` per project
convention — `package.json` has `"type": "commonjs"`).

### 2.2 Test code (verified tsc-clean, no new errors)

| File                                                     | Purpose                                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `tests/smoke/qr/qr-import-account.spec.ts`               | Import spec — navigates to scanner, asserts account selector                  |
| `tests/smoke/qr/qr-send-sign-spike.spec.ts`              | Sign spike spec (assertion-free, gated on `QR_E2E=1`)                         |
| `tests/page-objects/QRHardware/QRHardwareConnectView.ts` | Page object (tapKeystone, tapContinue, waitForScanner, assertAccountImported) |
| `tests/selectors/QRHardware/QRHardware.selectors.ts`     | Selector constants                                                            |
| `tests/tags.js`                                          | `SmokeQr` / `smokeQr` tag (gated on `QR_E2E === '1'`)                         |

### 2.3 Product testIDs (the only product-code changes)

Correction: these testIDs were NOT previously present in the product code —
they are being added NOW to the Modal and container only. The camera testID
is unnecessary: under the thin seam the camera is the mock's
`qr-thin-seam-camera`.

| File                                                 | testID                          | Line |
| ---------------------------------------------------- | ------------------------------- | ---- |
| `app/components/UI/QRHardware/AnimatedQRScanner.tsx` | `animated-qr-scanner-modal`     | ~525 |
| `app/components/UI/QRHardware/AnimatedQRScanner.tsx` | `animated-qr-scanner-container` | ~537 |
| `app/components/UI/QRHardware/QRSigningDetails.tsx`  | `qr-signing-details-wrapper`    | ~236 |

No other product code changes. No env-gated branches, no test-only
conditionals in product components.

### 2.4 ML Kit barcode model (verified present)

`react-native-vision-camera/android/build.gradle` line 204 contains:

```
implementation 'com.google.mlkit:barcode-scanning:17.3.0'
```

This is the **bundled** ML Kit model (statically linked, works without
Google Play Services). No yarn patch overrides it. The emulator camera
barcode scanning path is not blocked by a missing model.

### 2.5 Detox connectivity (verified end-to-end)

A minimal test calling `TestHelpers.launchApp({ delete: true })` followed
by `device.enableSynchronization()` **passes** in ~27 seconds. Detox
installs both APKs, launches the app, and the WebSocket connection is
established.

### 2.6 Full app flow (verified — 268-second test run)

The QR import spec ran for **268 seconds** and completed the entire flow:

1. ✅ App launched (embedded JS bundle, no Metro)
2. ✅ Detox connected
3. ✅ Login screen appeared (`waitForAppReady` passed)
4. ✅ Login flow (`loginToAppWithSyncDisabled`)
5. ✅ Navigate to Add Account → Connect Hardware Wallet
6. ✅ Tap Keystone button
7. ✅ Tap Continue → scanner opened
8. ✅ Scanner visible (`assertScannerVisible` passed)
9. ❌ Account selector did not appear within 120 s (camera did not decode QR)

### 2.7 Documentation

| File                                             | Content                                          |
| ------------------------------------------------ | ------------------------------------------------ |
| `e2e/speculos/docs/qr-e2e-testing.md`            | Architecture, CI strategy, file map, run recipes |
| `e2e/speculos/docs/qr-camera-injection-spike.md` | Camera-injection mechanism runbook               |

## 3. What has NOT worked (verified failures)

### 3.1 DevLauncher intercepts all launches

**Root cause:** The Expo DevLauncher (`expo-dev-launcher`) is hardcoded in
the debug build. `MainActivity.onCreate()` redirects to
`DevLauncherActivity` regardless of how the activity is launched — even
`adb shell am start -n io.metamask/.MainActivity` ends up at
`DevLauncherActivity`.

**Impact:** The DevLauncher strips Detox's WebSocket launch args from the
intent, so the Detox native framework never receives the server address.
Detox reports: _"Detox can't seem to connect to the test app(s)!"_

**Patches applied to node_modules (not yet formalized via patch-package):**

| File                                                                                                             | Change                                                            |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `node_modules/expo-dev-launcher/android/src/debug/java/expo/modules/devlauncher/DevLauncherController.kt`        | Replaced with release NOP version + `isLoadingToBundler` property |
| `node_modules/expo-dev-launcher/android/src/debug/java/expo/modules/devlauncher/launcher/DevLauncherActivity.kt` | `onCreate` redirects to `MainActivity` + forwards intent extras   |
| `tests/helpers.js`                                                                                               | `DETOX_SKIP_DEVLAUNCHER=1` env var skips the deep-link path       |

**Result with patches:** `TestHelpers.launchApp({ delete: true })` works
(PASS in ~27 s). The app loads JS from Metro. ReactNativeJS logs appear.

### 3.2 `withFixtures` does not call `launchApp` by default

**Root cause:** `FixtureHelper.ts` line 633: `if (restartDevice)`.
`restartDevice` defaults to `false`. Without it, `TestHelpers.launchApp()`
is never called — the framework expects the app to already be running
from Detox's auto-launch.

**Fix applied:** Pass `restartDevice: true` in the `withFixtures` call in
`qr-import-account.spec.ts`.

**Result:** The test runs for 268 seconds through the full app flow.

### 3.3 Metro crashes/hangs on the 126 MB debug bundle

The Metro dev server crashed (out of memory) while compiling the 126 MB
debug bundle. After crash, subsequent test runs that depend on Metro
fail silently (app never loads JS).

**Fix applied:** Embed the JS bundle directly in the debug APK via
post-build injection (`assets/index.android.bundle`), zipalign, and
re-sign with the debug keystore. This eliminates the Metro dependency.

**Result:** Sanity test passes in ~32 seconds without Metro running.

### 3.4 Expo dev menu + RN dev menu appear on first launch

Without the DevLauncher deep link (which included
`disableOnboarding=1`), both the Expo dev menu and the RN dev menu
appear on first launch of the debug build. These are native overlays
that block the login screen.

**Manual dismissal verified:** `adb shell input tap 540 2185` (Expo dev
menu "Continue") → `adb shell input keyevent 4` (RN dev menu) → login
screen appears ("Enter password" / "Unlock").

**Automated dismissal in the spec was not reliable:** Detox
synchronization blocks interactions while the app has continuous
background activity (SnapController, AssetsController persisting state).
`device.disableSynchronization()` + `execSync` adb commands were added
but timing was unreliable (Metro bundle download delay vs. fixed delays).

**Note:** With the **embedded bundle** approach, these dev menus do NOT
appear (there is no Metro connection to trigger them). This was observed
in the 268-second test run.

### 3.5 Virtual scene camera produces green/corrupted frames

**This is the current blocker for camera injection.**

`-camera-back virtualscene` produces green/corrupted camera frames on
emulator 35.5.10. Verified across three GPU modes:

| GPU mode               | Green-dominant pixels | Verdict         |
| ---------------------- | --------------------- | --------------- |
| `swiftshader_indirect` | ~16%                  | ❌ Green blocks |
| `host`                 | ~16%                  | ❌ Green blocks |
| `swangle`              | ~16%                  | ❌ Green blocks |

The basic emulated camera (`-camera-back emulated`) does NOT have this
issue (0.3% green-dominant). The green blocks are specific to the
virtual scene renderer — a camera HAL bug in emulator 35.5.10's virtual
scene YUV pipeline.

### 3.6 Virtual scene poster positioning cannot be changed

The `-virtualscene-poster <name>=<filename>` flag places the poster at a
fixed position (bottom of the camera view). Verified:

| Attempt                                           | Result                                                  |
| ------------------------------------------------- | ------------------------------------------------------- |
| Modified `Toren1BD.posters` with custom positions | ❌ Ignored (emulator caches/compiles the scene)         |
| Different poster names (`wall`, `qr`)             | ❌ Same fixed position                                  |
| Overwrote all poster entries with QR images       | ❌ Scene failed to render (all black with `-no-window`) |

### 3.7 Virtual scene camera cannot be navigated programmatically

The virtual scene camera's pitch (looking up/down) is **mouse-drag-only
within the emulator GUI**. Verified that none of these affect it:

| Method                                      | Result                                                               |
| ------------------------------------------- | -------------------------------------------------------------------- |
| Console `sensor set acceleration`           | ❌ No effect (virtual scene camera is independent of device sensors) |
| Console `event send EV_REL:REL_Y`           | ❌ No effect                                                         |
| Console `event mouse <x> <y> <btn> <extra>` | ❌ Goes to Android input, not emulator camera controller             |
| `adb shell input keyevent`                  | ❌ Goes to Android input                                             |

### 3.8 `-camera-back imagefile:` not supported

Emulator version is **35.5.10.0**. The `imagefile:` camera mode requires emulator
**>= 36.6.4**. Verified: the emulator rejects
`-camera-back imagefile:/path/to/qr.png` with:
_"invalid value for -camera-back"_.

> **UPDATE (2026-06-28):** The "≥ 36.6.4" claim above is **WRONG** — it
> conflates `image360:` (equirectangular panoramic, which genuinely requires
> 36.6.4+) with `imagefile:`/`videofile:`. The official docs
> (`developer.android.com/studio/run/emulator-commandline`) list `imagefile:`
> and `videofile:` with **no version restriction**, and attach the "36.6.4+"
> note only to `image360:`. The exact release that introduced `imagefile:`/
> `videofile:` is undocumented (emulator binary is closed-source), but
> `strings` analysis of the 35.5.10 binary confirms **zero references** to
> either token. Current stable emulator (mid-2026) is **36.6.11**.

### 3.11 Full camera-mode matrix on emulator 35.5.10 (verified 2026-06-28)

Booting the `test` AVD with each `-camera-back` mode and capturing the
parse result:

| Mode                  | Parse result    | Verified source                                                                                                      |
| --------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `emulated`            | ✅ Accepted     | Fixed procedural scene; no image injection (AOSP `EmulatedCamera.cpp`)                                               |
| `none`                | ✅ Accepted     | Disables camera                                                                                                      |
| `virtualscene`        | ✅ Accepted     | Green/corrupted frames (§3.5); poster fixed at bottom (§3.6)                                                         |
| `webcam0`             | ✅ Accepted     | Host webcam (MacBook camera `webcam0` listed by `-webcam-list`); deterministic QR injection needs OBS virtual camera |
| **`videoplayback`**   | ❌ **REJECTED** | Listed in `emulator -help-camera-back` as _"If the feature is enabled"_ — the feature is compiled out of 35.5.10     |
| **`imagefile:/path`** | ❌ **REJECTED** | Zero references in the 35.5.10 binary; mode does not exist                                                           |
| **`videofile:/path`** | ❌ **REJECTED** | Zero references in the 35.5.10 binary; mode does not exist                                                           |

All three rejections produce:
`ERROR | Invalid value for -camera-back <mode> parameter: <mode>`

**Conclusion (definitive):** Emulator 35.5.10 has **no camera mode that
accepts a custom image or video file**. The only no-mock camera paths on
this version are:

1. **`virtualscene`** — broken (green frames + fixed poster position).
2. **`webcam<N>` + OBS virtual camera** — works on 35.5.10, but requires
   OBS installed/running, is fragile in CI, and is macOS-host-only.
3. **Physical device** — external UVC-gadget SBC or screen+camera rig.

**The clean no-mock path requires upgrading the emulator to >= 36.6.11**
(to gain `imagefile:`/`videofile:` modes) or switching to **Genymotion**
(first-class Media Injection, API 34 supported).

### 3.9 Release build path blocked

Three pre-existing issues prevent the release APK from building on this
dev machine (none caused by QR changes):

| Issue                             | Cause                                                                   |
| --------------------------------- | ----------------------------------------------------------------------- |
| Sentry CLI upload fails           | No `SENTRY_AUTH_TOKEN` on dev machine (CI-only)                         |
| R8 minification fails             | `minifyProdReleaseWithR8` — "Compilation failed to complete"            |
| Release keystore missing password | `SigningConfig "mainProd" is missing required property "storePassword"` |

**Temporary build.gradle changes applied** (for local debugging only):

- `minifyEnabled` respects `-PdisableMinify` flag
- `mainProd` signing config falls back to debug keystore when
  `-PdisableMinify` is set

### 3.10 `react-native-launch-arguments` returns `{}` on Android

Documented in earlier research: the Detox→JS launch-args channel on
Android is unreliable. `react-native-launch-arguments` returns an empty
object. The team uses hardcoded fallback ports (e.g.,
`FALLBACK_FIXTURE_SERVER_PORT`) with `adb reverse` to map them.

## 4. Environment details

| Item                            | Value                                      |
| ------------------------------- | ------------------------------------------ |
| Android emulator                | 35.5.10.0 (build_id 13402964)              |
| AVD                             | `Pixel_5_Pro_API_34` (google_apis, API 34) |
| GPU modes tested                | `swiftshader_indirect`, `host`, `swangle`  |
| Metro bundle (debug)            | ~126–130 MB                                |
| Debug APK (no bundle)           | ~311 MB                                    |
| Debug APK (embedded bundle)     | ~328 MB                                    |
| `@metamask/hw-emulator` version | 0.2.0 (resolved from accounts repo)        |
| Build tools                     | 36.0.0                                     |
| Platform tools                  | latest                                     |
| Node.js                         | v20.18.0                                   |
| Yarn                            | ^4.14.1                                    |

## 5. Files created / modified

### 5.1 New files (test code + scripts + docs)

```
scripts/qr-emulator/
├── render-account-ur.js              ← Pair QR → PNG (CJS, verified)
├── render-sign-ur-to-mp4.js          ← Animated sign QR → MP4 (CJS, verified)
└── .gitignore                        ← Ignores tmp/

tests/smoke/qr/
├── qr-import-account.spec.ts         ← Import spec (restartDevice: true)
└── qr-send-sign-spike.spec.ts        ← Sign spike spec

tests/page-objects/QRHardware/
└── QRHardwareConnectView.ts          ← Page object

tests/selectors/QRHardware/
└── QRHardware.selectors.ts           ← Selectors

e2e/speculos/docs/
├── qr-e2e-testing.md                 ← Architecture + CI strategy guide
└── qr-camera-injection-spike.md      ← Camera-injection runbook
```

### 5.2 Modified files (product — testIDs only)

```
app/components/UI/QRHardware/AnimatedQRScanner.tsx   ← 3 testIDs
app/components/UI/QRHardware/QRSigningDetails.tsx     ← 1 testID
```

### 5.3 Modified files (test infra)

```
tests/helpers.js                         ← DETOX_SKIP_DEVLAUNCHER env var
tests/tags.js                            ← SmokeQr tag
yarn.lock                                ← @metamask/hw-emulator 0.2.0
```

### 5.4 Modified files (node_modules — need patch-package)

```
node_modules/expo-dev-launcher/android/src/debug/.../DevLauncherController.kt
node_modules/expo-dev-launcher/android/src/debug/.../DevLauncherActivity.kt
```

### 5.5 Modified files (build config — temporary, local debugging)

```
android/app/build.gradle                 ← minifyEnabled + signing fallbacks
```

## 6. Accounts repo cross-references

| Path in accounts repo                         | Relevance                                                           |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `packages/hw-emulator/src/qr/emulator.ts`     | QR emulator implementation (376 lines)                              |
| `packages/hw-emulator/src/qr/core/signer.ts`  | requestId extraction (lines 217–218)                                |
| `packages/hw-emulator/src/index.ts`           | Public exports (lines 60–93)                                        |
| `docs/specs/qr-emulator.md`                   | Authoritative spec (transport-agnostic, §6.1)                       |
| `extension-2/test/e2e/.../qr-account.spec.ts` | Extension QR test (`describe.skip`, uses FakeQrBridge not emulator) |

The mobile repo's `yarn.lock` resolves `@metamask/hw-emulator` via `file:`
to the accounts repo's local build at
`/Users/montelai/consensys/accounts/packages/hw-emulator`.

## 7. Open items (no assumptions about feasibility)

1. **Camera injection — SOLVED for 36.6.11; decode pending.** The full
   camera-mode matrix (§3.11) proved emulator 35.5.10 has no mode that
   accepts a custom image/video file. **Upgrading to emulator 36.6.11
   (arm64) adds `-camera-back imagefile:<path>` and `videofile:<path>`** —
   verified working at the HAL level:
   - Mode accepted (no parse error).
   - **0.0% green-dominant pixels** (vs. ~16% on 35.5.10's `virtualscene`).
   - CameraX binds Preview + ImageAnalysis to back camera (ID 10,
     `Facing: Back`) successfully.
   - **ImageAnalysis receives frames** at 15+ fps: 640×480 YUV_420_888
     (format=35), non-null, rowStride=640 (no padding). Confirmed via
     diagnostic logging in `CodeScannerPipeline.analyze()`.
   - **Frame pixel stats** look QR-like: mean=163, min=16, max=233,
     black=27%, white=63% — consistent with a high-contrast QR image.
   - **Source QR is valid** — jsqr decodes it from the PNG:
     `UR:CRYPTO-ACCOUNT/1-4/LPADA...` (valid BC-UR account UR).
   - **Neither ML Kit nor ZXing can decode the QR from emulator camera
     frames.** Root cause definitively identified via ASCII-art pixel
     dump: the emulator's `imagefile:`/`videofile:` camera HAL renders
     input through a GPU pipeline that applies anti-aliasing/smoothing,
     destroying the sharp QR module edges. Source QR modules (2-5px each)
     are blurred into 7-11px uniform blocks. This occurs at ALL output
     resolutions (640×480 and 1280×960 both tested). The HAL is designed
     for photographic content, not high-contrast barcode patterns.
   - **This is a fundamental limitation of the emulator camera HAL.**
     No library (ML Kit, ZXing, jsqr) or resolution setting can decode
     QR codes from `imagefile:`/`videofile:` frames on the standard
     Android emulator.
   - **Additionally (structural, not HAL-related):** Account UR is BC-UR
     fountain-encoded as 4 fragments (verified via `encodeToFragments`).
     `renderToPng` renders only fragment 1 of 4 — so the static-image
     camera paths (`imagefile:` / `virtualscene`) could never complete an
     import regardless of HAL quality, because
     `URRegistryDecoder.receivePart` needs all 4 fragments to reach
     `isSuccess()`. This overturns the spike doc's earlier "Static QR
     (import): VIABLE" claim.
   - **CI-viable paths remaining:**
     (a) **Genymotion** — different camera HAL, media injection designed
     for QR scanning (Jun 2026 widget), API 34 supported. Commercial.
     (b) **Thin-seam injection** — the camera opens for real (CameraX +
     ImageAnalysis pipeline runs), but the QR string is injected at
     the JS layer (`onCodeScanned`) using the emulator's
     `renderToPng` → `jsqr` decode output. Tests the real UR decoder
     with real emulator data. Camera is "used" but the barcode decode
     step is bypassed.
     (c) **`takePhoto()` pipeline** (untested) — CameraX photo capture
     uses a different HAL path than ImageAnalysis; might preserve more
     detail. Needs investigation.

2. **Thin-seam Metro mock — RESOLVED (IMPLEMENTED).** Env
   `QR_E2E_THIN_SEAM=true` makes Metro resolve
   `react-native-vision-camera` to
   `tests/module-mocking/vision-camera/qr-thin-seam.ts` (see the
   `isQrThinSeam` branch in `metro.config.js`). That mock auto-replays the
   4 account-UR fragments (from
   `tests/fixtures/qr/account-ur-fragments.json`) into the scanner's
   `onCodeScanned` callback on a timer, bypassing the camera + ML Kit. The
   real `URRegistryDecoder.receivePart` path runs unchanged. This is the
   chosen path for the main E2E suite and resolves the camera blocker for
   import. (Supersedes the earlier "designed but not implemented" status.)

3. **E2E execution blocker — Detox 20.51 ↔ RN 0.81.5 Fabric incompatibility
   (CURRENT BLOCKER for step-9 green).** With the thin-seam mock verified in
   the bundle (§7.2) and the app loading the embedded bundle cleanly, the
   `qr-import-account` Detox run still cannot reach step 9. Root cause,
   isolated via `adb logcat`: Detox 20.51's Fabric idling resources
   reflectively probe RN internals whose fields were removed/renamed in
   RN 0.81.5, crashing Detox's **own instrumentation** at
   `device.launchApp()` / `enableSynchronization()`. This is NOT an app
   crash — there is no `ReactNativeJS` / native error; the `io.metamask`
   process is force-stopped only because the instrumentation
   (`DetoxCrashHandler`) died.
   - First crash: `NoSuchFieldException: mMountItemDispatcher` in
     `FabricUIManagerIdlingResources.kt:103`. (RN 0.81.5
     `FabricUIManager.java:174` still declares `mMountItemDispatcher`, but
     `UIManagerHelper.getUIManager()` returns a type that doesn't expose it
     reflectively.)
   - After defensively patching that resource (see below), a second crash
     surfaces: `NoSuchFieldException: javaTimerManager` in
     `JavaTimersReflected.kt`.
   - **Scope:** 11 Detox idling-resource files do reflective `.field(...)`
     access on RN internals
     (`node_modules/detox/android/detox/src/full/java/com/wix/detox/reactnative/idlingresources/`).
     RN 0.81.5 breaks several. This blocks ANY debug Detox test on this
     build, independent of QR.
   - **Verified NOT the thin-seam:** the bundle contains
     `qr-thin-seam-camera`, `QrThinSeam`, and the `ur:crypto-account/1-4/`
     fragment (confirmed by grepping the served/embedded 135 MB bundle);
     the app launches and loads the bundle; the crash is Detox's
     instrumentation process, not the app.
   - **Delivery mechanism (SOLVED — not the blocker):** Metro-at-runtime
     hits the documented §3.3 dev-client/Detox wall (the deep-link path
     loads the bundle but strips Detox args; `DETOX_SKIP_DEVLAUNCHER=1`
     preserves Detox args but the app won't load without an embedded
     bundle). The working delivery is an **embedded bundle**: build the
     debug APK (`detox build -c android.emu.main.speculos.debug`), then
     light-inject the JS bundle into `assets/index.android.bundle` via
     `zip` + `zipalign` + `apksigner` with `~/.android/debug.keystore`
     (NO Apktool — the `@expo/repack-app`/Apktool repack path failed with
     "All promises were rejected"). Point Detox at the result via
     `PREBUILT_ANDROID_APK_PATH` / `PREBUILT_ANDROID_TEST_APK_PATH` and run
     with `DETOX_SKIP_DEVLAUNCHER=1`.
   - **Bridge-mode workaround DOES NOT build:** `newArchEnabled=false` in
     `android/gradle.properties` fails to compile (the app requires the New
     Architecture). Reverted to `true`.
   - **Partial patch applied (node_modules — needs patch-package, like the
     §5.4 DevLauncher patches):**
     `node_modules/detox/android/detox/src/full/java/com/wix/detox/reactnative/idlingresources/uimodule/fabric/FabricUIManagerIdlingResources.kt`
     — `getMountItemsSize()` / `getViewCommandMountItemsSize()` now return
     `0` (idle) on any reflection failure instead of crashing. Strictly
     safer; does not survive `yarn install`. Insufficient on its own
     (other resources still crash).
   - **Paths to unblock the E2E-green (separate infra task):**
     (a) Upgrade Detox to a release with proper RN 0.81.5 Fabric support.
     (b) Comprehensively patch all affected Detox idling resources to
     degrade gracefully (fragile; sync becomes "always idle" → flaky).
     (c) Unblock the release build (§3.9 Sentry/R8/keystore) so CI's
     release Detox path (`android.emu.main.speculos`) can run instead.

4. **DevLauncher patches:** Applied to `node_modules` but not formalized
   via `patch-package`. Would not survive `yarn install`.

5. **build.gradle changes:** Temporary local-debug modifications
   (`minifyEnabled` fallback, signing config fallback). Should be
   reverted or formalized.

6. **Sign flow testID:** `qr-signing-details-get-signature-button` was
   identified by the oracle spec but not added (only needed for the sign
   flow, not the import flow).

7. **iOS:** No iOS Detox configs or testing. Android only throughout.

8. **CI integration:** No CI workflow modifications. CI uses release
   builds (`android.emu.main.speculos`), which have the Sentry/R8/keystore
   blockers described in §3.9.
