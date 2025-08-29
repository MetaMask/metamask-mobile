import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectIsSignedIn } from '../../../selectors/identity';
import { selectIsUnlocked } from '../../../selectors/keyringController';
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
} from './useNotifications';
import {
  hasNotificationSubscriptionExpired,
  hasUserTurnedOffNotificationsOnce,
} from '../constants/notification-storage-keys';

const showPushNush = { nudgeEnablePush: true };

const useEnableAndRefresh = () => {
  const { enableNotifications } = useEnableNotifications(showPushNush);
  const { listNotifications } = useListNotifications();
  return useCallback(
    async (shouldEnable = true) => {
      shouldEnable && (await enableNotifications());
      await listNotifications();
    },
    [enableNotifications, listNotifications],
  );
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
          await enableAndRefresh(await hasNotificationSubscriptionExpired());
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

  const enableAndRefresh = useEnableAndRefresh();

  useEffect(() => {
    const run = async () => {
      try {
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
  ]);
}

/**
 * Effect that queries for notifications on startup if notifications are enabled.
 */
export function useStartupNotificationsEffect() {
  useRegisterAndFetchNotifications();
  useEnableNotificationsByDefaultEffect();
}
