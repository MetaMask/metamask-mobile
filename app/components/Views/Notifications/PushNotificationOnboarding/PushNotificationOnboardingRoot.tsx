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
import { selectPrePushPromptEnabled } from '../../../../selectors/featureFlagController/engagement';
import PushNotificationPermissionFallback from './PushNotificationPermissionFallback';

type VisibleVariant = Exclude<PushPrePromptVariant, null>;
interface VisiblePrePrompt {
  nativeOsPermissionEnabled: boolean | null;
  variant: VisibleVariant;
}

const PushNotificationOnboardingRootContent = () => {
  const {
    dismiss: dismissPrePrompt,
    isHomeUnobstructed,
    markAnswered,
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

  // Preserve the pending session while navigation covers home. Only its
  // presentation is suspended; answering and async permission work own its end.
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
      isVisible={isHomeUnobstructed}
      nativeOsPermissionEnabled={currentPrePrompt.nativeOsPermissionEnabled}
      onComplete={handleComplete}
      onUserAnswered={markAnswered}
      prePromptVariant={currentPrePrompt.variant}
    />
  );
};

const PushNotificationOnboardingRoot = () => {
  const isPrePromptEnabled = useSelector(selectPrePushPromptEnabled);

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
