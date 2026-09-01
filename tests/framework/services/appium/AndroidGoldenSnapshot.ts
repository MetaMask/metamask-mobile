/* eslint-disable import-x/no-nodejs-modules */
import { exec } from 'child_process';
import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createLogger } from '../../logger.ts';

const logger = createLogger({ name: 'AndroidGoldenSnapshot' });

const ANDROID_EMULATOR_CI_CORES_DEFAULT = '8';
const ANDROID_EMULATOR_CI_DNS_SERVER = '8.8.8.8';
const ANDROID_EMULATOR_CI_SKIN = '1440x3120';

/** Named quick-boot snapshot shared by Appium CI shards. */
export const ANDROID_EMULATOR_GOLDEN_SNAPSHOT_NAME = 'e2e_golden';

export type AndroidEmulatorBootMode = 'auto' | 'snapshot' | 'cold';

export type AndroidEmulatorArgMode =
  | 'cold'
  | 'snapshot-prime'
  | 'snapshot-resume';

function execAsync(cmd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export function resolveAndroidBootMode(
  env: Record<string, string | undefined> = process.env,
): AndroidEmulatorBootMode {
  const raw = env.ANDROID_EMULATOR_BOOT_MODE?.trim().toLowerCase();
  if (raw === 'snapshot' || raw === 'cold') {
    return raw;
  }
  return 'auto';
}

export function getAndroidAvdHome(
  env: Record<string, string | undefined> = process.env,
): string {
  return (
    env.ANDROID_AVD_HOME?.trim() || path.join(os.homedir(), '.android', 'avd')
  );
}

export function getGoldenSnapshotDir(
  avdName: string,
  env: Record<string, string | undefined> = process.env,
): string {
  return path.join(
    getAndroidAvdHome(env),
    `${avdName}.avd`,
    'snapshots',
    ANDROID_EMULATOR_GOLDEN_SNAPSHOT_NAME,
  );
}

function getGoldenSnapshotFingerprintPath(
  avdName: string,
  env: Record<string, string | undefined> = process.env,
): string {
  return path.join(
    getAndroidAvdHome(env),
    `${avdName}.avd`,
    'snapshots',
    `${ANDROID_EMULATOR_GOLDEN_SNAPSHOT_NAME}.fingerprint.txt`,
  );
}

export function hasGoldenSnapshot(
  avdName: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  return fs.existsSync(
    path.join(getGoldenSnapshotDir(avdName, env), 'snapshot.pb'),
  );
}

export function readGoldenSnapshotFingerprint(
  avdName: string,
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  try {
    return fs
      .readFileSync(getGoldenSnapshotFingerprintPath(avdName, env), 'utf8')
      .trim();
  } catch {
    return undefined;
  }
}

export function writeGoldenSnapshotFingerprint(
  avdName: string,
  fingerprint: string,
  env: Record<string, string | undefined> = process.env,
): void {
  fs.writeFileSync(
    getGoldenSnapshotFingerprintPath(avdName, env),
    `${fingerprint}\n`,
    'utf8',
  );
}

export function removeGoldenSnapshot(
  avdName: string,
  env: Record<string, string | undefined> = process.env,
): void {
  const snapshotDir = getGoldenSnapshotDir(avdName, env);
  if (fs.existsSync(snapshotDir)) {
    fs.rmSync(snapshotDir, { recursive: true, force: true });
  }
  try {
    fs.unlinkSync(getGoldenSnapshotFingerprintPath(avdName, env));
  } catch {
    // absent
  }
}

/**
 * Snapshot is usable when it exists and matches ANDROID_EMULATOR_IMAGE_FINGERPRINT.
 * In CI, a missing fingerprint is unusable; locally, existence alone is enough.
 */
export function isGoldenSnapshotUsable(
  avdName: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!hasGoldenSnapshot(avdName, env)) {
    return false;
  }
  const expected = env.ANDROID_EMULATOR_IMAGE_FINGERPRINT?.trim();
  if (!expected) {
    if (env.CI === 'true') {
      logger.warn(
        'ANDROID_EMULATOR_IMAGE_FINGERPRINT not set in CI — treating golden snapshot as unusable.',
      );
      return false;
    }
    logger.warn(
      'ANDROID_EMULATOR_IMAGE_FINGERPRINT not set — accepting golden snapshot on existence only.',
    );
    return true;
  }
  const actual = readGoldenSnapshotFingerprint(avdName, env);
  if (actual !== expected) {
    logger.warn(
      `Golden snapshot fingerprint mismatch (snapshot=${actual ?? 'missing'}, image=${expected}) — treating as unusable.`,
    );
    return false;
  }
  return true;
}

export function buildAndroidEmulatorArgs(options: {
  avdName: string;
  isCI: boolean;
  bootMode?: AndroidEmulatorArgMode;
  cores?: string;
  skin?: string;
  snapshotName?: string;
  snapshotReadOnly?: boolean;
}): string[] {
  const { avdName, isCI, bootMode = 'cold' } = options;
  if (!isCI) {
    return ['-avd', avdName, '-no-snapshot-load'];
  }

  const cores = options.cores?.trim() || ANDROID_EMULATOR_CI_CORES_DEFAULT;
  const skin = options.skin?.trim() || ANDROID_EMULATOR_CI_SKIN;
  const snapshotName =
    options.snapshotName?.trim() || ANDROID_EMULATOR_GOLDEN_SNAPSHOT_NAME;

  const head = [
    '-avd',
    avdName,
    '-skin',
    skin,
    '-memory',
    '12288',
    '-cores',
    cores,
    '-dns-server',
    ANDROID_EMULATOR_CI_DNS_SERVER,
    '-gpu',
    'swiftshader_indirect',
    '-no-audio',
    '-no-boot-anim',
  ];
  const tail = ['-cache-size', '2048', '-accel', 'on', '-no-window'];

  const modeFlags: Record<AndroidEmulatorArgMode, string[]> = {
    cold: [
      '-partition-size',
      '8192',
      '-no-snapshot-save',
      '-no-snapshot-load',
      '-wipe-data',
      '-read-only',
    ],
    'snapshot-prime': [
      '-partition-size',
      '8192',
      '-wipe-data',
      '-no-snapshot-load',
    ],
    'snapshot-resume': [
      '-no-snapshot-save',
      '-snapshot',
      snapshotName,
      ...((options.snapshotReadOnly ?? true) ? ['-read-only'] : []),
    ],
  };

  return [...head, ...modeFlags[bootMode], ...tail];
}

/** Hash of system-image metadata, emulator version, and CI prime boot args. */
export async function computeAndroidSystemImageFingerprint(
  env: Record<string, string | undefined> = process.env,
): Promise<string> {
  const androidHome = env.ANDROID_HOME;
  if (!androidHome) {
    throw new Error(
      'ANDROID_HOME is not set. Please set the ANDROID_HOME environment variable.',
    );
  }
  const apiLevel = env.ANDROID_SYSTEM_IMAGE_API_LEVEL?.trim() || '36';
  const tag = env.ANDROID_SYSTEM_IMAGE_TAG?.trim() || 'default';
  const abi = env.ANDROID_SYSTEM_IMAGE_ABI?.trim() || 'x86_64';
  const imageDir = path.join(
    androidHome,
    'system-images',
    `android-${apiLevel}`,
    tag,
    abi,
  );

  const hash = createHash('sha256');
  for (const file of ['source.properties', 'build.props']) {
    try {
      hash.update(fs.readFileSync(path.join(imageDir, file)));
    } catch {
      // missing metadata still leaves emulator version / args in the hash
    }
  }
  try {
    const { stdout } = await execAsync(
      `"${path.join(androidHome, 'emulator', 'emulator')}" -version`,
    );
    hash.update(stdout);
  } catch {
    // image metadata still distinguishes snapshots
  }
  hash.update(
    JSON.stringify(
      buildAndroidEmulatorArgs({
        avdName: '',
        isCI: true,
        bootMode: 'snapshot-prime',
        cores: env.ANDROID_EMULATOR_CI_CORES,
        skin: env.ANDROID_EMULATOR_CI_SKIN,
      }),
    ),
  );
  return hash.digest('hex');
}
