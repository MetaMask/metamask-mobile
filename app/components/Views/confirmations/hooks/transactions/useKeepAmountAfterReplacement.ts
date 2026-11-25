import { useEffect, useRef } from 'react';

/**
 * Remembers the keypad amount across a Perps provider switch. The confirmation
 * is replaced while the screen stays mounted, and the first automatic pay-token
 * change after that switch must not clear the amount.
 *
 * @param params - Pay token identity and the reset for a real token change.
 * @param params.onGenuineTokenChange - Called when the pay token changes to
 * another token. `keptAcrossReplacement` is true for the automatic change that
 * follows a provider switch.
 * @param params.payTokenAddress - Current pay token address, absent while the
 * replacement has not selected a token yet.
 * @param params.payTokenChainId - Current pay token chain, absent during that
 * same gap.
 * @param params.payTokenKey - Stable identity of the current pay token.
 * @returns Refs the replacement clamp and the prefill use to keep or clear the
 * amount.
 */
export function useKeepAmountAfterReplacement({
  onGenuineTokenChange,
  payTokenAddress,
  payTokenChainId,
  payTokenKey,
}: {
  onGenuineTokenChange: (keptAcrossReplacement: boolean) => void;
  payTokenAddress: string | undefined;
  payTokenChainId: string | undefined;
  payTokenKey: string;
}): {
  ignoreNextAutomaticTokenChangeRef: { current: boolean };
  keepAmountAfterReplacementRef: { current: boolean };
} {
  const keepAmountAfterReplacementRef = useRef(false);
  const ignoreNextAutomaticTokenChangeRef = useRef(false);
  const previousPayTokenKeyRef = useRef(payTokenKey);

  useEffect((): void => {
    // Becoming undefined during a replacement is not a token change.
    const hasToken = Boolean(payTokenAddress && payTokenChainId);
    const isGenuineChange =
      hasToken && previousPayTokenKeyRef.current !== payTokenKey;

    if (!isGenuineChange) {
      return;
    }

    // Hyperliquid on Arbitrum and Lighter on mainnet select different tokens.
    // Ignore that first automatic change so the kept amount survives.
    const keptAcrossReplacement = ignoreNextAutomaticTokenChangeRef.current;
    if (keptAcrossReplacement) {
      ignoreNextAutomaticTokenChangeRef.current = false;
    } else {
      keepAmountAfterReplacementRef.current = false;
    }

    onGenuineTokenChange(keptAcrossReplacement);
    previousPayTokenKeyRef.current = payTokenKey;
  }, [onGenuineTokenChange, payTokenAddress, payTokenChainId, payTokenKey]);

  return {
    ignoreNextAutomaticTokenChangeRef,
    keepAmountAfterReplacementRef,
  };
}
