import { useSyncExternalStore } from 'react';

/**
 * The Social link a user opened before joining Social.
 *
 * `previewing` while the trader preview sheet is open. `onboarding` once the
 * user chose to join: onboarding opens this target when it finishes.
 */
export type PendingSocialPreviewStage = 'previewing' | 'onboarding';

interface PendingSocialPreviewTargetBase {
  traderId: string;
  stage: PendingSocialPreviewStage;
  /**
   * Money referral code the user agreed to accept by joining. Registered once
   * onboarding finishes. Only set in the `onboarding` stage.
   */
  referralCode?: string;
}

export type PendingSocialPreviewTarget =
  | (PendingSocialPreviewTargetBase & { kind: 'trader' })
  | (PendingSocialPreviewTargetBase & {
      kind: 'position';
      positionId: string;
    });

// Session-scoped: a link opened in an earlier session must not redirect a
// later onboarding.
let pendingTarget: PendingSocialPreviewTarget | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

export const getPendingSocialPreviewTarget =
  (): PendingSocialPreviewTarget | null => pendingTarget;

export const setPendingSocialPreviewTarget = (
  target: PendingSocialPreviewTarget | null,
): void => {
  pendingTarget = target;
  emit();
};

/**
 * Moves the pending target to the onboarding stage, keeping the referral
 * code the user agreed to accept.
 */
export const startPendingSocialPreviewOnboarding = (
  referralCode: string | undefined,
): void => {
  if (!pendingTarget) {
    return;
  }
  setPendingSocialPreviewTarget({
    ...pendingTarget,
    stage: 'onboarding',
    ...(referralCode ? { referralCode } : {}),
  });
};

/**
 * Removes and returns the target when it is in `stage`. Anything else is left
 * as it is.
 */
export const takePendingSocialPreviewTarget = (
  stage: PendingSocialPreviewStage,
): PendingSocialPreviewTarget | null => {
  if (pendingTarget?.stage !== stage) {
    return null;
  }
  const target = pendingTarget;
  setPendingSocialPreviewTarget(null);
  return target;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const usePendingSocialPreviewTarget =
  (): PendingSocialPreviewTarget | null =>
    useSyncExternalStore(subscribe, getPendingSocialPreviewTarget);
