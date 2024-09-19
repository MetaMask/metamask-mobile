/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/prefer-default-export */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { getErrorMessage } from '../../../util/errorHandling';
import {
  deleteOnChainTriggersByAccount,
  setFeatureAnnouncementsEnabled,
  updateOnChainTriggersByAccount,
} from '../../../actions/notification/helpers';
import { UseSwitchAccountNotificationsData } from './types';
import Engine from '../../../core/Engine';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectIsMetamaskNotificationsEnabled,
  selectIsUpdatingMetamaskNotificationsAccount,
} from '../../../selectors/notifications';
import { updateAccountState } from '../../../core/redux/slices/notifications';
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

export function useRefetchAccountSettings(
  isMetamaskNotificationsEnabled: boolean,
) {
  const getAccountSettings = useCallback(
    async (accounts: string[]): Promise<UseSwitchAccountNotificationsData> => {
      try {
        if (!isMetamaskNotificationsEnabled) {
          return {};
        }
        const result =
          await Engine.context.NotificationServicesController.checkAccountsPresence(
            accounts,
          );

        return result;
      } catch {
        return {};
      }
    },
    [isMetamaskNotificationsEnabled],
  );

  return { getAccountSettings };
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
  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const { getAccountSettings } = useRefetchAccountSettings(
    isMetamaskNotificationsEnabled,
  );
  const [data, setData] = useState<UseSwitchAccountNotificationsData>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch();

  // Memoize the accounts array to avoid unnecessary re-fetching
  const memoizedAccounts = useMemo(() => accounts, [accounts]);

  // Memoize the accounts array to avoid unnecessary re-fetching

  const update = useCallback(async (addresses: string[]) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAccountSettings(addresses);
      setData(res);
      dispatch(updateAccountState(res));
    } catch {
      setError('Failed to get account settings');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect - async get if accounts are enabled/disabled
  useEffect(() => {
    try {
      const memoAccounts: string[] = memoizedAccounts;
      update(memoAccounts);
    } catch {
      setError('Failed to get account settings');
    } finally {
      setLoading(false);
    }
  }, [memoizedAccounts, update]);

  return {
    data,
    initialLoading: loading,
    error,
    accountsBeingUpdated,
    update,
  };
}
