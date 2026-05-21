import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NotificationPreferences } from '@metamask/authenticated-user-storage';
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
import Logger from '../../Logger';
import { isNotificationsFeatureEnabled } from '../constants';
import {
  hasPushPrePromptBeenShown,
  setPushPrePromptShown,
} from '../constants/notification-storage-keys';
import { resolvePushNotificationStatus } from '../utils/push-notification-status';
import Engine from '../../../core/Engine';

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
  isBasicFunctionalityEnabled: boolean;
  isNotificationFeatureFlagOn: boolean;
  isPushEnabled: boolean;
  isUnlocked: boolean;
  notificationsFlagEnabled: boolean;
  pendingSocialLoginMarketingConsentBackfill: string | null;
}

const GET_NOTIFICATION_PREFERENCES_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences' as const;

const isEligibleForPrePrompt = ({
  completedOnboarding,
  isBasicFunctionalityEnabled,
  isNotificationFeatureFlagOn,
  isUnlocked,
  notificationsFlagEnabled,
}: PushPrePromptEligibility): boolean =>
  isUnlocked &&
  isBasicFunctionalityEnabled &&
  completedOnboarding &&
  isNotificationFeatureFlagOn &&
  notificationsFlagEnabled;

const getResolutionKey = ({
  completedOnboarding,
  isBasicFunctionalityEnabled,
  isNotificationFeatureFlagOn,
  isPushEnabled,
  isUnlocked,
  notificationsFlagEnabled,
  pendingSocialLoginMarketingConsentBackfill,
}: PushPrePromptEligibility) =>
  [
    `completedOnboarding:${completedOnboarding}`,
    `isBasicFunctionalityEnabled:${isBasicFunctionalityEnabled}`,
    `isNotificationFeatureFlagOn:${isNotificationFeatureFlagOn}`,
    `isPushEnabled:${isPushEnabled}`,
    `isUnlocked:${isUnlocked}`,
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

const resolveMarketingNotificationPreferences = async () => {
  const preferences = (await Engine.controllerMessenger.call(
    GET_NOTIFICATION_PREFERENCES_ACTION,
  )) as NotificationPreferences | null;

  return {
    hasNotificationPreferences: Boolean(preferences),
    marketingNotificationsEnabled:
      preferences?.marketing.inAppNotificationsEnabled === true &&
      preferences?.marketing.pushNotificationsEnabled === true,
  };
};

const resolvePrePromptVariant = async (
  eligibility: PushPrePromptEligibility,
): Promise<PushPrePromptVariant> => {
  if (!isEligibleForPrePrompt(eligibility)) {
    return null;
  }

  if (hasPushPrePromptBeenShown()) {
    return null;
  }

  const pushStatus = await resolvePushNotificationStatus({
    controllerIsPushEnabled: eligibility.isPushEnabled,
  });

  if (!pushStatus.nativeOsPermissionEnabled) {
    return 'push_permission';
  }

  const marketingPreferences = await resolveMarketingNotificationPreferences();

  if (!marketingPreferences.hasNotificationPreferences) {
    return 'push_permission';
  }

  if (marketingPreferences.marketingNotificationsEnabled) {
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
  const pendingSocialLoginMarketingConsentBackfill = useSelector(
    selectPendingSocialLoginMarketingConsentBackfill,
  );

  const eligibility = useMemo<PushPrePromptEligibility>(
    () => ({
      completedOnboarding: Boolean(completedOnboarding),
      isBasicFunctionalityEnabled,
      isNotificationFeatureFlagOn,
      isPushEnabled,
      isUnlocked,
      notificationsFlagEnabled,
      pendingSocialLoginMarketingConsentBackfill,
    }),
    [
      completedOnboarding,
      isBasicFunctionalityEnabled,
      isNotificationFeatureFlagOn,
      isPushEnabled,
      isUnlocked,
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
