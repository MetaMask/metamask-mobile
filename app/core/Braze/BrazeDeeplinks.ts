import Braze, { type PushNotificationEvent } from '@braze/react-native-sdk';
import { type EmitterSubscription } from 'react-native';
import Logger from '../../util/Logger';

/**
 * Report whether a Braze push notification launched the app from a terminated
 * (cold) state, along with its deep link URL when the payload carries one.
 *
 * Requires native setup:
 * - iOS:     `[[BrazeReactUtils sharedInstance] populateInitialPayloadFromLaunchOptions:launchOptions]`
 * - Android: `BrazeReactUtils.populateInitialPushPayloadFromIntent(intent)`
 */
export function getBrazeInitialPush(): Promise<{
  opened: boolean;
  deeplink: string | null;
}> {
  return new Promise((resolve) => {
    try {
      Braze.getInitialPushPayload((payload: PushNotificationEvent | null) => {
        if (!payload) {
          resolve({ opened: false, deeplink: null });
          return;
        }
        if (payload.is_braze_internal || payload.is_silent) {
          resolve({ opened: false, deeplink: null });
          return;
        }
        const url = payload.url;
        const deeplink = typeof url === 'string' && url.length > 0 ? url : null;
        if (deeplink) {
          Logger.log('[Braze] Initial push deep link:', deeplink);
        }
        // A payload without a URL is still a tap that launched the app.
        resolve({ opened: true, deeplink });
      });
    } catch (error) {
      Logger.error(
        error as Error,
        '[Braze] Failed to get initial push payload',
      );
      resolve({ opened: false, deeplink: null });
    }
  });
}

/**
 * Subscribe to Braze push notification tap events. `callback` fires for every
 * genuine tap, receiving the deep link URL when the payload carries one and
 * `null` when it does not.
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
export function subscribeToBrazePushOpens(
  callback: (deeplink: string | null) => void,
): EmitterSubscription | null {
  try {
    return Braze.addListener(
      Braze.Events.PUSH_NOTIFICATION_EVENT,
      (event: PushNotificationEvent) => {
        if (event.payload_type !== 'push_opened') {
          return;
        }

        // Silent and Braze-internal pushes are not user taps, so they must not
        // reach the callback — an open they did not cause would be attributed
        // to push.
        if (event.is_braze_internal || event.is_silent) {
          return;
        }

        const url = event.url;
        const deeplink = typeof url === 'string' && url.length > 0 ? url : null;
        if (deeplink) {
          Logger.log('[Braze] Push notification deep link:', deeplink);
        }
        // Fires for every genuine tap, with or without a deeplink.
        callback(deeplink);
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
