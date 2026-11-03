import { useCallback } from 'react';
import { usePerpsOrderBookPreferences } from './usePerpsOrderBookPreferences';
import type { PerpsSizeDenomination } from '../utils/perpsSizeDenomination';

export interface UsePerpsSizeDenominationResult {
  /** USD or coin, shared by Lite and Pro and restored after restart. */
  denomination: PerpsSizeDenomination;
  /** Persist a user toggle so the next market and session keep it. */
  setDenomination: (denomination: PerpsSizeDenomination) => void;
}

/**
 * Shared order-size denomination for Lite and Pro order forms.
 *
 * The persisted store is the order-book currency (`usd` / `base`). Pro already
 * saved that choice for the book; Lite reads and writes the same field so a
 * toggle survives sheet remounts, market changes, and restarts. `base` is the
 * coin amount (`asset` on the order form).
 */
export const usePerpsSizeDenomination = (): UsePerpsSizeDenominationResult => {
  const { preferences, setOrderBookPreferences } =
    usePerpsOrderBookPreferences();
  const denomination: PerpsSizeDenomination =
    preferences.currency === 'base' ? 'asset' : 'usd';

  const setDenomination = useCallback(
    (next: PerpsSizeDenomination) => {
      setOrderBookPreferences({
        currency: next === 'asset' ? 'base' : 'usd',
      });
    },
    [setOrderBookPreferences],
  );

  return { denomination, setDenomination };
};
