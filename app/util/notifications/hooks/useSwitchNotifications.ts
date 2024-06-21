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
  const [error, setError] = useState<string>();

  const switchSnapNotifications = useCallback(
    async (state: boolean) => {
      setLoading(true);

      try {
        const errorMessage = await dispatch(setSnapNotificationsEnabled(state));
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
    [dispatch],
  );

  const switchFeatureAnnouncements = useCallback(
    async (state: boolean) => {
      setLoading(true);

      try {
        const errorMessage = await dispatch(
          setFeatureAnnouncementsEnabled(state),
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
    [dispatch],
  );

  const switchAccountNotifications = useCallback(
    async (accounts: string[], state: boolean) => {
      setLoading(true);

      try {
        if (state) {
          const errorMessage = await dispatch(
            updateOnChainTriggersByAccount(accounts),
          );

          if (errorMessage) {
            setError(getErrorMessage(errorMessage));
            return errorMessage;
          }
        } else {
          const errorMessage = await dispatch(
            deleteOnChainTriggersByAccount(accounts),
          );

          if (errorMessage) {
            setError(getErrorMessage(errorMessage));
            return errorMessage;
          }
        }
      } catch (e) {
        const errorMessage = getErrorMessage(e);
        setError(errorMessage);
        return errorMessage;
      } finally {
        setLoading(false);
      }
    },
    [dispatch],
  );

  return {
    switchSnapNotifications,
    switchFeatureAnnouncements,
    switchAccountNotifications,
    loading,
    error,
  };
}
