/* eslint-disable import-x/no-nodejs-modules */
import { exec, spawn } from 'child_process';
import path from 'path';
import { Platform } from '../../types.ts';
import { createLogger } from '../../logger.ts';

const logger = createLogger({ name: 'EmulatorHelpers' });

const ANDROID_BOOT_TIMEOUT_MS = 3 * 60 * 1000;
const ANDROID_BOOT_POLL_INTERVAL_MS = 2000;

interface AdbDevice {
  serial: string;
  state: string;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseAdbDevices(stdout: string): AdbDevice[] {
  return stdout
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return null;
      }
      const tabIndex = trimmed.indexOf('\t');
      if (tabIndex === -1) {
        return null;
      }
      const serial = trimmed.slice(0, tabIndex);
      const state = trimmed.slice(tabIndex + 1).trim();
      if (!serial.startsWith('emulator-')) {
        return null;
      }
      return { serial, state };
    })
    .filter((device): device is AdbDevice => device !== null);
}

async function listAdbDevices(): Promise<AdbDevice[]> {
  const { stdout } = await execAsync('adb devices');
  return parseAdbDevices(stdout);
}

async function getEmulatorAvdName(serial: string): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync(`adb -s ${serial} emu avd name`);
    return stdout.trim().split('\n')[0]?.trim();
  } catch {
    return undefined;
  }
}

async function findEmulatorSerialForAvd(
  avdName: string,
  states: string[],
): Promise<string | undefined> {
  const devices = await listAdbDevices();
  for (const device of devices) {
    if (!states.includes(device.state)) {
      continue;
    }
    const name = await getEmulatorAvdName(device.serial);
    if (name === avdName) {
      return device.serial;
    }
  }
  return undefined;
}

async function waitForEmulatorBoot(serial: string): Promise<void> {
  await execAsync(`adb -s ${serial} wait-for-device`);

  const deadline = Date.now() + ANDROID_BOOT_TIMEOUT_MS;
  let booted = false;

  while (Date.now() < deadline) {
    const devices = await listAdbDevices();
    const device = devices.find((entry) => entry.serial === serial);
    if (device?.state === 'device') {
      try {
        const { stdout } = await execAsync(
          `adb -s ${serial} shell getprop sys.boot_completed 2>/dev/null`,
        );
        if (stdout.trim() === '1') {
          booted = true;
          break;
        }
      } catch {
        // Device not yet ready — keep polling
      }
    }
    await sleep(ANDROID_BOOT_POLL_INTERVAL_MS);
  }

  if (!booted) {
    throw new Error(
      `Android emulator ${serial} did not complete booting within ${ANDROID_BOOT_TIMEOUT_MS / 1000}s.`,
    );
  }

  await execAsync(`adb -s ${serial} shell input keyevent 82`).catch(() => {
    /* screen may already be unlocked */
  });
}

/**
 * Check if any Android emulator is currently running and fully booted.
 */
export async function isAndroidEmulatorRunning(): Promise<boolean> {
  try {
    const devices = await listAdbDevices();
    return devices.some((device) => device.state === 'device');
  } catch {
    return false;
  }
}

/**
 * Start the Android emulator and wait for it to fully boot.
 * If the requested AVD is already running and booted, this is a no-op.
 * @returns adb serial for the booted emulator (e.g. emulator-5554)
 */
export async function startAndroidEmulator(avdName: string): Promise<string> {
  const bootedSerial = await findEmulatorSerialForAvd(avdName, ['device']);
  if (bootedSerial) {
    logger.info(
      `Android emulator "${avdName}" (${bootedSerial}) is already running — skipping boot.`,
    );
    return bootedSerial;
  }

  const startingSerial = await findEmulatorSerialForAvd(avdName, [
    'offline',
    'authorizing',
  ]);
  if (startingSerial) {
    logger.info(
      `Android emulator "${avdName}" (${startingSerial}) is starting — waiting for boot.`,
    );
    await waitForEmulatorBoot(startingSerial);
    return startingSerial;
  }

  const devices = await listAdbDevices();
  const offlineEmulator = devices.find(
    (device) => device.state === 'offline' || device.state === 'authorizing',
  );
  if (offlineEmulator) {
    const offlineAvdName = await getEmulatorAvdName(offlineEmulator.serial);
    if (!offlineAvdName || offlineAvdName === avdName) {
      logger.info(
        `Waiting for Android emulator ${offlineEmulator.serial} (${offlineAvdName ?? 'unknown AVD'}) to finish booting instead of spawning a duplicate.`,
      );
      await waitForEmulatorBoot(offlineEmulator.serial);
      return offlineEmulator.serial;
    }
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

  // Match Detox CI emulator flags (.detoxrc.js → android.github_ci.emulator) so
  // Appium smoke gets the same RAM/CPU and clean `-wipe-data` boot. The minimal
  // flags we used previously (-no-snapshot-load only) left emulators under-resourced
  // and prone to system app crashes (e.g. Messages ANR) on cold boot.
  const args = ['-avd', avdName];
  if (isCI) {
    args.push(
      '-memory',
      '12288',
      '-cores',
      '8',
      '-gpu',
      'swiftshader_indirect',
      '-no-audio',
      '-no-boot-anim',
      '-partition-size',
      '8192',
      '-no-snapshot-save',
      '-no-snapshot-load',
      '-cache-size',
      '2048',
      '-accel',
      'on',
      '-wipe-data',
      '-no-window',
    );
  } else {
    args.push('-no-snapshot-load');
  }

  const emulatorProcess = spawn(emulatorBin, args, {
    stdio: 'ignore',
    detached: true,
  });
  emulatorProcess.unref();

  logger.info('Waiting for Android emulator to appear in adb...');
  const deadline = Date.now() + ANDROID_BOOT_TIMEOUT_MS;
  let serial: string | undefined;

  while (Date.now() < deadline) {
    serial = await findEmulatorSerialForAvd(avdName, [
      'offline',
      'authorizing',
      'device',
    ]);
    if (serial) {
      break;
    }
    await sleep(ANDROID_BOOT_POLL_INTERVAL_MS);
  }

  if (!serial) {
    throw new Error(
      `Android emulator for AVD "${avdName}" did not appear in adb within ${ANDROID_BOOT_TIMEOUT_MS / 1000}s.`,
    );
  }

  await waitForEmulatorBoot(serial);
  logger.info(`Android emulator "${avdName}" is booted and ready (${serial}).`);
  return serial;
}

/**
 * Stop the running Android emulator gracefully.
 */
export async function stopAndroidEmulator(serial?: string): Promise<void> {
  logger.info('Stopping Android emulator...');
  try {
    if (serial) {
      await execAsync(`adb -s ${serial} emu kill`);
    } else {
      await execAsync('adb emu kill');
    }
    logger.info('Android emulator stopped.');
  } catch (error) {
    logger.warn(`Could not stop Android emulator: ${error}`);
  }
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
      resolve(true);
    }
  });
}

/**
 * Per-process cache: deviceName → resolved UDID.
 */
const iosSimulatorUdidCache = new Map<string, string>();

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
        return d.udid;
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

export async function startIosSimulator(deviceName: string): Promise<string> {
  const udid = await getIosSimulatorUdid(deviceName);

  if (await isIosSimulatorBooted(udid)) {
    logger.info(
      `iOS simulator "${deviceName}" (${udid}) is already booted — skipping boot.`,
    );
    return udid;
  }

  logger.info(`Booting iOS simulator: ${deviceName} (${udid})`);

  await execAsync(`xcrun simctl boot "${udid}"`).catch(
    (err: { code?: number }) => {
      if (err.code !== 149) {
        throw err;
      }
    },
  );

  await execAsync(`xcrun simctl bootstatus "${udid}" -b`);

  logger.info(`iOS simulator "${deviceName}" is booted and ready.`);
  return udid;
}

export async function stopIosSimulator(udid: string): Promise<void> {
  logger.info(`Shutting down iOS simulator: ${udid}`);
  try {
    await execAsync(`xcrun simctl shutdown "${udid}"`);
    logger.info(`iOS simulator ${udid} shut down.`);
  } catch (error) {
    logger.warn(`Could not stop iOS simulator: ${error}`);
  }
}
