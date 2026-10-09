#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
import { execFile } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * @typedef {(file: string, args: readonly string[]) => Promise<{ stdout: string, stderr: string }>} ExecFileImpl
 */

/**
 * @param {ExecFileImpl | undefined} execFileImpl
 * @returns {ExecFileImpl}
 */
function resolveExecFileImpl(execFileImpl) {
  return execFileImpl ?? execFileAsync;
}

const DEFAULT_IOS_POST_BOOT_SETTLE_MS = 15_000;
const DEFAULT_IOS_APP_WARM_LAUNCH_SETTLE_MS = 15_000;

/**
 * @param {string | undefined} rawValue
 * @returns {number}
 */
export function parseIosDevicePoolSize(rawValue) {
  const trimmed = rawValue?.trim() ?? '';
  if (!trimmed) {
    return 1;
  }

  if (!/^\d+$/u.test(trimmed)) {
    throw new Error('IOS_DEVICE_POOL_SIZE must be a positive integer.');
  }

  const poolSize = Number(trimmed);
  if (!Number.isInteger(poolSize) || poolSize < 1) {
    throw new Error('IOS_DEVICE_POOL_SIZE must be a positive integer.');
  }

  return poolSize;
}

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
 * Name a cloned CoreSimulator device for a worker slot.
 * Mirrors `iosPoolSimulatorName` in iosDevicePool.ts (Task 1).
 *
 * @param {string} baseName
 * @param {number} workerIndex
 * @returns {string}
 */
export function iosPoolSimulatorName(baseName, workerIndex) {
  return `${baseName} Appium Pool ${workerIndex}`;
}

/**
 * @param {string} deviceName
 * @param {ExecFileImpl} [execFileImpl]
 * @returns {Promise<string>}
 */
export async function getIosSimulatorUdid(deviceName, execFileImpl) {
  const exec = resolveExecFileImpl(execFileImpl);
  const { stdout } = await exec('xcrun', [
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
 * @param {string} deviceName
 * @param {ExecFileImpl} [execFileImpl]
 * @returns {Promise<{ udid: string; state: string } | undefined>}
 */
async function findIosSimulatorByName(deviceName, execFileImpl) {
  const exec = resolveExecFileImpl(execFileImpl);
  const { stdout } = await exec('xcrun', [
    'simctl',
    'list',
    'devices',
    'available',
    '-j',
  ]);
  const list = JSON.parse(stdout);

  for (const devices of Object.values(list.devices)) {
    for (const device of devices) {
      if (device.name === deviceName) {
        return { udid: device.udid, state: device.state };
      }
    }
  }

  return undefined;
}

/**
 * @param {string} udid
 * @param {ExecFileImpl} [execFileImpl]
 * @returns {Promise<boolean>}
 */
export async function isIosSimulatorBooted(udid, execFileImpl) {
  const exec = resolveExecFileImpl(execFileImpl);
  let stdout;
  try {
    ({ stdout } = await exec('xcrun', [
      'simctl',
      'list',
      'devices',
      'available',
      '-j',
    ]));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `Failed to check boot state for iOS simulator ${udid}: ${message}`,
    );
    throw error;
  }

  let list;
  try {
    list = JSON.parse(stdout);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `Failed to parse simctl device list while checking ${udid}: ${message}`,
    );
    throw error;
  }

  for (const devices of Object.values(list.devices)) {
    const sim = devices.find((d) => d.udid === udid);
    if (sim) {
      return sim.state === 'Booted';
    }
  }
  return false;
}

/**
 * @param {string} udid
 * @param {ExecFileImpl} [execFileImpl]
 * @returns {Promise<string>} UDID of the booted simulator
 */
export async function bootIosSimulatorByUdid(udid, execFileImpl) {
  const exec = resolveExecFileImpl(execFileImpl);

  if (await isIosSimulatorBooted(udid, exec)) {
    return udid;
  }

  await exec('xcrun', ['simctl', 'boot', udid]).catch((err) => {
    if (err.code !== 149) {
      throw err;
    }
  });

  await exec('xcrun', ['simctl', 'bootstatus', udid, '-b']);
  await waitForIosSimulatorPostBootSettle();
  return udid;
}

/**
 * @param {string} udid
 * @param {ExecFileImpl} [execFileImpl]
 * @returns {Promise<void>}
 */
export async function shutdownIosSimulator(udid, execFileImpl) {
  const exec = resolveExecFileImpl(execFileImpl);
  await exec('xcrun', ['simctl', 'shutdown', udid]);
}

/**
 * Delete a simulator matched by device name. No-ops when absent. Shuts down a
 * booted match before delete so stale pool clones cannot block recreation.
 * Failures after a match is found are logged and rethrown (fail closed).
 *
 * @param {string} name
 * @param {ExecFileImpl} [execFileImpl]
 * @returns {Promise<void>}
 */
export async function deleteIosSimulatorByName(name, execFileImpl) {
  const exec = resolveExecFileImpl(execFileImpl);

  let match;
  try {
    match = await findIosSimulatorByName(name, exec);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `Failed to look up iOS simulator "${name}" before delete: ${message}`,
    );
    throw error;
  }

  if (!match) {
    return;
  }

  if (match.state === 'Booted') {
    try {
      await shutdownIosSimulator(match.udid, exec);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `Failed to shut down iOS simulator "${name}" (${match.udid}) before delete: ${message}`,
      );
      throw error;
    }
  }

  try {
    await exec('xcrun', ['simctl', 'delete', match.udid]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `Failed to delete iOS simulator "${name}" (${match.udid}): ${message}`,
    );
    throw error;
  }
}

/**
 * @param {string} sourceUdid
 * @param {string} cloneName
 * @param {ExecFileImpl} [execFileImpl]
 * @returns {Promise<string>} new clone UDID
 */
export async function cloneIosSimulator(sourceUdid, cloneName, execFileImpl) {
  const exec = resolveExecFileImpl(execFileImpl);
  const { stdout } = await exec('xcrun', [
    'simctl',
    'clone',
    sourceUdid,
    cloneName,
  ]);
  return stdout.trim();
}

/**
 * @param {{ baseName: string; poolSize: number }} options
 * @param {ExecFileImpl} [execFileImpl]
 * @returns {Promise<string[]>}
 */
export async function prepareIosSimulatorPool(
  { baseName, poolSize },
  execFileImpl,
) {
  if (!Number.isInteger(poolSize) || poolSize < 1) {
    throw new Error(
      `Invalid poolSize ${poolSize}. Expected a positive integer.`,
    );
  }

  const exec = resolveExecFileImpl(execFileImpl);

  if (poolSize === 1) {
    const udid = await getIosSimulatorUdid(baseName, exec);
    await bootIosSimulatorByUdid(udid, exec);
    return [udid];
  }

  const baseUdid = await getIosSimulatorUdid(baseName, exec);

  if (await isIosSimulatorBooted(baseUdid, exec)) {
    await shutdownIosSimulator(baseUdid, exec);
  }

  for (let workerIndex = 0; workerIndex < poolSize; workerIndex += 1) {
    await deleteIosSimulatorByName(
      iosPoolSimulatorName(baseName, workerIndex),
      exec,
    );
  }

  const cloneUdids = [];
  for (let workerIndex = 0; workerIndex < poolSize; workerIndex += 1) {
    const cloneName = iosPoolSimulatorName(baseName, workerIndex);
    cloneUdids.push(await cloneIosSimulator(baseUdid, cloneName, exec));
  }

  // Await every boot (allSettled) so a single rejection cannot orphan siblings.
  const bootResults = await Promise.allSettled(
    cloneUdids.map((udid) => bootIosSimulatorByUdid(udid, exec)),
  );
  const bootFailures = bootResults.filter(
    (result) => result.status === 'rejected',
  );
  if (bootFailures.length > 0) {
    const messages = bootFailures.map((result) =>
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason),
    );
    throw new Error(
      `Failed to boot ${bootFailures.length}/${cloneUdids.length} iOS pool simulator(s): ${messages.join('; ')}`,
    );
  }

  return cloneUdids;
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
  await bootIosSimulatorByUdid(udid);
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
