# QR Camera-Injection Spike (zero-mock)

> Status: **SPIKE**. Goal: prove a QR (Keystone-class) hardware-wallet account
> can be imported end-to-end via the **real** `react-native-vision-camera`
> camera, with **NO vision-camera mock**. This document captures the
> mechanism-independent harness built so far + the one open research question.

## Goal

A green E2E that opens the animated QR scanner, feeds it an emulated account UR
through the live camera, and verifies the imported account appears — with **no
`react-native-vision-camera` mock anywhere**. This is the QR analogue of the
Speculos BLE Ledger harness, but the transport is optical (camera) instead of
BLE, and the emulator is pure TypeScript (no Docker).

## Transport-agnostic emulator fact

`@metamask/hw-emulator` (the same local `file:` build the Ledger/Speculos
harness sources) ships a `QrEmulator` that:

- Holds a deterministic seed and derives the same account a Keystone-class
  device would (default address: `QR_EMULATOR_ADDRESS` =
  `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`).
- Produces the pairing account UR (`getAccountUR()`) and signs requests with
  real ECDSA.
- Renders URs in two transport-agnostic formats:
  - `renderQrPng(fragment)` / `QrEmulator.renderToPng(ur)` — single-frame PNG.
  - `renderUrToY4m(ur, { outputPath, fps, durationS })` — animated Y4M
    (needs ffmpeg) for multi-fragment URs.
- Decodes back via `decodeQrScreenshots(paths)` (zbar).

This is **transport-agnostic**: the emulator emits images, it does not care how
they reach the camera or how camera frames come back. That decoupling is what
makes the spike mechanism-independent.

## The two optical directions

```
   APP ────────────► EMULATOR        app shows an animated sign-request QR;
   (sign flow)       (decode)        Detox screenshots it; decodeQrScreenshots
                                      reconstructs the UR → emulator signs.

   EMULATOR ────────► APP            emulator renders the account-UR QR;
   (pair flow)       (camera)        the live vision-camera decodes it.
                                      └─ THIS DIRECTION IS THE OPEN SPIKE.
```

- **app → emulator (sign flow): SOLVED transport-agnostically.** Detox
  `device.takeScreenshot()` captures the app's animated QR frames;
  `@metamask/hw-emulator`'s `decodeQrScreenshots` decodes them back into the
  sign-request UR. No camera involvement on this leg.
- **emulator → app (pair flow): OPEN — the injection mechanism is the spike.**
  The emulator renders the account UR; it must reach the live
  `react-native-vision-camera` Camera so the scanner's `onCodeScanned` fires
  with the `ur:...` fragment. The mechanism to put those pixels in front of the
  camera is the research question (see OPEN below).

## Prerequisites

- A built detox debug app (the scanner needs the native vision-camera module).
  - Android: `yarn build:android:main:dev` (plus a Detox debug build config).
  - iOS: `yarn build:ios:main:dev`.
- A working camera on the test device/emulator.
  - **Android emulator:** must use a virtual scene (`-camera-back virtualscene`
    or the AVD camera setting) that can display an injected image — this is the
    crux of the open mechanism.
  - **Physical device:** point the camera at a screen showing the rendered QR.
- `@metamask/hw-emulator` QR exports resolvable. The repo pins it via a Yarn
  `file:` resolution (`package.json` →
  `/Users/montelai/consensys/accounts/packages/hw-emulator`). After rebuilding
  that local package, run `yarn install` to refresh the copy in `node_modules`
  (the QR exports live in `dist/qr/`).
- `QR_E2E=1` to enable the gated spec (it is `describe.skip` otherwise).

## Render the account-UR QR (no ffmpeg needed for the single-frame PNG)

```bash
node scripts/qr-emulator/render-account-ur.js
```

- Writes `scripts/qr-emulator/tmp/qr-account.png` (single-frame grayscale PNG).
- Prints the expected derived address (`QR_EMULATOR_ADDRESS`).
- Pure Node (`.js`). Note: it installs a one-line Node-only shim for
  `@metamask/native-utils` (the app patches `@ethereumjs/util` to a Nitro native
  binding that drags in `react-native`, unparseable by plain Node); the shim
  restores the equivalent pure-JS `pubToAddress`. No product/app code is
  changed — the shim lives entirely in the script.

For animated/multi-fragment URs (e.g. larger sign requests) use the emulator's
`renderUrToY4m` instead (requires ffmpeg).

## The import spec

`tests/smoke/qr/qr-import-account.spec.ts` — gated on `QR_E2E === '1'` (tagged
`SmokeQr:`). It logs in, navigates Add Account → Connect Hardware Wallet →
taps the Keystone button → taps Continue → asserts the scanner is visible →
waits for the account selector as the decode-success signal, with hard
assertions. The camera-injection step is performed at emulator-launch time
(see the paths above); the test just waits for the real camera to decode.

Run it:

```bash
QR_E2E=1 yarn detox test -c android.emu.main.speculos.debug --testPathPattern='qr-import-account'
```

## PASS / FAIL criterion

- **PASS:** with `QR_E2E=1`, after opening the scanner and performing the
  (manual or automated) injection, the account selector appears
  (`account-selector-next-button`) — proving the live camera decoded the
  injected account UR — and there is **NO** `react-native-vision-camera` mock
  in the repo (metro.config.js / `__mocks__` / `jest.mock(...vision-camera...)`).
- **FAIL:** a vision-camera mock has to be introduced to make the decode happen,
  OR the scanner never decodes the injected QR.

## Camera-injection mechanism (resolved — two viable paths)

### Path A: `-camera-back imagefile:` (simplest, recommended)

The Android emulator has a first-class `imagefile:` camera source mode. Point
it at the rendered QR PNG and the emulated back camera shows that image
continuously. The real `react-native-vision-camera` reads it, and its native
ML Kit barcode scanner decodes the QR. **No stub, no mock, no product code
changes.**

```bash
# 1. Render the account QR
node scripts/qr-emulator/render-account-ur.js
# → scripts/qr-emulator/tmp/qr-account.png

# 2. Launch the AVD with the image file as the back camera
emulator @Pixel_5_Pro_API_34 \
  -camera-back imagefile:scripts/qr-emulator/tmp/qr-account.png \
  -gpu swiftshader_indirect -no-audio
```

For the sign spike (animated fountain QR), use `videofile:` instead:

```bash
# 1. Render the animated sign QR to MP4
node scripts/qr-emulator/render-sign-ur-to-mp4.js
# → scripts/qr-emulator/tmp/qr-sign-response.mp4

# 2. Launch with the video loop as the back camera
emulator @Pixel_5_Pro_API_34 \
  -camera-back videofile:scripts/qr-emulator/tmp/qr-sign-response.mp4 \
  -gpu swiftshader_indirect -no-audio
```

> **CI note:** `android-emulator-runner` does not reliably pass `-camera-back`
> through `emulator-options`. Set `hw.camera.back=imagefile:/abs/path/qr.png`
> (or `=videofile:/abs/path/qr.mp4`) directly in the AVD `config.ini` before
> launch. See [android-emulator-runner#443](https://github.com/ReactiveCircus/android-emulator-runner/issues/443).

### Path B: `-camera-back virtualscene` + poster PNG (proven, more complex)

Place the rendered QR PNG as a "poster" in the emulator's virtual AR room.
Officially documented for QR codes. More setup (poster file + layout file) but
CI-proven.

```bash
# 1. Render the QR
node scripts/qr-emulator/render-account-ur.js

# 2. Place the poster
cp scripts/qr-emulator/tmp/qr-account.png \
  "$ANDROID_HOME/emulator/resources/my-qr.png"
printf 'poster custom\nsize 1 1\nposition 0 0 -1.5\nrotation 0 0 0\ndefault my-qr.png\n' \
  > "$ANDROID_HOME/emulator/resources/Toren1BD.posters"

# 3. Launch
emulator @Pixel_5_Pro_API_34 -camera-back virtualscene \
  -gpu swiftshader_indirect -no-audio
```

### Status

- **Static QR (import):** NOT VIABLE. The account UR is BC-UR fountain-encoded
  into 4 fragments (`encodeToFragments`); `renderToPng(accountUR)` emits only
  fragment 1 of 4. A static image therefore can NEVER complete
  `URRegistryDecoder.receivePart` to reach `isSuccess()` — the decoder needs
  all 4 fragments. Import requires the animated 4-frame sequence, or the
  thin-seam mock (see below) that replays all 4 fragments. This overturns the
  earlier "`imagefile:`/`virtualscene` proven viable" claim: even with a
  perfect camera HAL, a single static frame is structurally insufficient.
- **Animated QR (sign):** RESEARCH-GRADE — `videofile:` is the true analog of
  Chrome's Y4M path but no public precedent with vision-camera exists. The
  `qr-send-sign-spike.spec.ts` spec captures the pass/fail data to decide.

## Thin-seam mock (implemented)

Under env `QR_E2E_THIN_SEAM=true`, the Metro resolver swaps
`react-native-vision-camera` →
`tests/module-mocking/vision-camera/qr-thin-seam.ts` (see the `isQrThinSeam`
branch in `metro.config.js`). That mock exports the same surface as the real
library (`Camera`, `useCameraDevice`, `useCameraPermission`, `useCodeScanner`,
type `Code`) and, inside `Camera`, auto-replays the deterministic 4-fragment
account UR into the consumer's `onCodeScanned` callback on a timer loop,
bypassing the camera + ML Kit barcode pipeline entirely. The real app code
paths (`URRegistryDecoder.receivePart`, scanner UI, the
`cameraDevice && hasPermission` gate) run unchanged.

- Fixture: `tests/fixtures/qr/account-ur-fragments.json` (4 fragments,
  `refreshMs: 200`).
- Generator: `node scripts/qr-emulator/generate-account-ur-fixture.js`.

This is the **chosen path for the main E2E suite**. The real-camera paths
(`imagefile:` / `virtualscene`) are abandoned for CI: emulator 35.5.10 has no
working image-injection camera mode (§3.11 of `qr-e2e-status.md`), and even
on 36.6.11 the HAL anti-aliases QR modules past decodability. A static image
is additionally structurally insufficient for a 4-fragment fountain encoding.
