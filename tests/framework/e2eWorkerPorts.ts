/**
 * Per-Playwright-worker host ports so N=2 Android Appium workers do not share
 * localhost listeners or `adb forward` slots.
 *
 * Device-facing ports stay on worker 0's values; adb reverse maps them to the
 * worker's host listen port.
 */
import { deviceForWorker } from './services/providers/emulator/android/androidDevicePool.ts';

const DAPP_HOST_PORT_STRIDE = 100;
const CDP_FORWARD_STRIDE = 10;
const CHROME_CDP_FORWARD_PORT_BASE = 9222;
const WEBVIEW_CDP_FORWARD_PORT_BASE = 9223;
const METAMASK_WEBVIEW_CDP_FORWARD_PORT_BASE = 10902;

/**
 * Playwright sets `TEST_PARALLEL_INDEX` when the worker process starts, so
 * `beforeAll` hooks resolve their slot even though the `deviceProvider` worker
 * fixture (which exports `E2E_WORKER_INDEX`) has not been created yet.
 */
export function resolveE2eWorkerIndex(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.E2E_WORKER_INDEX?.trim() || env.TEST_PARALLEL_INDEX?.trim();
  if (!raw) {
    return 0;
  }
  const workerIndex = Number(raw);
  if (!Number.isInteger(workerIndex) || workerIndex < 0) {
    throw new Error(
      `Invalid worker index "${raw}". Expected a non-negative integer.`,
    );
  }
  return workerIndex;
}

export function hostListenPortForDevicePort(
  devicePort: number,
  env: Record<string, string | undefined> = process.env,
): number {
  return devicePort + resolveE2eWorkerIndex(env) * DAPP_HOST_PORT_STRIDE;
}

/**
 * URL the in-app browser should open for a local dapp served via
 * {@link hostListenPortForDevicePort}.
 *
 * Android: keep the device-facing port — `adb reverse` maps it to the worker
 * host listen port. iOS: simulators share the host network and reverse is a
 * no-op, so navigate to the worker's host listen port directly (worker 1 →
 * devicePort + 100).
 */
export function localDappBrowserUrl(
  devicePort: number,
  env: Record<string, string | undefined> = process.env,
): string {
  if (isIosAppiumSmokeEnv(env)) {
    return `http://localhost:${hostListenPortForDevicePort(devicePort, env)}`;
  }
  return `http://localhost:${devicePort}`;
}

export function chromeCdpForwardPort(
  env: Record<string, string | undefined> = process.env,
): number {
  return (
    CHROME_CDP_FORWARD_PORT_BASE +
    resolveE2eWorkerIndex(env) * CDP_FORWARD_STRIDE
  );
}

export function webviewCdpForwardPort(
  env: Record<string, string | undefined> = process.env,
): number {
  return (
    WEBVIEW_CDP_FORWARD_PORT_BASE +
    resolveE2eWorkerIndex(env) * CDP_FORWARD_STRIDE
  );
}

export function metamaskWebViewCdpForwardPort(
  env: Record<string, string | undefined> = process.env,
): number {
  return (
    METAMASK_WEBVIEW_CDP_FORWARD_PORT_BASE +
    resolveE2eWorkerIndex(env) * CDP_FORWARD_STRIDE
  );
}

/**
 * adb serial for this worker. Falls back to the pool assignment so `beforeAll`
 * hooks do not run bare `adb` against two emulators ("more than one device").
 *
 * Never invent Android serials on iOS jobs: shared CI env historically leaked
 * ANDROID_DEVICE_POOL_SIZE onto ios-smoke, which made ADB reverse fail closed
 * with `spawnSync adb ENOENT` on Mac runners that have no adb.
 */
export function resolveWorkerAndroidSerial(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  if (isIosAppiumSmokeEnv(env)) {
    return undefined;
  }

  const explicit = env.ANDROID_SERIAL?.trim();
  if (explicit) {
    return explicit;
  }
  return deviceForWorker(resolveE2eWorkerIndex(env), env)?.serial;
}

/**
 * True when this process is an iOS Appium smoke worker (simulator UDID / pool
 * exported by prepare-ios-appium-runner, or iOS pool size > 1).
 */
export function isIosAppiumSmokeEnv(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (env.IOS_SIMULATOR_UDID?.trim() || env.IOS_DEVICE_POOL?.trim()) {
    return true;
  }
  const rawIosPoolSize = env.IOS_DEVICE_POOL_SIZE?.trim();
  if (!rawIosPoolSize) {
    return false;
  }
  const iosPoolSize = Number(rawIosPoolSize);
  return Number.isInteger(iosPoolSize) && iosPoolSize > 1;
}

/**
 * Host adb server port for this worker. Falls back to the pool assignment for
 * the same reason the serial does: `beforeAll` hooks run before the
 * `deviceProvider` fixture exports `ANDROID_ADB_SERVER_PORT`, and an early
 * `adb reverse` that lands on the default 5037 server puts this worker back on
 * worker 0's daemon — the shared failure domain per-worker servers remove.
 */
export function resolveWorkerAdbServerPort(
  env: Record<string, string | undefined> = process.env,
): number | undefined {
  if (isIosAppiumSmokeEnv(env)) {
    return undefined;
  }

  const explicit = env.ANDROID_ADB_SERVER_PORT?.trim();
  if (explicit) {
    const port = Number(explicit);
    if (!Number.isInteger(port) || port < 1) {
      throw new Error(
        `Invalid ANDROID_ADB_SERVER_PORT "${explicit}". Expected a positive integer.`,
      );
    }
    return port;
  }
  return deviceForWorker(resolveE2eWorkerIndex(env), env)?.adbServerPort;
}

export function adbDeviceArgs(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const serial = resolveWorkerAndroidSerial(env);
  if (!serial) {
    return [];
  }
  const adbServerPort = resolveWorkerAdbServerPort(env);
  return adbServerPort === undefined
    ? ['-s', serial]
    : ['-P', String(adbServerPort), '-s', serial];
}
