import Braze from '@braze/react-native-sdk';
import Logger from '../../util/Logger';
import { hasTestOverrides } from '../../util/test/utils';

/**
 * Register this device's current APNs/FCM token with Braze.
 * No-op when there is no token or when E2E test overrides are active.
 */
export function registerBrazePushToken(token: string): void {
  if (hasTestOverrides || !token) {
    return;
  }

  try {
    Braze.registerPushToken(token);
    Logger.log('[Braze] Registered this device for Braze push');
  } catch (error) {
    Logger.error(error as Error, '[Braze] Failed to register push token');
  }
}
