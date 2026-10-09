import { useCallback, useEffect, useRef, useState } from 'react';
import { toKeypadAssetAmount } from '../utils/assetAmountInput';

interface UseAssetAmountDraftParams {
  /** True while the keypad should edit asset units instead of USD. */
  isActive: boolean;
  /** Canonical USD amount. A change this hook did not commit reseeds the draft. */
  usdAmount: string;
  /** Asset amount derived from the canonical USD amount. */
  assetAmount: string | undefined;
}

interface UseAssetAmountDraftResult {
  draft: string;
  /**
   * Records a keypad entry and the USD amount that entry commits, so a
   * later echo of that USD amount does not replace the in-progress draft.
   */
  setDraftFromKeypad: (assetValue: string, usdValue: string) => void;
}

/**
 * Holds the asset amount the user is typing.
 *
 * The order stays canonical in USD, but the keypad must append to the coin
 * amount on screen. Re-deriving that amount from USD on every key would
 * replace "1" with a rounded size before the next digit.
 */
export function useAssetAmountDraft({
  isActive,
  usdAmount,
  assetAmount,
}: UseAssetAmountDraftParams): UseAssetAmountDraftResult {
  const [draft, setDraft] = useState('0');
  const pendingUsdRef = useRef<string | null>(null);
  // Seed before paint when coin input turns on, so the keypad does not flash
  // the initial "0" over the amount already on screen.
  const [trackedActive, setTrackedActive] = useState(isActive);
  if (trackedActive !== isActive) {
    setTrackedActive(isActive);
    pendingUsdRef.current = null;
    if (isActive) {
      setDraft(toKeypadAssetAmount(assetAmount));
    }
  }

  useEffect(() => {
    if (!isActive) {
      pendingUsdRef.current = null;
      return;
    }

    if (pendingUsdRef.current !== null && pendingUsdRef.current === usdAmount) {
      return;
    }

    pendingUsdRef.current = null;
    setDraft(toKeypadAssetAmount(assetAmount));
  }, [assetAmount, isActive, usdAmount]);

  const setDraftFromKeypad = useCallback(
    (assetValue: string, usdValue: string) => {
      pendingUsdRef.current = usdValue;
      setDraft(assetValue || '0');
    },
    [],
  );

  return { draft, setDraftFromKeypad };
}
