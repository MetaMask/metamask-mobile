/* eslint-disable import/prefer-default-export */
import { useState, useCallback } from 'react';
import { ProfileSyncingReturn } from './types';
import { getErrorMessage } from '../../../util/errorHandling';
import {
  disableProfileSyncing as disableProfileSyncingAction,
  enableProfileSyncing as enableProfileSyncingAction,
} from '../../../actions/notification/pushNotifications';

/**
 * Custom hook to enable profile syncing. This hook handles the process of signing in
 * and enabling profile syncing via dispatch actions.
 *
 * @returns An object containing the `enableProfileSyncing` function, loading state, and error state.
 */
export function useProfileSyncing(): ProfileSyncingReturn {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const enableProfileSyncing = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      // set profile syncing to true
      const errorMessage = await enableProfileSyncingAction();
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

  const disableProfileSyncing = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const errorMessage = await disableProfileSyncingAction();
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

  return { enableProfileSyncing, disableProfileSyncing, loading, error };
}
