import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectIsSignedIn } from '../../../selectors/identity';
import { selectIsUnlocked } from '../../../selectors/keyringController';
import { selectShouldShowWalletHomeOnboardingSteps } from '../../../selectors/onboarding';
import {
  getIsNotificationEnabledByDefaultFeatureFlag,
  selectIsMetamaskNotificationsEnabled,
} from '../../../selectors/notifications';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import Logger from '../../Logger';
import { pushStartupLog } from '../utils/push-startup-log';
import { isNotificationsFeatureEnabled } from '../constants';
import {
  useEnableNotifications,
  useListNotifications,
} from './useNotifications';
import {
  hasNotificationSubscriptionExpired,
  hasUserTurnedOffNotificationsOnce,
} from '../constants/notification-storage-keys';
import { hasNotificationPreferences } from '../../../actions/notification/helpers';

const silentPushCheck = { nudgeEnablePush: false };

const useEnableAndRefresh = () => {
  const { enableNotifications } = useEnableNotifications(silentPushCheck);
  const { listNotifications } = useListNotifications();
  return useCallback(
    async (shouldEnable = true) => {
      shouldEnable && (await enableNotifications());
      await listNotifications();
    },
    [enableNotifications, listNotifications],
  );
};

const shouldEnableNotificationsOnStartup = async () => {
  const subscriptionExpired = await hasNotificationSubscriptionExpired();
  if (subscriptionExpired) {
    pushStartupLog('enable-on-startup decision', {
      reason: 'subscription-expired',
      subscriptionExpired,
      shouldEnable: true,
    });
    return true;
  }

  try {
    const hasPreferences = await hasNotificationPreferences();
    pushStartupLog('enable-on-startup decision', {
      reason: hasPreferences
        ? 'existing-notification-preferences'
        : 'no-notification-preferences',
      subscriptionExpired,
      hasPreferences,
      shouldEnable: !hasPreferences,
    });
    return !hasPreferences;
  } catch (error) {
    pushStartupLog('enable-on-startup decision', {
      reason: 'preferences-check-failed',
      subscriptionExpired,
      shouldEnable: false,
      error: error instanceof Error ? error.message : String(error),
    });
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'Failed to check notification preferences initialization',
    );
    return false;
  }
};

const useNotificationStartupSelectors = () => {
  // Base requirements
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const isBasicFunctionalityEnabled = Boolean(
    useSelector(selectBasicFunctionalityEnabled),
  );

  // Notification requirements
  const notificationsFlagEnabled = isNotificationsFeatureEnabled();
  const notificationsControllerEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const isSignedIn = useSelector(selectIsSignedIn);
  const notificationsEnabled =
    notificationsFlagEnabled && notificationsControllerEnabled && isSignedIn;

  return {
    isUnlocked,
    isBasicFunctionalityEnabled,
    notificationsEnabled,
    notificationsFlagEnabled,
    notificationsControllerEnabled,
    isSignedIn,
  };
};

export function useRegisterAndFetchNotifications() {
  const {
    isUnlocked,
    isBasicFunctionalityEnabled,
    notificationsEnabled,
    notificationsFlagEnabled,
    notificationsControllerEnabled,
    isSignedIn,
  } = useNotificationStartupSelectors();

  // Actions
  const enableAndRefresh = useEnableAndRefresh();

  // App Open Effect
  useEffect(() => {
    const run = async () => {
      pushStartupLog('useRegisterAndFetchNotifications gates', {
        isUnlocked,
        isBasicFunctionalityEnabled,
        notificationsEnabled,
        notificationsFlagEnabled,
        notificationsControllerEnabled,
        isSignedIn,
        mmNotificationsUiEnabledEnv:
          process.env.MM_NOTIFICATIONS_UI_ENABLED ?? null,
        metamaskEnvironment: process.env.METAMASK_ENVIRONMENT ?? null,
      });
      try {
        if (isUnlocked && isBasicFunctionalityEnabled && notificationsEnabled) {
          const shouldEnable = await shouldEnableNotificationsOnStartup();
          pushStartupLog('useRegisterAndFetchNotifications running', {
            shouldEnable,
          });
          await enableAndRefresh(shouldEnable);
          pushStartupLog('useRegisterAndFetchNotifications done', {
            shouldEnable,
          });
        } else {
          pushStartupLog('useRegisterAndFetchNotifications skipped');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        pushStartupLog('useRegisterAndFetchNotifications failed', {
          error: errorMessage,
        });
        Logger.error(
          new Error(`Failed to list notifications - ${errorMessage}`),
        );
      }
    };

    run();
  }, [
    enableAndRefresh,
    isBasicFunctionalityEnabled,
    isUnlocked,
    notificationsEnabled,
    notificationsFlagEnabled,
    notificationsControllerEnabled,
    isSignedIn,
  ]);
}

export function useEnableNotificationsByDefaultEffect() {
  const {
    isUnlocked,
    isBasicFunctionalityEnabled,
    notificationsEnabled,
    notificationsFlagEnabled,
    notificationsControllerEnabled,
    isSignedIn,
  } = useNotificationStartupSelectors();
  const isNotificationsEnabledByDefaultFeatureFlag = useSelector(
    getIsNotificationEnabledByDefaultFeatureFlag,
  );
  const shouldShowWalletHomeOnboardingSteps = useSelector(
    selectShouldShowWalletHomeOnboardingSteps,
  );

  const enableAndRefresh = useEnableAndRefresh();

  useEffect(() => {
    const run = async () => {
      pushStartupLog('useEnableNotificationsByDefaultEffect gates', {
        isUnlocked,
        isBasicFunctionalityEnabled,
        notificationsEnabled,
        notificationsFlagEnabled,
        notificationsControllerEnabled,
        isSignedIn,
        isNotificationsEnabledByDefaultFeatureFlag,
        shouldShowWalletHomeOnboardingSteps,
      });
      try {
        const isWalletHomePostOnboardingChecklistActive =
          shouldShowWalletHomeOnboardingSteps;

        if (isWalletHomePostOnboardingChecklistActive) {
          pushStartupLog(
            'useEnableNotificationsByDefaultEffect skipped: wallet home onboarding checklist active',
          );
          return;
        }

        if (
          isBasicFunctionalityEnabled &&
          isUnlocked &&
          !notificationsEnabled &&
          isNotificationsEnabledByDefaultFeatureFlag &&
          notificationsFlagEnabled
        ) {
          const userTurnedOffOnce = await hasUserTurnedOffNotificationsOnce();
          pushStartupLog('useEnableNotificationsByDefaultEffect decision', {
            userTurnedOffOnce,
            willEnable: !userTurnedOffOnce,
          });
          if (!userTurnedOffOnce) {
            await enableAndRefresh();
            pushStartupLog('useEnableNotificationsByDefaultEffect done');
          }
        } else {
          pushStartupLog(
            'useEnableNotificationsByDefaultEffect skipped: gate not satisfied',
          );
        }
      } catch (error) {
        pushStartupLog('useEnableNotificationsByDefaultEffect failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        // Do nothing
      }
    };
    run();
  }, [
    enableAndRefresh,
    isBasicFunctionalityEnabled,
    isNotificationsEnabledByDefaultFeatureFlag,
    isUnlocked,
    notificationsEnabled,
    notificationsFlagEnabled,
    notificationsControllerEnabled,
    isSignedIn,
    shouldShowWalletHomeOnboardingSteps,
  ]);
}

/**
 * Effect that queries for notifications on startup if notifications are enabled.
 */
export function useStartupNotificationsEffect() {
  useRegisterAndFetchNotifications();
  useEnableNotificationsByDefaultEffect();
}
