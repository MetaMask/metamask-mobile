import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePerpsLiveFills } from './stream';
import type { OrderFill } from '../controllers/types';
import Engine from '../../../../core/Engine';

interface UsePerpsMarketFillsParams {
  /**
   * Market symbol to filter fills for (e.g., "BTC", "ETH", "HYPE")
   */
  symbol: string;
  /**
   * Throttle interval for WebSocket updates in milliseconds
   * @default 0 (instant updates)
   */
  throttleMs?: number;
}

interface UsePerpsMarketFillsReturn {
  /**
   * Array of fills for the specified market, sorted by timestamp descending
   */
  fills: OrderFill[];
  /**
   * True while waiting for initial WebSocket data
   */
  isInitialLoading: boolean;
  /**
   * Refresh function to manually refetch REST data
   */
  refresh: () => Promise<void>;
  /**
   * True while refreshing REST data
   */
  isRefreshing: boolean;
}

/**
 * Hook for fetching market-specific fills with combined WebSocket + REST data
 *
 * Combines two data sources:
 * 1. WebSocket (via usePerpsLiveFills) - Real-time updates, limited to 100 fills total
 * 2. REST API (via getOrderFills) - Complete history, up to 2000 fills
 *
 * WebSocket data displays immediately for instant feedback.
 * REST data loads in background and merges silently for complete history.
 * Live fills take precedence over REST fills (fresher data).
 *
 * @param params - Configuration options including symbol filter
 * @returns Object containing fills array, loading states, and refresh function
 */
export const usePerpsMarketFills = ({
  symbol,
  throttleMs = 0,
}: UsePerpsMarketFillsParams): UsePerpsMarketFillsReturn => {
  // WebSocket fills for real-time updates
  const { fills: liveFills, isInitialLoading } = usePerpsLiveFills({
    throttleMs,
  });

  // REST API fills state for complete history
  const [restFills, setRestFills] = useState<OrderFill[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch historical fills via REST API
  const fetchRestFills = useCallback(async () => {
    try {
      const controller = Engine.context.PerpsController;
      const provider = controller?.getActiveProvider();
      if (!provider) {
        return;
      }

      const fills = await provider.getOrderFills({ aggregateByTime: false });
      setRestFills(fills);
    } catch (error) {
      // Log error but don't fail - WebSocket fills still work
      console.error('[usePerpsMarketFills] Failed to fetch REST fills:', error);
    }
  }, []);

  // Fetch historical fills on mount (background, non-blocking)
  // This ensures we have complete fill history, not just WebSocket snapshot
  useEffect(() => {
    fetchRestFills();
  }, [fetchRestFills]);

  // Refresh function for manual refetch
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchRestFills();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchRestFills]);

  // Merge REST + WebSocket fills with deduplication, filtered by symbol
  // Live fills take precedence over REST fills (more up-to-date)
  const fills = useMemo(() => {
    // Use Map for efficient deduplication
    const fillsMap = new Map<string, OrderFill>();

    // Add REST fills first
    for (const fill of restFills) {
      // Only add fills for the requested symbol
      if (fill.symbol === symbol) {
        const key = `${fill.orderId}-${fill.timestamp}`;
        fillsMap.set(key, fill);
      }
    }

    // Add live fills (overwrites duplicates from REST - live data is fresher)
    for (const fill of liveFills) {
      // Only add fills for the requested symbol
      if (fill.symbol === symbol) {
        const key = `${fill.orderId}-${fill.timestamp}`;
        fillsMap.set(key, fill);
      }
    }

    // Convert back to array and sort by timestamp descending (newest first)
    return Array.from(fillsMap.values()).sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  }, [restFills, liveFills, symbol]);

  return {
    fills,
    isInitialLoading,
    refresh,
    isRefreshing,
  };
};
