/* eslint-disable import/prefer-default-export */
import { useState, useCallback, useEffect } from 'react';
import { getErrorMessage } from '../../../util/errorHandling';
import {
  deleteOnChainTriggersByAccount,
  setFeatureAnnouncementsEnabled,
  updateOnChainTriggersByAccount,
} from '../../../actions/notification/pushNotifications';
import { UseSwitchAccountNotificationsData } from './types';
import Engine from '../../../core/Engine';
import { useSelector } from 'react-redux';
import { selectIsUpdatingMetamaskNotificationsAccount } from '../../../selectors/pushNotifications';

export function useSwitchNotifications() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const resetStates = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  const switchFeatureAnnouncements = useCallback(
    async (state: boolean) => {
      resetStates();
      setLoading(true);

      try {
        const errorMessage = await setFeatureAnnouncementsEnabled(state);
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
    [resetStates],
  );

  const switchAccountNotifications = useCallback(
    async (accounts: string[], state: boolean) => {
      resetStates();
      setLoading(true);

      try {
        let errorMessage: string | undefined;
        if (state) {
          errorMessage = await updateOnChainTriggersByAccount(accounts);
        } else {
          errorMessage = await deleteOnChainTriggersByAccount(accounts);
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
    [resetStates],
  );

  return {
    switchFeatureAnnouncements,
    switchAccountNotifications,
    loading,
    error,
  };
}

function useRefetchAccountSettings() {
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
