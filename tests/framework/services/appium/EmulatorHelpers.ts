/* eslint-disable import-x/no-nodejs-modules */
import { exec, spawn } from 'child_process';
import path from 'path';
import { Platform } from '../../types.ts';
import { createLogger } from '../../logger.ts';

const logger = createLogger({ name: 'EmulatorHelpers' });

const ANDROID_BOOT_TIMEOUT_MS = 3 * 60 * 1000;
const ANDROID_BOOT_POLL_INTERVAL_MS = 2000;

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

/**
 * Check if emulator is installed for the given platform
 * Not in use for now
 */
export function isEmulatorInstalled(platform: Platform): Promise<boolean> {
  return new Promise((resolve) => {
    if (platform === Platform.ANDROID) {
      const androidHome = process.env.ANDROID_HOME;
      if (!androidHome) {
        throw new Error(
          'ANDROID_HOME is not set. Please set the ANDROID_HOME environment variable.',
        );
      }

      const emulatorPath = path.join(androidHome, 'emulator', 'emulator');
      exec(`${emulatorPath} -list-avds`, (error, stdout, stderr) => {
        if (error) {
          throw new Error(
            `Error fetching emulator list.\nPlease make sure to follow the steps in the Android emulator section of the environment setup guide: https://github.com/MetaMask/metamask-mobile/blob/main/docs/readme/environment.md#android`,
          );
        }
        if (stderr) {
          logger.error(`Emulator: ${stderr}`);
        }

        const lines = stdout.trim().split('\n');
        const deviceNames = lines.filter(
          (line) =>
            line.trim() && !line.startsWith('INFO') && !line.includes('/tmp/'),
        );

        if (deviceNames.length > 0) {
          resolve(true);
        } else {
          throw new Error(
            'No installed emulators found. Please make sure create an emulator with the specs mentioned at https://github.com/MetaMask/metamask-mobile/blob/main/docs/readme/e2e-testing.md#tooling-setup',
          );
        }
      });
    } else {
      // iOS simulators - to be implemented
      resolve(true);
    }
  });
}

/**
 * Check if any Android emulator is currently running and fully booted.
 */
export async function isAndroidEmulatorRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('adb devices');
    // Each running device appears as "emulator-XXXX\tdevice" (state = "device" means booted)
    const lines = stdout.trim().split('\n').slice(1); // skip "List of devices attached" header
    return lines.some(
      (line) => line.startsWith('emulator-') && line.includes('\tdevice'),
    );
  } catch {
    return false;
  }
}

/**
 * Start the Android emulator and wait for it to fully boot.
 * If an emulator is already running and booted, this is a no-op.
 */
export async function startAndroidEmulator(avdName: string): Promise<void> {
  if (await isAndroidEmulatorRunning()) {
    logger.info('Android emulator is already running — skipping boot.');
    return;
  }

  const androidHome = process.env.ANDROID_HOME;
  if (!androidHome) {
    throw new Error(
      'ANDROID_HOME is not set. Please set the ANDROID_HOME environment variable.',
    );
  }

  const emulatorBin = path.join(androidHome, 'emulator', 'emulator');
  const isCI = process.env.CI === 'true';

  logger.info(`Starting Android emulator: ${avdName}`);

  const args = ['-avd', avdName, '-no-snapshot-load'];
  if (isCI) {
    // Headless flags for CI runners
    args.push('-no-window', '-no-audio', '-gpu', 'swiftshader_indirect');
  }

  // Detach so the emulator outlives the spawning process
  const emulatorProcess = spawn(emulatorBin, args, {
    stdio: 'ignore',
    detached: true,
  });
  emulatorProcess.unref();

  logger.info('Waiting for Android emulator to appear in adb...');
  await execAsync('adb wait-for-device');

  logger.info('Waiting for Android emulator to complete boot sequence...');
  const deadline = Date.now() + ANDROID_BOOT_TIMEOUT_MS;
  let booted = false;

  while (Date.now() < deadline) {
    try {
      const { stdout } = await execAsync(
        'adb shell getprop sys.boot_completed 2>/dev/null',
      );
      if (stdout.trim() === '1') {
        booted = true;
        break;
      }
    } catch {
      // Device not yet ready — keep polling
    }
    await new Promise((r) => setTimeout(r, ANDROID_BOOT_POLL_INTERVAL_MS));
  }

  if (!booted) {
    throw new Error(
      `Android emulator did not complete booting within ${ANDROID_BOOT_TIMEOUT_MS / 1000}s.`,
    );
  }

  // Unlock the screen so the app is visible
  await execAsync('adb shell input keyevent 82').catch((_err) => {
    /* screen may already be unlocked */
  });
  logger.info('Android emulator is booted and ready.');
}

/**
 * Stop the running Android emulator gracefully.
 */
export async function stopAndroidEmulator(): Promise<void> {
  logger.info('Stopping Android emulator...');
  try {
    await execAsync('adb emu kill');
    logger.info('Android emulator stopped.');
  } catch (error) {
    logger.warn(`Could not stop Android emulator: ${error}`);
  }
}

/**
 * Per-process cache: deviceName → resolved UDID.
 * The simulator UDID is stable for the lifetime of a test run so caching once
 * is safe and avoids repeated `xcrun simctl list` shell-outs per test.
 */
const iosSimulatorUdidCache = new Map<string, string>();

/**
 * Get the UDID of an available iOS simulator by display name.
 *
 * Multiple simulators can share the same display name across different iOS
 * runtime versions. To target the right one:
 * 1. If one is already Booted, return its UDID (it's the active device).
 * 2. Otherwise return the first available match.
 *
 * Result is cached per process so repeated calls within a test run are free.
 * Throws if no simulator with the given name is found at all.
 */
export async function getIosSimulatorUdid(deviceName: string): Promise<string> {
  const cached = iosSimulatorUdidCache.get(deviceName);
  if (cached) {
    return cached;
  }

  const { stdout } = await execAsync('xcrun simctl list devices available -j');
  const list = JSON.parse(stdout) as {
    devices: Record<string, { name: string; udid: string; state: string }[]>;
  };

  let firstMatch: string | undefined;

  for (const devices of Object.values(list.devices)) {
    for (const d of devices) {
      if (d.name !== deviceName) continue;
      if (d.state === 'Booted') {
        iosSimulatorUdidCache.set(deviceName, d.udid);
        return d.udid; // prefer the already-booted one
      }
      firstMatch ??= d.udid;
    }
  }

  if (firstMatch) {
    iosSimulatorUdidCache.set(deviceName, firstMatch);
    return firstMatch;
  }

  throw new Error(
    `iOS simulator "${deviceName}" not found in available devices. ` +
      'Run `xcrun simctl list devices available` to see available simulators.',
  );
}

/**
 * Check if an iOS simulator is already in the Booted state.
 */
export async function isIosSimulatorBooted(udid: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync('xcrun simctl list devices -j');
    const list = JSON.parse(stdout) as {
      devices: Record<string, { udid: string; state: string }[]>;
    };
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
 * Boot an iOS simulator and wait for it to be fully ready.
 * If the simulator is already booted, this is a no-op.
 * @returns The UDID of the booted simulator.
 */
export async function startIosSimulator(deviceName: string): Promise<string> {
  const udid = await getIosSimulatorUdid(deviceName);

  if (await isIosSimulatorBooted(udid)) {
    logger.info(
      `iOS simulator "${deviceName}" (${udid}) is already booted — skipping boot.`,
    );
    return udid;
  }

  logger.info(`Booting iOS simulator: ${deviceName} (${udid})`);

  // xcrun simctl boot exits with code 149 if already booted — treat that as success
  await execAsync(`xcrun simctl boot "${udid}"`).catch(
    (err: NodeJS.ErrnoException) => {
      if (err.code !== 149) {
        throw err;
      }
    },
  );

  // bootstatus -b blocks until the simulator is fully booted
  await execAsync(`xcrun simctl bootstatus "${udid}" -b`);

  logger.info(`iOS simulator "${deviceName}" is booted and ready.`);
  return udid;
}

/**
 * Shut down an iOS simulator by UDID.
 */
export async function stopIosSimulator(udid: string): Promise<void> {
  logger.info(`Shutting down iOS simulator: ${udid}`);
  try {
    await execAsync(`xcrun simctl shutdown "${udid}"`);
    logger.info(`iOS simulator ${udid} shut down.`);
  } catch (error) {
    logger.warn(`Could not stop iOS simulator: ${error}`);
  }
}
