/* eslint-disable import-x/no-nodejs-modules */
/* eslint-disable no-console */
/**
 * CI helper for Android golden-snapshot prime/check.
 *
 * check — fingerprint + usability → GITHUB_ENV fingerprint, GITHUB_OUTPUT ready
 * prime — cold-boot, save, resume-verify; sets ready=true on success
 */
import fs from 'fs';
import {
  computeAndroidSystemImageFingerprint,
  getGoldenSnapshotDir,
  isGoldenSnapshotUsable,
  primeAndroidGoldenSnapshot,
} from '../../../../tests/framework/services/appium/EmulatorHelpers.ts';

const avdName = process.env.ANDROID_AVD_NAME?.trim() || 'appium_smoke_avd';

function appendEnvFile(
  envFile: string | undefined,
  key: string,
  value: string,
): void {
  if (!envFile) {
    return;
  }
  fs.appendFileSync(envFile, `${key}=${value}\n`);
}

function exportFingerprint(fingerprint: string): void {
  appendEnvFile(process.env.GITHUB_ENV, 'ANDROID_EMULATOR_IMAGE_FINGERPRINT', fingerprint);
}

function exportReady(ready: boolean): void {
  appendEnvFile(process.env.GITHUB_OUTPUT, 'ready', ready ? 'true' : 'false');
}

async function check(): Promise<void> {
  try {
    const fingerprint = await computeAndroidSystemImageFingerprint();
    exportFingerprint(fingerprint);
    const usable = isGoldenSnapshotUsable(avdName, {
      ...process.env,
      ANDROID_EMULATOR_IMAGE_FINGERPRINT: fingerprint,
    });
    exportReady(usable);
    console.log(
      usable
        ? `Golden snapshot for "${avdName}" is ready (fingerprint ${fingerprint}).`
        : `No usable golden snapshot for "${avdName}" at ${getGoldenSnapshotDir(
            avdName,
          )} (fingerprint ${fingerprint}).`,
    );
  } catch (error) {
    console.warn(`Golden snapshot check failed (${error}) — cold boot.`);
    exportFingerprint('');
    exportReady(false);
  }
}

async function prime(): Promise<void> {
  const fingerprint = await computeAndroidSystemImageFingerprint();
  console.log(`Priming golden snapshot (fingerprint ${fingerprint})...`);
  await primeAndroidGoldenSnapshot(avdName, { fingerprint });
  if (
    !isGoldenSnapshotUsable(avdName, {
      ...process.env,
      ANDROID_EMULATOR_IMAGE_FINGERPRINT: fingerprint,
    })
  ) {
    throw new Error(
      'Golden snapshot was saved but failed post-prime validation.',
    );
  }
  exportFingerprint(fingerprint);
  exportReady(true);
  console.log(`Golden snapshot primed and validated for "${avdName}".`);
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === 'check') {
    await check();
    return;
  }
  if (command === 'prime') {
    await prime();
    return;
  }
  throw new Error(`Unknown command "${command ?? ''}" — use check|prime.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
