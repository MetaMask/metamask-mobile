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
  const initialChannelPositions = stream.positions.getSnapshot();
  const [isInitialLoading, setIsInitialLoading] = useState(() => {
    if (
      initialChannelPositions !== null &&
      initialChannelPositions !== undefined
    ) {
      return false;
    }
    const hasCached = hasPreloadedData('cachedPositions');
    return !hasCached;
  });
  const hasReceivedFirstUpdate = useRef(false);

  // Store raw positions and price data in state
  const [rawPositions, setRawPositions] = useState<Position[]>(() => {
    const cached =
      initialChannelPositions ??
      getPreloadedData<Position[]>('cachedPositions') ??
      EMPTY_POSITIONS;
    return cached;
  });
  const [priceData, setPriceData] = useState<Record<string, PriceUpdate>>({});

  // Derive enriched positions synchronously to avoid one-frame flash
  // where isInitialLoading is false but positions haven't been enriched yet
  const positions = useMemo(() => {
    if (rawPositions.length === 0) {
      return EMPTY_POSITIONS;
    }
    return enrichPositionsWithLivePnL(rawPositions, priceData);
  }, [rawPositions, priceData]);

  // Subscribe to position updates
  useEffect(() => {
    const unsubscribe = stream.positions.subscribe({
      callback: (newPositions) => {
        if (newPositions === null) {
          // Cleared on account switch — show skeleton until first update for new account
          hasReceivedFirstUpdate.current = false;
          setIsInitialLoading(true);
          setRawPositions(EMPTY_POSITIONS);
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
      },
      throttleMs,
    });

    return () => {
      unsubscribe();
    };
  }, [stream, throttleMs]);

  // Derive the unique set of symbols from the current positions so we only
  // subscribe to the prices we actually need (instead of the full price channel).
  // Sorted + memoized so the subscription effect only re-runs when the set of
  // symbols actually changes, not on every positions tick (which creates a new array).
  const symbols = useMemo(
    () =>
      Array.from(new Set(rawPositions.map((p) => p.symbol))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [rawPositions],
  );
  const symbolsKey = useMemo(() => symbols.join(','), [symbols]);

  // Subscribe to price updates for real-time PnL recalculation (only if useLivePnl is true)
  useEffect(() => {
    if (!useLivePnl || symbols.length === 0) {
      return undefined;
    }

    const unsubscribe = stream.prices.subscribeToSymbols({
      symbols,
      callback: (newPriceData) => {
        if (!newPriceData) {
          return;
        }
        // An empty payload signals a cache clear emitted by PriceStreamChannel
        // on reconnect, provider change, or account switch. Treat it as a full
        // reset so stale mark prices are not used for PnL until fresh ticks arrive.
        if (Object.keys(newPriceData).length === 0) {
          setPriceData({});
          return;
        }
        // Merge incoming price batches into existing state instead of replacing.
        // Live WebSocket ticks deliver only the symbols that changed, so replacing
        // would wipe other positions' prices when a partial batch arrives.
        setPriceData((prev) => ({ ...prev, ...newPriceData }));
      },
      throttleMs,
    });

    return () => {
      unsubscribe();
    };
    // symbolsKey captures symbols content changes via memoization, so symbols is
    // intentionally omitted to avoid re-subscribing when the array reference
    // changes but its contents are the same.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, symbolsKey, throttleMs, useLivePnl]);

  return {
    positions,
    isInitialLoading,
  };
}
