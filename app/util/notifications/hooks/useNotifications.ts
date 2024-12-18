import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';

import {
  ListNotificationsReturn,
  CreateNotificationsReturn,
  EnableNotificationsReturn,
  DisableNotificationsReturn,
  MarkNotificationAsReadReturn,
  deleteNotificationsStorageKeyReturn,
} from './types';
import { getErrorMessage } from '../../../util/errorHandling';
import {
  MarkAsReadNotificationsParam,
  performDeleteStorage,
  disableNotificationServices,
  enableNotificationServices,
  fetchAndUpdateMetamaskNotifications,
  markMetamaskNotificationsAsRead,
  updateOnChainTriggersByAccount,
} from '../../../actions/notification/helpers';
import { getNotificationsList } from '../../../selectors/notifications';
import { usePushNotifications } from './usePushNotifications';
import { isNotificationsFeatureEnabled } from '../constants';

/**
 * Custom hook to fetch and update the list of notifications.
 * Manages loading and error states internally.
 *
 * @returns An object containing the `listNotifications` function, loading state, and error state.
 */
export function useListNotifications(): ListNotificationsReturn {
  const notifications = useSelector(getNotificationsList);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const listNotifications = useCallback(async () => {
    if (!isNotificationsFeatureEnabled()) {
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const errorMessage = await fetchAndUpdateMetamaskNotifications();
      if (errorMessage) {
        setError(getErrorMessage(errorMessage));
        return errorMessage;
      }
    } catch (e) {
      const errorMessage = getErrorMessage(e);
      setError(errorMessage);
      return errorMessage;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    listNotifications,
    notificationsData: notifications,
    isLoading: loading,
    error,
  };
}
/**
 * Custom hook to enable notifications by creating on-chain triggers.
 * It manages loading and error states internally.
 *
 * @returns An object containing the `enableNotifications` function, loading state, and error state.
 */
export function useCreateNotifications(): CreateNotificationsReturn {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const createNotifications = useCallback(async (accounts: string[]) => {
    if (!isNotificationsFeatureEnabled()) {
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const errorMessage = await updateOnChainTriggersByAccount(accounts);
      if (errorMessage) {
        setError(getErrorMessage(errorMessage));
        return errorMessage;
      }
    } catch (e) {
      const errorMessage = getErrorMessage(e);
      setError(errorMessage);
      return errorMessage;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createNotifications,
    loading,
    error,
  };
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
export function useEnableNotifications(): EnableNotificationsReturn {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const { switchPushNotifications } = usePushNotifications();
  const enableNotifications = useCallback(async () => {
    if (!isNotificationsFeatureEnabled()) {
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const errorEnablingNotifications = await enableNotificationServices();
      const errorEnablingPushNotifications = await switchPushNotifications(
        true,
      );
      const errorMessage =
        errorEnablingNotifications || errorEnablingPushNotifications;

      if (errorMessage) {
        setError(getErrorMessage(errorMessage));
        return errorMessage;
      }
    } catch (e) {
      const errorMessage = getErrorMessage(e);
      setError(errorMessage);
      return errorMessage;
    } finally {
      setLoading(false);
    }
  }, [switchPushNotifications]);

  return {
    enableNotifications,
    loading,
    error,
  };
}
/**
 * Custom hook to disable notifications by deleting on-chain triggers associated with accounts.
 * It also disables snap and feature announcements. Manages loading and error states internally.
 *
 * @returns An object containing the `disableNotifications` function, loading state, and error state.
 */
export function useDisableNotifications(): DisableNotificationsReturn {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const { switchPushNotifications } = usePushNotifications();
  const disableNotifications = useCallback(async () => {
    if (!isNotificationsFeatureEnabled()) {
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const errorDisablingNotifications = await disableNotificationServices();
      const errorDisablingPushNotifications = await switchPushNotifications(
        false,
      );
      const errorMessage =
        errorDisablingNotifications || errorDisablingPushNotifications;

      if (errorMessage) {
        setError(getErrorMessage(errorMessage));
        return errorMessage;
      }
    } catch (e) {
      const errorMessage = getErrorMessage(e);
      setError(errorMessage);
      return errorMessage;
    } finally {
      setLoading(false);
    }
  }, [switchPushNotifications]);

  return {
    disableNotifications,
    loading,
    error,
  };
}
/**
 * Provides a function to mark notifications as read. This hook does not take parameters itself,
 * but returns a function that accepts the notification parameters when called.
 *
 * @returns An object containing the `markNotificationAsRead` function which takes a `notifications`
 * parameter of type `MarkAsReadNotificationsParam` and marks those notifications as read.
 */
export function useMarkNotificationAsRead(): MarkNotificationAsReadReturn {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const markNotificationAsRead = useCallback(
    async (notifications: MarkAsReadNotificationsParam) => {
      if (!isNotificationsFeatureEnabled()) {
        return;
      }

      setLoading(true);
      setError(undefined);
      try {
        const errorMessage = await markMetamaskNotificationsAsRead(
          notifications,
        );
        if (errorMessage) {
          setError(getErrorMessage(errorMessage));
          return errorMessage;
        }
      } catch (e) {
        const errorMessage = getErrorMessage(e);
        setError(errorMessage);
        return errorMessage;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    markNotificationAsRead,
    loading,
    error,
  };
}

/**
 * Custom hook to delete notifications storage key.
 * It manages loading and error states internally.
 *
 * @returns An object containing the `deleteNotificationsStorageKey` function, loading state, and error state.
 */
export function useDeleteNotificationsStorageKey(): deleteNotificationsStorageKeyReturn {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const deleteNotificationsStorageKey = useCallback(async () => {
    if (!isNotificationsFeatureEnabled()) {
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const errorMessage = await performDeleteStorage();
      if (errorMessage) {
        setError(getErrorMessage(errorMessage));
        return errorMessage;
      }
    } catch (e) {
      const errorMessage = getErrorMessage(e);
      setError(errorMessage);
      return errorMessage;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    deleteNotificationsStorageKey,
    loading,
    error,
  };
}
