import { useCallback, useEffect, useState } from 'react';
import {
  readPerpsSizeDenomination,
  subscribePerpsSizeDenomination,
  writePerpsSizeDenomination,
  type PerpsSizeDenomination,
} from '../utils/perpsSizeDenomination';

export interface UsePerpsSizeDenominationResult {
  /** USD or coin, shared by Lite and Pro and restored after restart. */
  denomination: PerpsSizeDenomination;
  /** Persist a user toggle so the next market and session keep it. */
  setDenomination: (denomination: PerpsSizeDenomination) => void;
}

/**
 * Shared order-size denomination for Lite and Pro order forms.
 */
export const usePerpsSizeDenomination = (): UsePerpsSizeDenominationResult => {
  const [denomination, setDenominationState] = useState(
    readPerpsSizeDenomination,
  );

  useEffect(() => subscribePerpsSizeDenomination(setDenominationState), []);

  const setDenomination = useCallback((next: PerpsSizeDenomination) => {
    writePerpsSizeDenomination(next);
  }, []);

  return { denomination, setDenomination };
};
