import { useMemo } from 'react';
import {
  usePredictAvailability,
  usePredictPortfolioValue,
} from '../../../../../UI/PredictNext';
import type { BalanceSlice, FiatConverter, SliceStatus } from '../../types';

/**
 * Predict's share of the balance breakdown. A value we do not have is never
 * shown as zero: a `ready` portfolio value without a finite amount, or one
 * that cannot be converted to the user's currency, is an error, and an
 * `unavailable` one leaves the slice ineligible.
 */
export function usePredictSlice(toUserCurrency: FiatConverter): BalanceSlice {
  const isAvailable = usePredictAvailability();
  const { status: valueStatus, valueUsd } = usePredictPortfolioValue();

  const { status, valueFiat } = useMemo((): {
    status: SliceStatus;
    valueFiat: number;
  } => {
    if (!isAvailable || valueStatus === 'unavailable') {
      return { status: 'ineligible', valueFiat: 0 };
    }
    if (valueStatus !== 'ready') {
      return { status: valueStatus, valueFiat: 0 };
    }
    const converted =
      typeof valueUsd === 'number' && Number.isFinite(valueUsd)
        ? toUserCurrency(valueUsd)
        : undefined;
    if (converted === undefined || !Number.isFinite(converted)) {
      return { status: 'error', valueFiat: 0 };
    }
    return { status: 'ready', valueFiat: converted };
  }, [isAvailable, toUserCurrency, valueStatus, valueUsd]);

  return useMemo(
    () => ({
      key: 'predict' as const,
      isVisible: status !== 'ineligible',
      valueFiat,
      status,
    }),
    [status, valueFiat],
  );
}
