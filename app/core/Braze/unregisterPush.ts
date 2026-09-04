import { NativeModules } from 'react-native';
import Logger from '../../util/Logger';
import { hasTestOverrides } from '../../util/test/utils';

interface BrazePushNativeModule {
  unregisterPush: () => Promise<void>;
}

const nativeModules = NativeModules as {
  BrazePushModule?: BrazePushNativeModule;
};

const toError = (error: unknown): Error =>
  error instanceof Error
    ? error
    : new Error(
        typeof error === 'string'
          ? error
          : 'Failed to unregister Braze push',
      );

/**
 * Unregister this device from Braze push before disabling NaaP push.
 *
 * The native implementation treats an absent token as already unregistered.
 * Any other native failure rejects so callers keep the in-app toggle enabled.
 */
export async function unregisterBrazePush(): Promise<void> {
  if (hasTestOverrides) {
    return;
  }

  const brazePushModule = nativeModules.BrazePushModule;
  if (!brazePushModule) {
    const error = new Error('BrazePushModule is not available');
    Logger.error(error, '[Braze] Native unregisterPush module is missing');
    throw error;
  }

  try {
    await brazePushModule.unregisterPush();
    Logger.log('[Braze] Unregistered this device from Braze push');
  } catch (nativeError) {
    const error = toError(nativeError);
    Logger.error(error, '[Braze] Failed to unregister push');
    throw error;
  }
}
