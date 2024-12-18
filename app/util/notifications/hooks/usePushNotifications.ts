import { useState, useCallback } from 'react';
import { getErrorMessage } from '../../errorHandling';
import {
  disablePushNotifications,
  enablePushNotifications,
} from '../../../actions/notification/helpers';
import { mmStorage } from '../settings';
import { UserStorage } from '@metamask/notification-services-controller/notification-services';
import { isNotificationsFeatureEnabled } from '../constants';

export function usePushNotifications() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const resetStates = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  const switchPushNotifications = useCallback(
    async (state: boolean) => {
      if (!isNotificationsFeatureEnabled()) {
        return;
      }

      resetStates();
      setLoading(true);
      let errorMessage: string | undefined;

      try {
        const userStorage: UserStorage = mmStorage.getLocal('pnUserStorage');
        if (state) {
          const fcmToken = mmStorage.getLocal('metaMaskFcmToken');
          errorMessage = await enablePushNotifications(
            userStorage,
            fcmToken?.data,
          );
        } else {
          errorMessage = await disablePushNotifications(userStorage);
        }
        if (errorMessage) {
          setError(getErrorMessage(errorMessage));
        }
      } catch (e) {
        errorMessage = getErrorMessage(e);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [resetStates],
  );

  return {
    switchPushNotifications,
    loading,
    error,
  };
}
