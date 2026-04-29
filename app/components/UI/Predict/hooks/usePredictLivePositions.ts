import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PredictPosition } from '../types';
import { predictQueries } from '../queries';
import { useLiveMarketPrices } from './useLiveMarketPrices';

export interface UseLivePositionsOptions {
  /**
   * Whether to enable live price updates
   * @default true
   */
  enabled?: boolean;
  /**
   * Address-scoped positions cache to sync live values into
   * @internal
   */
  cacheAddress?: string;
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
export const usePredictLivePositions = (
  positions: PredictPosition[],
  options: UseLivePositionsOptions = {},
): UseLivePositionsResult => {
  const { enabled = true, cacheAddress } = options;
  const queryClient = useQueryClient();

  const tokenIds = useMemo(
    () =>
      positions
        .filter((position) => !position.claimable)
        .map((position) => position.outcomeTokenId),
    [positions],
  );

  const { prices, isConnected, lastUpdateTime } = useLiveMarketPrices(
    tokenIds,
    { enabled: enabled && tokenIds.length > 0 },
  );

  const livePositions = useMemo(() => {
    if (positions.length === 0) {
      return [];
    }

    let hasChanges = false;

    const nextPositions = positions.map((position) => {
      if (position.claimable) {
        return position;
      }

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

      if (
        position.currentValue === liveCurrentValue &&
        position.cashPnl === liveCashPnl &&
        position.percentPnl === livePercentPnl &&
        position.price === bestBid
      ) {
        return position;
      }

      hasChanges = true;

      return {
        ...position,
        currentValue: liveCurrentValue,
        cashPnl: liveCashPnl,
        percentPnl: livePercentPnl,
        price: bestBid,
      };
    });

    return hasChanges ? nextPositions : positions;
  }, [positions, prices]);

  const livePositionUpdates = useMemo(() => {
    const updates = new Map<
      string,
      Pick<PredictPosition, 'currentValue' | 'cashPnl' | 'percentPnl' | 'price'>
    >();

    livePositions.forEach((livePosition, index) => {
      const originalPosition = positions[index];

      if (
        !originalPosition ||
        originalPosition.id !== livePosition.id ||
        originalPosition === livePosition ||
        livePosition.claimable
      ) {
        return;
      }

      updates.set(livePosition.id, {
        currentValue: livePosition.currentValue,
        cashPnl: livePosition.cashPnl,
        percentPnl: livePosition.percentPnl,
        price: livePosition.price,
      });
    });

    return updates;
  }, [livePositions, positions]);

  useEffect(() => {
    if (!enabled || !cacheAddress || livePositionUpdates.size === 0) {
      return;
    }

    queryClient.setQueryData<PredictPosition[]>(
      predictQueries.positions.keys.byAddress(cacheAddress),
      (cachedPositions) => {
        if (!cachedPositions || cachedPositions.length === 0) {
          return cachedPositions;
        }

        let hasChanges = false;

        const nextPositions = cachedPositions.map((cachedPosition) => {
          const livePositionUpdate = livePositionUpdates.get(cachedPosition.id);

          if (!livePositionUpdate || cachedPosition.claimable) {
            return cachedPosition;
          }

          if (
            cachedPosition.currentValue === livePositionUpdate.currentValue &&
            cachedPosition.cashPnl === livePositionUpdate.cashPnl &&
            cachedPosition.percentPnl === livePositionUpdate.percentPnl &&
            cachedPosition.price === livePositionUpdate.price
          ) {
            return cachedPosition;
          }

          hasChanges = true;

          return {
            ...cachedPosition,
            ...livePositionUpdate,
          };
        });

        return hasChanges ? nextPositions : cachedPositions;
      },
    );
  }, [cacheAddress, enabled, livePositionUpdates, queryClient]);

  return {
    livePositions,
    isConnected,
    lastUpdateTime,
  };
};
