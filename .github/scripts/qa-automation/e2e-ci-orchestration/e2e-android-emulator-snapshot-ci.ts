/* eslint-disable import-x/no-nodejs-modules */
/* eslint-disable no-console */
/**
 * CI helper for the Android golden-snapshot boot flow.
 *
 * The Appium smoke CI historically cold-booted every shard with
 * `-no-snapshot-save -no-snapshot-load -wipe-data -read-only` (~171s of boot +
 * stabilization per shard). The golden-snapshot flow pays that cost once per
 * system image: a prime step cold-boots, stabilizes (system trimming,
 * animations off, network up), and saves a named quick-boot snapshot
 * (`e2e_golden`). Shards then resume from it in seconds.
 *
 * Usage: `yarn tsx .github/scripts/qa-automation/e2e-ci-orchestration/e2e-android-emulator-snapshot-ci.ts check` computes
 * the system-image fingerprint and exports ANDROID_EMULATOR_IMAGE_FINGERPRINT
 * and ANDROID_GOLDEN_SNAPSHOT_VALID (true|false) to $GITHUB_ENV. It always
 * exits 0 — on any error it reports valid=false so shards fall back to cold
 * boot. `... prime` cold-boots the AVD, stabilizes it, and saves the golden
 * snapshot with the current image fingerprint, exiting non-zero on failure.
 *
 * Relevant env: ANDROID_AVD_NAME (default appium_smoke_avd),
 * ANDROID_SYSTEM_IMAGE_API_LEVEL (default 36), ANDROID_SYSTEM_IMAGE_TAG
 * (default "default", AOSP), ANDROID_SYSTEM_IMAGE_ABI (default x86_64).
 * Shard boots use ANDROID_EMULATOR_BOOT_MODE (auto|snapshot|cold).
 */
import fs from 'fs';
import {
  computeAndroidSystemImageFingerprint,
  getGoldenSnapshotDir,
  isGoldenSnapshotUsable,
  primeAndroidGoldenSnapshot,
} from '../../../../tests/framework/services/appium/EmulatorHelpers.ts';

const avdName = process.env.ANDROID_AVD_NAME?.trim() || 'appium_smoke_avd';

function exportToGithubEnv(key: string, value: string): void {
  const envFile = process.env.GITHUB_ENV;
  if (!envFile) {
    return;
  }
  fs.appendFileSync(envFile, `${key}=${value}\n`);
}

async function check(): Promise<void> {
  try {
    const fingerprint = await computeAndroidSystemImageFingerprint();
    exportToGithubEnv('ANDROID_EMULATOR_IMAGE_FINGERPRINT', fingerprint);
    const usable = isGoldenSnapshotUsable(avdName, {
      ...process.env,
      ANDROID_EMULATOR_IMAGE_FINGERPRINT: fingerprint,
    });
    exportToGithubEnv(
      'ANDROID_GOLDEN_SNAPSHOT_VALID',
      usable ? 'true' : 'false',
    );
    console.log(
      usable
        ? `Golden snapshot for "${avdName}" is valid (fingerprint ${fingerprint}) — shards will quick-boot.`
        : `No usable golden snapshot for "${avdName}" at ${getGoldenSnapshotDir(
            avdName,
          )} (fingerprint ${fingerprint}) — shards will cold boot.`,
    );
  } catch (error) {
    console.warn(
      `Golden snapshot check failed (${error}) — shards will cold boot.`,
    );
    exportToGithubEnv('ANDROID_GOLDEN_SNAPSHOT_VALID', 'false');
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
