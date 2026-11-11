import React, { useCallback, useEffect, useRef, useState } from 'react';
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
    markShown: markPrePromptShown,
    nativeOsPermissionEnabled,
    unmarkShown: unmarkPrePromptShown,
    variant,
  } = usePushPrePromptVariant();

  const [visiblePrePrompt, setVisiblePrePrompt] =
    useState<VisiblePrePrompt | null>(null);
  // Yes closes the sheet, then waits on the permission request before
  // onComplete. The latch stays set through that wait, so this records the
  // answer itself and keeps an obstruction from handing the shown flag back.
  const userAnsweredRef = useRef(false);

  useEffect(() => {
    if (variant && !visiblePrePrompt) {
      setVisiblePrePrompt({ nativeOsPermissionEnabled, variant });
    }
  }, [nativeOsPermissionEnabled, variant, visiblePrePrompt]);

  // The latch above holds a shown sheet through resolution churn. Anything
  // presented over home (a deeplink, say) takes it down, so it never sits over
  // the screen the user moved to. A sheet the user has not answered can open
  // again once home is clear. A sheet the user has answered stays counted,
  // even while the permission request is still running.
  useEffect(() => {
    if (!isHomeUnobstructed && visiblePrePrompt) {
      if (!userAnsweredRef.current) {
        unmarkPrePromptShown().catch(() => undefined);
      }
      setVisiblePrePrompt(null);
    }
  }, [isHomeUnobstructed, unmarkPrePromptShown, visiblePrePrompt]);

  const handleUserAnswered = useCallback(() => {
    userAnsweredRef.current = true;
  }, []);

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
      onUserAnswered={handleUserAnswered}
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
