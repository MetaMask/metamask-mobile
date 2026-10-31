import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPerpsSizeDenomination } from '../../../../actions/settings';
import { selectPerpsSizeDenomination } from '../selectors/sizeDenomination';
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
 * This is a second persisted copy of the Pro order book's `currency`
 * (`usd` / `base` via `usePerpsOrderBookPreferences`). Both are required:
 * the book currency is the Pro order book's own listed-by unit and already
 * persisted before this choice was shared, while Lite has no order book and
 * still has to keep the same choice across markets, sheet remounts, and
 * restarts. Toggles write both. On a Pro open, a saved coin in either store
 * wins so a book left on USD does not hide a coin size choice.
 */
export const usePerpsSizeDenomination = (): UsePerpsSizeDenominationResult => {
  const denomination = useSelector(selectPerpsSizeDenomination);
  const dispatch = useDispatch();

  const setDenomination = useCallback(
    (next: PerpsSizeDenomination) => {
      dispatch(setPerpsSizeDenomination(next));
    },
    [dispatch],
  );

  return { denomination, setDenomination };
};
