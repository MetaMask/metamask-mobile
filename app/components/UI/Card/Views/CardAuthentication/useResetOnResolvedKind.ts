import { useEffect, useRef } from 'react';
import type { CardSignInResolution } from '../../../../../core/Engine/controllers/card-controller/provider-types';

/**
 * Resets transient auth UI state when the resolved sign-in kind changes to a
 * different non-null value. Skips the null gap that useCardSignIn inserts at
 * the start of every re-resolve so a retry or account-list change does not
 * kick the user out of the fork/email form mid-interaction.
 */
export function useResetOnResolvedKind(
  kind: CardSignInResolution['kind'] | undefined,
  reset: () => void,
): void {
  const lastKind = useRef<CardSignInResolution['kind'] | null>(null);

  useEffect(() => {
    if (!kind || kind === lastKind.current) {
      return;
    }
    lastKind.current = kind;
    reset();
  }, [kind, reset]);
}
