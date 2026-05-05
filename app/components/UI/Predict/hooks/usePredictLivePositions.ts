import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { PredictPosition } from '../types';
import { predictQueries } from '../queries';
import { useLiveMarketPrices } from './useLiveMarketPrices';

/**
 * Stable empty Map reference to avoid unnecessary useEffect cycles.
 * When livePositionUpdates computes an empty Map, returning this constant
 * preserves referential equality and prevents the cache-sync effect from firing.
 */
const EMPTY_POSITION_UPDATES = new Map<
  string,
  Pick<PredictPosition, 'currentValue' | 'cashPnl' | 'percentPnl' | 'price'>
>();

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

/**
 * Side-effect hook that subscribes to live market prices and syncs
 * computed position values (currentValue, cashPnl, percentPnl, price)
 * into the address-scoped positions query cache.
 *
 * @param positions - Array of positions to track (from usePredictPositions)
 * @param options - Configuration options
 * @internal Only consumed by usePredictPositions
 */
export const usePredictLivePositions = (
  positions: PredictPosition[],
  options: UseLivePositionsOptions = {},
): void => {
  const { enabled = true, cacheAddress } = options;
  const queryClient = useQueryClient();
  const isScreenFocused = useIsFocused();

  const tokenIds = useMemo(
    () =>
      positions
        .filter((position) => !position.claimable)
        .map((position) => position.outcomeTokenId),
    [positions],
  );

  const { prices, isConnected, lastUpdateTime } = useLiveMarketPrices(
    tokenIds,
    { enabled: enabled && isScreenFocused && tokenIds.length > 0 },
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

    return updates.size > 0 ? updates : EMPTY_POSITION_UPDATES;
  }, [livePositions, positions]);

  useEffect(() => {
    if (
      !enabled ||
      !isScreenFocused ||
      !cacheAddress ||
      livePositionUpdates.size === 0
    ) {
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
  }, [
    cacheAddress,
    enabled,
    isScreenFocused,
    livePositionUpdates,
    queryClient,
  ]);
};
