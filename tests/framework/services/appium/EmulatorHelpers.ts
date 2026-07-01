/* eslint-disable import-x/no-nodejs-modules */
import { exec, spawn } from 'child_process';
import path from 'path';
import { Platform } from '../../types.ts';
import { createLogger } from '../../logger.ts';

const logger = createLogger({ name: 'EmulatorHelpers' });

const DEFAULT_ANDROID_BOOT_TIMEOUT_MS = 3 * 60 * 1000;
const ANDROID_BOOT_POLL_INTERVAL_MS = 2000;
const ANDROID_CI_INITIAL_SETTLE_MS = 30_000;
const ANDROID_ANR_DISMISS_INTERVAL_MS = 3000;
const ANDROID_ANR_CLEAR_STREAK_REQUIRED = 3;
const ANDROID_ANR_STABILIZE_TIMEOUT_MS = 90_000;
const ANDROID_NETWORK_READY_POLL_MS = 2_000;
const ANDROID_NETWORK_READY_CONSECUTIVE_PINGS = 3;
const ANDROID_NETWORK_READY_TIMEOUT_MS = 60_000;
const ANDROID_EMULATOR_CI_CORES_DEFAULT = '8';
const ANDROID_EMULATOR_CI_DNS_SERVER = '8.8.8.8';
const DEFAULT_IOS_POST_BOOT_SETTLE_MS = 15_000;
const UI_AUTOMATOR_DUMP_PATH = '/sdcard/window_dump.xml';

/** Play Store / GMS packages disabled after cold boot — not needed for Appium E2E. */
export const ANDROID_E2E_PACKAGES_TO_DISABLE = [
  'com.android.vending',
  'com.google.android.gms',
  'com.google.android.gsf',
  'com.google.android.partnersetup',
  'com.google.android.setupwizard',
  'com.google.android.apps.restore',
  'com.google.android.apps.wellbeing',
] as const;

/** Launcher packages force-stopped so ANR dialogs do not cover the test app. */
export const ANDROID_E2E_LAUNCHER_PACKAGES = [
  'com.google.android.apps.nexuslauncher',
  'com.android.launcher3',
] as const;

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

function resolveAndroidBootTimeoutMs(): number {
  const raw = process.env.ANDROID_BOOT_TIMEOUT_MS?.trim();
  if (!raw) {
    return DEFAULT_ANDROID_BOOT_TIMEOUT_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_ANDROID_BOOT_TIMEOUT_MS;
  }
  return parsed;
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
    const name = stdout.trim().split('\n')[0]?.trim();
    if (name) {
      return name;
    }
  } catch {
    // fall through to getprop fallback
  }
  // Fallback: on some macOS setups `adb emu avd name` returns empty because the
  // emulator console socket is not accessible via ADB. The boot property
  // `ro.boot.qemu.avd_name` contains the same value and is always readable.
  try {
    const { stdout } = await execAsync(
      `adb -s ${serial} shell getprop ro.boot.qemu.avd_name`,
    );
    return stdout.trim() || undefined;
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

/**
 * Only reuse an offline/authorizing emulator when its AVD name is known and matches.
 * If `adb emu avd name` fails, do not attach — another host's emulator may be starting.
 */
export function shouldWaitForOfflineEmulator(
  requestedAvdName: string,
  resolvedAvdName: string | undefined,
): boolean {
  return resolvedAvdName === requestedAvdName;
}

/**
 * During cold boot `adb emu avd name` can fail while the device is still offline.
 * Wait on a lone starting emulator instead of spawning a duplicate (CI uses `-read-only`).
 */
export function shouldWaitForUnidentifiedOfflineEmulator(options: {
  isCI: boolean;
  offlineOrAuthorizingCount: number;
}): boolean {
  return options.isCI && options.offlineOrAuthorizingCount === 1;
}

interface TapPoint {
  x: number;
  y: number;
}

function parseUiNodeCenter(bounds: string): TapPoint | undefined {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) {
    return undefined;
  }
  const left = Number.parseInt(match[1], 10);
  const top = Number.parseInt(match[2], 10);
  const right = Number.parseInt(match[3], 10);
  const bottom = Number.parseInt(match[4], 10);
  return {
    x: Math.floor((left + right) / 2),
    y: Math.floor((top + bottom) / 2),
  };
}

/**
 * Finds the tap target for an Android "app isn't responding" dialog.
 * Prefers "Wait" over "Close app" so the launcher can recover.
 */
export function findAnrDialogWaitTapPoint(
  uiDump: string,
): TapPoint | undefined {
  return findAnrDialogRecoveryTapPoint(uiDump, { preferCloseApp: false });
}

/**
 * Finds an ANR recovery tap target. Prefers "Close app" for launcher ANRs
 * (Pixel/Nexus Launcher) since we launch MetaMask directly and do not need HOME.
 */
export function findAnrDialogRecoveryTapPoint(
  uiDump: string,
  options?: { preferCloseApp?: boolean },
): TapPoint | undefined {
  if (!/isn.t responding/i.test(uiDump)) {
    return undefined;
  }

  const preferCloseApp =
    options?.preferCloseApp ??
    /Pixel Launcher|Nexus Launcher|launcher/i.test(uiDump);

  const waitNode = uiDump.match(
    /text="Wait"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/,
  );
  const closeNode = uiDump.match(
    /text="Close app"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/,
  );

  if (preferCloseApp) {
    if (closeNode) {
      return parseUiNodeCenter(closeNode[1]);
    }
    if (waitNode) {
      return parseUiNodeCenter(waitNode[1]);
    }
    return undefined;
  }

  if (waitNode) {
    return parseUiNodeCenter(waitNode[1]);
  }
  if (closeNode) {
    return parseUiNodeCenter(closeNode[1]);
  }

  return undefined;
}

async function dumpUiHierarchy(serial: string): Promise<string> {
  await execAsync(
    `adb -s ${serial} shell uiautomator dump ${UI_AUTOMATOR_DUMP_PATH}`,
  ).catch(() => undefined);
  const { stdout } = await execAsync(
    `adb -s ${serial} shell cat ${UI_AUTOMATOR_DUMP_PATH}`,
  ).catch(() => ({ stdout: '', stderr: '' }));
  return stdout;
}

async function disableAndroidAnimations(serial: string): Promise<void> {
  const settings = [
    'settings put global window_animation_scale 0',
    'settings put global transition_animation_scale 0',
    'settings put global animator_duration_scale 0',
  ];
  for (const command of settings) {
    await execAsync(`adb -s ${serial} shell ${command}`).catch(() => undefined);
  }
}

async function runAdbShell(serial: string, command: string): Promise<void> {
  await execAsync(`adb -s ${serial} shell ${command}`).catch(() => undefined);
}

async function trimAndroidSystemForE2e(serial: string): Promise<void> {
  logger.info(
    'Trimming Android system for E2E (skip setup wizard, disable bloat packages)...',
  );

  const setupWizardSettings = [
    'settings put global device_provisioned 1',
    'settings put secure user_setup_complete 1',
    'settings put global setup_wizard_has_run 1',
  ];
  for (const command of setupWizardSettings) {
    await runAdbShell(serial, command);
  }

  for (const packageName of ANDROID_E2E_PACKAGES_TO_DISABLE) {
    await runAdbShell(serial, `pm disable-user --user 0 ${packageName}`);
  }

  for (const packageName of ANDROID_E2E_LAUNCHER_PACKAGES) {
    await runAdbShell(serial, `am force-stop ${packageName}`);
  }
}

async function dismissAndroidAnrDialogs(serial: string): Promise<boolean> {
  const uiDump = await dumpUiHierarchy(serial);
  const tapPoint = findAnrDialogRecoveryTapPoint(uiDump);
  if (!tapPoint) {
    return false;
  }

  logger.warn(
    `Android system ANR dialog detected on ${serial} — tapping recovery action.`,
  );
  await execAsync(
    `adb -s ${serial} shell input tap ${tapPoint.x} ${tapPoint.y}`,
  );
  return true;
}

/**
 * Poll until ANR dialogs are absent for several consecutive checks, dismissing
 * any that appear. Falls through after timeout so boot does not hang forever.
 */
async function waitForAndroidSystemReady(serial: string): Promise<void> {
  const initialSettleMs = Number.parseInt(
    process.env.ANDROID_EMULATOR_POST_BOOT_SETTLE_MS ??
      String(ANDROID_CI_INITIAL_SETTLE_MS),
    10,
  );
  if (initialSettleMs > 0) {
    logger.info(
      `Waiting ${initialSettleMs / 1000}s before checking Android system readiness...`,
    );
    await sleep(initialSettleMs);
  }

  const deadline = Date.now() + ANDROID_ANR_STABILIZE_TIMEOUT_MS;
  let clearStreak = 0;

  while (Date.now() < deadline) {
    const hadAnr = await dismissAndroidAnrDialogs(serial);
    if (hadAnr) {
      clearStreak = 0;
    } else {
      clearStreak += 1;
      if (clearStreak >= ANDROID_ANR_CLEAR_STREAK_REQUIRED) {
        logger.info(
          `Android system stable (${clearStreak} consecutive ANR-free checks).`,
        );
        return;
      }
    }
    await sleep(ANDROID_ANR_DISMISS_INTERVAL_MS);
  }

  logger.warn(
    `Android system did not stabilize within ${ANDROID_ANR_STABILIZE_TIMEOUT_MS / 1000}s — continuing.`,
  );
}

/** True when `adb shell ping -c 1` output indicates a successful reply. */
export function isAndroidPingSuccessful(stdout: string): boolean {
  if (/100% packet loss|0 received/i.test(stdout)) {
    return false;
  }
  return /1 received|1 packets transmitted, 1 received|0% packet loss/i.test(
    stdout,
  );
}

async function ensureAndroidNetworkEnabled(serial: string): Promise<void> {
  await runAdbShell(serial, 'svc wifi enable');
  await runAdbShell(serial, 'svc data enable');
  await runAdbShell(serial, 'settings put global airplane_mode_on 0');
}

/**
 * Waits until the emulator has stable outbound network before E2E tests start.
 * Reduces NetInfo false-offline flips during cold boot on CI.
 */
async function waitForAndroidNetworkReady(serial: string): Promise<void> {
  if (process.env.CI !== 'true') {
    return;
  }

  const timeoutMs = Number.parseInt(
    process.env.ANDROID_EMULATOR_NETWORK_READY_TIMEOUT_MS ??
      String(ANDROID_NETWORK_READY_TIMEOUT_MS),
    10,
  );
  const requiredSuccesses = Number.parseInt(
    process.env.ANDROID_EMULATOR_NETWORK_READY_CONSECUTIVE_PINGS ??
      String(ANDROID_NETWORK_READY_CONSECUTIVE_PINGS),
    10,
  );

  logger.info(
    `Waiting for Android emulator network (${requiredSuccesses} consecutive pings)...`,
  );
  await ensureAndroidNetworkEnabled(serial);

  const deadline = Date.now() + timeoutMs;
  let consecutiveSuccesses = 0;

  while (Date.now() < deadline) {
    try {
      const { stdout } = await execAsync(
        `adb -s ${serial} shell ping -c 1 -W 3 ${ANDROID_EMULATOR_CI_DNS_SERVER}`,
      );
      if (isAndroidPingSuccessful(stdout)) {
        consecutiveSuccesses += 1;
        if (consecutiveSuccesses >= requiredSuccesses) {
          logger.info(
            `Android emulator network ready (${consecutiveSuccesses} consecutive pings to ${ANDROID_EMULATOR_CI_DNS_SERVER}).`,
          );
          return;
        }
      } else {
        consecutiveSuccesses = 0;
      }
    } catch {
      consecutiveSuccesses = 0;
    }
    await sleep(ANDROID_NETWORK_READY_POLL_MS);
  }

  logger.warn(
    `Android emulator network not stable within ${timeoutMs / 1000}s — continuing.`,
  );
}

/**
 * After cold `-wipe-data` boot, system apps can ANR while indexing.
 * Trim bloat, wait for ANR-free window, then force-stop the launcher.
 */
async function stabilizeAndroidEmulatorAfterBoot(
  serial: string,
): Promise<void> {
  if (process.env.CI !== 'true') {
    return;
  }

  logger.info('Stabilizing Android emulator after cold boot...');
  await disableAndroidAnimations(serial);
  await trimAndroidSystemForE2e(serial);
  await execAsync(`adb -s ${serial} shell input keyevent 3`).catch(() => {
    /* HOME — surface any remaining system dialogs */
  });

  await waitForAndroidSystemReady(serial);

  for (const packageName of ANDROID_E2E_LAUNCHER_PACKAGES) {
    await runAdbShell(serial, `am force-stop ${packageName}`);
  }
}

async function waitForEmulatorBoot(serial: string): Promise<void> {
  await execAsync(`adb -s ${serial} wait-for-device`);

  const bootTimeoutMs = resolveAndroidBootTimeoutMs();
  const deadline = Date.now() + bootTimeoutMs;
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
      `Android emulator ${serial} did not complete booting within ${bootTimeoutMs / 1000}s.`,
    );
  }

  await execAsync(`adb -s ${serial} shell input keyevent 82`).catch(() => {
    /* screen may already be unlocked */
  });

  await stabilizeAndroidEmulatorAfterBoot(serial);
  await waitForAndroidNetworkReady(serial);
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
 * Ensures an Android emulator is booted before Appium session creation.
 * Prefers `preferredSerial` or `ANDROID_DEVICE_UDID` so tests attach to a
 * specific adb serial instead of whichever emulator matches the AVD name.
 */
async function killAndroidEmulatorsForAvd(avdName: string): Promise<void> {
  const devices = await listAdbDevices();
  for (const device of devices) {
    if (!device.serial.startsWith('emulator-')) {
      continue;
    }
    let resolvedAvdName: string | undefined;
    try {
      resolvedAvdName = await getEmulatorAvdName(device.serial);
    } catch {
      resolvedAvdName = undefined;
    }
    if (resolvedAvdName && resolvedAvdName !== avdName) {
      continue;
    }
    logger.warn(
      `Stopping Android emulator ${device.serial}${resolvedAvdName ? ` (${resolvedAvdName})` : ''} before restarting "${avdName}".`,
    );
    await execAsync(`adb -s ${device.serial} emu kill`).catch(() => undefined);
  }
  await sleep(2000);
}

export async function ensureAndroidEmulatorReady(
  avdName: string,
  preferredSerial?: string,
): Promise<string> {
  const serial =
    preferredSerial?.trim() || process.env.ANDROID_DEVICE_UDID?.trim();
  if (serial) {
    const devices = await listAdbDevices();
    const device = devices.find((entry) => entry.serial === serial);
    if (device?.state === 'device') {
      logger.info(
        `Using configured Android emulator ${serial} — skipping AVD name lookup.`,
      );
      await waitForEmulatorBoot(serial);
      return serial;
    }
    if (
      device &&
      (device.state === 'offline' || device.state === 'authorizing')
    ) {
      logger.info(
        `Configured Android emulator ${serial} is ${device.state} — waiting for boot instead of spawning a duplicate.`,
      );
      await waitForEmulatorBoot(serial);
      return serial;
    }
    logger.warn(
      `Configured Android serial ${serial} not found in adb devices — restarting emulator for AVD "${avdName}".`,
    );
    await killAndroidEmulatorsForAvd(avdName);
  }
  return startAndroidEmulator(avdName);
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
    if (shouldWaitForOfflineEmulator(avdName, offlineAvdName)) {
      logger.info(
        `Waiting for Android emulator ${offlineEmulator.serial} (${offlineAvdName}) to finish booting instead of spawning a duplicate.`,
      );
      await waitForEmulatorBoot(offlineEmulator.serial);
      return offlineEmulator.serial;
    }
    if (
      offlineAvdName === undefined &&
      shouldWaitForUnidentifiedOfflineEmulator({
        isCI: process.env.CI === 'true',
        offlineOrAuthorizingCount: devices.filter(
          (entry) => entry.state === 'offline' || entry.state === 'authorizing',
        ).length,
      })
    ) {
      logger.info(
        `Waiting for unidentified offline emulator ${offlineEmulator.serial} — likely "${avdName}" still booting.`,
      );
      await waitForEmulatorBoot(offlineEmulator.serial);
      return offlineEmulator.serial;
    }
    if (offlineAvdName) {
      logger.info(
        `Ignoring offline emulator ${offlineEmulator.serial} (AVD "${offlineAvdName}") — requested "${avdName}".`,
      );
    } else {
      logger.info(
        `Ignoring offline emulator ${offlineEmulator.serial} (AVD unknown) — requested "${avdName}".`,
      );
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

  // Appium smoke CI uses AOSP (`default` image) — lighter cold boot than google_apis.
  // RAM/CPU flags align with Detox CI where noted; cores overridable via env.
  const args = ['-avd', avdName];
  if (isCI) {
    const cores =
      process.env.ANDROID_EMULATOR_CI_CORES?.trim() ||
      ANDROID_EMULATOR_CI_CORES_DEFAULT;
    args.push(
      '-skin',
      '1080x2340',
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
      '-partition-size',
      '8192',
      '-no-snapshot-save',
      '-no-snapshot-load',
      '-cache-size',
      '2048',
      '-accel',
      'on',
      '-wipe-data',
      '-read-only',
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
  const bootTimeoutMs = resolveAndroidBootTimeoutMs();
  const deadline = Date.now() + bootTimeoutMs;
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
      `Android emulator for AVD "${avdName}" did not appear in adb within ${bootTimeoutMs / 1000}s.`,
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
  if (cached && (await isIosSimulatorBooted(cached))) {
    return cached;
  }
  if (cached) {
    iosSimulatorUdidCache.delete(deviceName);
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
    // Do not cache shutdown simulators — callers may boot a different UDID next.
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

function resolveIosPostBootSettleMs(): number {
  const raw = process.env.IOS_SIMULATOR_POST_BOOT_SETTLE_MS?.trim();
  if (!raw) {
    return DEFAULT_IOS_POST_BOOT_SETTLE_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_IOS_POST_BOOT_SETTLE_MS;
}

async function waitForIosSimulatorPostBootSettle(): Promise<void> {
  const settleMs = resolveIosPostBootSettleMs();
  if (settleMs <= 0) {
    return;
  }
  logger.info(
    `Waiting ${settleMs / 1000}s for iOS simulator post-boot settle (SpringBoard / system UI)…`,
  );
  await sleep(settleMs);
}

export async function bootIosSimulatorByUdid(udid: string): Promise<string> {
  const alreadyBooted = await isIosSimulatorBooted(udid);
  if (alreadyBooted) {
    logger.info(`iOS simulator ${udid} is already booted — skipping boot.`);
    return udid;
  }

  logger.info(`Booting iOS simulator: ${udid}`);

  await execAsync(`xcrun simctl boot "${udid}"`).catch(
    (err: { code?: number }) => {
      if (err.code !== 149) {
        throw err;
      }
    },
  );

  await execAsync(`xcrun simctl bootstatus "${udid}" -b`);
  await waitForIosSimulatorPostBootSettle();

  logger.info(`iOS simulator ${udid} is booted and ready.`);
  return udid;
}

export async function startIosSimulator(deviceName: string): Promise<string> {
  const udid = await getIosSimulatorUdid(deviceName);
  const bootedUdid = await bootIosSimulatorByUdid(udid);
  iosSimulatorUdidCache.set(deviceName, bootedUdid);
  return bootedUdid;
}

/**
 * Ensures an iOS simulator is booted before Appium session creation.
 * Prefers `preferredUdid` or `IOS_SIMULATOR_UDID` (set by CI prepare step)
 * so tests attach to the same sim that received the app install.
 */
export async function ensureIosSimulatorReady(
  deviceName: string,
  preferredUdid?: string,
): Promise<string> {
  const udid = preferredUdid?.trim() || process.env.IOS_SIMULATOR_UDID?.trim();
  if (udid) {
    const bootedUdid = await bootIosSimulatorByUdid(udid);
    iosSimulatorUdidCache.set(deviceName, bootedUdid);
    return bootedUdid;
  }
  return startIosSimulator(deviceName);
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
