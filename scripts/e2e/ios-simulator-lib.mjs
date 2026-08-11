#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
import { execFile } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_IOS_POST_BOOT_SETTLE_MS = 15_000;
const DEFAULT_IOS_APP_WARM_LAUNCH_SETTLE_MS = 15_000;

/**
 * @param {string} name
 * @param {number} fallback
 * @returns {number}
 */
export function parsePositiveIntEnv(name, fallback) {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Brief pause after `bootstatus -b` so SpringBoard/RN bridge can settle (mirrors
 * Android `ANDROID_EMULATOR_POST_BOOT_SETTLE_MS`).
 */
export async function waitForIosSimulatorPostBootSettle() {
  const settleMs = parsePositiveIntEnv(
    'IOS_SIMULATOR_POST_BOOT_SETTLE_MS',
    DEFAULT_IOS_POST_BOOT_SETTLE_MS,
  );
  if (settleMs <= 0) {
    return;
  }
  console.log(
    `Waiting ${settleMs}ms for iOS simulator post-boot settle (SpringBoard / system UI)…`,
  );
  await sleep(settleMs);
}

/**
 * Pre-grant common permissions so system sheets are less likely to cover the wallet.
 * Best-effort — unsupported services are ignored.
 *
 * @param {{ udid: string; bundleId: string }} options
 */
export async function grantIosAppPermissions({ udid, bundleId }) {
  const services = ['notifications', 'photos', 'camera', 'microphone'];
  for (const service of services) {
    try {
      await execFileAsync('xcrun', [
        'simctl',
        'privacy',
        udid,
        'grant',
        service,
        bundleId,
      ]);
      console.log(`Granted iOS simulator ${service} permission to ${bundleId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `Could not grant ${service} to ${bundleId} (continuing): ${message}`,
      );
    }
  }
}

/**
 * Cold-launches the app once so the first Playwright fixture pays less startup cost.
 *
 * @param {{ udid: string; bundleId: string }} options
 */
export async function warmLaunchIosApp({ udid, bundleId }) {
  const settleMs = parsePositiveIntEnv(
    'IOS_APP_WARM_LAUNCH_SETTLE_MS',
    DEFAULT_IOS_APP_WARM_LAUNCH_SETTLE_MS,
  );
  if (settleMs <= 0) {
    return;
  }

  console.log(`Warm-launching ${bundleId} on simulator ${udid}…`);
  await execFileAsync('xcrun', ['simctl', 'launch', udid, bundleId]);
  console.log(
    `Warm launch started — waiting ${settleMs}ms before terminate (JS bridge / first frame)…`,
  );
  await sleep(settleMs);
  try {
    await execFileAsync('xcrun', ['simctl', 'terminate', udid, bundleId]);
  } catch {
    // App may already have exited.
  }
  console.log('iOS app warm launch complete.');
}

/**
 * @param {string} deviceName
 * @returns {Promise<string>}
 */
export async function getIosSimulatorUdid(deviceName) {
  const { stdout } = await execFileAsync('xcrun', [
    'simctl',
    'list',
    'devices',
    'available',
    '-j',
  ]);
  const list = JSON.parse(stdout);

  let firstMatch;

  for (const devices of Object.values(list.devices)) {
    for (const device of devices) {
      if (device.name !== deviceName) {
        continue;
      }
      if (device.state === 'Booted') {
        return device.udid;
      }
      firstMatch ??= device.udid;
    }
  }

  if (firstMatch) {
    return firstMatch;
  }

  throw new Error(
    `iOS simulator "${deviceName}" not found. Run \`xcrun simctl list devices available\`.`,
  );
}

/**
 * @param {string} udid
 * @returns {Promise<boolean>}
 */
async function isIosSimulatorBooted(udid) {
  try {
    const { stdout } = await execFileAsync('xcrun', [
      'simctl',
      'list',
      'devices',
      'available',
      '-j',
    ]);
    const list = JSON.parse(stdout);
    for (const devices of Object.values(list.devices)) {
      const sim = devices.find((d) => d.udid === udid);
      if (sim) {
        return sim.state === 'Booted';
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * @param {string} deviceName
 * @returns {Promise<string>} UDID of the booted simulator
 */
export async function bootIosSimulator(deviceName) {
  const udid = await getIosSimulatorUdid(deviceName);

  if (await isIosSimulatorBooted(udid)) {
    console.log(
      `iOS simulator "${deviceName}" (${udid}) is already booted — skipping boot.`,
    );
    return udid;
  }

  console.log(`Booting iOS simulator: ${deviceName} (${udid})`);

  await execFileAsync('xcrun', ['simctl', 'boot', udid]).catch(
    (err) => {
      if (err.code !== 149) {
        throw err;
      }
    },
  );

  await execFileAsync('xcrun', ['simctl', 'bootstatus', udid, '-b']);
  await waitForIosSimulatorPostBootSettle();
  console.log(`iOS simulator "${deviceName}" is booted and ready.`);
  return udid;
}

/**
 * Blocks until simctl reports the simulator fully booted (SpringBoard ready).
 * Call before Appium session creation so XCUITest does not race sim boot.
 * @param {string} udid
 */
export async function ensureIosSimulatorBooted(udid) {
  await execFileAsync('xcrun', ['simctl', 'bootstatus', udid, '-b']);
}

/**
 * @param {string} udid
 * @param {string} bundleId
 * @returns {Promise<boolean>}
 */
export async function isIosAppInstalled(udid, bundleId) {
  try {
    await execFileAsync('xcrun', ['simctl', 'get_app_container', udid, bundleId]);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} udid
 * @param {string} bundleId
 */
export async function assertIosAppInstalled(udid, bundleId) {
  if (!(await isIosAppInstalled(udid, bundleId))) {
    throw new Error(
      `App "${bundleId}" is not installed on simulator ${udid} after simctl install.`,
    );
  }
  console.log(`Verified ${bundleId} is installed on simulator ${udid}.`);
}

/**
 * @param {{ udid: string; bundleId: string; appPath: string }} options
 */
export async function installIosApp({ udid, bundleId, appPath }) {
  try {
    await execFileAsync('xcrun', ['simctl', 'uninstall', udid, bundleId]);
  } catch {
    // App may not be installed yet.
  }

  console.log(`simctl install: ${appPath} → simulator ${udid}`);
  await execFileAsync('xcrun', ['simctl', 'install', udid, appPath]);
  await assertIosAppInstalled(udid, bundleId);
}
