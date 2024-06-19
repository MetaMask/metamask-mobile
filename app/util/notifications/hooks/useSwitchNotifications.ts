import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  SwitchSnapNotificationsChangeReturn,
  SwitchFeatureAnnouncementsChangeReturn,
  UseSwitchAccountNotificationsData,
  SwitchAccountNotificationsChangeReturn,
  SwitchPushNotificationsReturn,
} from './types';
import { getErrorMessage } from '../../../util/errorHandling';
import {
  checkAccountsPresenceRequest,
  deleteOnChainTriggersByAccountRequest,
  disablePushNotificationsRequest,
  enablePushNotificationsRequest,
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

export function useSwitchPushNotificationsChange(): SwitchPushNotificationsReturn {
  const dispatch = useDispatch();
  const [error, setError] = useState<string>();

  const onChange = useCallback(
    (UUIDS: string[], state: boolean) => {
      try {
        if (state === true) {
          dispatch(enablePushNotificationsRequest(UUIDS));
        } else {
          dispatch(disablePushNotificationsRequest(UUIDS));
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

export function useSwitchAccountNotifications(): {
  switchAccountNotifications: (
    accounts: string[],
  ) => UseSwitchAccountNotificationsData | undefined;
  isLoading: boolean;
  error: string | undefined;
} {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const switchAccountNotifications = useCallback(
    (accounts: string[]): UseSwitchAccountNotificationsData | undefined => {
      setIsLoading(true);

      try {
        const data = dispatch(checkAccountsPresenceRequest(accounts));
        return data as unknown as UseSwitchAccountNotificationsData;
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
