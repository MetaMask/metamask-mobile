import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  selectCanonicalProfileId,
  selectIsSignedIn,
} from '../../../../selectors/identity';
import {
  selectIsMetaMaskPushNotificationsEnabled,
  selectMetaMaskPushNotificationToken,
} from '../../../../selectors/notifications';
import { setBrazeUser, clearBrazeUser, refreshBrazeBanners } from '../..';
import { registerBrazePush } from '../../registerPush';
import Logger from '../../../../util/Logger';

/**
 * Syncs the Braze identity with the MetaMask profile sign-in state.
 *
 * On sign-in (and whenever the cached canonical profile ID changes),
 * `setBrazeUser(canonicalProfileId)` identifies Braze, then
 * `refreshBrazeBanners()` runs so placement-targeted banners use the
 * current identity.
 *
 * While signed in, registers Braze push only after the NaaP push controller
 * has enabled push and persisted its current FCM token.
 *
 * On sign-out `clearBrazeUser()` makes the plugin a no-op so events are no
 * longer attributed to the previous user.
 */
export function useBrazeIdentity(): void {
  const isSignedIn = useSelector(selectIsSignedIn);
  const canonicalProfileId = useSelector(selectCanonicalProfileId);
  const isPushEnabled = useSelector(selectIsMetaMaskPushNotificationsEnabled);
  const fcmToken = useSelector(selectMetaMaskPushNotificationToken);
  const hasBeenSignedInRef = useRef(false);

  useEffect(() => {
    try {
      if (isSignedIn && canonicalProfileId) {
        hasBeenSignedInRef.current = true;
        setBrazeUser(canonicalProfileId);
        refreshBrazeBanners();
      } else if (!isSignedIn && hasBeenSignedInRef.current) {
        hasBeenSignedInRef.current = false;
        clearBrazeUser();
      }
    } catch (error) {
      Logger.error(error as Error, '[Braze] Failed to sync Braze identity');
    }
  }, [isSignedIn, canonicalProfileId]);

  useEffect(() => {
    if (!isSignedIn || !canonicalProfileId || !isPushEnabled || !fcmToken) {
      return;
    }

    registerBrazePush(fcmToken).catch((error) => {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        '[Braze] Failed to sync push registration',
      );
    });
  }, [isSignedIn, canonicalProfileId, isPushEnabled, fcmToken]);
}
