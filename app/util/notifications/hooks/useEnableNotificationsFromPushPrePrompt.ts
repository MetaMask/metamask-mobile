import { useCallback } from 'react';
import type { NotificationPreferences } from '@metamask/authenticated-user-storage';

import {
  assertIsFeatureEnabled,
  enableNotifications as enableNotificationsHelper,
} from '../../../actions/notification/helpers';
import { updateNotificationSubscriptionExpiration } from '../constants/notification-storage-keys';
import { requestPushPermissions } from '../services/NotificationService';
import Logger from '../../Logger';
import Engine from '../../../core/Engine';

const CLIENT_TYPE = 'mobile' as const;
const GET_NOTIFICATION_PREFERENCES_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences' as const;
const PUT_NOTIFICATION_PREFERENCES_ACTION =
  'AuthenticatedUserStorageService:putNotificationPreferences' as const;

interface EnableNotificationsInBackgroundOptions {
  enableMarketingNotifications?: boolean;
}

const enableMarketingNotificationPreferences = async () => {
  assertIsFeatureEnabled();

  const preferences = (await Engine.controllerMessenger.call(
    GET_NOTIFICATION_PREFERENCES_ACTION,
  )) as NotificationPreferences | null;

  if (!preferences) {
    return;
  }

  await Engine.controllerMessenger.call(
    PUT_NOTIFICATION_PREFERENCES_ACTION,
    {
      ...preferences,
      marketing: {
        ...preferences.marketing,
        inAppNotificationsEnabled: true,
        pushNotificationsEnabled: true,
      },
    },
    CLIENT_TYPE,
  );
};

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
    (
      nativePermissionEnabled: boolean,
      options: EnableNotificationsInBackgroundOptions = {},
    ) => {
      const registerPushNotifications = nativePermissionEnabled;

      (async () => {
        try {
          await enableNotificationsHelper({
            registerPushNotifications,
            ...(options.enableMarketingNotifications
              ? {
                  hasMarketingConsent: true,
                  productAnnouncementEnabled: true,
                }
              : {}),
          });
          if (options.enableMarketingNotifications) {
            await enableMarketingNotificationPreferences();
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
    [],
  );

  const enableMarketingNotificationsInBackground = useCallback(() => {
    (async () => {
      try {
        await enableMarketingNotificationPreferences();
      } catch (backgroundSetupError) {
        Logger.error(
          backgroundSetupError as Error,
          'Failed to enable marketing notifications from push pre-prompt',
        );
      }
    })();
  }, []);

  return {
    enableMarketingNotificationsInBackground,
    enableNotificationsInBackground,
    requestPushPermission,
  };
}
