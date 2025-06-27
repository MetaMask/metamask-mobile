import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RESUBSCRIBE_NOTIFICATIONS_EXPIRY } from '../../../constants/storage';
import { selectIsSignedIn } from '../../../selectors/identity';
import { selectIsUnlocked } from '../../../selectors/keyringController';
import { selectIsMetamaskNotificationsEnabled } from '../../../selectors/notifications';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import storageWrapper from '../../../store/storage-wrapper';
import Logger from '../../Logger';
import { isNotificationsFeatureEnabled } from '../constants';
import {
  useEnableNotifications,
  useListNotifications,
} from './useNotifications';

const EXPIRY_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day

const hasExpired = async () => {
  const expiryTimestamp: string | undefined = await storageWrapper.getItem(
    RESUBSCRIBE_NOTIFICATIONS_EXPIRY,
  );
  if (!expiryTimestamp) {
    return true;
  }
  const now = Date.now();
  return now > parseInt(expiryTimestamp, 10);
};

const setExpiry = async () => {
  const now = Date.now();
  const expiryTimestamp = now + EXPIRY_DURATION_MS;
  await storageWrapper.setItem(
    RESUBSCRIBE_NOTIFICATIONS_EXPIRY,
    expiryTimestamp.toString(),
  );
};

/**
 * Effect that queries for notifications on startup if notifications are enabled.
 */
export function useStartupNotificationsEffect() {
  // Base requirements
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const isBasicFunctionalityEnabled = Boolean(
    useSelector(selectBasicFunctionalityEnabled),
  );

  // Notification requirements
  const notificationsFlagEnabled = isNotificationsFeatureEnabled();
  const notificationsControllerEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const isSignedIn = useSelector(selectIsSignedIn);
  const notificationsEnabled =
    notificationsFlagEnabled && notificationsControllerEnabled && isSignedIn;

  // Actions
  const { enableNotifications } = useEnableNotifications();
  const { listNotifications } = useListNotifications();

  // App Open Effect
  useEffect(() => {
    const run = async () => {
      try {
        if (isUnlocked && isBasicFunctionalityEnabled && notificationsEnabled) {
          if (await hasExpired()) {
            // Re-enabling notifications to keep subscriptions up to date
            await enableNotifications();
            await setExpiry();
          }
          await listNotifications();
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        Logger.error(
          new Error(`Failed to list notifications - ${errorMessage}`),
        );
      }
    };

    run();
  }, [
    enableNotifications,
    isBasicFunctionalityEnabled,
    isUnlocked,
    listNotifications,
    notificationsEnabled,
  ]);
}
