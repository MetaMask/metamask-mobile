#!/usr/bin/env node
/**
 * repack-debug-with-mock.js — Repack the Detox debug APK with a freshly-built
 * JS bundle that has the QR thin-seam vision-camera mock baked in.
 *
 * The plain `detox build -c android.emu.main.speculos.debug` APK has NO
 * embedded JS bundle (debug builds expect Metro at runtime — which OOMs on the
 * ~126 MB bundle; see qr-e2e-status.md §3.3). This script uses
 * `@expo/repack-app` (the same lib `scripts/repack.js` uses for release) to
 * rebuild the JS bundle and re-embed it into the debug APK, then re-signs with
 * the Android debug keystore.
 *
 * Set `QR_E2E_THIN_SEAM=true` so the Metro resolver swap in metro.config.js
 * bakes the thin-seam mock (`tests/module-mocking/vision-camera/qr-thin-seam.ts`)
 * into the bundle. `env: process.env` below propagates it into the
 * `expo export:embed` child process.
 *
 * Output: android/app/build/outputs/apk/prod/debug/app-prod-debug-thin-seam.apk
 * Point Detox at it via PREBUILT_ANDROID_APK_PATH (the original debug APK is
 * left untouched).
 *
 * Usage:
 *   QR_E2E_THIN_SEAM=true node scripts/qr-emulator/repack-debug-with-mock.js
 */
// NODE_ENV/BABEL_ENV must be pinned to 'production' BEFORE importing
// @expo/repack-app, otherwise the spawned `expo export:embed` produces a
// jsxDEV-bearing bundle that crashes the RN runtime on first render. See the
// extensive comment at the top of scripts/repack.js for the full rationale.
process.env.NODE_ENV = 'production';
process.env.BABEL_ENV = 'production';

const os = require('node:os');
const path = require('node:path');

const SOURCE_APK = path.resolve(
  'android/app/build/outputs/apk/prod/debug/app-prod-debug.apk',
);
const OUTPUT_APK = path.resolve(
  'android/app/build/outputs/apk/prod/debug/app-prod-debug-thin-seam.apk',
);
const WORK_DIR = path.resolve('android/app/build/repack-working-qr');

async function main() {
  if (process.env.QR_E2E_THIN_SEAM !== 'true') {
    console.warn(
      '⚠️  QR_E2E_THIN_SEAM is not "true" — the mock will NOT be in the bundle.',
    );
  }
  const fs = await import('node:fs');
  if (!fs.default.existsSync(SOURCE_APK)) {
    throw new Error(`Source APK not found: ${SOURCE_APK}\nRun detox build first.`);
  }
  fs.default.mkdirSync(WORK_DIR, { recursive: true });

  const { repackAppAndroidAsync } = await import('@expo/repack-app');
  console.log(`📦 Repacking:\n   src: ${SOURCE_APK}\n   out: ${OUTPUT_APK}`);
  console.log(`   QR_E2E_THIN_SEAM=${process.env.QR_E2E_THIN_SEAM || '(unset)'}`);

  await repackAppAndroidAsync({
    platform: 'android',
    projectRoot: process.cwd(),
    sourceAppPath: SOURCE_APK,
    outputPath: OUTPUT_APK,
    workingDirectory: WORK_DIR,
    verbose: true,
    androidSigningOptions: {
      keyStorePath: path.join(os.homedir(), '.android', 'debug.keystore'),
      keyStorePassword: 'pass:android',
      keyAlias: 'androiddebugkey',
      keyPassword: 'pass:android',
    },
    env: process.env,
  });

  fs.default.rmSync(WORK_DIR, { recursive: true, force: true });
  console.log(`✅ Repacked APK: ${OUTPUT_APK}`);
}

main().catch((e) => {
  console.error(`❌ Repack failed: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
