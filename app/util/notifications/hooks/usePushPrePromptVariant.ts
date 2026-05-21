import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  getIsNotificationEnabledByDefaultFeatureFlag,
  selectIsMetaMaskPushNotificationsEnabled,
} from '../../../selectors/notifications';
import {
  selectCompletedOnboarding,
  selectPendingSocialLoginMarketingConsentBackfill,
} from '../../../selectors/onboarding';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
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
  nativeOsPermissionEnabled: boolean | null;
  variant: PushPrePromptVariant;
}

interface PushPrePromptEligibility {
  /**
   * Lightweight gate for the push-permission variant. Does NOT require
   * isSignedIn or isUnlocked, so it can fire immediately after onboarding
   * completes without waiting for the AuthenticationController network
   * round-trip.
   */
  canShowPushPermissionPrePrompt: boolean;
  /**
   * Full runtime gate (isUnlocked + isSignedIn + basicFunctionality + flags)
   * required for the marketing-consent variant, which needs an authenticated
   * user-storage call to read notification preferences.
   */
  canShowMarketingConsentPrePrompt: boolean;
  hasPrePromptBeenShown: boolean;
  hasNotificationPreferences: boolean;
  isNotificationPreferencesLoading: boolean;
  isPushEnabled: boolean;
  marketingNotificationsEnabled: boolean;
  pendingSocialLoginMarketingConsentBackfill: string | null;
}

const getResolutionKey = ({
  canShowPushPermissionPrePrompt,
  canShowMarketingConsentPrePrompt,
  hasPrePromptBeenShown,
  hasNotificationPreferences,
  isNotificationPreferencesLoading,
  isPushEnabled,
  marketingNotificationsEnabled,
  pendingSocialLoginMarketingConsentBackfill,
}: PushPrePromptEligibility) =>
  [
    `canShowPushPermissionPrePrompt:${canShowPushPermissionPrePrompt}`,
    `canShowMarketingConsentPrePrompt:${canShowMarketingConsentPrePrompt}`,
    `hasPrePromptBeenShown:${hasPrePromptBeenShown}`,
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
  nativeOsPermissionEnabled: null,
  variant: null,
});

type PushPrePromptResolutionResult =
  | {
      status: 'resolved';
      nativeOsPermissionEnabled: boolean | null;
      variant: PushPrePromptVariant;
    }
  | { status: 'waiting' };

const resolvePrePromptVariant = async (
  eligibility: PushPrePromptEligibility,
): Promise<PushPrePromptResolutionResult> => {
  if (eligibility.hasPrePromptBeenShown) {
    return {
      nativeOsPermissionEnabled: null,
      status: 'resolved',
      variant: null,
    };
  }

  // Neither gate is satisfied — nothing to show.
  if (
    !eligibility.canShowPushPermissionPrePrompt &&
    !eligibility.canShowMarketingConsentPrePrompt
  ) {
    return {
      nativeOsPermissionEnabled: null,
      status: 'resolved',
      variant: null,
    };
  }

  // The push-permission gate is the lighter of the two and is always satisfied
  // whenever the marketing-consent gate is satisfied, so we only need to check
  // canShowPushPermissionPrePrompt here.
  const pushStatus = await resolvePushNotificationStatus({
    controllerIsPushEnabled: eligibility.isPushEnabled,
  });
  const nativeOsPermissionEnabled =
    pushStatus.nativeOsPermissionEnabled === true;

  if (!nativeOsPermissionEnabled) {
    // OS push not granted — show the push-permission pre-prompt immediately.
    // This resolves without waiting for isSignedIn (the full runtime gate).
    return {
      nativeOsPermissionEnabled,
      status: 'resolved',
      variant: 'push_permission',
    };
  }

  // OS push is already enabled. The marketing-consent path requires the full
  // runtime gate (isSignedIn) because it reads authenticated user storage.
  if (!eligibility.canShowMarketingConsentPrePrompt) {
    return {
      nativeOsPermissionEnabled,
      status: 'resolved',
      variant: null,
    };
  }

  if (eligibility.isNotificationPreferencesLoading) {
    return { status: 'waiting' };
  }

  if (!eligibility.hasNotificationPreferences) {
    return {
      nativeOsPermissionEnabled,
      status: 'resolved',
      variant: 'push_permission',
    };
  }

  if (eligibility.marketingNotificationsEnabled) {
    return {
      nativeOsPermissionEnabled,
      status: 'resolved',
      variant: null,
    };
  }

  if (eligibility.pendingSocialLoginMarketingConsentBackfill) {
    return {
      nativeOsPermissionEnabled,
      status: 'resolved',
      variant: null,
    };
  }

  return {
    nativeOsPermissionEnabled,
    status: 'resolved',
    variant: 'marketing_consent',
  };
};

/**
 * Resolves whether the startup notification pre-prompt should be shown.
 *
 * The pre-prompt presenter uses this hook to decide between the push permission
 * prompt, the marketing consent prompt, or no prompt. The hook keeps the UI in
 * a resolving state while it checks local "already shown" storage and native
 * push permission, then exposes helpers for marking the prompt as shown and
 * hiding it after the user dismisses or completes the flow.
 *
 * Two eligibility gates are maintained:
 *
 * canShowPushPermissionPrePrompt — lightweight, does NOT require isSignedIn.
 * Enables the push-permission sheet to appear as soon as onboarding completes,
 * without waiting for the AuthenticationController network round-trip.
 *
 * canShowMarketingConsentPrePrompt — full runtime gate (requires isSignedIn).
 * Only used when OS push is already granted and we need to check whether the
 * user has marketing consent stored in authenticated user storage.
 */
export function usePushPrePromptVariant(): {
  isResolving: boolean;
  nativeOsPermissionEnabled: boolean | null;
  variant: PushPrePromptVariant;
  markShown: () => Promise<void>;
  dismiss: () => void;
} {
  const runtimeGate = useNotificationsRuntimeGate();
  const isNotificationFeatureFlagOn = useSelector(
    getIsNotificationEnabledByDefaultFeatureFlag,
  );
  const completedOnboarding = useSelector(selectCompletedOnboarding);
  const isBasicFunctionalityEnabled = Boolean(
    useSelector(selectBasicFunctionalityEnabled),
  );
  const isPushEnabled = useSelector(selectIsMetaMaskPushNotificationsEnabled);
  const pendingSocialLoginMarketingConsentBackfill = useSelector(
    selectPendingSocialLoginMarketingConsentBackfill,
  );

  // Lightweight gate: show push-permission sheet without waiting for sign-in.
  const canShowPushPermissionPrePrompt =
    Boolean(completedOnboarding) &&
    isNotificationFeatureFlagOn &&
    isBasicFunctionalityEnabled;

  // Full gate: used for the marketing-consent path (needs authenticated
  // user-storage) and as the original gate for all prompts.
  const canShowMarketingConsentPrePrompt =
    runtimeGate && isNotificationFeatureFlagOn && Boolean(completedOnboarding);

  // Storage resets should affect the next app session/remount, not reopen the
  // pre-prompt while this root is already mounted.
  const hasPrePromptBeenShownRef = useRef<boolean | null>(null);
  if (hasPrePromptBeenShownRef.current === null) {
    hasPrePromptBeenShownRef.current = hasPushPrePromptBeenShown();
  }
  const hasPrePromptBeenShown = hasPrePromptBeenShownRef.current;

  const {
    hasNotificationPreferences,
    isLoading: isNotificationPreferencesLoading,
    marketingNotificationsEnabled,
  } = useNotificationsMarketingConsent({
    // Only query user storage when the full runtime gate is satisfied; the
    // push-permission fast path does not need notification preferences.
    enabled: canShowMarketingConsentPrePrompt && !hasPrePromptBeenShown,
  });

  const eligibility = useMemo<PushPrePromptEligibility>(
    () => ({
      canShowPushPermissionPrePrompt,
      canShowMarketingConsentPrePrompt,
      hasPrePromptBeenShown,
      hasNotificationPreferences,
      isNotificationPreferencesLoading,
      isPushEnabled,
      marketingNotificationsEnabled,
      pendingSocialLoginMarketingConsentBackfill,
    }),
    [
      canShowPushPermissionPrePrompt,
      canShowMarketingConsentPrePrompt,
      hasPrePromptBeenShown,
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
      nativeOsPermissionEnabled: null,
      variant: null,
    });

  useEffect(() => {
    let cancelled = false;

    // When eligibility inputs change, hold the pre-prompt in a resolving state
    // until storage/native permission checks finish.
    setResolutionState((currentState) =>
      currentState.key === resolutionKey &&
      currentState.isResolving &&
      currentState.variant === null
        ? currentState
        : getResolvingState(resolutionKey),
    );

    const applyResolvedVariant = (
      result: Extract<PushPrePromptResolutionResult, { status: 'resolved' }>,
    ) => {
      if (!cancelled) {
        setResolutionState({
          isResolving: false,
          key: resolutionKey,
          nativeOsPermissionEnabled: result.nativeOsPermissionEnabled,
          variant: result.variant,
        });
      }
    };

    resolvePrePromptVariant(eligibility)
      .then((result) => {
        if (result.status === 'resolved') {
          applyResolvedVariant(result);
        }
      })
      .catch((error) => {
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          'Failed to resolve push pre-prompt variant',
        );
        applyResolvedVariant({
          nativeOsPermissionEnabled: null,
          status: 'resolved',
          variant: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [eligibility, resolutionKey]);

  const markShown = useCallback(async () => {
    hasPrePromptBeenShownRef.current = true;
    await setPushPrePromptShown();
  }, []);

  const dismiss = useCallback(() => {
    setResolutionState((currentState) =>
      currentState.key === resolutionKey
        ? {
            ...currentState,
            isResolving: false,
            nativeOsPermissionEnabled: null,
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
    nativeOsPermissionEnabled: isCurrentResolution
      ? resolutionState.nativeOsPermissionEnabled
      : null,
    variant: isCurrentResolution ? resolutionState.variant : null,
  };
}
