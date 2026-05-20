import { useMemo } from 'react';
import { usePerpsLiveOrderBook } from './stream/usePerpsLiveOrderBook';
import { calculateEstimatedSlippageBps } from '../utils/slippageCalculation';

export interface UsePerpsEstimatedSlippageOptions {
  /** Asset symbol (e.g. 'BTC'). */
  symbol: string;
  /** USD notional to fill. Pass undefined / 0 to disable the calc. */
  sizeUsd: number | undefined;
  /** true = BUY (sweeps asks), false = SELL (sweeps bids). */
  isBuy: boolean;
  /**
   * Disable the subscription entirely (e.g. for limit orders).
   * Defaults to true.
   */
  enabled?: boolean;
}

export interface UsePerpsEstimatedSlippageReturn {
  /** Estimated slippage in bps, or null when the book is loading or too shallow. */
  estimatedSlippageBps: number | null;
  /** True once the underlying order book subscription has produced data. */
  isReady: boolean;
}

/**
 * Estimates the slippage in basis points a market order would incur given the
 * live HyperLiquid order book and the requested USD size. Combines the L2 book
 * subscription with the pure VWAP calc helper so the order screen can show a
 * "Est: X%" value and block submission when the estimate exceeds the user cap.
 *
 * @param options - Symbol, USD size, direction, and an optional enable flag.
 * @returns Estimated slippage in bps and a readiness flag.
 */
export function usePerpsEstimatedSlippage({
  symbol,
  sizeUsd,
  isBuy,
  enabled = true,
}: UsePerpsEstimatedSlippageOptions): UsePerpsEstimatedSlippageReturn {
  const { orderBook } = usePerpsLiveOrderBook({
    symbol,
    enabled: enabled && Boolean(symbol),
    levels: 10,
    throttleMs: 250,
  });

  const estimatedSlippageBps = useMemo(() => {
    if (!enabled || !sizeUsd || sizeUsd <= 0) {
      return null;
    }
    return calculateEstimatedSlippageBps({
      orderBook,
      sizeUsd,
      isBuy,
    });
  }, [orderBook, sizeUsd, isBuy, enabled]);

  return {
    estimatedSlippageBps,
    isReady: orderBook !== null,
  };
}
