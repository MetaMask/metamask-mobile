import { useCallback } from 'react';

import {
  assertIsFeatureEnabled,
  enableNotifications as enableNotificationsHelper,
} from '../../../actions/notification/helpers';
import { updateNotificationSubscriptionExpiration } from '../constants/notification-storage-keys';
import { requestPushPermissions } from '../services/NotificationService';
import Logger from '../../Logger';
import { setCachedNativePermissionEnabled } from '../utils/push-notification-status';
import { markPushPrePromptPerformance } from '../utils/push-pre-prompt-performance';

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export function useEnableNotificationsFromPushPrePrompt() {
  const requestPushPermission = useCallback(async () => {
    const startedAt = Date.now();
    assertIsFeatureEnabled();
    markPushPrePromptPerformance('push_pre_prompt.native_permission.start');

    try {
      const nativePermissionEnabled = await requestPushPermissions();
      setCachedNativePermissionEnabled(nativePermissionEnabled);
      markPushPrePromptPerformance('push_pre_prompt.native_permission.end', {
        durationMs: Date.now() - startedAt,
        nativePermissionEnabled,
        success: true,
      });
      return nativePermissionEnabled;
    } catch (requestError) {
      setCachedNativePermissionEnabled(false);
      Logger.error(
        requestError as Error,
        'Failed to request push permission from pre-prompt',
      );
      markPushPrePromptPerformance('push_pre_prompt.native_permission.end', {
        durationMs: Date.now() - startedAt,
        error: getErrorMessage(requestError),
        nativePermissionEnabled: false,
        success: false,
      });
      return false;
    }
  }, []);

  const enableNotificationsInBackground = useCallback(
    (nativePermissionEnabled: boolean) => {
      const registerPushNotifications = nativePermissionEnabled;
      const startedAt = Date.now();
      markPushPrePromptPerformance('push_pre_prompt.background_setup.start', {
        registerPushNotifications,
      });

      void (async () => {
        try {
          await enableNotificationsHelper({ registerPushNotifications });
          await updateNotificationSubscriptionExpiration();
          markPushPrePromptPerformance('push_pre_prompt.background_setup.end', {
            durationMs: Date.now() - startedAt,
            registerPushNotifications,
            success: true,
          });
        } catch (backgroundSetupError) {
          Logger.error(
            backgroundSetupError as Error,
            'Failed to enable notifications from push pre-prompt',
          );
          markPushPrePromptPerformance('push_pre_prompt.background_setup.end', {
            durationMs: Date.now() - startedAt,
            error: getErrorMessage(backgroundSetupError),
            registerPushNotifications,
            success: false,
          });
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
