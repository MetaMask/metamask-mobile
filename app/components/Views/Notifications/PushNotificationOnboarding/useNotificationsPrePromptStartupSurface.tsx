import React, { useCallback, useMemo, useState } from 'react';
import {
  useStartupSurface,
  type CompleteSurfaceReason,
} from '../../../UI/Engagement/StartupSurfaceCoordinator/context';
import type { StartupSurfaceDescriptor } from '../../../UI/Engagement/StartupSurfaceCoordinator';
import {
  PushPrePromptVariant,
  usePushPrePromptVariant,
} from '../../../../util/notifications/hooks/usePushPrePromptVariant';
import PushNotificationOnboarding from '.';

type VisiblePushPrePromptVariant = Exclude<PushPrePromptVariant, null>;

/**
 * Adapts notification pre-prompt eligibility into the startup surface contract.
 */
export const useNotificationsPrePromptStartupSurface =
  (): StartupSurfaceDescriptor => {
    const { completeSurface } = useStartupSurface();
    const [pendingActionVariant, setPendingActionVariant] =
      useState<VisiblePushPrePromptVariant | null>(null);
    const {
      isResolving,
      variant,
      markShown: markPrePromptShown,
      dismiss: dismissPrePrompt,
    } = usePushPrePromptVariant();
    const visibleVariant = pendingActionVariant ?? variant;

    // Keep the prompt visible while the user is moving through a native or
    // follow-up action, even if the base eligibility hook has already dismissed.
    const status = visibleVariant
      ? 'eligible'
      : isResolving
        ? 'resolving'
        : 'ineligible';

    const handlePendingActionStart = useCallback(
      (nextVariant: VisiblePushPrePromptVariant) => {
        setPendingActionVariant(nextVariant);
      },
      [],
    );

    // Build the rendered surface here so the orchestrator only has to mount the
    // active element; completion still flows through the shared coordinator API.
    const surfaceElement = useMemo(
      () =>
        visibleVariant ? (
          <PushNotificationOnboarding
            dismissPrePrompt={dismissPrePrompt}
            isVisible
            markPrePromptShown={markPrePromptShown}
            onComplete={(reason: CompleteSurfaceReason) => {
              completeSurface('push-pre-prompt', reason);
              setPendingActionVariant(null);
            }}
            onPendingActionStart={handlePendingActionStart}
            prePromptVariant={visibleVariant}
          />
        ) : null,
      [
        completeSurface,
        dismissPrePrompt,
        handlePendingActionStart,
        markPrePromptShown,
        visibleVariant,
      ],
    );

    return useMemo(
      () => ({
        id: 'push-pre-prompt',
        element: surfaceElement,
        status,
      }),
      [surfaceElement, status],
    );
  };
