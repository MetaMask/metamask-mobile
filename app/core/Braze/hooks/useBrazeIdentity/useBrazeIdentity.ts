import { useEffect, useRef, useState } from 'react';
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
import { retryPendingBrazePushUnregistration } from '../../unregisterPush';
import { hasPendingBrazePushUnregistrationSync } from '../../pushRegistrationState';
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
 * On app launch, retries one push unregistration left pending by a previous
 * session before changing the Braze identity.
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
  const hadPendingUnregistrationAtLaunchRef = useRef(
    hasPendingBrazePushUnregistrationSync(),
  );
  const startupUnregistrationRetryRef = useRef<Promise<boolean> | undefined>(
    undefined,
  );
  const [identifiedProfileId, setIdentifiedProfileId] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    const syncIdentity = async () => {
      startupUnregistrationRetryRef.current ??= isPushEnabled
        ? Promise.resolve(true)
        : retryPendingBrazePushUnregistration();
      const unregistrationComplete =
        await startupUnregistrationRetryRef.current;
      if (cancelled || (!unregistrationComplete && !isPushEnabled)) {
        return;
      }

      if (isSignedIn && canonicalProfileId) {
        hasBeenSignedInRef.current = true;
        if (identifiedProfileId !== canonicalProfileId) {
          setBrazeUser(canonicalProfileId);
          refreshBrazeBanners();
          setIdentifiedProfileId(canonicalProfileId);
        }
      } else if (
        !isSignedIn &&
        (hasBeenSignedInRef.current ||
          hadPendingUnregistrationAtLaunchRef.current)
      ) {
        hasBeenSignedInRef.current = false;
        setIdentifiedProfileId(undefined);
        await clearBrazeUser();
      }
    };

    syncIdentity().catch((error) => {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        '[Braze] Failed to sync Braze identity',
      );
    });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, canonicalProfileId, identifiedProfileId, isPushEnabled]);

  useEffect(() => {
    if (
      !isSignedIn ||
      identifiedProfileId !== canonicalProfileId ||
      !isPushEnabled ||
      !fcmToken
    ) {
      return;
    }

    registerBrazePush(fcmToken).catch((error) => {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        '[Braze] Failed to sync push registration',
      );
    });
  }, [
    isSignedIn,
    canonicalProfileId,
    identifiedProfileId,
    isPushEnabled,
    fcmToken,
  ]);
}
