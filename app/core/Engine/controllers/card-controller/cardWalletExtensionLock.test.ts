import { NativeModules, Platform } from 'react-native';
import { createNativeCardRefreshLock } from './cardWalletExtensionLock';

const originalOS = Platform.OS;

describe('createNativeCardRefreshLock', () => {
  afterEach(() => {
    Platform.OS = originalOS;
    delete NativeModules.CardWalletExtensionStore;
  });

  it('returns true on iOS when the native module is missing', async () => {
    Platform.OS = 'ios';

    await expect(createNativeCardRefreshLock().acquire(1_000)).resolves.toBe(
      true,
    );
  });

  it('uses the native lock result when the module is present', async () => {
    Platform.OS = 'ios';
    NativeModules.CardWalletExtensionStore = {
      acquireRefreshLock: jest.fn().mockResolvedValue(false),
    };

    await expect(createNativeCardRefreshLock().acquire(1_000)).resolves.toBe(
      false,
    );
    expect(
      NativeModules.CardWalletExtensionStore.acquireRefreshLock,
    ).toHaveBeenCalledWith(1_000);
  });

  it('returns true on Android when the native module is missing', async () => {
    Platform.OS = 'android';

    await expect(createNativeCardRefreshLock().acquire(1_000)).resolves.toBe(
      true,
    );
  });

  it('does not acquire again until the holder releases', async () => {
    let resolveAcquire: (acquired: boolean) => void = () => undefined;
    let calls = 0;
    const acquireRefreshLock = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          calls += 1;
          if (calls === 1) {
            resolveAcquire = resolve;
            return;
          }
          resolve(true);
        }),
    );
    const releaseRefreshLock = jest.fn().mockResolvedValue(undefined);
    NativeModules.CardWalletExtensionStore = {
      acquireRefreshLock,
      releaseRefreshLock,
    };
    const lock = createNativeCardRefreshLock();

    const first = lock.acquire(1_000);
    const second = lock.acquire(1_000);
    await Promise.resolve();

    expect(acquireRefreshLock).toHaveBeenCalledTimes(1);
    resolveAcquire(true);
    await expect(first).resolves.toBe(true);
    expect(acquireRefreshLock).toHaveBeenCalledTimes(1);

    await lock.release();
    await expect(second).resolves.toBe(true);
    expect(acquireRefreshLock).toHaveBeenCalledTimes(2);
    expect(releaseRefreshLock).toHaveBeenCalledTimes(1);
  });

  it('lets the next caller acquire after the native lock is refused', async () => {
    const acquireRefreshLock = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    NativeModules.CardWalletExtensionStore = { acquireRefreshLock };
    const lock = createNativeCardRefreshLock();

    await expect(lock.acquire(1_000)).resolves.toBe(false);
    await expect(lock.acquire(1_000)).resolves.toBe(true);
    expect(acquireRefreshLock).toHaveBeenCalledTimes(2);
  });

  it('lets the next caller acquire after the native lock throws', async () => {
    const acquireRefreshLock = jest
      .fn()
      .mockRejectedValueOnce(new Error('native failed'))
      .mockResolvedValueOnce(true);
    NativeModules.CardWalletExtensionStore = { acquireRefreshLock };
    const lock = createNativeCardRefreshLock();

    await expect(lock.acquire(1_000)).rejects.toThrow('native failed');
    await expect(lock.acquire(1_000)).resolves.toBe(true);
    expect(acquireRefreshLock).toHaveBeenCalledTimes(2);
  });
});
