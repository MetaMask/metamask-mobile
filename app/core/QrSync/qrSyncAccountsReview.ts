import { useSyncExternalStore } from 'react';

import type { ImportedAccountSection } from './buildImportedAccountSections';

export interface QrSyncAccountsReview {
  mode: 'new-user' | 'existing-user';
  sections: ImportedAccountSection[];
}

interface QrSyncAccountsReviewSnapshot {
  review: QrSyncAccountsReview | null;
  holdInstructions: boolean;
}

let snapshot: QrSyncAccountsReviewSnapshot = {
  review: null,
  holdInstructions: false,
};

const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => {
    listener();
  });
};

export const getQrSyncAccountsReviewSnapshot =
  (): QrSyncAccountsReviewSnapshot => snapshot;

export const subscribeQrSyncAccountsReview = (
  listener: () => void,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setQrSyncAccountsReview = (review: QrSyncAccountsReview): void => {
  snapshot = { review, holdInstructions: false };
  emit();
};

/** Back from the review screen. Holds the instructions UI until sync state resets. */
export const dismissQrSyncAccountsReview = (): void => {
  snapshot = { review: null, holdInstructions: true };
  emit();
};

export const releaseQrSyncAccountsReviewHold = (): void => {
  if (!snapshot.holdInstructions) {
    return;
  }
  snapshot = { review: null, holdInstructions: false };
  emit();
};

export const clearQrSyncAccountsReview = (): void => {
  snapshot = { review: null, holdInstructions: false };
  emit();
};

export const useQrSyncAccountsReviewSnapshot =
  (): QrSyncAccountsReviewSnapshot =>
    useSyncExternalStore(
      subscribeQrSyncAccountsReview,
      getQrSyncAccountsReviewSnapshot,
      getQrSyncAccountsReviewSnapshot,
    );
