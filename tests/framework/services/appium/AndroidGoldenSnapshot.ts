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
const ANDROID_EMULATOR_CI_MEMORY_MB = '10240';

/** Named quick-boot snapshot shared by Appium CI shards. */
export const ANDROID_EMULATOR_GOLDEN_SNAPSHOT_NAME = 'e2e_golden';

export type AndroidEmulatorBootMode = 'auto' | 'snapshot' | 'cold';

export type AndroidEmulatorArgMode =
  | 'cold'
  | 'snapshot-prime'
  | 'snapshot-resume';

export interface AndroidEmulatorPoolBoot {
  serial: string;
  port: number;
  args: string[];
}

/** Console port / adb serial for pool index 0 (`emulator-5554`). */
export const ANDROID_EMULATOR_CONSOLE_PORT_BASE = 5554;

export function androidEmulatorConsolePortForIndex(index: number): number {
  return ANDROID_EMULATOR_CONSOLE_PORT_BASE + index * 2;
}

export function androidEmulatorSerialForIndex(index: number): string {
  return `emulator-${androidEmulatorConsolePortForIndex(index)}`;
}

export function androidEmulatorSerialsForPoolSize(poolSize: number): string[] {
  if (!Number.isInteger(poolSize) || poolSize < 1) {
    throw new Error(
      `Invalid Android emulator pool size "${poolSize}". Expected a positive integer.`,
    );
  }
  return Array.from({ length: poolSize }, (_, index) =>
    androidEmulatorSerialForIndex(index),
  );
}

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
  port?: number;
}): string[] {
  const { avdName, isCI, bootMode = 'cold' } = options;
  const portFlags =
    options.port === undefined ? [] : ['-port', String(options.port)];
  if (!isCI) {
    const readOnlyFlags =
      options.snapshotReadOnly === true || options.port !== undefined
        ? ['-read-only']
        : [];
    return [
      '-avd',
      avdName,
      '-no-snapshot-load',
      ...readOnlyFlags,
      ...portFlags,
    ];
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
    ANDROID_EMULATOR_CI_MEMORY_MB,
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

  return [...head, ...modeFlags[bootMode], ...portFlags, ...tail];
}

/**
 * Build deterministic pool boot commands. Golden resume is the CI default;
 * `bootMode: 'cold'` shares the same AVD on distinct console ports with
 * `-read-only` so two QEMU instances can start without a snapshot.
 */
export function buildAndroidEmulatorPoolArgs(options: {
  avdName: string;
  isCI: boolean;
  poolSize: number;
  cores?: string;
  skin?: string;
  bootMode?: Extract<AndroidEmulatorArgMode, 'cold' | 'snapshot-resume'>;
}): AndroidEmulatorPoolBoot[] {
  if (!Number.isInteger(options.poolSize) || options.poolSize < 1) {
    throw new Error(
      `Invalid Android emulator pool size "${options.poolSize}". Expected a positive integer.`,
    );
  }

  const bootMode = options.bootMode ?? 'snapshot-resume';
  return Array.from({ length: options.poolSize }, (_, index) => {
    const port = androidEmulatorConsolePortForIndex(index);
    return {
      serial: androidEmulatorSerialForIndex(index),
      port,
      args: buildAndroidEmulatorArgs({
        avdName: options.avdName,
        isCI: options.isCI,
        bootMode,
        cores: options.cores,
        skin: options.skin,
        snapshotReadOnly: true,
        port,
      }),
    };
  });
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
