import type { DeviceBackend, SnapshotResult } from '@metamask/device-mcp';

const DEFAULT_RETRY_DELAY_MS = 100;

export interface SnapshotBackendOptions {
  readonly retryDelayMs?: number;
  readonly delay?: (milliseconds: number) => Promise<void>;
}

export function wrapAndroidSnapshotBackend(
  backend: DeviceBackend,
  options: SnapshotBackendOptions = {},
): DeviceBackend {
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const delay = options.delay ?? sleep;
  let snapshotQueue: Promise<void> = Promise.resolve();

  async function captureSnapshot(): Promise<SnapshotResult> {
    try {
      return await backend.snapshot();
    } catch (error) {
      if (!isTransientUiAutomatorSnapshotError(error)) {
        throw error;
      }
      await delay(retryDelayMs);
      return backend.snapshot();
    }
  }

  function snapshot(): Promise<SnapshotResult> {
    const capture = snapshotQueue.then(captureSnapshot, captureSnapshot);
    snapshotQueue = capture.then(
      () => undefined,
      () => undefined,
    );
    return capture;
  }

  // Only direct snapshot calls can be intercepted without changing the
  // upstream DeviceBackend contract. Methods such as tapElement perform their
  // own internal snapshots and remain delegated to the original backend.
  return new Proxy(backend, {
    get(target, property, receiver) {
      if (property === 'snapshot') {
        return snapshot;
      }
      const value: unknown = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export function isTransientUiAutomatorSnapshotError(error: unknown): boolean {
  const message = getErrorText(error).toLowerCase();
  if (message.includes('could not get idle state')) {
    return true;
  }
  if (message.includes('/sdcard/window_dump.xml')) {
    return /no such file|does not exist|cannot open|not found/u.test(message);
  }
  return (
    message.includes('uiautomator') &&
    (/\bexit(?:ed)?(?: with(?: code)?)? 137\b/u.test(message) ||
      /\bkilled\b/u.test(message))
  );
}

function getErrorText(error: unknown): string {
  if (error instanceof Error) {
    const cause = 'cause' in error ? getErrorText(error.cause) : '';
    return `${error.message} ${cause}`;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    const stderr = 'stderr' in error ? error.stderr : undefined;
    if (Buffer.isBuffer(stderr)) {
      return stderr.toString('utf8');
    }
    if (typeof stderr === 'string') {
      return stderr;
    }
  }
  return '';
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
