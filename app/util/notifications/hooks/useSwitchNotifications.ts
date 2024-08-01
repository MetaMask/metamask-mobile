/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/prefer-default-export */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { getErrorMessage } from '../../../util/errorHandling';
import {
  deleteOnChainTriggersByAccount,
  setFeatureAnnouncementsEnabled,
  updateOnChainTriggersByAccount,
} from '../../../actions/notification/helpers';
import { UseSwitchAccountNotificationsData } from './types';
import Engine from '../../../core/Engine';
import { useSelector } from 'react-redux';
import { selectIsUpdatingMetamaskNotificationsAccount } from '../../../selectors/notifications';

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

  // Memoize the accounts array to avoid unnecessary re-fetching
  const memoizedAccounts = useMemo(() => accounts, [accounts]);

  // Effect - async get if accounts are enabled/disabled
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      fetchAccountSettings(memoizedAccounts)
        .then((res: any) => setData(res))
        .catch((e: any) => {
          const errorMessage = getErrorMessage(e);
          setError(errorMessage);
        })
        .finally(() => setLoading(false));
    };
    fetchData();
  }, [memoizedAccounts, fetchAccountSettings]);

  return {
    data,
    initialLoading: loading,
    error,
    accountsBeingUpdated,
    update: fetchAccountSettings,
  };
}
