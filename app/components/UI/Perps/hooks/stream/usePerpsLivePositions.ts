import { useEffect, useMemo, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { type Position, type PriceUpdate } from '@metamask/perps-controller';
import { hasPreloadedData, getPreloadedData } from './hasCachedPerpsData';
import { selectPerpsSelectedAccountAddress } from '../../selectors/selectedAccountAddress';

// Stable empty array reference to prevent re-renders
const EMPTY_POSITIONS: Position[] = [];

export interface UsePerpsLivePositionsOptions {
  /** Whether to subscribe to position updates (default: true) */
  enabled?: boolean;
  /** Throttle delay in milliseconds (default: 0 - no throttling for instant updates) */
  throttleMs?: number;
  /** Whether to subscribe to live prices for the position symbols, exposed as `prices` (default: false) */
  useLivePnl?: boolean;
}

export interface UsePerpsLivePositionsReturn {
  /** Current positions with the controller's PnL, RoE and value */
  positions: Position[];
  /** Whether we're waiting for the first real WebSocket data (not cached) */
  isInitialLoading: boolean;
  /** Deliveries accepted by this selected-account subscription. */
  deliveryRevision?: number;
  /** Latest price updates by symbol (only populated with `useLivePnl`). */
  prices?: Record<string, PriceUpdate>;
}

/**
 * Hook for real-time position updates via WebSocket subscription.
 * Positions carry the controller's `unrealizedPnl`, `returnOnEquity` and
 * `positionValue` as delivered; with `useLivePnl` it also exposes the live
 * prices (e.g. `prices[symbol].markPrice`) for the position symbols.
 *
 * @param options - Configuration options for the hook
 * @param options.throttleMs - Throttle delay in milliseconds (default: 0)
 * @param options.useLivePnl - Whether to subscribe to price updates for live PnL calculations (default: false)
 * @returns Object containing positions array with optional live PnL and loading state
 */
export function usePerpsLivePositions(
  options: UsePerpsLivePositionsOptions = {},
): UsePerpsLivePositionsReturn {
  const { enabled = true, throttleMs = 0, useLivePnl = false } = options; // No live PnL by default to avoid unnecessary re-renders
  const stream = usePerpsStream();
  const selectedAddress = useSelector(selectPerpsSelectedAccountAddress);
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
  const [deliveryRevision, setDeliveryRevision] = useState(0);
  const acceptedDeliveryRef = useRef(false);

  // Store raw positions and price data in state
  const [rawPositions, setRawPositions] = useState<Position[]>(() => {
    const cached =
      initialChannelPositions ??
      getPreloadedData<Position[]>('cachedPositions') ??
      EMPTY_POSITIONS;
    return cached;
  });
  const [rawPositionsAddress, setRawPositionsAddress] =
    useState(selectedAddress);
  const [priceData, setPriceData] = useState<Record<string, PriceUpdate>>({});

  // Positions for another account never show.
  const positions =
    rawPositionsAddress !== selectedAddress || rawPositions.length === 0
      ? EMPTY_POSITIONS
      : rawPositions;

  // Subscribe to position updates
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const unsubscribe = stream.positions.subscribe({
      callback: (newPositions) => {
        acceptedDeliveryRef.current = false;
        if (newPositions === null) {
          // Cleared on account switch — show skeleton until first update for new account
          hasReceivedFirstUpdate.current = false;
          setIsInitialLoading(true);
          setRawPositions(EMPTY_POSITIONS);
          setRawPositionsAddress(selectedAddress);
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
        setRawPositionsAddress(selectedAddress);
        acceptedDeliveryRef.current = true;
      },
      onDelivery: (source) => {
        if (source === 'fresh' && acceptedDeliveryRef.current) {
          setDeliveryRevision((revision) => revision + 1);
        }
        acceptedDeliveryRef.current = false;
      },
      throttleMs,
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, selectedAddress, stream, throttleMs]);

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
    isInitialLoading:
      rawPositionsAddress !== selectedAddress || isInitialLoading,
    deliveryRevision,
    prices: priceData,
  };
}
