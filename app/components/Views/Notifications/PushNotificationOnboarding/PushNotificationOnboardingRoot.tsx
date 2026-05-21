import React, { useCallback, useEffect, useState } from 'react';
import PushNotificationOnboarding, {
  type PushPrePromptCompletionReason,
} from '.';
import {
  usePushPrePromptVariant,
  type PushPrePromptVariant,
} from '../../../../util/notifications/hooks/usePushPrePromptVariant';

type VisibleVariant = Exclude<PushPrePromptVariant, null>;
interface VisiblePrePrompt {
  nativeOsPermissionEnabled: boolean | null;
  variant: VisibleVariant;
}

const PushNotificationOnboardingRoot = () => {
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

export default PushNotificationOnboardingRoot;
