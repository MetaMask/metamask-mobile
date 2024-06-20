import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  SwitchSnapNotificationsChangeReturn,
  SwitchFeatureAnnouncementsChangeReturn,
  SwitchAccountNotificationsChangeReturn,
} from './types';
import { getErrorMessage } from '../../../util/errorHandling';
import {
  checkAccountsPresenceRequest,
  deleteOnChainTriggersByAccountRequest,
  setFeatureAnnouncementsEnabledRequest,
  setSnapNotificationsEnabledRequest,
  updateOnChainTriggersByAccountRequest,
} from '../../../actions/notification/pushNotifications';

export function useSwitchSnapNotificationsChange(): SwitchSnapNotificationsChangeReturn {
  const dispatch = useDispatch();
  const [error, setError] = useState<string>();

  const onChange = useCallback(() => {
    try {
      dispatch(setSnapNotificationsEnabledRequest());
    } catch (e) {
      setError(getErrorMessage(e));
      throw e;
    }
  }, [dispatch]);

  return {
    onChange,
    error,
  };
}

export function useSwitchFeatureAnnouncementsChange(): SwitchFeatureAnnouncementsChangeReturn {
  const dispatch = useDispatch();
  const [error, setError] = useState<string>();

  const onChange = useCallback(() => {
    try {
      dispatch(setFeatureAnnouncementsEnabledRequest());
    } catch (e) {
      setError(getErrorMessage(e));
      throw e;
    }
  }, [dispatch]);

  return {
    onChange,
    error,
  };
}

export function useSwitchAccountNotifications(): {
  switchAccountNotifications: (accounts: string[]) => void;
  isLoading: boolean;
  error: string | undefined;
} {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const switchAccountNotifications = useCallback(
    (accounts: string[]) => {
      setIsLoading(true);

      try {
        dispatch(checkAccountsPresenceRequest(accounts));
      } catch (e) {
        setError(getErrorMessage(e));
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch],
  );

  return { switchAccountNotifications, isLoading, error };
}

export function useSwitchAccountNotificationsChange(): SwitchAccountNotificationsChangeReturn {
  const dispatch = useDispatch();
  const [error, setError] = useState<string>();

  const onChange = useCallback(
    (accounts: string[], state: boolean) => {
      try {
        if (state) {
          dispatch(updateOnChainTriggersByAccountRequest(accounts));
        } else {
          dispatch(deleteOnChainTriggersByAccountRequest(accounts));
        }
      } catch (e) {
        setError(getErrorMessage(e));
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
