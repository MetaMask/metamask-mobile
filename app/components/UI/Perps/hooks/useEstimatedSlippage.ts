import { useMemo } from 'react';
import { type OrderBookData } from '@metamask/perps-controller';
import { usePerpsLiveOrderBook } from './stream/usePerpsLiveOrderBook';

export interface EstimatedSlippageResult {
  estimatedSlippagePct: number | null;
  insufficientLiquidity: boolean;
}

const EMPTY_RESULT: EstimatedSlippageResult = {
  estimatedSlippagePct: null,
  insufficientLiquidity: false,
};

/**
 * Walk one side of the order book until `notionalUsd` is filled and return
 * the percent deviation between the volume-weighted fill price and mid price.
 */
export function computeSlippagePct(
  orderBook: OrderBookData,
  notionalUsd: number,
  direction: 'long' | 'short',
): EstimatedSlippageResult {
  const levels = direction === 'long' ? orderBook.asks : orderBook.bids;
  const midPrice = Number.parseFloat(orderBook.midPrice);
  if (!levels.length || !Number.isFinite(midPrice) || midPrice <= 0) {
    return EMPTY_RESULT;
  }

  let remainingUsd = notionalUsd;
  let filledSize = 0;
  let filledNotional = 0;

  for (const level of levels) {
    if (remainingUsd <= 0) {
      break;
    }
    const price = Number.parseFloat(level.price);
    const size = Number.parseFloat(level.size);
    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(size) ||
      size <= 0
    ) {
      continue;
    }
    const levelNotional = price * size;
    const consumeUsd = Math.min(remainingUsd, levelNotional);
    const consumeSize = consumeUsd / price;
    filledSize += consumeSize;
    filledNotional += consumeUsd;
    remainingUsd -= consumeUsd;
  }

  if (filledSize <= 0) {
    return EMPTY_RESULT;
  }

  if (remainingUsd > 0) {
    return { estimatedSlippagePct: null, insufficientLiquidity: true };
  }

  const avgFillPrice = filledNotional / filledSize;
  const slippageRatio =
    direction === 'long'
      ? (avgFillPrice - midPrice) / midPrice
      : (midPrice - avgFillPrice) / midPrice;

  return {
    estimatedSlippagePct: Math.max(0, slippageRatio * 100),
    insufficientLiquidity: false,
  };
}

export interface UseEstimatedSlippageOptions {
  symbol: string;
  notionalUsd: number;
  direction: 'long' | 'short';
  enabled?: boolean;
}

/**
 * Compute estimated slippage % for a prospective market order against the
 * live order book. Uses usePerpsLiveOrderBook (20 levels, 500ms throttle).
 */
export function useEstimatedSlippage({
  symbol,
  notionalUsd,
  direction,
  enabled = true,
}: UseEstimatedSlippageOptions): EstimatedSlippageResult {
  const { orderBook } = usePerpsLiveOrderBook({
    symbol,
    levels: 20,
    throttleMs: 500,
    enabled: enabled && !!symbol,
  });

  return useMemo(() => {
    if (
      !enabled ||
      !orderBook ||
      !Number.isFinite(notionalUsd) ||
      notionalUsd <= 0
    ) {
      return EMPTY_RESULT;
    }
    return computeSlippagePct(orderBook, notionalUsd, direction);
  }, [enabled, orderBook, notionalUsd, direction]);
}
