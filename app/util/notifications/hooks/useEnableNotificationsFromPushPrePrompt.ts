import { useCallback } from 'react';

import {
  assertIsFeatureEnabled,
  enableNotifications as enableNotificationsHelper,
} from '../../../actions/notification/helpers';
import { updateNotificationSubscriptionExpiration } from '../constants/notification-storage-keys';
import { requestPushPermissions } from '../services/NotificationService';
import Logger from '../../Logger';
import { setCachedNativePermissionEnabled } from '../utils/push-notification-status';

export function useEnableNotificationsFromPushPrePrompt() {
  const requestPushPermission = useCallback(async () => {
    assertIsFeatureEnabled();

    try {
      const nativePermissionEnabled = await requestPushPermissions();
      setCachedNativePermissionEnabled(nativePermissionEnabled);
      return nativePermissionEnabled;
    } catch (requestError) {
      setCachedNativePermissionEnabled(false);
      Logger.error(
        requestError as Error,
        'Failed to request push permission from pre-prompt',
      );
      return false;
    }
  }, []);

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
