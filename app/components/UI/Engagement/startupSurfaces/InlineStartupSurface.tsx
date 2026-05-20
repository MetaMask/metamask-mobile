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
 * Renders inline startup surfaces whose UI is not navigation-backed.
 *
 * The push pre-prompt resolves eligibility and renders from the same hook
 * instance so the reported queue status and visible sheet stay in sync.
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

  const [latchedVariant, setLatchedVariant] = useState<VisibleVariant | null>(
    null,
  );

  // Latch the first active variant so eligibility re-checks do not unmount a
  // sheet that is already being shown.
  useEffect(() => {
    if (activeSurfaceId === 'push-pre-prompt' && variant && !latchedVariant) {
      setLatchedVariant(variant);
    }
  }, [activeSurfaceId, variant, latchedVariant]);

  // Pending actions, such as the OS permission prompt, keep rendering the
  // sheet until completion even if the underlying eligibility value changes.
  const visibleVariant = pendingActionVariant ?? latchedVariant ?? variant;

  const handleComplete = useCallback(
    (reason: CompleteSurfaceReason) => {
      dispatch(surfaceCompleted({ id: 'push-pre-prompt', reason }));
      setPendingActionVariant(null);
      setLatchedVariant(null);
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
