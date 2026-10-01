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
import { isNotificationsFeatureEnabled } from '../constants';
import {
  useEnableNotifications,
  useListNotifications,
  useNotificationsCategories,
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
  if (await hasNotificationSubscriptionExpired()) {
    return true;
  }

  try {
    return !(await hasNotificationPreferences());
  } catch (error) {
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
  };
};

export function useRegisterAndFetchNotifications() {
  const { isUnlocked, isBasicFunctionalityEnabled, notificationsEnabled } =
    useNotificationStartupSelectors();

  // Actions
  const enableAndRefresh = useEnableAndRefresh();

  // App Open Effect
  useEffect(() => {
    const run = async () => {
      try {
        if (isUnlocked && isBasicFunctionalityEnabled && notificationsEnabled) {
          await enableAndRefresh(await shouldEnableNotificationsOnStartup());
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
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
  ]);
}

export function useEnableNotificationsByDefaultEffect() {
  const {
    isUnlocked,
    isBasicFunctionalityEnabled,
    notificationsEnabled,
    notificationsFlagEnabled,
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
      try {
        const isWalletHomePostOnboardingChecklistActive =
          shouldShowWalletHomeOnboardingSteps;

        if (isWalletHomePostOnboardingChecklistActive) {
          return;
        }

        if (
          isBasicFunctionalityEnabled &&
          isUnlocked &&
          !notificationsEnabled &&
          isNotificationsEnabledByDefaultFeatureFlag &&
          notificationsFlagEnabled
        ) {
          if (!(await hasUserTurnedOffNotificationsOnce())) {
            await enableAndRefresh();
          }
        }
      } catch {
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
    shouldShowWalletHomeOnboardingSteps,
  ]);
}

/**
 * Fetches the (unauthenticated) notification categories on startup, regardless
 * of whether the user has notifications enabled.
 */
export function useFetchNotificationCategoriesEffect() {
  const { isUnlocked, isBasicFunctionalityEnabled, notificationsFlagEnabled } =
    useNotificationStartupSelectors();
  const { fetchCategories } = useNotificationsCategories();

  useEffect(() => {
    if (
      !(isUnlocked && isBasicFunctionalityEnabled && notificationsFlagEnabled)
    ) {
      return;
    }
    fetchCategories().catch((error) =>
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        'Failed to fetch notification categories on startup',
      ),
    );
  }, [
    fetchCategories,
    isBasicFunctionalityEnabled,
    isUnlocked,
    notificationsFlagEnabled,
  ]);
}

/**
 * Effect that queries for notifications on startup if notifications are enabled.
 */
export function useStartupNotificationsEffect() {
  useFetchNotificationCategoriesEffect();
  useRegisterAndFetchNotifications();
  useEnableNotificationsByDefaultEffect();
}
