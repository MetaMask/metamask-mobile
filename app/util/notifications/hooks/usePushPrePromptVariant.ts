import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { getIsNotificationEnabledByDefaultFeatureFlag } from '../../../selectors/notifications';
import {
  selectCompletedOnboarding,
  selectPendingSocialLoginMarketingConsentBackfill,
} from '../../../selectors/onboarding';
import { selectDataCollectionForMarketingEnabled } from '../../../selectors/engagement';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import Logger from '../../Logger';
import {
  hasPushPrePromptBeenShown,
  setPushPrePromptShown,
} from '../constants/notification-storage-keys';
import { isNotificationsFeatureEnabled } from '../constants';
import { resolveNativePushPermissionEnabled } from '../utils/push-notification-status';

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
  canShowPrePrompt: boolean;
  hasPrePromptBeenShown: boolean;
  hasMarketingConsent: boolean;
  pendingSocialLoginMarketingConsentBackfill: string | null;
}

const getResolutionKey = ({
  canShowPrePrompt,
  hasPrePromptBeenShown,
  hasMarketingConsent,
  pendingSocialLoginMarketingConsentBackfill,
}: PushPrePromptEligibility) =>
  [
    `canShowPrePrompt:${canShowPrePrompt}`,
    `hasPrePromptBeenShown:${hasPrePromptBeenShown}`,
    `hasMarketingConsent:${hasMarketingConsent}`,
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

interface PushPrePromptResolutionResult {
  nativeOsPermissionEnabled: boolean | null;
  variant: PushPrePromptVariant;
}

const resolvePrePromptVariant = async (
  eligibility: PushPrePromptEligibility,
): Promise<PushPrePromptResolutionResult> => {
  if (eligibility.hasPrePromptBeenShown) {
    return {
      nativeOsPermissionEnabled: null,
      variant: null,
    };
  }

  // The prompt is ineligible, so there is nothing to show.
  if (!eligibility.canShowPrePrompt) {
    return {
      nativeOsPermissionEnabled: null,
      variant: null,
    };
  }

  const nativeOsPermissionEnabled = await resolveNativePushPermissionEnabled();

  if (!nativeOsPermissionEnabled) {
    return {
      nativeOsPermissionEnabled,
      variant: 'push_permission',
    };
  }

  if (eligibility.hasMarketingConsent) {
    return {
      nativeOsPermissionEnabled,
      variant: null,
    };
  }

  if (eligibility.pendingSocialLoginMarketingConsentBackfill) {
    return {
      nativeOsPermissionEnabled,
      variant: null,
    };
  }

  return {
    nativeOsPermissionEnabled,
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
 * Eligibility is shared by both prompts. Once eligible, native OS push
 * permission decides whether to show the push-permission prompt; otherwise,
 * Redux marketing consent decides whether to show the marketing-consent prompt.
 */
export function usePushPrePromptVariant(): {
  isResolving: boolean;
  nativeOsPermissionEnabled: boolean | null;
  variant: PushPrePromptVariant;
  markShown: () => Promise<void>;
  dismiss: () => void;
} {
  // Two independent gates:
  // - `isNotificationsFeatureAvailable` gates the notifications feature itself
  //   (build flag + `assetsNotificationsEnabled` remote flag).
  // - `isNotificationsByDefaultFlagOn` gates this post-onboarding nudge
  //   (`assetsEnableNotificationsByDefault` remote flag).
  const isNotificationsFeatureAvailable = isNotificationsFeatureEnabled();
  const isNotificationsByDefaultFlagOn = useSelector(
    getIsNotificationEnabledByDefaultFeatureFlag,
  );
  const completedOnboarding = useSelector(selectCompletedOnboarding);
  const isBasicFunctionalityEnabled = Boolean(
    useSelector(selectBasicFunctionalityEnabled),
  );
  const hasMarketingConsent = useSelector(
    selectDataCollectionForMarketingEnabled,
  );
  const pendingSocialLoginMarketingConsentBackfill = useSelector(
    selectPendingSocialLoginMarketingConsentBackfill,
  );

  const canShowPrePrompt =
    Boolean(completedOnboarding) &&
    isNotificationsFeatureAvailable &&
    isNotificationsByDefaultFlagOn &&
    isBasicFunctionalityEnabled;

  // Storage resets should affect the next app session/remount, not reopen the
  // pre-prompt while this root is already mounted.
  const hasPrePromptBeenShownRef = useRef<boolean | null>(null);
  if (hasPrePromptBeenShownRef.current === null) {
    hasPrePromptBeenShownRef.current = hasPushPrePromptBeenShown();
  }
  const hasPrePromptBeenShown = hasPrePromptBeenShownRef.current;

  const eligibility = useMemo<PushPrePromptEligibility>(
    () => ({
      canShowPrePrompt,
      hasPrePromptBeenShown,
      hasMarketingConsent,
      pendingSocialLoginMarketingConsentBackfill,
    }),
    [
      canShowPrePrompt,
      hasPrePromptBeenShown,
      hasMarketingConsent,
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

    const applyResolvedVariant = (result: PushPrePromptResolutionResult) => {
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
      .then(applyResolvedVariant)
      .catch((error) => {
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          'Failed to resolve push pre-prompt variant',
        );
        applyResolvedVariant({
          nativeOsPermissionEnabled: null,
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
