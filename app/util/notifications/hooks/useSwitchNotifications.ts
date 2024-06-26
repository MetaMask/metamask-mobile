/* eslint-disable import/prefer-default-export */
import { useState, useCallback } from 'react';
import { getErrorMessage } from '../../../util/errorHandling';
import {
  deleteOnChainTriggersByAccount,
  setFeatureAnnouncementsEnabled,
  setSnapNotificationsEnabled,
  updateOnChainTriggersByAccount,
} from '../../../actions/notification/pushNotifications';
import { useThunkNotificationDispatch } from '../../../actions/notification/helpers/useThunkNotificationDispatch';

export function useSwitchNotifications() {
  const dispatch = useThunkNotificationDispatch();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const resetStates = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  const switchSnapNotifications = useCallback(
    async (state: boolean) => {
      resetStates();
      setLoading(true);

      try {
        const errorMessage = await dispatch(setSnapNotificationsEnabled(state));
        if (errorMessage) {
          setError(getErrorMessage(errorMessage));
        }
      } catch (e) {
        const errorMessage = getErrorMessage(e);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [dispatch, resetStates],
  );

  const switchFeatureAnnouncements = useCallback(
    async (state: boolean) => {
      resetStates();
      setLoading(true);

      try {
        const errorMessage = await dispatch(
          setFeatureAnnouncementsEnabled(state),
        );
        if (errorMessage) {
          setError(getErrorMessage(errorMessage));
        }
      } catch (e) {
        const errorMessage = getErrorMessage(e);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [dispatch, resetStates],
  );

  const switchAccountNotifications = useCallback(
    async (accounts: string[], state: boolean) => {
      resetStates();
      setLoading(true);

      try {
        let errorMessage: string | undefined;
        if (state) {
          errorMessage = await dispatch(
            updateOnChainTriggersByAccount(accounts),
          );
        } else {
          errorMessage = await dispatch(
            deleteOnChainTriggersByAccount(accounts),
          );
        }

        if (errorMessage) {
          setError(getErrorMessage(errorMessage));
        }
      } catch (e) {
        const errorMessage = getErrorMessage(e);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [dispatch, resetStates],
  );

  return {
    switchSnapNotifications,
    switchFeatureAnnouncements,
    switchAccountNotifications,
    loading,
    error,
  };
}
