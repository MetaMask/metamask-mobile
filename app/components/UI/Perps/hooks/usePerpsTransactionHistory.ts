import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { CaipAccountId } from '@metamask/utils';
import { PerpsTransaction } from '../types/transactionHistory';
import { useUserHistory } from './useUserHistory';
import { usePerpsLiveFills } from './stream/usePerpsLiveFills';
import {
  transformFillsToTransactions,
  transformOrdersToTransactions,
  transformFundingToTransactions,
  transformUserHistoryToTransactions,
} from '../utils/transactionTransforms';
import type { OrderFill, Order, Funding } from '../controllers/types';

interface UsePerpsTransactionHistoryParams {
  startTime?: number;
  endTime?: number;
  accountId?: CaipAccountId;
  skipInitialFetch?: boolean;
}

interface UsePerpsTransactionHistoryResult {
  transactions: PerpsTransaction[];
  isLoading: boolean;
  ordersLoaded: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Comprehensive hook to fetch and combine all perps transaction data
 * Includes trades, orders, funding, and user history (deposits/withdrawals)
 * Uses HyperLiquid user history as the single source of truth for withdrawals
 *
 * Performance optimization: Progressive rendering
 * - Phase 1: Fetch fills + funding immediately, render as soon as ready
 * - Phase 2: Fetch orders in background for enrichment + Orders tab
 *
 * FlashList handles rendering virtualization, so we don't need client-side pagination.
 */
export const usePerpsTransactionHistory = ({
  startTime,
  endTime,
  accountId,
  skipInitialFetch = false,
}: UsePerpsTransactionHistoryParams = {}): UsePerpsTransactionHistoryResult => {
  // Core state
  const [transactions, setTransactions] = useState<PerpsTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store fetched data in refs for re-enrichment when orders arrive
  const fillsRef = useRef<OrderFill[]>([]);
  const fundingRef = useRef<Funding[]>([]);
  const ordersRef = useRef<Order[]>([]);

  // Get user history (includes deposits/withdrawals) - single source of truth
  const {
    userHistory,
    isLoading: userHistoryLoading,
    error: userHistoryError,
    refetch: refetchUserHistory,
  } = useUserHistory({ startTime, endTime, accountId });

  // Subscribe to live WebSocket fills for instant trade updates
  // This ensures new trades appear immediately without waiting for REST refetch
  const { fills: liveFills } = usePerpsLiveFills({ throttleMs: 0 });

  // Store userHistory in ref to avoid recreating fetchTransactions callback
  const userHistoryRef = useRef(userHistory);
  // Track if initial fetch has been done to prevent duplicate fetches
  const initialFetchDone = useRef(false);

  useEffect(() => {
    userHistoryRef.current = userHistory;
  }, [userHistory]);

  /**
   * Build transactions from current data (fills, orders, funding, userHistory)
   * Called after Phase 1 and again after Phase 2 when orders arrive
   */
  const buildTransactions = useCallback(
    (
      fills: OrderFill[],
      orders: Order[],
      funding: Funding[],
      includeOrders: boolean,
    ): PerpsTransaction[] => {
      // Create order map for fill enrichment (TP/SL pills)
      const orderMap = new Map(orders.map((order) => [order.orderId, order]));

      // Enrich fills with detailedOrderType for TP/SL pill display
      const enrichedFills = fills.map((fill) => ({
        ...fill,
        detailedOrderType: orderMap.get(fill.orderId)?.detailedOrderType,
      }));

      // Transform each data type to PerpsTransaction format
      const fillTransactions = transformFillsToTransactions(enrichedFills);
      const fundingTransactions = transformFundingToTransactions(funding);
      const userHistoryTransactions = transformUserHistoryToTransactions(
        userHistoryRef.current,
      );

      // Build combined transactions
      const allTransactions = [
        ...fillTransactions,
        ...fundingTransactions,
        ...userHistoryTransactions,
      ];

      // Include order transactions only when orders are loaded
      if (includeOrders) {
        const orderTransactions = transformOrdersToTransactions(orders);
        allTransactions.push(...orderTransactions);
      }

      // Sort by timestamp descending (newest first)
      allTransactions.sort((a, b) => b.timestamp - a.timestamp);

      // Remove duplicates based on ID
      const uniqueTransactions = allTransactions.reduce((acc, transaction) => {
        const existingIndex = acc.findIndex((t) => t.id === transaction.id);
        if (existingIndex === -1) {
          acc.push(transaction);
        }
        return acc;
      }, [] as PerpsTransaction[]);

      return uniqueTransactions;
    },
    [],
  );

  /**
   * Main fetch function with progressive rendering
   * Phase 1: Fetch fills + funding, render immediately
   * Phase 2: Fetch orders in background, re-render with enrichment
   */
  const fetchTransactions = useCallback(
    async (skipCache = false) => {
      try {
        setIsLoading(true);
        setError(null);
        setOrdersLoaded(false);

        const controller = Engine.context.PerpsController;
        if (!controller) {
          throw new Error('PerpsController not available');
        }

        const provider = controller.getActiveProvider();
        if (!provider) {
          throw new Error('No active provider available');
        }

        DevLogger.log('Fetching transaction history (progressive)...');

        // PHASE 1: Fetch fills + funding in parallel (fast path)
        const [fills, funding] = await Promise.all([
          provider.getOrderFills({
            accountId,
            aggregateByTime: false,
            skipCache,
          }),
          provider.getFunding({
            accountId,
            startTime,
            endTime,
            skipCache,
          }),
        ]);

        DevLogger.log('Phase 1 complete - fills + funding fetched:', {
          fills: fills.length,
          funding: funding.length,
        });

        // Store in refs for later re-enrichment
        fillsRef.current = fills;
        fundingRef.current = funding;

        // Build and render immediately WITHOUT orders (no enrichment yet)
        const phase1Transactions = buildTransactions(fills, [], funding, false);
        setTransactions(phase1Transactions);
        setIsLoading(false); // UI is now interactive!

        DevLogger.log('Phase 1 rendered:', {
          transactionCount: phase1Transactions.length,
        });

        // PHASE 2: Fetch orders in background (for enrichment + Orders tab)
        provider
          .getOrders({ accountId, skipCache })
          .then((orders) => {
            DevLogger.log('Phase 2 complete - orders fetched:', {
              orders: orders.length,
            });

            // Store orders in ref
            ordersRef.current = orders;

            // Re-build transactions with orders (now enriched with TP/SL pills)
            const phase2Transactions = buildTransactions(
              fillsRef.current,
              orders,
              fundingRef.current,
              true,
            );
            setTransactions(phase2Transactions);
            setOrdersLoaded(true);

            DevLogger.log('Phase 2 rendered:', {
              transactionCount: phase2Transactions.length,
            });
          })
          .catch((err) => {
            // Orders failed - fills/funding still work, just no TP/SL pills or Orders tab
            DevLogger.log('Failed to fetch orders for enrichment:', err);
            // Don't set error - Phase 1 data is still valid
            // Mark orders as "loaded" so Orders tab shows empty state instead of spinner
            setOrdersLoaded(true);
          });
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to fetch transaction history';
        DevLogger.log('Error fetching transaction history:', errorMessage);
        setError(errorMessage);
        setTransactions([]);
        setIsLoading(false);
      }
    },
    [startTime, endTime, accountId, buildTransactions],
  );

  /**
   * Refetch all data (bypasses cache)
   * Used for pull-to-refresh
   */
  const refetch = useCallback(async () => {
    // Reset refs
    fillsRef.current = [];
    fundingRef.current = [];
    ordersRef.current = [];

    // Fetch user history first, then fetch all transactions
    const freshUserHistory = await refetchUserHistory();
    userHistoryRef.current = freshUserHistory;
    await fetchTransactions(true); // skipCache = true for refresh
  }, [fetchTransactions, refetchUserHistory]);

  // Initial fetch on mount
  useEffect(() => {
    if (!skipInitialFetch && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchTransactions(false); // Use cache on initial load
    }
  }, [skipInitialFetch, fetchTransactions]);

  // Combine loading states
  const combinedIsLoading = useMemo(
    () => isLoading || userHistoryLoading,
    [isLoading, userHistoryLoading],
  );

  // Combine error states
  const combinedError = useMemo(() => {
    if (error) return error;
    if (userHistoryError) return userHistoryError;
    return null;
  }, [error, userHistoryError]);

  // Merge live WebSocket fills with REST transactions for instant updates
  // Live fills take precedence for recent trades
  // IMPORTANT: Deduplicate trades using asset+timestamp (truncated to seconds), not tx.id,
  // because:
  // 1. The ID includes array index which differs between REST and WebSocket arrays
  // 2. Aggregated fills (from split stop loss/TP) may have slightly different first-fill
  //    timestamps between REST and WebSocket if fills arrive in different order
  const mergedTransactions = useMemo(() => {
    // Transform live fills to PerpsTransaction format
    // Note: transformFillsToTransactions now aggregates split stop loss/TP fills
    const liveTransactions = transformFillsToTransactions(liveFills);

    // If no REST transactions yet, return only live fills
    if (transactions.length === 0) {
      return liveTransactions;
    }

    // Separate trade transactions from non-trade transactions (orders, funding, deposits)
    // Non-trade transactions use their ID directly (no index issue)
    const restTradeTransactions = transactions.filter(
      (tx) => tx.type === 'trade',
    );
    const nonTradeTransactions = transactions.filter(
      (tx) => tx.type !== 'trade',
    );

    // Merge trades using asset+timestamp(seconds) as dedup key
    // Use seconds-truncated timestamp to handle cases where REST and WebSocket
    // aggregated fills have slightly different first-fill timestamps
    const tradeMap = new Map<string, PerpsTransaction>();

    // Add REST trade transactions first
    for (const tx of restTradeTransactions) {
      // Use asset + timestamp (truncated to seconds) as key
      const timestampSeconds = Math.floor(tx.timestamp / 1000);
      const dedupKey = `${tx.asset}-${timestampSeconds}`;
      tradeMap.set(dedupKey, tx);
    }

    // Add live fills (overwrites REST duplicates - live data is fresher)
    for (const tx of liveTransactions) {
      const timestampSeconds = Math.floor(tx.timestamp / 1000);
      const dedupKey = `${tx.asset}-${timestampSeconds}`;
      tradeMap.set(dedupKey, tx);
    }

    // Combine deduplicated trades with non-trade transactions
    const allTransactions = [
      ...Array.from(tradeMap.values()),
      ...nonTradeTransactions,
    ];

    // Sort by timestamp descending
    return allTransactions.sort((a, b) => b.timestamp - a.timestamp);
  }, [liveFills, transactions]);

  return {
    transactions: mergedTransactions,
    isLoading: combinedIsLoading,
    ordersLoaded,
    error: combinedError,
    refetch,
  };
};
