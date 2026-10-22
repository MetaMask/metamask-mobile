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
 * Stored on the persisted settings slice, with the other Perps preferences.
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
