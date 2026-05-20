import { useCallback } from 'react';

import {
  assertIsFeatureEnabled,
  enableNotifications as enableNotificationsHelper,
} from '../../../actions/notification/helpers';
import { updateNotificationSubscriptionExpiration } from '../constants/notification-storage-keys';
import { requestPushPermissions } from '../services/NotificationService';
import Logger from '../../Logger';

export function useEnableNotificationsFromPushPrePrompt() {
  // Ask the OS for push permission while the pre-prompt is still in focus.
  const requestPushPermission = useCallback(async () => {
    assertIsFeatureEnabled();

    try {
      return await requestPushPermissions();
    } catch (requestError) {
      Logger.error(
        requestError as Error,
        'Failed to request push permission from pre-prompt',
      );
      return false;
    }
  }, []);

  // Finish MetaMask notification setup after the pre-prompt resolves. The OS
  // permission result determines whether push registration should be attempted.
  const enableNotificationsInBackground = useCallback(
    (nativePermissionEnabled: boolean) => {
      const registerPushNotifications = nativePermissionEnabled;

      (async () => {
        try {
          await enableNotificationsHelper({ registerPushNotifications });
          await updateNotificationSubscriptionExpiration();
        } catch (backgroundSetupError) {
          Logger.error(
            backgroundSetupError as Error,
            'Failed to enable notifications from push pre-prompt',
          );
        }
      })();
    },
    [],
  );

  return {
    enableNotificationsInBackground,
    requestPushPermission,
  };
}
