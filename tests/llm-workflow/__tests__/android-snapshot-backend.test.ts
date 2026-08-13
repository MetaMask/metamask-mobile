import type { DeviceBackend, SnapshotResult } from '@metamask/device-mcp';

import {
  isTransientUiAutomatorSnapshotError,
  wrapAndroidSnapshotBackend,
} from '../android/snapshot-backend';

const snapshotResult: SnapshotResult = {
  platform: 'android',
  hierarchy: [],
  raw: '<hierarchy />',
  timestamp: 1,
};

function createBackend(snapshot: jest.Mock): DeviceBackend {
  return {
    platform: 'android',
    snapshot,
  } as unknown as DeviceBackend;
}

describe('wrapAndroidSnapshotBackend', () => {
  it('preserves backend identity and delegates non-snapshot methods', async () => {
    class TestBackend {
      readonly platform = 'android' as const;
      snapshot = jest.fn().mockResolvedValue(snapshotResult);
      getDeviceInfo = jest
        .fn()
        .mockResolvedValue({ deviceId: 'emulator-5554' });
    }
    const backend = new TestBackend() as unknown as DeviceBackend;
    const wrapped = wrapAndroidSnapshotBackend(backend);

    expect(wrapped).toBeInstanceOf(TestBackend);
    await wrapped.getDeviceInfo();
    expect(backend.getDeviceInfo).toHaveBeenCalledTimes(1);
  });

  it('serializes snapshots and continues the queue after success', async () => {
    let active = 0;
    let maxActive = 0;
    const releases: (() => void)[] = [];
    const snapshot = jest.fn(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active -= 1;
      return snapshotResult;
    });
    const wrapped = wrapAndroidSnapshotBackend(createBackend(snapshot));

    const first = wrapped.snapshot();
    const second = wrapped.snapshot();
    await Promise.resolve();
    expect(snapshot).toHaveBeenCalledTimes(1);
    releases.shift()?.();
    await first;
    await Promise.resolve();
    expect(snapshot).toHaveBeenCalledTimes(2);
    releases.shift()?.();
    await second;
    expect(maxActive).toBe(1);
  });

  it('retries one transient failure after the injected delay', async () => {
    const error = new Error('uiautomator dump: could not get idle state');
    const snapshot = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(snapshotResult);
    const delay = jest.fn().mockResolvedValue(undefined);
    const wrapped = wrapAndroidSnapshotBackend(createBackend(snapshot), {
      retryDelayMs: 5,
      delay,
    });

    await expect(wrapped.snapshot()).resolves.toBe(snapshotResult);
    expect(delay).toHaveBeenCalledWith(5);
    expect(snapshot).toHaveBeenCalledTimes(2);
  });

  it('does not retry general ADB failures', async () => {
    const error = new Error('error: device offline');
    const snapshot = jest.fn().mockRejectedValue(error);
    const delay = jest.fn().mockResolvedValue(undefined);
    const wrapped = wrapAndroidSnapshotBackend(createBackend(snapshot), {
      delay,
    });

    await expect(wrapped.snapshot()).rejects.toBe(error);
    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(delay).not.toHaveBeenCalled();
  });

  it('continues the queue after a failed capture', async () => {
    const permanentError = new Error('adb: unauthorized');
    const snapshot = jest
      .fn()
      .mockRejectedValueOnce(permanentError)
      .mockResolvedValueOnce(snapshotResult);
    const wrapped = wrapAndroidSnapshotBackend(createBackend(snapshot));

    await expect(wrapped.snapshot()).rejects.toBe(permanentError);
    await expect(wrapped.snapshot()).resolves.toBe(snapshotResult);
    expect(snapshot).toHaveBeenCalledTimes(2);
  });
});

describe('isTransientUiAutomatorSnapshotError', () => {
  it.each([
    'ERROR: could not get idle state',
    'uiautomator exited with code 137',
    'Killed while running uiautomator dump',
    'cat: /sdcard/window_dump.xml: No such file or directory',
  ])('classifies %s as transient', (message) => {
    expect(isTransientUiAutomatorSnapshotError(new Error(message))).toBe(true);
  });

  it.each([
    'error: device offline',
    'error: device unauthorized',
    'adb: command not found',
    'uiautomator dump failed with exit code 1',
    'permission denied',
  ])('does not classify %s as transient', (message) => {
    expect(isTransientUiAutomatorSnapshotError(new Error(message))).toBe(false);
  });
});
