import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import Logger from '../../../util/Logger';
import Creators from '../../../store/ducks/notifications';
import {
  EnableProfileSyncingReturn,
  DisableProfileSyncingReturn,
  SetIsProfileSyncingEnabledReturn,
} from './types';

/**
 * Custom hook to enable profile syncing. This hook handles the process of signing in
 * and enabling profile syncing via dispatch actions.
 *
 * @returns An object containing the `enableProfileSyncing` function, loading state, and error state.
 */
export function useEnableProfileSyncing(): EnableProfileSyncingReturn {
  const dispatch = useDispatch();

  const [error, setError] = useState<string | null>(null);

  const enableProfileSyncing = useCallback(async () => {
    setError(null);

    try {
      // set profile syncing to true
      await dispatch(Creators.enableProfileSyncingRequest());
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : (JSON.stringify(e ?? '') as any);
      Logger.error(errorMessage);
      setError(errorMessage);
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

  const [error, setError] = useState<string | null>(null);

  const disableProfileSyncing = useCallback(async () => {
    setError(null);

    try {
      // disable profile syncing
      await dispatch(Creators.disableProfileSyncingRequest());
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : (JSON.stringify(e ?? '') as any);
      setError(errorMessage);
      Logger.error(errorMessage);
      throw e;
    } finally {
      dispatch(Creators.hideLoadingIndication());
    }
  }, [dispatch]);

  return { disableProfileSyncing, error };
}
export function useSetIsProfileSyncingEnabled(
  state: boolean,
): SetIsProfileSyncingEnabledReturn {
  const dispatch = useDispatch();

  const [error, setError] = useState<string | null>(null);

  const setIsProfileSyncingEnabled = useCallback(async () => {
    setError(null);

    try {
      //TODO: check necessity of a separate action for this or not
      await dispatch(Creators.setIsProfileSyncingEnabledAction(state));
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : (JSON.stringify(e ?? '') as any);
      setError(errorMessage);
      Logger.error(errorMessage);
      throw e;
    }
  }, [dispatch, state]);

  return { setIsProfileSyncingEnabled, error };
}
