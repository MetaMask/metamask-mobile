import { useMemo } from 'react';
import { PredictPosition } from '../types';
import { useLiveMarketPrices } from './useLiveMarketPrices';

export interface UseLivePositionsOptions {
  /**
   * Whether to enable live price updates
   * @default true
   */
  enabled?: boolean;
}

export interface UseLivePositionsResult {
  /**
   * Positions with live-updated values based on current market prices
   */
  livePositions: PredictPosition[];
  /**
   * Whether the WebSocket connection is active
   */
  isConnected: boolean;
  /**
   * Timestamp of the last price update
   */
  lastUpdateTime: number | null;
}

/**
 * Hook that takes positions and returns live-updated positions based on real-time market prices.
 *
 * Uses the bestBid price from live market data to calculate:
 * - currentValue: size * bestBid (what you can sell for right now)
 * - cashPnl: currentValue - initialValue (profit/loss)
 * - percentPnl: ((currentValue - initialValue) / initialValue) * 100
 *
 * @param positions - Array of positions to track (from usePredictPositions)
 * @param options - Configuration options (enabled: boolean)
 * @returns Live-updated positions, connection status, and last update timestamp
 */
export const useLivePositions = (
  positions: PredictPosition[],
  options: UseLivePositionsOptions = {},
): UseLivePositionsResult => {
  const { enabled = true } = options;

  const tokenIds = useMemo(
    () => positions.map((position) => position.outcomeTokenId),
    [positions],
  );

  const { prices, isConnected, lastUpdateTime } = useLiveMarketPrices(
    tokenIds,
    { enabled: enabled && positions.length > 0 },
  );

  const livePositions = useMemo(() => {
    if (positions.length === 0) {
      return [];
    }

    return positions.map((position) => {
      const priceUpdate = prices.get(position.outcomeTokenId);

      if (!priceUpdate) {
        return position;
      }

      const { bestBid } = priceUpdate;
      const liveCurrentValue = position.size * bestBid;
      const liveCashPnl = liveCurrentValue - position.initialValue;
      const livePercentPnl =
        position.initialValue > 0
          ? ((liveCurrentValue - position.initialValue) /
              position.initialValue) *
            100
          : 0;

      return {
        ...position,
        currentValue: liveCurrentValue,
        cashPnl: liveCashPnl,
        percentPnl: livePercentPnl,
        price: bestBid,
      };
    });
  }, [positions, prices]);

  return {
    livePositions,
    isConnected,
    lastUpdateTime,
  };
};
