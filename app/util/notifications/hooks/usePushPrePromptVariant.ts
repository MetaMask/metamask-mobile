import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  getIsNotificationEnabledByDefaultFeatureFlag,
  selectIsMetaMaskPushNotificationsEnabled,
} from '../../../selectors/notifications';
import {
  selectCompletedOnboarding,
  selectPendingSocialLoginMarketingConsentBackfill,
} from '../../../selectors/onboarding';
import Logger from '../../Logger';
import {
  hasPushPrePromptBeenShown,
  setPushPrePromptShown,
} from '../constants/notification-storage-keys';
import { resolvePushNotificationStatus } from '../utils/push-notification-status';
import { useNotificationsMarketingConsent } from './useNotificationsMarketingConsent';
import { useNotificationsRuntimeGate } from './useNotificationsRuntimeGate';

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
  canShowPrePrompt: boolean;
  hasNotificationPreferences: boolean;
  isNotificationPreferencesLoading: boolean;
  isPushEnabled: boolean;
  marketingNotificationsEnabled: boolean;
  pendingSocialLoginMarketingConsentBackfill: string | null;
}

const getResolutionKey = ({
  canShowPrePrompt,
  hasNotificationPreferences,
  isNotificationPreferencesLoading,
  isPushEnabled,
  marketingNotificationsEnabled,
  pendingSocialLoginMarketingConsentBackfill,
}: PushPrePromptEligibility) =>
  [
    `canShowPrePrompt:${canShowPrePrompt}`,
    `hasNotificationPreferences:${hasNotificationPreferences}`,
    `isNotificationPreferencesLoading:${isNotificationPreferencesLoading}`,
    `isPushEnabled:${isPushEnabled}`,
    `marketingNotificationsEnabled:${marketingNotificationsEnabled}`,
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
  if (!eligibility.canShowPrePrompt) {
    return null;
  }

  if (hasPushPrePromptBeenShown()) {
    return null;
  }

  if (!eligibility.hasNotificationPreferences) {
    return 'push_permission';
  }

  const pushStatus = await resolvePushNotificationStatus({
    controllerIsPushEnabled: eligibility.isPushEnabled,
  });

  if (!pushStatus.nativeOsPermissionEnabled) {
    return 'push_permission';
  }

  if (eligibility.marketingNotificationsEnabled) {
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
  const runtimeGate = useNotificationsRuntimeGate();
  const isNotificationFeatureFlagOn = useSelector(
    getIsNotificationEnabledByDefaultFeatureFlag,
  );
  const completedOnboarding = useSelector(selectCompletedOnboarding);
  const isPushEnabled = useSelector(selectIsMetaMaskPushNotificationsEnabled);
  const pendingSocialLoginMarketingConsentBackfill = useSelector(
    selectPendingSocialLoginMarketingConsentBackfill,
  );

  const canShowPrePrompt =
    runtimeGate && isNotificationFeatureFlagOn && Boolean(completedOnboarding);

  const {
    hasNotificationPreferences,
    isLoading: isNotificationPreferencesLoading,
    marketingNotificationsEnabled,
  } = useNotificationsMarketingConsent();

  const eligibility = useMemo<PushPrePromptEligibility>(
    () => ({
      canShowPrePrompt,
      hasNotificationPreferences,
      isNotificationPreferencesLoading,
      isPushEnabled,
      marketingNotificationsEnabled,
      pendingSocialLoginMarketingConsentBackfill,
    }),
    [
      canShowPrePrompt,
      hasNotificationPreferences,
      isNotificationPreferencesLoading,
      isPushEnabled,
      marketingNotificationsEnabled,
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

    if (
      eligibility.canShowPrePrompt &&
      !hasPushPrePromptBeenShown() &&
      eligibility.isNotificationPreferencesLoading
    ) {
      return () => {
        cancelled = true;
      };
    }

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
