import Braze, { type PushNotificationEvent } from '@braze/react-native-sdk';
import {
  NativeModules,
  Platform,
  type EmitterSubscription,
} from 'react-native';
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
 * Android-only — on iOS, warm/suspended push deep links flow through the
 * system URL handlers (Linking / Branch) which are already wired up.
 *
 * @returns An unsubscribe function, or null on iOS / on error.
 */
export function subscribeToBrazePushDeeplinks(
  callback: (deeplink: string) => void,
): EmitterSubscription | null {
  if (Platform.OS !== 'android') {
    return null;
  }
  if (!isBrazeBridgeAvailable()) {
    Logger.log('[Braze] Native bridge unavailable, skipping push listener');
    return null;
  }

  try {
    return Braze.addListener(
      Braze.Events.PUSH_NOTIFICATION_EVENT,
      (event: PushNotificationEvent) => {
        // Only handle user-tapped notifications, not foreground-received ones
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
