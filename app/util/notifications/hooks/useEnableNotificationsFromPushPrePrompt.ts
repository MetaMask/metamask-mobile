import { useCallback } from 'react';

import {
  assertIsFeatureEnabled,
  enableNotifications as enableNotificationsHelper,
  hasNotificationPreferences as hasNotificationPreferencesHelper,
} from '../../../actions/notification/helpers';
import { updateNotificationSubscriptionExpiration } from '../constants/notification-storage-keys';
import { requestPushPermissions } from '../services/NotificationService';
import Logger from '../../Logger';
import { useNotificationsMarketingConsent } from './useNotificationsMarketingConsent';

interface EnableNotificationsInBackgroundOptions {
  enableMarketingNotifications?: boolean;
}

export function useEnableNotificationsFromPushPrePrompt() {
  const { setMarketingNotificationsEnabled } =
    useNotificationsMarketingConsent();

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
    (
      nativePermissionEnabled: boolean,
      options: EnableNotificationsInBackgroundOptions = {},
    ) => {
      const registerPushNotifications = nativePermissionEnabled;

      (async () => {
        try {
          const enableMarketingNotifications =
            options.enableMarketingNotifications === true;
          const hasExistingNotificationPreferences =
            enableMarketingNotifications
              ? await hasNotificationPreferencesHelper()
              : false;

          // Marketing prefs are written by either first-time notification
          // initialization or the explicit AUS update for existing prefs.
          await enableNotificationsHelper({
            registerPushNotifications,
            ...(enableMarketingNotifications &&
            !hasExistingNotificationPreferences
              ? {
                  hasMarketingConsent: true,
                  productAnnouncementEnabled: true,
                }
              : {}),
          });
          if (
            enableMarketingNotifications &&
            hasExistingNotificationPreferences
          ) {
            await setMarketingNotificationsEnabled(true);
          }
          await updateNotificationSubscriptionExpiration();
        } catch (backgroundSetupError) {
          Logger.error(
            backgroundSetupError as Error,
            'Failed to enable notifications from push pre-prompt',
          );
        }
      })();
    },
    [setMarketingNotificationsEnabled],
  );

  const enableMarketingNotificationsInBackground = useCallback(() => {
    (async () => {
      try {
        await setMarketingNotificationsEnabled(true);
      } catch (backgroundSetupError) {
        Logger.error(
          backgroundSetupError as Error,
          'Failed to enable marketing notifications from push pre-prompt',
        );
      }
    })();
  }, [setMarketingNotificationsEnabled]);

  return {
    enableMarketingNotificationsInBackground,
    enableNotificationsInBackground,
    requestPushPermission,
  };
}
