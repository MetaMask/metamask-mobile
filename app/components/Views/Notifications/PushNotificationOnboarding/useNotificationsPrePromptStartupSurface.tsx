import React, { useCallback, useMemo, useState } from 'react';
import type { CompleteSurfaceReason } from '../../../Nav/Main/StartupSurfaceCoordinator/context';
import type { StartupSurfaceDescriptor } from '../../../Nav/Main/StartupSurfaceCoordinator';
import {
  PushPrePromptVariant,
  usePushPrePromptVariant,
} from '../../../../util/notifications/hooks/usePushPrePromptVariant';
import { markPushPrePromptPerformance } from '../../../../util/notifications/utils/push-pre-prompt-performance';
import PushNotificationOnboarding from '.';

type VisiblePushPrePromptVariant = Exclude<PushPrePromptVariant, null>;

export const useNotificationsPrePromptStartupSurface =
  (): StartupSurfaceDescriptor => {
    const [pendingActionVariant, setPendingActionVariant] =
      useState<VisiblePushPrePromptVariant | null>(null);
    const {
      isResolving,
      variant,
      markShown: markPrePromptShown,
      dismiss: dismissPrePrompt,
    } = usePushPrePromptVariant();
    const visibleVariant = pendingActionVariant ?? variant;

    const status = visibleVariant
      ? 'eligible'
      : isResolving
        ? 'resolving'
        : 'ineligible';

    const handlePendingActionStart = useCallback(
      (nextVariant: VisiblePushPrePromptVariant) => {
        markPushPrePromptPerformance('startup_surface.pending_action.start', {
          surfaceId: 'push-pre-prompt',
          variant: nextVariant,
        });
        setPendingActionVariant(nextVariant);
      },
      [],
    );

    return useMemo(
      () => ({
        id: 'push-pre-prompt',
        render: ({ completeSurface }) =>
          visibleVariant ? (
            <PushNotificationOnboarding
              dismissPrePrompt={dismissPrePrompt}
              isVisible
              markPrePromptShown={markPrePromptShown}
              onComplete={(reason: CompleteSurfaceReason) => {
                if (pendingActionVariant) {
                  markPushPrePromptPerformance(
                    'startup_surface.pending_action.end',
                    {
                      reason,
                      surfaceId: 'push-pre-prompt',
                      variant: pendingActionVariant,
                    },
                  );
                }
                completeSurface('push-pre-prompt', reason);
                setPendingActionVariant(null);
              }}
              onPendingActionStart={handlePendingActionStart}
              prePromptVariant={visibleVariant}
            />
          ) : null,
        status,
      }),
      [
        dismissPrePrompt,
        handlePendingActionStart,
        markPrePromptShown,
        pendingActionVariant,
        status,
        visibleVariant,
      ],
    );
  };
