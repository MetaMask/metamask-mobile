import { useEffect, useMemo, useState, useRef } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { type Position, type PriceUpdate } from '@metamask/perps-controller';
import { calculateRoEForPrice } from '../../utils/tpslValidation';
import { hasPreloadedData, getPreloadedData } from './hasCachedPerpsData';

// Stable empty array reference to prevent re-renders
const EMPTY_POSITIONS: Position[] = [];

export interface UsePerpsLivePositionsOptions {
  /** Throttle delay in milliseconds (default: 0 - no throttling for instant updates) */
  throttleMs?: number;
  /** Whether to subscribe to price updates for live PnL calculations (default: false) */
  useLivePnl?: boolean;
}

export interface UsePerpsLivePositionsReturn {
  /** Array of current positions with live PnL calculations */
  positions: Position[];
  /** Whether we're waiting for the first real WebSocket data (not cached) */
  isInitialLoading: boolean;
  /** Whether position data has been confirmed by at least one subscription callback */
  isPositionDataReady: boolean;
}

/**
 * Enrich positions with recalculated unrealizedPnl and returnOnEquity
 * based on current mark price from live price feed
 */
export function enrichPositionsWithLivePnL(
  positions: Position[],
  priceData: Record<string, PriceUpdate>,
): Position[] {
  if (!priceData || Object.keys(priceData).length === 0) {
    return positions;
  }

  return positions.map((position) => {
    const priceUpdate = priceData[position.symbol];
    if (!priceUpdate) {
      return position;
    }

    // Use mark price if available, fallback to mid price
    const currentPrice = Number.parseFloat(
      priceUpdate.price ?? priceUpdate.markPrice,
    );

    if (!currentPrice || Number.isNaN(currentPrice) || currentPrice <= 0) {
      return position;
    }

    const entryPrice = Number.parseFloat(position.entryPrice);
    const size = Number.parseFloat(position.size);
    const leverage = position.leverage?.value ?? 1;

    if (Number.isNaN(entryPrice) || Number.isNaN(size) || entryPrice <= 0) {
      return position;
    }

    const direction = size >= 0 ? 'long' : 'short';

    const calculatedUnrealizedPnl = (currentPrice - entryPrice) * size;

    const roePercentage = calculateRoEForPrice(
      currentPrice.toString(),
      calculatedUnrealizedPnl >= 0, // isProfit
      true, // isForPositionBoundTpsl - true for existing positions
      {
        currentPrice,
        direction,
        leverage,
        entryPrice,
      },
    );

    const calculatedRoe = roePercentage
      ? Number.parseFloat(roePercentage) / 100
      : 0;

    return {
      ...position,
      unrealizedPnl: calculatedUnrealizedPnl.toString(),
      returnOnEquity: calculatedRoe.toString(),
    };
  });
}

/**
 * Hook for real-time position updates via WebSocket subscription
 * with optional live PnL calculations based on current mark prices
 *
 * @param options - Configuration options for the hook
 * @param options.throttleMs - Throttle delay in milliseconds (default: 0)
 * @param options.useLivePnl - Whether to subscribe to price updates for live PnL calculations (default: false)
 * @returns Object containing positions array with optional live PnL and loading state
 */
export function usePerpsLivePositions(
  options: UsePerpsLivePositionsOptions = {},
): UsePerpsLivePositionsReturn {
  const { throttleMs = 0, useLivePnl = false } = options; // No live PnL by default to avoid unnecessary re-renders
  const stream = usePerpsStream();
  const [isInitialLoading, setIsInitialLoading] = useState(
    () => !hasPreloadedData('cachedPositions'),
  );
  const [isPositionDataReady, setIsPositionDataReady] = useState(
    () =>
      hasPreloadedData('cachedPositions') &&
      (getPreloadedData<Position[]>('cachedPositions') ?? []).length > 0,
  );
  const hasReceivedFirstUpdate = useRef(false);

  // Store raw positions and price data in state
  const [rawPositions, setRawPositions] = useState<Position[]>(
    () => getPreloadedData<Position[]>('cachedPositions') ?? EMPTY_POSITIONS,
  );
  const [priceData, setPriceData] = useState<Record<string, PriceUpdate>>({});

  // Derive enriched positions synchronously to prevent render flash
  const positions = useMemo(() => {
    if (rawPositions.length === 0) {
      return EMPTY_POSITIONS;
    }
    return enrichPositionsWithLivePnL(rawPositions, priceData);
  }, [rawPositions, priceData]);

  // Subscribe to position updates
  useEffect(() => {
    let readyTimer: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = stream.positions.subscribe({
      callback: (newPositions) => {
        if (newPositions === null) {
          return;
        }

        if (!hasReceivedFirstUpdate.current) {
          DevLogger.log(
            'usePerpsLivePositions: Received first WebSocket update',
            { positionsCount: newPositions?.length ?? 0 },
          );
          hasReceivedFirstUpdate.current = true;
          setIsInitialLoading(false);
        }

        setRawPositions(newPositions);

        if (newPositions.length > 0) {
          // Non-empty positions are always trustworthy — mark ready immediately
          if (readyTimer) clearTimeout(readyTimer);
          setIsPositionDataReady(true);
        } else if (!readyTimer) {
          // Empty positions might be stale cache. Defer "ready" briefly
          // to let WebSocket deliver authoritative data. If no update
          // arrives, accept empty as genuine "no positions."
          readyTimer = setTimeout(() => {
            setIsPositionDataReady(true);
          }, 150);
        }
      },
      throttleMs,
    });

    return () => {
      unsubscribe();
      if (readyTimer) clearTimeout(readyTimer);
    };
  }, [stream, throttleMs]);

  // Subscribe to price updates for real-time PnL recalculation (only if useLivePnl is true)
  useEffect(() => {
    if (!useLivePnl) {
      return undefined;
    }

    const unsubscribe = stream.prices.subscribe({
      callback: (newPriceData) => {
        setPriceData(newPriceData);
      },
      throttleMs,
    });

    return () => {
      unsubscribe();
    };
  }, [stream, throttleMs, useLivePnl]);

  return {
    positions,
    isInitialLoading,
    isPositionDataReady,
  };
}
