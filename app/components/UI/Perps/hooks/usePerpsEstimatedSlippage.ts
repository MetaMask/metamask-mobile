import { useMemo } from 'react';
import { usePerpsLiveOrderBook } from './stream/usePerpsLiveOrderBook';
import {
  calculateMarketOrderLiquidity,
  type MarketOrderLiquidityParams,
} from '../utils/slippageCalculation';
import { PERFORMANCE_CONFIG } from '@metamask/perps-controller';

export interface UsePerpsEstimatedSlippageOptions
  extends Pick<
    MarketOrderLiquidityParams,
    'currentPrice' | 'maxSlippageBps' | 'szDecimals' | 'reduceOnly' | 'size'
  > {
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
  worstSlippageBps: number | null;
  canFillWithinSlippage: boolean | null;
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
  currentPrice,
  maxSlippageBps,
  szDecimals,
  reduceOnly,
  size,
}: UsePerpsEstimatedSlippageOptions): UsePerpsEstimatedSlippageReturn {
  // Throttle the L2 book at `SlippageEstimateThrottleMs`. The slippage row
  // needs sub-second updates while the user types, which is faster than the
  // generic order-form price guideline; the downstream `useMemo` keeps each
  // tick cheap (one VWAP walk).
  const { orderBook, dataSymbol, error } = usePerpsLiveOrderBook({
    symbol,
    enabled: enabled && Boolean(symbol),
    levels: PERFORMANCE_CONFIG.SlippageEstimateBookLevels,
    throttleMs: PERFORMANCE_CONFIG.SlippageEstimateThrottleMs,
  });

  const liquidity = useMemo(() => {
    if (!enabled || !sizeUsd || sizeUsd <= 0 || dataSymbol !== symbol) {
      return null;
    }
    return calculateMarketOrderLiquidity({
      orderBook,
      sizeUsd,
      isBuy,
      currentPrice,
      maxSlippageBps,
      szDecimals,
      reduceOnly,
      size,
    });
  }, [
    orderBook,
    dataSymbol,
    symbol,
    sizeUsd,
    isBuy,
    enabled,
    currentPrice,
    maxSlippageBps,
    szDecimals,
    reduceOnly,
    size,
  ]);

  return {
    estimatedSlippageBps: liquidity?.estimatedSlippageBps ?? null,
    worstSlippageBps: liquidity?.worstSlippageBps ?? null,
    canFillWithinSlippage: liquidity?.canFillWithinSlippage ?? null,
    isReady:
      enabled &&
      dataSymbol === symbol &&
      (orderBook !== null || error !== null),
  };
}
