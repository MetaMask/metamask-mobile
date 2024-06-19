import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import type { Notification } from '../../../util/notifications/types/notification';
import {
  ListNotificationsReturn,
  CreateNotificationsReturn,
  EnableNotificationsReturn,
  DisableNotificationsReturn,
  MarkNotificationAsReadReturn,
} from './types';
import { getErrorMessage } from '../../../util/errorHandling';
import {
  disableNotificationsServicesRequest,
  enableNotificationsServicesRequest,
  fetchAndUpdateMetamaskNotificationsRequest,
  markMetamaskNotificationsAsReadRequest,
  setMetamaskNotificationsFeatureSeenRequest,
  updateOnChainTriggersByAccountRequest,
} from '../../../actions/notification/pushNotifications';

/**
 * Custom hook to fetch and update the list of notifications.
 * Manages loading and error states internally.
 *
 * @returns An object containing the `listNotifications` function, loading state, and error state.
 */
export function useListNotifications(): ListNotificationsReturn {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const [notificationsData, setNotificationsData] = useState<
    Notification[] | undefined
  >(undefined);

  const listNotifications = useCallback(() => {
    setLoading(true);

    try {
      dispatch(fetchAndUpdateMetamaskNotificationsRequest());
    } catch (e) {
      setError(getErrorMessage(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  return {
    listNotifications,
    notificationsData,
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
  const dispatch = useDispatch();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const createNotifications = useCallback(
    (accounts: string[]) => {
      setLoading(true);

      try {
        dispatch(updateOnChainTriggersByAccountRequest(accounts));
        dispatch(setMetamaskNotificationsFeatureSeenRequest());
      } catch (e) {
        setError(getErrorMessage(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [dispatch],
  );

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
  const dispatch = useDispatch();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const enableNotifications = useCallback(() => {
    setLoading(true);

    try {
      dispatch(enableNotificationsServicesRequest());
      dispatch(setMetamaskNotificationsFeatureSeenRequest());
    } catch (e) {
      setError(getErrorMessage(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

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
  const dispatch = useDispatch();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const disableNotifications = useCallback(() => {
    setLoading(true);

    try {
      dispatch(disableNotificationsServicesRequest());
    } catch (e) {
      setError(getErrorMessage(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  return {
    disableNotifications,
    loading,
    error,
  };
}
/**
 * Custom hook to mark specific notifications as read.
 * It accepts a parameter of notifications to be marked as read and manages loading and error states internally.
 *
 * @param notifications - The notifications to mark as read.
 * @returns An object containing the `markNotificationAsRead` function, loading state, and error state.
 */
export function useMarkNotificationAsRead(): MarkNotificationAsReadReturn {
  const dispatch = useDispatch();
  const [error, setError] = useState<string>();

  const markNotificationAsRead = useCallback(
    (notifications: Notification[]) => {
      try {
        dispatch(markMetamaskNotificationsAsReadRequest(notifications));
      } catch (e) {
        setError(getErrorMessage(e));
        throw e;
      }
    },
    [dispatch],
  );

  return {
    markNotificationAsRead,
    error,
  };
}
