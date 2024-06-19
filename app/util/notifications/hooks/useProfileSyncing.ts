import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  EnableProfileSyncingReturn,
  DisableProfileSyncingReturn,
} from './types';
import { getErrorMessage } from '../../../util/errorHandling';
import {
  disableProfileSyncingRequest,
  enableProfileSyncingRequest,
} from '../../../actions/notification/pushNotifications';
/**
 * Custom hook to enable profile syncing. This hook handles the process of signing in
 * and enabling profile syncing via dispatch actions.
 *
 * @returns An object containing the `enableProfileSyncing` function, loading state, and error state.
 */
export function useEnableProfileSyncing(): EnableProfileSyncingReturn {
  const dispatch = useDispatch();
  const [error, setError] = useState<string>();

  const enableProfileSyncing = useCallback(() => {
    try {
      // set profile syncing to true
      dispatch(enableProfileSyncingRequest());
    } catch (e) {
      setError(getErrorMessage(e));
      throw e;
    }
  }, [dispatch]);

  return { enableProfileSyncing, error };
}
/**
 * Custom hook to disable profile syncing. This hook handles the process of disabling notifications,
 * disabling profile syncing, and signing out if MetaMetrics participation is not enabled.
 *
 * @returns An object containing the `disableProfileSyncing` function, current profile syncing state,
 * loading state, and error state.
 */
export function useDisableProfileSyncing(): DisableProfileSyncingReturn {
  const dispatch = useDispatch();
  const [error, setError] = useState<string>();

  const disableProfileSyncing = useCallback(() => {
    try {
      dispatch(disableProfileSyncingRequest());
    } catch (e) {
      setError(getErrorMessage(e));
      throw e;
    }
  }, [dispatch]);

  return { disableProfileSyncing, error };
}
