import { useCallback, useMemo } from 'react';
import { useSelector, useStore } from 'react-redux';
import type { RootState } from '../../../../reducers';
import { selectPredictLegacyDepositAvailable } from './selectPredictLegacyDeposit';

export interface PredictLegacyDeposit {
  /**
   * Whether a surface may offer the legacy Polymarket deposit (a Predict
   * deposit, add funds, or the Predict balance as a pay source) for the
   * Active Venue. When false, render no entry point at all.
   */
  isAvailable: boolean;
  /**
   * The same check against the store at call time. Call it where a deferred
   * deposit executes: the Active Venue can change between the render that
   * offered it and the moment it runs.
   */
  isAvailableNow: () => boolean;
}

/**
 * The availability and capability gate (D1, A3) for surfaces outside Predict
 * that start the legacy Polymarket deposit. It gates; it does not run the
 * deposit, which stays legacy execution until PRED-1356.
 */
export const usePredictLegacyDeposit = (): PredictLegacyDeposit => {
  const isAvailable = useSelector(selectPredictLegacyDepositAvailable);
  const store = useStore<RootState>();
  const isAvailableNow = useCallback(
    () => selectPredictLegacyDepositAvailable(store.getState()),
    [store],
  );
  return useMemo(
    () => ({ isAvailable, isAvailableNow }),
    [isAvailable, isAvailableNow],
  );
};
