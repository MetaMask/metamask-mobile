import { useCallback } from 'react';

import {
  assertIsFeatureEnabled,
  enableNotifications as enableNotificationsHelper,
  hasNotificationPreferences as hasNotificationPreferencesHelper,
  setMarketingNotificationPreferencesEnabled,
} from '../../../actions/notification/helpers';
import { updateNotificationSubscriptionExpiration } from '../constants/notification-storage-keys';
import { requestPushPermissions } from '../services/NotificationService';
import Logger from '../../Logger';

export function usePushPermissionNotificationSetup() {
  // Ask the OS for push permission while the pre-prompt is still in focus.
  const requestPushPermission = useCallback(async () => {
    try {
      assertIsFeatureEnabled();
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

      const enableNotifications = async () => {
        try {
          const hasExistingNotificationPreferences =
            await hasNotificationPreferencesHelper();

          // Marketing prefs are written by either first-time notification
          // initialization or the explicit AUS update for existing prefs.
          await enableNotificationsHelper({
            registerPushNotifications,
            ...(!hasExistingNotificationPreferences
              ? {
                  hasMarketingConsent: true,
                  productAnnouncementEnabled: true,
                }
              : {}),
          });
          if (hasExistingNotificationPreferences) {
            await setMarketingNotificationPreferencesEnabled(true);
          }
          await updateNotificationSubscriptionExpiration();
        } catch (backgroundSetupError) {
          Logger.error(
            backgroundSetupError as Error,
            'Failed to enable notifications from push pre-prompt',
          );
        }
      };

      void enableNotifications();
    },
    [],
  );

  return {
    enableNotificationsInBackground,
    requestPushPermission,
  };
}
