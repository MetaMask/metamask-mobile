import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { usePerpsLiveFills } from './stream';
import type { OrderFill } from '../controllers/types';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import { ensureError } from '../../../../util/errorUtils';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';

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
 * 2. REST API (via getOrderFills) - Historical fills from last 3 months (up to 2000 fills)
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
  // Get current selected account address for debugging context
  const selectedAddress = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:1',
  )?.address;

  // Use ref to access address in callback without adding as dependency
  const addressRef = useRef(selectedAddress);
  addressRef.current = selectedAddress;

  // WebSocket fills for real-time updates
  const { fills: liveFills, isInitialLoading } = usePerpsLiveFills({
    throttleMs,
  });

  // REST API fills state for complete history
  const [restFills, setRestFills] = useState<OrderFill[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch historical fills via REST API (limited to last 3 months for performance)
  const fetchRestFills = useCallback(async () => {
    const controller = Engine.context.PerpsController;
    if (!controller) {
      return;
    }

    try {
      const provider = controller?.getActiveProvider();
      if (!provider) {
        return;
      }

      // Use time-filtered API to limit data fetched for active traders
      const startTime = Date.now() - PERPS_CONSTANTS.FILLS_LOOKBACK_MS;

      const fills = await provider.getOrderFills({
        aggregateByTime: false,
        startTime,
      });
      setRestFills(fills);
    } catch (err) {
      // Get the current account for debugging context
      const accountAddress = addressRef.current ?? 'unknown';

      // Log error to Sentry but don't fail - WebSocket fills still work
      Logger.error(ensureError(err), {
        tags: {
          feature: PERPS_CONSTANTS.FEATURE_NAME,
        },
        extra: {
          hook: 'usePerpsMarketFills',
          method: 'fetchRestFills',
          message: `[usePerpsMarketFills] Failed to fetch REST fills for account ${accountAddress}: ${err}`,
        },
      });
    }
  }, []);

  // Fetch historical fills on mount and when account changes (background, non-blocking)
  // This ensures we have complete fill history, not just WebSocket snapshot
  // Clear stale fills and refetch when account changes to prevent data leakage
  useEffect(() => {
    // Clear stale REST fills from previous account before fetching new ones
    setRestFills([]);
    fetchRestFills();
  }, [fetchRestFills, selectedAddress]);

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
