# QR (Keystone-Class) E2E Testing

> Companion to the Ledger/Speculos harness. Tests QR-based air-gapped hardware
> wallets (Keystone-class) on the Android emulator via camera injection — with
> **zero `react-native-vision-camera` mock or Metro module-swap** in the import
> path, and a deterministic thin-seam fallback for the animated sign path.

## 1. Overview

| Concern | Ledger (Speculos) | QR (this doc) |
|---|---|---|
| Production keyring | Real `LedgerOffscreenBridge` | Real `QrKeyringScannerBridge` |
| Transport mocked at | BLE layer (Speculos Docker → netsim) | Camera layer (emulator `-camera-back imagefile:` / `videofile:`) |
| Device emulator | Speculos (Docker, real firmware) | `@metamask/hw-emulator` QrEmulator (pure TS, real BC-UR + ECDSA) |
| Product code changes | None | None (testIDs only) |
| CI gating env var | `LEDGER_E2E=1` | `QR_E2E=1` |

## 2. Architecture

### 2.1 Transport-agnostic emulator

`@metamask/hw-emulator` (the same package the Ledger harness sources locally via
`file:`) ships a `QrEmulator` that:

- Holds a deterministic seed (`QR_EMULATOR_SEED`, 12-word BIP-39) and derives
  the same account a real Keystone-class device would. Default address:
  `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`.
- Produces pairing account URs (`getAccountUR()`) and signs transactions /
  messages with real ECDSA (`handleSignRequest()`).
- Renders URs in transport-agnostic formats: `renderToPng(ur)` (single-frame
  PNG, pure TS, no ffmpeg) and `renderUrToY4m(ur, opts)` (animated Y4M,
  requires ffmpeg).
- Decodes QR images back into UR strings via `decodeQrImage(png)` and
  `decodeQrScreenshots(paths)` (Node-side `@zxing/library`).

The emulator does **not** care how the QR reaches the camera or how camera
frames come back — that decoupling is what makes both the zero-stub and
thin-seam paths viable.

### 2.2 Two optical directions

```
APP ──────────────► EMULATOR          App displays an animated sign-request QR.
(sign flow)          (decode)         Detox screenshots capture the frames;
                                      decodeQrScreenshots reconstructs the UR
                                      → emulator signs it.
                                      (Zero-stub — no camera involved.)

EMULATOR ──────────► APP              Emulator renders the account UR or the
(pair + sign          (camera)        signed ETHSignature response as a QR.
 response)                            The live vision-camera + ML Kit decodes
                                      it → real URRegistryDecoder →
                                      real resolvePendingScan.
                                      (Zero-stub for static QR via imagefile: or
                                      virtualscene. For animated QR, videofile:
                                      is a research-grade spike; thin-seam
                                      fallback via Metro module-swap is the
                                      deterministic CI default.)
```

### 2.3 CI strategy

| Flow | CI path | Mechanism | Status |
|---|---|---|---|
| **Import / pair** (static QR) | Zero-stub, camera injection | `-camera-back imagefile:qr.png` or `virtualscene` + poster | ✅ Viable |
| **Sign** (animated QR) | Thin seam (Metro swap) | `react-native-vision-camera` stub with real `renderToPng` + real `@zxing/library` decode | ✅ Deterministic |
| **Sign** (animated QR, fidelity canary) | Zero-stub, camera injection | `-camera-back videofile:qr.mp4` | 🔬 Research-grade (`qr-send-sign-spike.spec.ts`) |

The thin seam is the **CI gate** for sign flows because `videofile:` has no
proven precedent with animated BC-UR + vision-camera. It exercises the real
`URRegistryDecoder` → `requestId` match → `resolvePendingScan` → keyring
pipeline; the only substituted piece is the native ML Kit QR-image decode
(replaced by JS `@zxing/library` — both are mature decoders, and ML Kit is
an external Google library, not MetaMask code).

## 3. Product / UI impact

**Zero.** The only product-code changes are `testID` attributes added to two
files — the same constraint as the Ledger harness:

| File | testIDs added |
|---|---|
| `app/components/UI/QRHardware/AnimatedQRScanner.tsx` | `animated-qr-scanner-modal`, `-container`, `-camera` |
| `app/components/UI/QRHardware/QRSigningDetails.tsx` | `qr-signing-details-wrapper` |

No `if (IN_TEST)` branches, no test-only conditionals, no keyring swaps —
the production `QrKeyringScannerBridge` runs unmodified in all builds.

## 4. Test hierarchy

Tests live under `tests/smoke/qr/`, gated by `QR_E2E=1` and tagged `SmokeQr`
(defined in `tests/tags.js`, mirrors `SmokeLedger`).

| Spec | Flow | Status |
|---|---|---|
| `qr-import-account.spec.ts` | Pair / account import via camera injection | Ready |
| `qr-send-sign-spike.spec.ts` | Send ETH — animated sign via `videofile:` spike | Research-grade |
| `qr-signatures.spec.ts` | personal_sign / signTypedData_v4 | Planned |

## 5. File map

```
tests/
├── smoke/qr/
│   ├── qr-import-account.spec.ts           ← Import spec (zero-stub)
│   └── qr-send-sign-spike.spec.ts          ← Sign spike (videofile)
├── page-objects/QRHardware/
│   └── QRHardwareConnectView.ts            ← Page object
├── selectors/QRHardware/
│   └── QRHardware.selectors.ts             ← testID selectors
├── framework/fixtures/
│   └── (QrFixtureHelper.ts — planned)      ← Emulator test wrapper

scripts/qr-emulator/
├── render-account-ur.js                   ← Render PAIR QR → PNG
├── render-sign-ur-to-mp4.js               ← Render animated sign QR → MP4
└── tmp/
    ├── qr-account.png                      ← Pre-rendered import QR
    └── qr-sign-response.mp4                ← Pre-rendered sign QR

e2e/speculos/docs/
├── qr-e2e-testing.md                       ← This document
├── qr-camera-injection-spike.md            ← Camera-injection mechanism runbook
└── android-setup.md                        ← Shared Android emulator setup
```

## 6. How to run

### 6.1 Prerequisites

- Built Detox debug app: `yarn build:android:main:dev` (or
  `yarn test:e2e:android:ledger:debug:build` for the Speculos-enabled config).
- Android emulator AVD (API 34+, `google_apis` system image).
- `@metamask/hw-emulator` QR exports resolvable. The repo pins it via a Yarn
  `file:` resolution in `package.json`. The QR-enabled 0.2.0 build must be
  present in `node_modules/` (`yarn install` refreshes it).
- `QR_E2E=1` to un-gate the specs.
- (Sign spike only) `ffmpeg` on `$PATH`.

### 6.2 Import (zero-stub, proven)

```bash
# Render the account QR
node scripts/qr-emulator/render-account-ur.js

# Launch the emulator with the QR as the back camera
emulator @Pixel_5_Pro_API_34 \
  -camera-back imagefile:scripts/qr-emulator/tmp/qr-account.png \
  -gpu swiftshader_indirect -no-audio

# Run the import spec
QR_E2E=1 yarn detox test -c android.emu.main.speculos.debug \
  --testPathPattern='qr-import-account'
```

PASS criterion: the account selector appears → the real camera + native ML Kit
decoded the emulator's QR with zero stub.

### 6.3 Sign spike (research-grade, `videofile:`)

```bash
# Render the animated sign QR
node scripts/qr-emulator/render-sign-ur-to-mp4.js

# Launch the emulator with the video loop as the back camera
emulator @Pixel_5_Pro_API_34 \
  -camera-back videofile:scripts/qr-emulator/tmp/qr-sign-response.mp4 \
  -gpu swiftshader_indirect -no-audio

# Run the sign spike
QR_E2E=1 yarn detox test -c android.emu.main.speculos.debug \
  --testPathPattern='qr-send-sign-spike'
```

This spec is assertion-free — it logs whether the animated fountain code was
decoded and the transaction completed. Use the results to decide whether
`videofile:` can be promoted to CI.

### 6.4 Virtualscene alternative (static import)

```bash
node scripts/qr-emulator/render-account-ur.js
cp scripts/qr-emulator/tmp/qr-account.png \
  "$ANDROID_HOME/emulator/resources/my-qr.png"
printf 'poster custom\nsize 1 1\nposition 0 0 -1.5\nrotation 0 0 0\ndefault my-qr.png\n' \
  > "$ANDROID_HOME/emulator/resources/Toren1BD.posters"

emulator @Pixel_5_Pro_API_34 -camera-back virtualscene \
  -gpu swiftshader_indirect -no-audio

QR_E2E=1 yarn detox test -c android.emu.main.speculos.debug \
  --testPathPattern='qr-import-account'
```

### 6.5 CI note

`android-emulator-runner` does not reliably pass `-camera-back` through
`emulator-options`. Set `hw.camera.back=imagefile:/abs/path/qr.png` (or
`=videofile:/abs/path/qr.mp4`) directly in the AVD `config.ini` before launch.

```ini
# ~/.android/avd/<avd-name>.avd/config.ini
hw.camera.back=imagefile:/abs/path/qr-account.png
```

See [android-emulator-runner#443](https://github.com/ReactiveCircus/android-emulator-runner/issues/443).

## 7. Differences from the Ledger / Speculos harness

| Concern | Ledger | QR |
|---|---|---|
| Device emulator | Speculos (Docker, real firmware) | QrEmulator (pure TS) |
| Transport layer | BLE (Speculos Docker → netsim bridge) | Camera (emulator `-camera-back imagefile:` / `videofile:`) |
| Fixture wrapper | `withSpeculosFixtures` (starts Docker + BLE runner) | `withFixtures` (no external process — emulator is pure TS, camera injection is pre-launch) |
| Test env var | `LEDGER_E2E=1` | `QR_E2E=1` |
| Page objects | `tests/page-objects/Ledger/` | `tests/page-objects/QRHardware/` |
| Selectors | `tests/selectors/Ledger/` | `tests/selectors/QRHardware/` |
| Spec directory | `tests/smoke/ledger/` | `tests/smoke/qr/` |
| Environment script | `scripts/speculos-env.sh` | N/A — no running daemons |

## 8. Known limitations / open items

1. **Animated sign flow in CI.** `videofile:` is unproven for animated BC-UR.
   The thin-seam Metro module-swap is designed as the deterministic fallback if
   the spike doesn't produce reliable results (cross-reference:
   `tests/module-mocking/qr-hardware/react-native-vision-camera.ts` — not yet
   built; design doc exists in the spike research).
2. **iOS.** No iOS Detox configs for camera-injection. Android only.
3. **ML Kit bundled model requirement.** The emulator path depends on the
   bundled `com.google.mlkit:barcode-scanning:17.3.0` in
   `react-native-vision-camera/android/build.gradle` (line 204). The unbundled
   Play Services variant silently fails on emulators.
4. **Auto-lock / permission dialogs.** The import spec uses
   `loginToAppWithSyncDisabled` and a `withNoAutoLock` variant for send tests —
   follow the same pattern as the Ledger specs for auto-lock concerns.
5. **Request ID matching for sign flow.** The keyring's `requestId` is random
   (`uuid.v4()`); the emulator extracts it from the sign request UR. The
   app→emulator screenshot path (Detox → `decodeQrScreenshots`) captures the
   live request ID; the emulator→app response carries the matching ID back.

## 9. References

- [QR emulator spec](../../../packages/hw-emulator/src/qr/README.md) — authoritative, in `@metamask/hw-emulator`
- [qr-camera-injection-spike.md](./qr-camera-injection-spike.md) — detailed camera-injection mechanism runbook
- [BC-UR spec (BCR-2020-006)](https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-ur.md)
- [`@ngraveio/bc-ur`](https://github.com/ngraveio/bc-ur)
- [`@keystonehq/bc-ur-registry-eth`](https://github.com/KeystoneHQ/bc-ur-registry-eth)
- [Android emulator camera modes](https://developer.android.com/studio/run/emulator-commandline)
- [vision-camera mocking guide (Detox)](https://github.com/mrousavy/react-native-vision-camera/blob/main/docs/docs/guides/MOCKING.mdx)
