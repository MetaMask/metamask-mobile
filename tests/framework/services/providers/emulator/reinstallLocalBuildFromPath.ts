/* eslint-disable import-x/no-nodejs-modules */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import type { Logger } from '../../../logger.ts';
import { Platform, type EmulatorConfig } from '../../../types.ts';
import type { ProjectConfig } from '../../common/types.ts';
import { resolveAndroidAdbUdidForDevice } from './android/resolveAndroidAdbUdid';

const execFileAsync = promisify(execFile);

const INSTALL_TIMEOUT_MS = 10 * 60_000;

/**
 * When `SKIP_APP_REINSTALL` is `true`, `1`, or `yes` (case-insensitive), global
 * setup skips `adb` / `simctl` uninstall+install for `use.app.buildPath`.
 * `false`, `0`, `no`, or unset: reinstall runs as usual.
 */
export function shouldSkipAppReinstallFromEnv(): boolean {
  const raw = process.env.SKIP_APP_REINSTALL;
  if (raw === undefined || raw === '') {
    return false;
  }
  const v = raw.trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'no') {
    return false;
  }
  if (v === 'true' || v === '1' || v === 'yes') {
    return true;
  }
  return false;
}

/**
 * Single entry for global setup: `adb` / `simctl` uninstall+install from
 * `buildPath`. Returns immediately when `SKIP_APP_REINSTALL` is set.
 */
export async function reinstallFromBuildPathForProject(
  project: ProjectConfig,
  buildPath: string,
  logger: Pick<Logger, 'debug' | 'info' | 'warn'>,
): Promise<void> {
  if (shouldSkipAppReinstallFromEnv()) {
    logger.info(
      'SKIP_APP_REINSTALL is enabled; skipping adb/simctl uninstall+install (app on device must still match your needs for the run).',
    );
    return;
  }

  if (project.use.platform === Platform.ANDROID) {
    const emulatorDevice = project.use.device as EmulatorConfig;
    const packageName = project.use.app?.packageName;
    if (!packageName) {
      throw new Error(
        'Android: `use.app.buildPath` requires `use.app.packageName` to uninstall/reinstall the app in global setup.',
      );
    }
    if (!emulatorDevice.name && !emulatorDevice.udid) {
      throw new Error(
        'Android: set `use.device.name` (AVD) or `use.device.udid` to reinstall from `use.app.buildPath` in global setup.',
      );
    }
    const adbSerial = await resolveAndroidAdbUdidForDevice(emulatorDevice);
    logger.info(
      `Reinstalling Android app from build path (adb uninstall + install) on ${adbSerial}…`,
    );
    await reinstallLocalAndroidBuildArtifact({
      buildPath,
      packageName,
      adbSerial,
      logger,
    });
  } else if (project.use.platform === Platform.IOS) {
    const bundleId = project.use.app?.appId;
    const simDevice = project.use.device?.name;
    if (!bundleId) {
      throw new Error(
        'iOS: `use.app.buildPath` requires `use.app.appId` (bundle id) to uninstall/reinstall in global setup.',
      );
    }
    if (!simDevice) {
      throw new Error(
        'iOS: set `use.device.name` to the target simulator to reinstall from `use.app.buildPath` in global setup.',
      );
    }
    logger.info(
      'Reinstalling iOS app from build path (simctl uninstall + install)…',
    );
    await reinstallLocalIOSBuildArtifact({
      buildPath,
      bundleId,
      simDevice,
      logger,
    });
  }
}

/**
 * Uninstalls the package, then installs the .apk. Uninstall is best-effort
 * (missing package is not fatal).
 */
export async function reinstallLocalAndroidBuildArtifact({
  buildPath,
  packageName,
  adbSerial,
  logger,
}: {
  buildPath: string;
  packageName: string;
  adbSerial: string;
  logger: Pick<Logger, 'debug' | 'info' | 'warn'>;
}): Promise<void> {
  const absApk = path.resolve(buildPath);

  try {
    const { stdout, stderr } = await execFileAsync(
      'adb',
      ['-s', adbSerial, 'uninstall', packageName],
      { timeout: 120_000, maxBuffer: 2 * 1024 * 1024 },
    );
    logger.debug(
      `adb uninstall ${packageName}: ${(stdout + stderr).trim() || 'done'}`,
    );
  } catch (error) {
    logger.debug(
      `adb uninstall (ignored if app was not installed): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  logger.info(`adb install: ${absApk}`);
  const { stdout, stderr } = await execFileAsync(
    'adb',
    ['-s', adbSerial, 'install', absApk],
    { timeout: INSTALL_TIMEOUT_MS, maxBuffer: 2 * 1024 * 1024 },
  );
  const out = (stdout + stderr).trim();
  if (out) {
    logger.info(out);
  }
}

/**
 * Uninstalls the bundle, then installs the .app. Uninstall is best-effort.
 */
export async function reinstallLocalIOSBuildArtifact({
  buildPath,
  bundleId,
  simDevice,
  logger,
}: {
  buildPath: string;
  bundleId: string;
  simDevice: string;
  logger: Pick<Logger, 'debug' | 'info' | 'warn'>;
}): Promise<void> {
  const absApp = path.resolve(buildPath);

  try {
    const { stdout, stderr } = await execFileAsync(
      'xcrun',
      ['simctl', 'uninstall', simDevice, bundleId],
      { timeout: 120_000, maxBuffer: 2 * 1024 * 1024 },
    );
    logger.debug(`simctl uninstall: ${(stdout + stderr).trim() || 'done'}`);
  } catch (error) {
    logger.debug(
      `simctl uninstall (ignored if app was not installed): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  logger.info(`simctl install: ${absApp}`);
  const { stdout, stderr } = await execFileAsync(
    'xcrun',
    ['simctl', 'install', simDevice, absApp],
    { timeout: INSTALL_TIMEOUT_MS, maxBuffer: 2 * 1024 * 1024 },
  );
  const out = (stdout + stderr).trim();
  if (out) {
    logger.info(out);
  }
}
