import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import Logger from '../../../util/Logger';
import {
  setSnapNotificationsEnabled,
  setFeatureAnnouncementsEnabled,
  checkAccountsPresence,
  deleteOnChainTriggersByAccount,
  updateOnChainTriggersByAccount,
  hideLoadingIndication,
} from '../../../actions/notification';

export function useSwitchSnapNotificationsChange(): {
  onChange: (state: boolean) => Promise<void>;
  error: null | string;
} {
  const dispatch = useDispatch();

  const [error, setError] = useState<null | string>(null);

  const onChange = useCallback(
    async (state: boolean) => {
      setError(null);

      try {
        await dispatch(setSnapNotificationsEnabled(state));
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : (JSON.stringify(e ?? '') as any);
        setError(errorMessage);
        Logger.error(errorMessage);
        throw e;
      }
    },
    [dispatch],
  );

  return {
    onChange,
    error,
  };
}

export function useSwitchFeatureAnnouncementsChange(): {
  onChange: (state: boolean) => Promise<void>;
  error: null | string;
} {
  const dispatch = useDispatch();

  const [error, setError] = useState<null | string>(null);

  const onChange = useCallback(
    async (state: boolean) => {
      setError(null);

      try {
        await dispatch(setFeatureAnnouncementsEnabled(state));
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : (JSON.stringify(e ?? '') as any);
        setError(errorMessage);
        throw e;
      }
    },
    [dispatch],
  );

  return {
    onChange,
    error,
  };
}

export interface UseSwitchAccountNotificationsData {
  [address: string]: boolean;
}

export function useSwitchAccountNotifications(accounts: string[]): {
  switchAccountNotifications: () => Promise<
    UseSwitchAccountNotificationsData | undefined
  >;
  isLoading: boolean;
  error: string | null;
} {
  const dispatch = useDispatch();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchAccountNotifications = useCallback(async (): Promise<
    UseSwitchAccountNotificationsData | undefined
  > => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await dispatch(checkAccountsPresence(accounts));
      return data as unknown as UseSwitchAccountNotificationsData;
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : (JSON.stringify(e ?? '') as any);
      setError(errorMessage);
      Logger.error(errorMessage);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [accounts, dispatch]);

  return { switchAccountNotifications, isLoading, error };
}

export function useSwitchAccountNotificationsChange(): {
  onChange: (addresses: string[], state: boolean) => Promise<void>;
  error: string | null;
} {
  const dispatch = useDispatch();

  const [error, setError] = useState<string | null>(null);

  const onChange = useCallback(
    async (addresses: string[], state: boolean) => {
      setError(null);

      try {
        if (state) {
          await dispatch(updateOnChainTriggersByAccount(addresses));
        } else {
          await dispatch(deleteOnChainTriggersByAccount(addresses));
        }
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : (JSON.stringify(e ?? '') as any);
        Logger.error(errorMessage);
        setError(errorMessage);
        throw e;
      }
      dispatch(hideLoadingIndication());
    },
    [dispatch],
  );

  return {
    onChange,
    error,
  };
}
