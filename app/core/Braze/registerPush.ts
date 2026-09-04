import { NativeModules, Platform } from 'react-native';
import Logger from '../../util/Logger';
import { hasTestOverrides } from '../../util/test/utils';

interface BrazePushNativeModule {
  registerPush: (fcmToken?: string) => Promise<void>;
}

const nativeModules = NativeModules as {
  BrazePushModule?: BrazePushNativeModule;
};

const toError = (error: unknown): Error =>
  error instanceof Error
    ? error
    : new Error(
        typeof error === 'string' ? error : 'Failed to register Braze push',
      );

/**
 * Register this device for Braze push.
 *
 * Android forwards the supplied FCM token to Braze. iOS deliberately does not
 * forward it because Braze requires the binary APNs token captured natively by
 * AppDelegate.
 *
 * @param fcmToken - Firebase registration token used by Android.
 */
export async function registerBrazePush(fcmToken: string): Promise<void> {
  if (hasTestOverrides) {
    return;
  }

  const brazePushModule = nativeModules.BrazePushModule;
  if (!brazePushModule) {
    const error = new Error('BrazePushModule is not available');
    Logger.error(error, '[Braze] Native registerPush module is missing');
    throw error;
  }

  try {
    if (Platform.OS === 'ios') {
      await brazePushModule.registerPush();
    } else if (Platform.OS === 'android') {
      await brazePushModule.registerPush(fcmToken);
    } else {
      throw new Error(`Unsupported Braze push platform: ${Platform.OS}`);
    }
    Logger.log('[Braze] Registered this device for Braze push');
  } catch (nativeError) {
    const error = toError(nativeError);
    Logger.error(error, '[Braze] Failed to register push');
    throw error;
  }
}
