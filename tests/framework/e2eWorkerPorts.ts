/**
 * Per-Playwright-worker host ports so N=2 Android Appium workers do not share
 * localhost listeners or `adb forward` slots.
 *
 * Device-facing ports stay on worker 0's values; adb reverse maps them to the
 * worker's host listen port.
 */
import { androidDevicePoolSerials } from './services/providers/emulator/android/androidDevicePool.ts';

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
 */
export function resolveWorkerAndroidSerial(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const explicit = env.ANDROID_SERIAL?.trim();
  if (explicit) {
    return explicit;
  }
  return androidDevicePoolSerials(env)[resolveE2eWorkerIndex(env)];
}

export function adbDeviceArgs(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const serial = resolveWorkerAndroidSerial(env);
  return serial ? ['-s', serial] : [];
}
