import { useCallback, useEffect, useRef, useState } from 'react';

import { PREDICT_NEXT_VERIFIED_CARD_DISMISSED } from '../../../../../constants/storage';
import StorageWrapper from '../../../../../store/storage-wrapper';

interface Identity {
  key: string | null;
  isVerified: boolean;
  dismissed: boolean;
  read?: Promise<boolean>;
}

interface PreferenceState {
  identity: Identity;
  isLoaded: boolean;
  isDismissed: boolean;
}

/** Stores the verified-card preference for the current canonical profile only. */
export function useVerifiedCardDismissal({
  canonicalProfileId,
  isVerified,
}: {
  canonicalProfileId: string | null;
  isVerified: boolean;
}): { isLoaded: boolean; isDismissed: boolean; dismiss(): void } {
  const key = canonicalProfileId
    ? `${PREDICT_NEXT_VERIFIED_CARD_DISMISSED}:${canonicalProfileId}`
    : null;
  const current = useRef<Identity>({ key, isVerified, dismissed: false });
  if (current.current.key !== key) {
    current.current = { key, isVerified, dismissed: false };
  }
  current.current.isVerified = isVerified;
  const identity = current.current;
  const [state, setState] = useState<PreferenceState>({
    identity,
    isLoaded: false,
    isDismissed: false,
  });
  const visibleState = state.identity === identity ? state : null;

  useEffect(() => {
    if (!key || !isVerified || visibleState?.isLoaded) {
      return undefined;
    }
    let cancelled = false;
    identity.read ??= StorageWrapper.getItem(key)
      .then((value) => value === 'true')
      .catch(() => false);
    identity.read.then(
      (isDismissed) => {
        if (cancelled || current.current !== identity || identity.dismissed) {
          return;
        }
        setState({ identity, isLoaded: true, isDismissed });
      },
      (error: unknown) => {
        throw error;
      },
    );
    return (): void => {
      cancelled = true;
    };
  }, [identity, isVerified, key, visibleState?.isLoaded]);

  const dismiss = useCallback(() => {
    if (
      !key ||
      current.current !== identity ||
      !identity.isVerified ||
      identity.dismissed
    ) {
      return;
    }
    identity.dismissed = true;
    setState({ identity, isLoaded: true, isDismissed: true });
    StorageWrapper.setItem(key, 'true').catch(() => undefined);
  }, [identity, key]);

  return {
    isLoaded: visibleState?.isLoaded ?? false,
    isDismissed: visibleState?.isDismissed ?? false,
    dismiss,
  };
}
