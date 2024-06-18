import { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Logger from '../../../util/Logger';
import {
  selectIsSignedIn,
  selectIsProfileSyncingEnabled,
} from '../../../selectors/pushNotifications';
import Creators from '../../../store/ducks/notifications';
import { DisableMetametricsReturn, EnableMetametricsReturn } from './types';

/**
 * Provides a hook to enable MetaMetrics tracking.
 * This hook handles user sign-in if not already signed in and sets participation in MetaMetrics to true.
 *
 * @returns An object containing the `enableMetametrics` function, a `loading` boolean indicating the operation status, and an `error` string for error messages.
 */
export function useEnableMetametrics(): EnableMetametricsReturn {
  const dispatch = useDispatch();
  const isUserSignedIn = useSelector(selectIsSignedIn);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const enableMetametrics = useCallback(async () => {
    setLoading(true);
    dispatch(Creators.showLoadingIndication());
    setError(null);

    try {
      if (!isUserSignedIn) {
        await dispatch(Creators.performSignIn());
      }

      await dispatch(Creators.setParticipateInMetaMetrics(true));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred');
      Logger.error(e as any);
      throw e;
    } finally {
      setLoading(false);
      dispatch(Creators.hideLoadingIndication());
    }

    dispatch(Creators.hideLoadingIndication());
  }, [dispatch, isUserSignedIn]);

  return {
    enableMetametrics,
    loading,
    error,
  };
}
/**
 * Provides a hook to disable MetaMetrics tracking.
 * This hook handles user sign-out if profile syncing is not enabled and sets participation in MetaMetrics to false.
 *
 * @returns An object containing the `disableMetametrics` function, a `loading` boolean indicating the operation status, and an `error` string for error messages.
 */
export function useDisableMetametrics(): DisableMetametricsReturn {
  const dispatch = useDispatch();
  const isProfileSyncingEnabled = useSelector(selectIsProfileSyncingEnabled);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const disableMetametrics = useCallback(async () => {
    setLoading(true);
    dispatch(Creators.showLoadingIndication());
    setError(null);

    try {
      if (!isProfileSyncingEnabled) {
        await dispatch(Creators.performSignOut());
      }
      await dispatch(Creators.setParticipateInMetaMetrics(false));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred');
      throw e;
    } finally {
      setLoading(false);
      dispatch(Creators.hideLoadingIndication());
    }

    dispatch(Creators.hideLoadingIndication());
  }, [dispatch, isProfileSyncingEnabled]);

  return {
    disableMetametrics,
    loading,
    error,
  };
}
