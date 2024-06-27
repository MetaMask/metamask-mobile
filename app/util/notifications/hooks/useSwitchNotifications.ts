/* eslint-disable import/prefer-default-export */
import { useState, useCallback, useEffect } from 'react';
import { getErrorMessage } from '../../../util/errorHandling';
import {
  deleteOnChainTriggersByAccount,
  setFeatureAnnouncementsEnabled,
  setSnapNotificationsEnabled,
  updateOnChainTriggersByAccount,
} from '../../../actions/notification/pushNotifications';
import { useThunkNotificationDispatch } from '../../../actions/notification/helpers/useThunkNotificationDispatch';
import { UseSwitchAccountNotificationsData } from './types';
import Engine from 'app/core/Engine';
import { useSelector } from 'react-redux';
import { selectIsUpdatingMetamaskNotificationsAccount } from 'app/selectors/pushNotifications';

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

export function useRefetchAccountSettings() {
  const getAccountSettings = useCallback(
    async (accounts: string[]): Promise<UseSwitchAccountNotificationsData> => {
      try {
        const result =
          await Engine.context.NotificationServicesController.checkAccountsPresence(
            accounts,
          );

        return result;
      } catch {
        return {};
      }
    },
    [],
  );

  return getAccountSettings;
}

/**
 * Account Settings Hook.
 * Gets initial loading states, and returns enable/disable account states.
 * Also exposes an update() method so each switch can be manually updated.
 *
 * @param accounts the accounts we are checking to see if notifications are enabled/disabled
 * @returns props for settings page
 */
export function useAccountSettingsProps(accounts: string[]) {
  const accountsBeingUpdated = useSelector(
    selectIsUpdatingMetamaskNotificationsAccount,
  );
  const fetchAccountSettings = useRefetchAccountSettings();
  const [data, setData] = useState<UseSwitchAccountNotificationsData>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Effect - async get if accounts are enabled/disabled
  // NOTE - be careful, as `accounts` is an array and could change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      fetchAccountSettings(accounts)
        .then((res) => setData(res))
        .catch((e) => {
          const errorMessage =
            e instanceof Error ? e.message : JSON.stringify(e ?? '');
          setError(errorMessage);
        })
        .finally(() => setLoading(false));
    };
    fetchData();
  }, [accounts, fetchAccountSettings]);

  return {
    data,
    initialLoading: loading,
    error,
    accountsBeingUpdated,
    update: fetchAccountSettings,
  };
}
