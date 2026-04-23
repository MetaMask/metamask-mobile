import Braze, { type PushNotificationEvent } from '@braze/react-native-sdk';
import { NativeModules, type EmitterSubscription } from 'react-native';
import Logger from '../../util/Logger';

const isBrazeBridgeAvailable = (): boolean => {
  // Keep tests deterministic regardless of NativeModules mock shape.
  if (process.env.JEST_WORKER_ID) {
    return true;
  }
  return Boolean((NativeModules as Record<string, unknown>)?.BrazeReactBridge);
};

/**
 * Retrieve the deep link URL from a Braze push notification that launched the
 * app from a terminated (cold) state.
 *
 * Requires native setup:
 * - iOS:     `[[BrazeReactUtils sharedInstance] populateInitialPayloadFromLaunchOptions:launchOptions]`
 * - Android: `BrazeReactUtils.populateInitialPushPayloadFromIntent(intent)`
 */
export function getBrazeInitialDeeplink(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!isBrazeBridgeAvailable()) {
      Logger.log('[Braze] Native bridge unavailable, skipping initial payload');
      resolve(null);
      return;
    }

    try {
      Braze.getInitialPushPayload((payload: PushNotificationEvent | null) => {
        const url = payload?.url;
        if (url && typeof url === 'string' && url.length > 0) {
          Logger.log('[Braze] Initial push deep link:', url);
          resolve(url);
        } else {
          resolve(null);
        }
      });
    } catch (error) {
      Logger.error(
        error as Error,
        '[Braze] Failed to get initial push payload',
      );
      resolve(null);
    }
  });
}

/**
 * Subscribe to Braze push notification tap events and invoke `callback` with
 * the deep link URL when one is present.
 *
 * On iOS, the native `BrazeDelegate.shouldOpenURL` routes universal links
 * (Branch domains) through Branch for proper resolution, and suppresses all
 * other URLs. Non-universal-link URLs are handled exclusively through this JS
 * listener, tagged with ORIGIN_BRAZE. Universal links are resolved by Branch
 * and delivered through the Branch flow with ORIGIN_DEEPLINK (unless further
 * tagged).
 *
 * @returns An EmitterSubscription, or null on error.
 */
export function subscribeToBrazePushDeeplinks(
  callback: (deeplink: string) => void,
): EmitterSubscription | null {
  if (!isBrazeBridgeAvailable()) {
    Logger.log('[Braze] Native bridge unavailable, skipping push listener');
    return null;
  }

  try {
    return Braze.addListener(
      Braze.Events.PUSH_NOTIFICATION_EVENT,
      (event: PushNotificationEvent) => {
        if (event.payload_type !== 'push_opened') {
          return;
        }

        if (event.is_braze_internal || event.is_silent) {
          return;
        }

        const url = event.url;
        if (url && typeof url === 'string' && url.length > 0) {
          Logger.log('[Braze] Push notification deep link:', url);
          callback(url);
        }
      },
    );
  } catch (error) {
    Logger.error(
      error as Error,
      '[Braze] Failed to subscribe to push deep links',
    );
    return null;
  }
}
