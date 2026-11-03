import { useSyncExternalStore } from 'react';

interface QrSyncInstructionsHoldSnapshot {
  holdInstructions: boolean;
}

let snapshot: QrSyncInstructionsHoldSnapshot = {
  holdInstructions: false,
};

const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => {
    listener();
  });
};

export const getQrSyncAccountsReviewSnapshot =
  (): QrSyncInstructionsHoldSnapshot => snapshot;

const subscribeQrSyncAccountsReview = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Hide the linked-device screen until the sync session has returned to instructions. */
export const holdQrSyncInstructions = (): void => {
  if (snapshot.holdInstructions) {
    return;
  }
  snapshot = { holdInstructions: true };
  emit();
};

export const releaseQrSyncAccountsReviewHold = (): void => {
  if (!snapshot.holdInstructions) {
    return;
  }
  snapshot = { holdInstructions: false };
  emit();
};

export const clearQrSyncAccountsReview = (): void => {
  snapshot = { holdInstructions: false };
  emit();
};

export const useQrSyncInstructionsHold = (): boolean =>
  useSyncExternalStore(
    subscribeQrSyncAccountsReview,
    () => snapshot.holdInstructions,
    () => snapshot.holdInstructions,
  );

/**
 * Leaves a QR sync session from the review or password step.
 * The instructions hold stays until the session is idle, unless reset fails.
 */
export const leaveQrSyncSession = async (
  clearAndReset: () => Promise<void>,
): Promise<void> => {
  holdQrSyncInstructions();
  try {
    await clearAndReset();
  } catch {
    releaseQrSyncAccountsReviewHold();
  }
};
