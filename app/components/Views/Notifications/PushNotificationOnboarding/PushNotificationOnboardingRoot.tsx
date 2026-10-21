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
import { setPushPrePromptActive } from '../../../../util/notifications/pushPrePromptPresence';
import PushNotificationPermissionFallback from './PushNotificationPermissionFallback';

type VisibleVariant = Exclude<PushPrePromptVariant, null>;
interface VisiblePrePrompt {
  nativeOsPermissionEnabled: boolean | null;
  variant: VisibleVariant;
}

const PushNotificationOnboardingRootContent = () => {
  const {
    dismiss: dismissPrePrompt,
    isResolving,
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
  const prePromptPending = isResolving || currentPrePrompt !== null;

  useEffect(() => {
    setPushPrePromptActive(prePromptPending);
  }, [prePromptPending]);

  useEffect(
    () => () => {
      setPushPrePromptActive(false);
    },
    [],
  );

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

  useEffect(() => {
    if (isE2EOrExpEnvironment || !isPrePromptEnabled) {
      setPushPrePromptActive(false);
    }
  }, [isPrePromptEnabled]);

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
