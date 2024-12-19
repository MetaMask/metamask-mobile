import { useState, useCallback, useMemo } from 'react';
import { getErrorMessage } from '../../../util/errorHandling';
import {
  deleteOnChainTriggersByAccount,
  setFeatureAnnouncementsEnabled,
  updateOnChainTriggersByAccount,
} from '../../../actions/notification/helpers';
import Engine from '../../../core/Engine';
import { useDispatch } from 'react-redux';

import { updateAccountState } from '../../../core/redux/slices/notifications';
import { Account } from '../../../components/hooks/useAccounts/useAccounts.types';
import Logger from '../../../util/Logger';
import { isNotificationsFeatureEnabled } from '../constants';

export function useSwitchNotifications() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const resetStates = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  const switchFeatureAnnouncements = useCallback(
    async (state: boolean) => {
      if (!isNotificationsFeatureEnabled()) {
        return;
      }

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

/**
 * Account Settings Hook.
 * Gets initial loading states, and returns enable/disable account states.
 * Also exposes an update() method so each switch can be manually updated.
 *
 * @param accounts the accounts we are checking to see if notifications are enabled/disabled
 * @returns props for settings page
 */

export function useAccountSettingsProps(accounts: Account[]) {
  const dispatch = useDispatch();

  // Memoize the accounts array to avoid unnecessary re-fetching
  const memoAccounts = useMemo(() => accounts.map((account) => account.address),[accounts]);
  const updateAndfetchAccountSettings = useCallback(async () => {
    try {
      const result = await Engine.context.NotificationServicesController.checkAccountsPresence(memoAccounts);
      dispatch(updateAccountState(result));
      return result;
    } catch (err) {
      Logger.log('Failed to get account settings:', err);
    }
  }, [dispatch, memoAccounts]);

  return { updateAndfetchAccountSettings };
}
