import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import { usePerpsMarketFills } from './usePerpsMarketFills';

interface UsePerpsRecordedOrderFeesResult {
  /** Sum of execution-time fees for fills matched to the order. */
  totalFee: number | undefined;
  /** True until both live and historical fill sources finish initial loading. */
  isLoading: boolean;
  /** True when historical fills could not be loaded. */
  hasError: boolean;
}

/**
 * Returns the cumulative fee recorded for a historical order.
 *
 * All fills sharing the order ID contribute to the total, including partial
 * fills that executed before an order was canceled. The value remains
 * undefined while fill history is loading or unavailable so callers do not
 * present an incomplete lookup as a confirmed zero fee.
 *
 * @param orderId - Hyperliquid order ID to correlate with execution fills.
 * @param symbol - Market symbol used to scope the fill history.
 * @param orderTimestamp - Order timestamp used to verify fill-history coverage.
 * @returns Recorded total fee and lookup state.
 */
export function usePerpsRecordedOrderFees(
  orderId: string | undefined,
  symbol: string,
  orderTimestamp: number | undefined,
): UsePerpsRecordedOrderFeesResult {
  const { fills, isInitialLoading, isHistoryLoading, historyError } =
    usePerpsMarketFills({ symbol });

  const isLoading = Boolean(orderId && (isInitialLoading || isHistoryLoading));
  const hasError = Boolean(orderId && historyError);

  const totalFee = useMemo(() => {
    if (!orderId || isLoading || hasError) {
      return undefined;
    }

    const matchingFills = fills.filter((fill) => fill.orderId === orderId);

    if (matchingFills.length === 0) {
      const historyStartTime = Date.now() - PERPS_CONSTANTS.FillsLookbackMs;
      if (orderTimestamp === undefined || orderTimestamp < historyStartTime) {
        return undefined;
      }
    }

    return matchingFills
      .reduce(
        (sum, fill) => sum.plus(new BigNumber(fill.fee || '0')),
        new BigNumber(0),
      )
      .toNumber();
  }, [fills, hasError, isLoading, orderId, orderTimestamp]);

  return { totalFee, isLoading, hasError };
}
