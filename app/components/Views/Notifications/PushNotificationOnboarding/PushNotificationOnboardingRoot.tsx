import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import PushNotificationOnboarding, {
  type PushPrePromptCompletionReason,
} from '.';
import {
  usePushPrePromptVariant,
  type PushPrePromptVariant,
} from '../../../../util/notifications/hooks/usePushPrePromptVariant';
import { isE2EOrExpEnvironment } from '../../../../util/test/utils';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import {
  selectPrePushPromptEnabled,
  PRE_PUSH_PROMPT_FLAG_KEY,
} from '../../../../selectors/featureFlagController/engagement';
import { pushStartupLog } from '../../../../util/notifications/utils/push-startup-log';
import PushNotificationPermissionFallback from './PushNotificationPermissionFallback';

type VisibleVariant = Exclude<PushPrePromptVariant, null>;
interface VisiblePrePrompt {
  nativeOsPermissionEnabled: boolean | null;
  variant: VisibleVariant;
}

const PushNotificationOnboardingRootContent = () => {
  const {
    dismiss: dismissPrePrompt,
    markShown: markPrePromptShown,
    nativeOsPermissionEnabled,
    variant,
  } = usePushPrePromptVariant();

  const [visiblePrePrompt, setVisiblePrePrompt] =
    useState<VisiblePrePrompt | null>(null);

  useEffect(() => {
    if (variant && !visiblePrePrompt) {
      setVisiblePrePrompt({ nativeOsPermissionEnabled, variant });
    }
  }, [nativeOsPermissionEnabled, variant, visiblePrePrompt]);

  const currentPrePrompt =
    visiblePrePrompt ??
    (variant ? { nativeOsPermissionEnabled, variant } : null);

  const handleComplete = useCallback(
    (_reason: PushPrePromptCompletionReason) => {
      setVisiblePrePrompt(null);
    },
    [],
  );

  if (!currentPrePrompt) {
    return null;
  }

  return (
    <PushNotificationOnboarding
      dismissPrePrompt={dismissPrePrompt}
      isVisible
      markPrePromptShown={markPrePromptShown}
      nativeOsPermissionEnabled={currentPrePrompt.nativeOsPermissionEnabled}
      onComplete={handleComplete}
      prePromptVariant={currentPrePrompt.variant}
    />
  );
};

const PushNotificationOnboardingRoot = () => {
  const isPrePromptEnabled = useSelector(selectPrePushPromptEnabled);
  const remoteFeatureFlags = useSelector(selectRemoteFeatureFlags);

  // Runs before the early returns below so the startup pre-prompt decision is
  // always visible in the device log, including on exp builds where the
  // pre-prompt is force-disabled. Remote flags load asynchronously after
  // launch, so re-log whenever they change.
  useEffect(() => {
    pushStartupLog('PushNotificationOnboardingRoot decision', {
      isE2EOrExpEnvironment,
      isPrePromptEnabled,
      prePushPromptEnabledFlag:
        remoteFeatureFlags?.[PRE_PUSH_PROMPT_FLAG_KEY] ?? null,
      metamaskEnvironment: process.env.METAMASK_ENVIRONMENT ?? null,
      renders: isE2EOrExpEnvironment
        ? 'nothing (e2e/exp environment)'
        : isPrePromptEnabled
          ? 'pre-prompt'
          : 'permission-fallback',
    });
  }, [isPrePromptEnabled, remoteFeatureFlags]);

  if (isE2EOrExpEnvironment) {
    return null;
  }

  return isPrePromptEnabled ? (
    <PushNotificationOnboardingRootContent />
  ) : (
    <PushNotificationPermissionFallback />
  );
};

export default PushNotificationOnboardingRoot;
