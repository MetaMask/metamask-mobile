/* eslint-disable import-x/no-nodejs-modules */
/**
 * Detox-only app launch helpers (extracted from deprecated tests/helpers.js).
 * Appium uses PlaywrightUtilities.launchApp instead.
 */
import { resolveConfig } from 'detox/internals';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../logger';

const logger = createLogger({
  name: 'DetoxAppLaunch',
});
const execAsync = promisify(exec);

function getDeepLinkUrl(url) {
  return `expo-metamask://expo-development-client/?url=${encodeURIComponent(
    url,
  )}`;
}

function getDevLauncherPackagerUrl(platform) {
  const port = process.env.METRO_PORT_E2E || process.env.WATCHER_PORT || '8081';
  return `http://localhost:${port}/index.bundle?platform=${platform}&dev=true&minify=false&disableOnboarding=1`;
}

function getAdbDeviceFlag() {
  return device?.id ? `-s ${device.id}` : '';
}

async function logAndroidReversePorts(context) {
  if (device.getPlatform() !== 'android') {
    return;
  }

  try {
    const command = `adb ${getAdbDeviceFlag()} reverse --list`;
    const { stdout } = await execAsync(command);
    logger.debug(
      `[launch diagnostics] ${context} | adb reverse --list:\n${
        stdout?.trim() || '(empty)'
      }`,
    );
  } catch (error) {
    logger.warn(
      `[launch diagnostics] ${context} | Failed to list adb reverse ports`,
      error,
    );
  }
}

function isAndroidReverseAddressInUseError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    device.getPlatform() === 'android' &&
    message.includes('adb') &&
    message.includes('reverse tcp:') &&
    message.includes('Address already in use')
  );
}

function extractConflictingReversePort(error) {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/reverse tcp:(\d+) tcp:\1/);
  return match?.[1];
}

async function removeAndroidReversePort(port) {
  try {
    const command = `adb ${getAdbDeviceFlag()} reverse --remove tcp:${port}`;
    await execAsync(command);
    logger.warn(
      `[launch recovery] Removed conflicting adb reverse tcp:${port}. Retrying app launch once.`,
    );
  } catch (removeError) {
    const msg =
      removeError instanceof Error ? removeError.message : String(removeError);
    if (msg.includes('not found')) {
      logger.warn(
        `[launch recovery] Port tcp:${port} not in adb reverse table (likely TIME_WAIT or OS-level bind). Will still retry.`,
      );
    } else {
      logger.error(
        `[launch recovery] Unexpected error removing tcp:${port}: ${msg}`,
      );
    }
  }
}

async function diagnoseEmulatorPort(port) {
  const deviceFlag = getAdbDeviceFlag();
  try {
    const hexPort = parseInt(port, 10)
      .toString(16)
      .toUpperCase()
      .padStart(4, '0');
    const { stdout: tcpState } = await execAsync(
      `adb ${deviceFlag} shell cat /proc/net/tcp6 2>/dev/null || adb ${deviceFlag} shell cat /proc/net/tcp 2>/dev/null`,
    );
    const relevantLines = tcpState
      .split('\n')
      .filter((line) => line.includes(`:${hexPort}`));
    if (relevantLines.length > 0) {
      logger.warn(
        `[launch diagnostics] Emulator socket state for port ${port} (hex ${hexPort}):\n${relevantLines.join('\n')}`,
      );
      logger.warn(
        `[launch diagnostics] TCP state reference: 01=ESTABLISHED, 06=TIME_WAIT, 0A=LISTEN`,
      );
    } else {
      logger.warn(
        `[launch diagnostics] No socket entries found for port ${port} inside emulator`,
      );
    }
  } catch (diagError) {
    logger.debug(
      `[launch diagnostics] Could not read emulator socket state: ${diagError.message}`,
    );
  }
}

async function launchAppWithRecovery(launchOptions) {
  await logAndroidReversePorts('before device.launchApp');

  try {
    return await device.launchApp(launchOptions);
  } catch (error) {
    if (!isAndroidReverseAddressInUseError(error)) {
      throw error;
    }

    const conflictingPort = extractConflictingReversePort(error);
    if (!conflictingPort) {
      throw error;
    }

    logger.warn(
      `[launch recovery] Detected Detox adb reverse port collision on tcp:${conflictingPort}.`,
    );
    await logAndroidReversePorts('launch failure before reverse cleanup');
    await diagnoseEmulatorPort(conflictingPort);
    await removeAndroidReversePort(conflictingPort);
    await logAndroidReversePorts('after reverse cleanup before retry');

    return device.launchApp(launchOptions);
  }
}

async function launchAppForDebugBuild(platform, launchOptions) {
  const deepLinkUrl = getDeepLinkUrl(getDevLauncherPackagerUrl(platform));

  if (platform === 'ios') {
    await launchAppWithRecovery(launchOptions);
    return device.openURL({
      url: deepLinkUrl,
    });
  }

  return launchAppWithRecovery({
    url: deepLinkUrl,
    ...launchOptions,
  });
}

/**
 * Launch the app under Detox with debug deep-link or recovery-based launch.
 * @param {object} launchOptions Detox device.launchApp options
 */
export async function launchApp(launchOptions) {
  const config = await resolveConfig();
  const platform = device.getPlatform();
  // Use debug launch for configs explicitly named 'debug' (original behavior)
  // AND for any non-CI config (e.g. ios.sim.main which uses ios.debug app locally).
  // CI configs (*.ci) use release apps and the normal recovery-based launch.
  if (
    config.configurationName.endsWith('debug') ||
    !config.configurationName.endsWith('.ci')
  ) {
    return launchAppForDebugBuild(platform, launchOptions);
  }

  return launchAppWithRecovery(launchOptions);
}
