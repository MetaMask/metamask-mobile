/* eslint-disable import/prefer-default-export */
import { useState, useCallback, useEffect } from 'react';
import { ProfileSyncingReturn } from './types';
import { getErrorMessage } from '../../../util/errorHandling';
import {
  disableProfileSyncing as disableProfileSyncingAction,
  enableProfileSyncing as enableProfileSyncingAction,
  syncInternalAccountsWithUserStorage as syncInternalAccountsWithUserStorageAction,
} from '../../../actions/notification/helpers';

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

/**
 * Custom hook to dispatch account syncing.
 *
 * @returns An object containing the `dispatchAccountSyncing` function, loading state, and error state.
 */
export const useAccountSyncing = () => {
  const [isLoading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const dispatchAccountSyncing = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const errorMessage = await syncInternalAccountsWithUserStorageAction();
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
    dispatchAccountSyncing,
    error,
    isLoading,
  };
};

export const useAccountSyncingEffect = () => {
  const { dispatchAccountSyncing } = useAccountSyncing();

  useEffect(() => {
    dispatchAccountSyncing();
  }, [dispatchAccountSyncing]);
};
