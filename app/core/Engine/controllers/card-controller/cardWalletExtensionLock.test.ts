import { NativeModules, Platform } from 'react-native';
import { createNativeCardRefreshLock } from './cardWalletExtensionLock';

const originalOS = Platform.OS;

describe('createNativeCardRefreshLock', () => {
  afterEach(() => {
    Platform.OS = originalOS;
    delete NativeModules.CardWalletExtensionStore;
  });

  it('returns false on iOS when the native module is missing', async () => {
    Platform.OS = 'ios';

    await expect(createNativeCardRefreshLock().acquire(1_000)).resolves.toBe(
      false,
    );
  });

  it('returns true on Android when the native module is missing', async () => {
    Platform.OS = 'android';

    await expect(createNativeCardRefreshLock().acquire(1_000)).resolves.toBe(
      true,
    );
  });
});
