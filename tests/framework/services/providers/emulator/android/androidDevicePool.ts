import { androidEmulatorSerialsForPoolSize } from '../../../appium/AndroidGoldenSnapshot.ts';

const ANDROID_EMULATOR_SERIAL_PATTERN = /^emulator-\d+$/;
const UIAUTOMATOR2_SYSTEM_PORT_BASE = 8200;
const CHROMEDRIVER_PORT_BASE = 9100;
const MJPEG_SERVER_PORT_BASE = 7810;

export interface AndroidWorkerDevice {
  serial: string;
  systemPort: number;
  chromedriverPort: number;
  mjpegServerPort: number;
}

/**
 * Resolve the requested emulator count, defaulting to the historical single
 * emulator path.
 */
export function resolveAndroidDevicePoolSize(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.ANDROID_DEVICE_POOL_SIZE?.trim() || '1';
  const poolSize = Number(raw);
  if (!Number.isInteger(poolSize) || poolSize < 1) {
    throw new Error(
      `Invalid ANDROID_DEVICE_POOL_SIZE "${raw}". Expected a positive integer.`,
    );
  }
  return poolSize;
}

/**
 * Parse the ordered adb serial list exported by Android pool setup.
 */
export function parseAndroidDevicePool(rawPool: string | undefined): string[] {
  if (!rawPool?.trim()) {
    return [];
  }

  const serials = rawPool
    .split(',')
    .map((serial) => serial.trim())
    .filter(Boolean);
  const seen = new Set<string>();

  for (const serial of serials) {
    if (!ANDROID_EMULATOR_SERIAL_PATTERN.test(serial)) {
      throw new Error(
        `ANDROID_DEVICE_POOL contains invalid adb serial "${serial}".`,
      );
    }
    if (seen.has(serial)) {
      throw new Error(
        `ANDROID_DEVICE_POOL contains duplicate serial "${serial}".`,
      );
    }
    seen.add(serial);
  }

  return serials;
}

/**
 * Ordered adb serials for the configured pool, or an empty list on the single
 * emulator path.
 */
export function androidDevicePoolSerials(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const explicit = parseAndroidDevicePool(env.ANDROID_DEVICE_POOL);
  if (explicit.length > 0) {
    return explicit;
  }
  const poolSize = resolveAndroidDevicePoolSize(env);
  if (poolSize <= 1) {
    return [];
  }
  return androidEmulatorSerialsForPoolSize(poolSize);
}

/**
 * Resolve the fixed Android device and UIAutomator2 ports for a worker slot.
 * Returns undefined when pool mode is not configured, preserving the single
 * emulator path. Workers can pin devices from ANDROID_DEVICE_POOL_SIZE
 * alone; Playwright globalSetup cannot export ANDROID_DEVICE_POOL to them.
 */
export function deviceForWorker(
  workerIndex: number,
  env: Record<string, string | undefined> = process.env,
): AndroidWorkerDevice | undefined {
  const serials = androidDevicePoolSerials(env);
  if (serials.length === 0) {
    return undefined;
  }

  const serial = serials[workerIndex];
  if (!serial) {
    throw new Error(
      `Android worker ${workerIndex} has no device in ANDROID_DEVICE_POOL (${serials.length} devices).`,
    );
  }

  return {
    serial,
    systemPort: UIAUTOMATOR2_SYSTEM_PORT_BASE + workerIndex,
    chromedriverPort: CHROMEDRIVER_PORT_BASE + workerIndex,
    mjpegServerPort: MJPEG_SERVER_PORT_BASE + workerIndex,
  };
}

/**
 * Export a worker's fixed Android assignment for adb and Appium.
 */
export function applyAndroidDevicePoolToWorker(
  workerIndex: number,
  env: Record<string, string | undefined> = process.env,
): AndroidWorkerDevice | undefined {
  const assignment = deviceForWorker(workerIndex, env);
  if (!assignment) {
    return undefined;
  }

  if (!env.ANDROID_DEVICE_POOL?.trim()) {
    env.ANDROID_DEVICE_POOL = androidDevicePoolSerials(env).join(',');
  }

  env.ANDROID_DEVICE_UDID = assignment.serial;
  env.ANDROID_SERIAL = assignment.serial;
  env.E2E_WORKER_INDEX = String(workerIndex);
  env.ANDROID_UIAUTOMATOR2_SYSTEM_PORT = String(assignment.systemPort);
  env.ANDROID_CHROMEDRIVER_PORT = String(assignment.chromedriverPort);
  env.ANDROID_MJPEG_SERVER_PORT = String(assignment.mjpegServerPort);
  return assignment;
}
