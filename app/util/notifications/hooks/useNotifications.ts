import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { MarkAsReadNotificationsParam } from '@metamask/notification-services-controller/notification-services';
import {
  assertIsFeatureEnabled,
  disableNotifications as disableNotificationsHelper,
  enableNotifications as enableNotificationsHelper,
  fetchNotifications,
  markNotificationsAsRead as markNotificationsAsReadHelper,
  resetNotifications as resetNotificationsHelper,
} from '../../../actions/notification/helpers';
import {
  getNotificationsList,
  selectIsFetchingMetamaskNotifications,
  selectIsMetamaskNotificationsEnabled,
  selectIsUpdatingMetamaskNotifications,
} from '../../../selectors/notifications';
import { usePushNotificationsToggle } from './usePushNotifications';
import Logger from '../../Logger';
import {
  setUserHasTurnedOffNotificationsOnce,
  updateNotificationSubscriptionExpiration,
} from '../constants/notification-storage-keys';

/**
 * Custom hook to fetch and update the list of notifications.
 * Manages loading and error states internally.
 *
 * @returns An object containing the `listNotifications` function, loading state, and error state.
 */
export function useListNotifications() {
  const loading = useSelector(selectIsFetchingMetamaskNotifications);
  const data = useSelector(getNotificationsList);
  const [error, setError] = useState<unknown>(null);
  const listNotifications = useCallback(async () => {
    assertIsFeatureEnabled();
    setError(null);
    await fetchNotifications().catch((e) => setError(e));
  }, []);

  return {
    listNotifications,
    notificationsData: data,
    isLoading: loading,
    error,
  };
}

/**
 * Adds a tiny delay between 2 loading states to ensure that we have a smooth loading experience.
 * It prevents any flickers while we are transitioning between the 2 loading params
 * E.g.
 * ```
 * loadingParam1: true, loadingParam2: false // 1st loading
 * loadingParam1: false, loadingParam2: false // False positive (causes UI flicker)
 * loadingParam1: false, loadingParam2: true // 2nd loading
 * loadingParam1: false, loadingParam2: false // Finished loading
 * ```
 * @param loadingParam1 boolean
 * @param loadingParam2 boolean
 */
export function useContiguousLoading(
  loadingParam1: boolean,
  loadingParam2: boolean,
) {
  const [contiguousLoading, setContiguousLoading] = useState(false);

  useEffect(() => {
    const isLoading = loadingParam1 || loadingParam2;

    // If loading is true, we set it immediately
    if (isLoading) {
      setContiguousLoading(isLoading);
      return;
    }

    // Otherwise if loading has stopped, we will continue to be loading for a little bit
    // In case the boolean params update again
    if (!isLoading) {
      const timeout = setTimeout(() => {
        setContiguousLoading(false);
      }, 100);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [loadingParam1, loadingParam2]);

  return contiguousLoading;
}

/**
 * Custom hook to enable MetaMask notifications.
 * This hook encapsulates the logic for enabling notifications, handling loading and error states.
 * It uses Redux to dispatch actions related to notifications.
 *
 * @returns An object containing:
 * - `enableNotifications`: A function that triggers the enabling of notifications.
 * - `loading`: A boolean indicating if the enabling process is ongoing.
 * - `error`: A string or null value representing any error that occurred during the process.
 */
export function useEnableNotifications(props = { nudgeEnablePush: true }) {
  const { togglePushNotification, loading: pushLoading } =
    usePushNotificationsToggle(props);
  const data = useSelector(selectIsMetamaskNotificationsEnabled);
  const loading = useSelector(selectIsUpdatingMetamaskNotifications);
  const [error, setError] = useState<unknown>(null);
  const enableNotifications = useCallback(async () => {
    assertIsFeatureEnabled();
    setError(null);
    await enableNotificationsHelper().catch((e) => setError(e));
    await togglePushNotification(true).catch(() => {
      /* Do Nothing */
    });
    await updateNotificationSubscriptionExpiration();
  }, [togglePushNotification]);

  const contiguousLoading = useContiguousLoading(loading, pushLoading);

  return {
    enableNotifications,
    isEnablingNotifications: loading,
    isEnablingPushNotifications: pushLoading,
    loading: loading || pushLoading || contiguousLoading,
    error,
    data,
  };
}

/**
 * Custom hook to disable notifications by deleting on-chain triggers associated with accounts.
 * It also disables snap and feature announcements. Manages loading and error states internally.
 *
 * @returns An object containing the `disableNotifications` function, loading state, and error state.
 */
export function useDisableNotifications() {
  const { togglePushNotification, loading: pushLoading } =
    usePushNotificationsToggle();

  const data = useSelector(selectIsMetamaskNotificationsEnabled);
  const loading = useSelector(selectIsUpdatingMetamaskNotifications);
  const [error, setError] = useState<string | undefined>(undefined);
  const disableNotifications = useCallback(async () => {
    assertIsFeatureEnabled();
    setError(undefined);
    await togglePushNotification(false);
    await disableNotificationsHelper().catch((e) => {
      Logger.error(e);
      setError(`Failed to disable push notifications`);
    });
    await setUserHasTurnedOffNotificationsOnce();
  }, [togglePushNotification]);

  return {
    disableNotifications,
    loading: loading && pushLoading,
    // This will be fixed in a separate PR to converge the types correctly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: error as any,
    data,
  };
}

/**
 * Provides a function to mark notifications as read. This hook does not take parameters itself,
 * but returns a function that accepts the notification parameters when called.
 *
 * @returns An object containing the `markNotificationAsRead` function which takes a `notifications`
 * parameter of type `MarkAsReadNotificationsParam` and marks those notifications as read.
 */
export function useMarkNotificationAsRead() {
  const [loading, setLoading] = useState(false);
  const markNotificationAsRead = useCallback(
    async (notifications: MarkAsReadNotificationsParam) => {
      assertIsFeatureEnabled();
      setLoading(true);
      await markNotificationsAsReadHelper(notifications);
      setLoading(false);
    },
    [],
  );

  return {
    markNotificationAsRead,
    loading,
  };
}

/**
 * Custom hook to delete notifications storage key.
 * It manages loading and error states internally.
 *
 * @returns An object containing the `deleteNotificationsStorageKey` function, loading state, and error state.
 */
export function useResetNotifications() {
  const loading = useSelector(selectIsUpdatingMetamaskNotifications);
  const [error, setError] = useState<unknown>(null);
  const resetNotifications = useCallback(async () => {
    assertIsFeatureEnabled();
    setError(null);
    await resetNotificationsHelper().catch((e) => setError(e));
  }, []);

  return {
    resetNotifications,
    loading,
    error,
  };
}
