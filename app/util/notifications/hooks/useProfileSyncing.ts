import { useState, useCallback } from 'react';
import {
  EnableProfileSyncingReturn,
  DisableProfileSyncingReturn,
} from './types';
import { getErrorMessage } from '../../../util/errorHandling';
import {
  disableProfileSyncing as disableProfileSyncingAction,
  enableProfileSyncing as enableProfileSyncingAction,
} from '../../../actions/notification/pushNotifications';

import { useThunkNotificationDispatch } from '../../../actions/notification/helpers/useThunkNotificationDispatch';

/**
 * Custom hook to enable profile syncing. This hook handles the process of signing in
 * and enabling profile syncing via dispatch actions.
 *
 * @returns An object containing the `enableProfileSyncing` function, loading state, and error state.
 */
export function useEnableProfileSyncing(): EnableProfileSyncingReturn {
  const dispatch = useThunkNotificationDispatch();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const enableProfileSyncing = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      // set profile syncing to true
      const errorMessage = await dispatch(enableProfileSyncingAction());
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
  }, [dispatch]);

  return { enableProfileSyncing, loading, error };
}
/**
 * Custom hook to disable profile syncing. This hook handles the process of disabling notifications,
 * disabling profile syncing, and signing out if MetaMetrics participation is not enabled.
 *
 * @returns An object containing the `disableProfileSyncing` function, current profile syncing state,
 * loading state, and error state.
 */
export function useDisableProfileSyncing(): DisableProfileSyncingReturn {
  const dispatch = useThunkNotificationDispatch();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const disableProfileSyncing = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const errorMessage = await dispatch(disableProfileSyncingAction());
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
  }, [dispatch]);

  return { disableProfileSyncing, loading, error };
}
