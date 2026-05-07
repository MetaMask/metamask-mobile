import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectIsUnlocked } from '../../../selectors/keyringController';
import {
  getIsNotificationEnabledByDefaultFeatureFlag,
  selectIsMetaMaskPushNotificationsEnabled,
} from '../../../selectors/notifications';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { selectCompletedOnboarding } from '../../../selectors/onboarding';
import { RootState } from '../../../reducers';
import Logger from '../../Logger';
import { isNotificationsFeatureEnabled } from '../constants';
import {
  hasPushPrePromptBeenShown,
  setPushPrePromptShown,
} from '../constants/notification-storage-keys';

export type PushPrePromptVariant =
  | 'push_permission'
  | 'marketing_consent'
  | null;

export function usePushPrePromptVariant(): {
  variant: PushPrePromptVariant;
  markShown: () => Promise<void>;
  dismiss: () => void;
} {
  const [variant, setVariant] = useState<PushPrePromptVariant>(null);

  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const isBasicFunctionalityEnabled = Boolean(
    useSelector(selectBasicFunctionalityEnabled),
  );
  const completedOnboarding = useSelector(selectCompletedOnboarding);
  const isPushEnabled = useSelector(selectIsMetaMaskPushNotificationsEnabled);
  const isNotificationFeatureFlagOn = useSelector(
    getIsNotificationEnabledByDefaultFeatureFlag,
  );
  const notificationsFlagEnabled = isNotificationsFeatureEnabled();
  const hasMarketingConsent = useSelector(
    (state: RootState) => state.security?.dataCollectionForMarketing === true,
  );

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (
        !isUnlocked ||
        !isBasicFunctionalityEnabled ||
        !completedOnboarding ||
        !isNotificationFeatureFlagOn ||
        !notificationsFlagEnabled ||
        (await hasPushPrePromptBeenShown())
      ) {
        if (!cancelled) {
          setVariant(null);
        }
        return;
      }

      if (!isPushEnabled) {
        if (!cancelled) {
          setVariant('push_permission');
        }
        return;
      }

      if (!hasMarketingConsent) {
        if (!cancelled) {
          setVariant('marketing_consent');
        }
        return;
      }

      if (!cancelled) {
        setVariant(null);
      }
    };

    resolve().catch((error) => {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        'Failed to resolve push pre-prompt variant',
      );
      if (!cancelled) {
        setVariant(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    completedOnboarding,
    hasMarketingConsent,
    isBasicFunctionalityEnabled,
    isNotificationFeatureFlagOn,
    isPushEnabled,
    isUnlocked,
    notificationsFlagEnabled,
  ]);

  const markShown = useCallback(async () => {
    await setPushPrePromptShown();
  }, []);

  const dismiss = useCallback(() => {
    setVariant(null);
  }, []);

  return { variant, markShown, dismiss };
}
