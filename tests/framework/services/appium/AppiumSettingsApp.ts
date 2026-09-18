/* eslint-disable import-x/no-nodejs-modules */
import { execFile } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createLogger } from '../../logger.ts';

const execFileAsync = promisify(execFile);
const logger = createLogger({ name: 'AppiumSettingsApp' });

export const APPIUM_SETTINGS_PACKAGE = 'io.appium.settings';
export const APPIUM_SETTINGS_APK_NAME = 'settings_apk-debug.apk';

/**
 * `appium:skipDeviceInitialization` skips Appium's install of this helper.
 * Media projection recording (`mobile: startMediaProjectionRecording`) starts
 * `io.appium.settings/.Settings`, so the APK must already be on the emulator.
 */
export function resolveAppiumSettingsApkPath(): string {
  const apkPath = join(
    process.cwd(),
    'node_modules',
    APPIUM_SETTINGS_PACKAGE,
    'apks',
    APPIUM_SETTINGS_APK_NAME,
  );
  accessSync(apkPath, constants.R_OK);
  return apkPath;
}

/** @internal exported for unit tests */
export function buildAppiumSettingsInstallArgs(
  serial: string,
  apkPath: string,
): string[] {
  return ['-s', serial, 'install', '-r', '-g', apkPath];
}

/** @internal exported for unit tests */
export function isAppiumSettingsPmPathInstalled(stdout: string): boolean {
  return stdout.includes('package:');
}

async function isAppiumSettingsInstalled(serial: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(
      'adb',
      ['-s', serial, 'shell', 'pm', 'path', APPIUM_SETTINGS_PACKAGE],
      { timeout: 15_000 },
    );
    return isAppiumSettingsPmPathInstalled(stdout);
  } catch {
    return false;
  }
}

/**
 * Installs the Appium settings helper and grants media-projection appops.
 * Idempotent when the package is already present.
 */
export async function ensureAppiumSettingsAppInstalled(
  serial: string,
): Promise<void> {
  const apkPath = resolveAppiumSettingsApkPath();
  if (await isAppiumSettingsInstalled(serial)) {
    logger.debug(
      `${APPIUM_SETTINGS_PACKAGE} already installed on ${serial} — skipping adb install.`,
    );
  } else {
    logger.info(
      `Installing ${APPIUM_SETTINGS_PACKAGE} on ${serial} for media projection recording.`,
    );
    const { stdout, stderr } = await execFileAsync(
      'adb',
      buildAppiumSettingsInstallArgs(serial, apkPath),
      { timeout: 120_000, maxBuffer: 2 * 1024 * 1024 },
    );
    const out = `${stdout}${stderr}`.trim();
    if (out) {
      logger.info(out);
    }
  }

  try {
    await execFileAsync(
      'adb',
      [
        '-s',
        serial,
        'shell',
        'appops',
        'set',
        APPIUM_SETTINGS_PACKAGE,
        'PROJECT_MEDIA',
        'allow',
      ],
      { timeout: 15_000 },
    );
  } catch (error) {
    logger.warn(
      `Could not grant PROJECT_MEDIA to ${APPIUM_SETTINGS_PACKAGE} on ${serial}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
