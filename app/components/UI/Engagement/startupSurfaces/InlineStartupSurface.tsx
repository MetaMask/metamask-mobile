import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  surfaceCompleted,
  surfaceStatusReported,
} from '../../../../reducers/engagement';
import { selectActiveStartupSurfaceId } from '../../../../reducers/engagement/selectors';
import PushNotificationOnboarding from '../../../Views/Notifications/PushNotificationOnboarding';
import {
  usePushPrePromptVariant,
  type PushPrePromptVariant,
} from '../../../../util/notifications/hooks/usePushPrePromptVariant';
import type { CompleteSurfaceReason } from './useCompleteStartupSurface';

type VisibleVariant = Exclude<PushPrePromptVariant, null>;

/**
 * Renders inline startup surfaces — surfaces whose UI lives in the component
 * tree rather than a separate navigation screen.
 *
 * Currently handles: push-pre-prompt.
 *
 * This component is the single call-site for `usePushPrePromptVariant` so
 * there is exactly one hook instance managing push eligibility. It both
 * dispatches the status to Redux (replacing a separate resolver hook) and
 * renders the element. Keeping them together eliminates the two-instance
 * race condition where `markPrePromptShown()` from one instance could make
 * the other instance dispatch `ineligible` before `surfaceCompleted` fires.
 *
 * The `pendingActionVariant` pattern keeps the prompt visible while the user
 * is in a follow-up action (native OS permission dialog, etc.) even after the
 * underlying variant resolves to null.
 */
const InlineStartupSurface = () => {
  const dispatch = useDispatch();
  const activeSurfaceId = useSelector(selectActiveStartupSurfaceId);

  const {
    isResolving,
    variant,
    markShown: markPrePromptShown,
    dismiss: dismissPrePrompt,
  } = usePushPrePromptVariant();

  // Report push eligibility status from this single hook instance.
  useEffect(() => {
    if (isResolving) {
      dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'resolving' }),
      );
      return;
    }
    dispatch(
      surfaceStatusReported({
        id: 'push-pre-prompt',
        status: variant ? 'eligible' : 'ineligible',
      }),
    );
  }, [dispatch, isResolving, variant]);

  const [pendingActionVariant, setPendingActionVariant] =
    useState<VisibleVariant | null>(null);

  // visibleVariant keeps the prompt rendered while a follow-up action is in
  // flight (OS permission dialog). pendingActionVariant takes priority so the
  // prompt stays visible even if variant resolves to null mid-flow.
  const visibleVariant = pendingActionVariant ?? variant;

  const handleComplete = useCallback(
    (reason: CompleteSurfaceReason) => {
      dispatch(surfaceCompleted({ id: 'push-pre-prompt', reason }));
      setPendingActionVariant(null);
    },
    [dispatch],
  );

  const handlePendingActionStart = useCallback(
    (nextVariant: VisibleVariant) => {
      setPendingActionVariant(nextVariant);
    },
    [],
  );

  const pushElement = useMemo(() => {
    if (!visibleVariant) {
      return null;
    }
    return (
      <PushNotificationOnboarding
        dismissPrePrompt={dismissPrePrompt}
        isVisible
        markPrePromptShown={markPrePromptShown}
        onComplete={handleComplete}
        onPendingActionStart={handlePendingActionStart}
        prePromptVariant={visibleVariant}
      />
    );
  }, [
    dismissPrePrompt,
    handleComplete,
    handlePendingActionStart,
    markPrePromptShown,
    visibleVariant,
  ]);

  if (activeSurfaceId === 'push-pre-prompt') {
    return pushElement;
  }

  return null;
};

export default InlineStartupSurface;
