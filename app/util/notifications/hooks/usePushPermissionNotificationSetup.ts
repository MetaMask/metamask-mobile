import { useCallback } from 'react';
import Engine from '../../../core/Engine';

import {
  assertIsFeatureEnabled,
  enableNotifications as enableNotificationsHelper,
  hasNotificationPreferences as hasNotificationPreferencesHelper,
  setMarketingNotificationPreferencesEnabled,
} from '../../../actions/notification/helpers';
import { updateNotificationSubscriptionExpiration } from '../constants/notification-storage-keys';
import {
  requestPushPermissions,
  requestOnboardingPushPermission,
} from '../services/NotificationService';
import Logger from '../../Logger';

export function usePushPermissionNotificationSetup({
  onboarding = false,
}: { onboarding?: boolean } = {}) {
  // Ask the OS for push permission while the pre-prompt is still in focus.
  const requestPushPermission = useCallback(async () => {
    try {
      assertIsFeatureEnabled();
      return await (onboarding
        ? requestOnboardingPushPermission()
        : requestPushPermissions());
    } catch (requestError) {
      Logger.error(
        requestError as Error,
        'Failed to request push permission from pre-prompt',
      );
      return false;
    }
  }, [onboarding]);

  // Finish MetaMask notification setup after the pre-prompt resolves. The OS
  // permission result determines whether push registration should be attempted.
  // Returns the in-flight promise so callers that navigate away immediately can
  // `await` it first (errors are handled internally, so it never rejects).
  const enableNotificationsInBackground = useCallback(
    (nativePermissionEnabled: boolean) => {
      const registerPushNotifications = nativePermissionEnabled;

      const enableNotifications = async () => {
        try {
          if (onboarding) {
            if (
              !nativePermissionEnabled ||
              !Engine.context.KeyringController.state.isUnlocked ||
              Engine.context.NotificationServicesController.state
                .isUpdatingMetamaskNotifications
            ) {
              return false;
            }
            // Auto-sign-in waits for completed onboarding. An explicit Enable
            // must finish authentication here before touching notification services.
            if (!Engine.context.AuthenticationController.state.isSignedIn) {
              await Engine.context.AuthenticationController.performSignIn();
            }
            if (
              !Engine.context.AuthenticationController.state.isSignedIn ||
              !Engine.context.KeyringController.state.isUnlocked
            ) {
              return false;
            }
          }
          const hasExistingNotificationPreferences =
            await hasNotificationPreferencesHelper();

          if (hasExistingNotificationPreferences) {
            // Still run the enable flow for auth, trigger refresh, controller
            // state, and push registration; existing AUS prefs are updated separately.
            await enableNotificationsHelper(
              {
                registerPushNotifications,
              },
              onboarding,
            );
            await setMarketingNotificationPreferencesEnabled(true);
          } else {
            await enableNotificationsHelper(
              {
                hasMarketingConsent: true,
                productAnnouncementEnabled: true,
                registerPushNotifications,
              },
              onboarding,
            );
          }

          await updateNotificationSubscriptionExpiration();
          return true;
        } catch (backgroundSetupError) {
          Logger.error(
            backgroundSetupError as Error,
            'Failed to enable notifications from push pre-prompt',
          );
          return false;
        }
      };

      return enableNotifications();
    },
    [onboarding],
  );

  return {
    enableNotificationsInBackground,
    requestPushPermission,
  };
}
