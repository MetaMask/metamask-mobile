import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectIsUnlocked } from '../../../selectors/keyringController';
import {
  getIsNotificationEnabledByDefaultFeatureFlag,
  selectIsMetaMaskPushNotificationsEnabled,
} from '../../../selectors/notifications';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import {
  selectCompletedOnboarding,
  selectPendingSocialLoginMarketingConsentBackfill,
} from '../../../selectors/onboarding';
import { RootState } from '../../../reducers';
import Logger from '../../Logger';
import { isNotificationsFeatureEnabled } from '../constants';
import {
  hasPushPrePromptBeenShown,
  setPushPrePromptShown,
} from '../constants/notification-storage-keys';
import { resolvePushNotificationStatus } from '../utils/push-notification-status';

export type PushPrePromptVariant =
  | 'push_permission'
  | 'marketing_consent'
  | null;

interface PushPrePromptResolutionState {
  isResolving: boolean;
  key: string;
  variant: PushPrePromptVariant;
}

interface PushPrePromptEligibility {
  completedOnboarding: boolean;
  hasMarketingConsent: boolean;
  isBasicFunctionalityEnabled: boolean;
  isNotificationFeatureFlagOn: boolean;
  isPushEnabled: boolean;
  isUnlocked: boolean;
  marketingConsent: boolean | null;
  notificationsFlagEnabled: boolean;
  pendingSocialLoginMarketingConsentBackfill: string | null;
}

type EligibilityBlockReason =
  | 'wallet_locked'
  | 'basic_functionality_disabled'
  | 'onboarding_incomplete'
  | 'notifications_enabled_by_default_flag_disabled'
  | 'notifications_feature_flag_disabled';

const PUSH_STATUS_SOURCE = 'pre_prompt_eligibility';

const getEligibilityBlockReason = ({
  completedOnboarding,
  isBasicFunctionalityEnabled,
  isNotificationFeatureFlagOn,
  isUnlocked,
  notificationsFlagEnabled,
}: PushPrePromptEligibility): EligibilityBlockReason | null => {
  if (!isUnlocked) return 'wallet_locked';
  if (!isBasicFunctionalityEnabled) return 'basic_functionality_disabled';
  if (!completedOnboarding) return 'onboarding_incomplete';
  if (!isNotificationFeatureFlagOn) {
    return 'notifications_enabled_by_default_flag_disabled';
  }
  if (!notificationsFlagEnabled) return 'notifications_feature_flag_disabled';
  return null;
};

const getResolutionKey = ({
  completedOnboarding,
  hasMarketingConsent,
  isBasicFunctionalityEnabled,
  isNotificationFeatureFlagOn,
  isPushEnabled,
  isUnlocked,
  marketingConsent,
  notificationsFlagEnabled,
  pendingSocialLoginMarketingConsentBackfill,
}: PushPrePromptEligibility) =>
  [
    `completedOnboarding:${completedOnboarding}`,
    `hasMarketingConsent:${hasMarketingConsent}`,
    `isBasicFunctionalityEnabled:${isBasicFunctionalityEnabled}`,
    `isNotificationFeatureFlagOn:${isNotificationFeatureFlagOn}`,
    `isPushEnabled:${isPushEnabled}`,
    `isUnlocked:${isUnlocked}`,
    `marketingConsent:${marketingConsent ?? 'null'}`,
    `notificationsFlagEnabled:${notificationsFlagEnabled}`,
    `pendingSocialLoginMarketingConsentBackfill:${
      pendingSocialLoginMarketingConsentBackfill ?? 'null'
    }`,
  ].join('|');

const getResolvingState = (key: string): PushPrePromptResolutionState => ({
  isResolving: true,
  key,
  variant: null,
});

const resolvePrePromptVariant = async (
  eligibility: PushPrePromptEligibility,
): Promise<PushPrePromptVariant> => {
  if (getEligibilityBlockReason(eligibility)) {
    return null;
  }

  if (await hasPushPrePromptBeenShown()) {
    return null;
  }

  if (!eligibility.isPushEnabled) {
    return 'push_permission';
  }

  const pushStatus = await resolvePushNotificationStatus({
    controllerIsPushEnabled: eligibility.isPushEnabled,
    source: PUSH_STATUS_SOURCE,
  });

  if (!pushStatus.effectivePushEnabled) {
    return 'push_permission';
  }

  if (eligibility.hasMarketingConsent) {
    return null;
  }

  if (eligibility.pendingSocialLoginMarketingConsentBackfill) {
    return null;
  }

  return 'marketing_consent';
};

/**
 * Resolves whether the startup notification pre-prompt should be shown.
 *
 * The startup surface coordinator uses this hook to decide between the push
 * permission prompt, the marketing consent prompt, or no prompt. The hook keeps
 * the UI in a resolving state while it checks local "already shown" storage and
 * native push permission, then exposes helpers for marking the prompt as shown
 * and hiding it after the user dismisses or completes the flow.
 */
export function usePushPrePromptVariant(): {
  isResolving: boolean;
  variant: PushPrePromptVariant;
  markShown: () => Promise<void>;
  dismiss: () => void;
} {
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
  const marketingConsent = useSelector(
    (state: RootState) => state.security?.dataCollectionForMarketing ?? null,
  );
  const hasMarketingConsent = marketingConsent === true;
  const pendingSocialLoginMarketingConsentBackfill = useSelector(
    selectPendingSocialLoginMarketingConsentBackfill,
  );

  const eligibility = useMemo<PushPrePromptEligibility>(
    () => ({
      completedOnboarding: Boolean(completedOnboarding),
      hasMarketingConsent,
      isBasicFunctionalityEnabled,
      isNotificationFeatureFlagOn,
      isPushEnabled,
      isUnlocked,
      marketingConsent,
      notificationsFlagEnabled,
      pendingSocialLoginMarketingConsentBackfill,
    }),
    [
      completedOnboarding,
      hasMarketingConsent,
      isBasicFunctionalityEnabled,
      isNotificationFeatureFlagOn,
      isPushEnabled,
      isUnlocked,
      marketingConsent,
      notificationsFlagEnabled,
      pendingSocialLoginMarketingConsentBackfill,
    ],
  );

  // Fingerprint the eligibility inputs used for this resolution. Native
  // permission checks are async, so this lets us ignore stale results from an
  // older onboarding, push, or marketing-consent state.
  const resolutionKey = useMemo(
    () => getResolutionKey(eligibility),
    [eligibility],
  );
  const [resolutionState, setResolutionState] =
    useState<PushPrePromptResolutionState>({
      isResolving: true,
      key: resolutionKey,
      variant: null,
    });

  useEffect(() => {
    let cancelled = false;

    // When eligibility inputs change, hold the startup surface in a resolving
    // state until storage/native permission checks finish.
    setResolutionState((currentState) =>
      currentState.key === resolutionKey &&
      currentState.isResolving &&
      currentState.variant === null
        ? currentState
        : getResolvingState(resolutionKey),
    );

    const applyResolvedVariant = (nextVariant: PushPrePromptVariant) => {
      if (!cancelled) {
        setResolutionState({
          isResolving: false,
          key: resolutionKey,
          variant: nextVariant,
        });
      }
    };

    resolvePrePromptVariant(eligibility)
      .then(applyResolvedVariant)
      .catch((error) => {
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          'Failed to resolve push pre-prompt variant',
        );
        applyResolvedVariant(null);
      });

    return () => {
      cancelled = true;
    };
  }, [eligibility, resolutionKey]);

  const markShown = useCallback(async () => {
    await setPushPrePromptShown();
  }, []);

  const dismiss = useCallback(() => {
    setResolutionState((currentState) =>
      currentState.key === resolutionKey
        ? {
            ...currentState,
            isResolving: false,
            variant: null,
          }
        : currentState,
    );
  }, [resolutionKey]);

  const isCurrentResolution = resolutionState.key === resolutionKey;

  return {
    dismiss,
    isResolving: isCurrentResolution ? resolutionState.isResolving : true,
    markShown,
    variant: isCurrentResolution ? resolutionState.variant : null,
  };
}
