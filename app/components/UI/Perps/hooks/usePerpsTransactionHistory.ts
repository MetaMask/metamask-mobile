import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import usePrevious from '../../../hooks/usePrevious';
import { BigNumber } from 'bignumber.js';
import { TransactionType } from '@metamask/transaction-controller';
import type { OrderFill } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { CaipAccountId } from '@metamask/utils';
import { areAddressesEqual } from '../../../../util/address';
import { selectNonReplacedTransactions } from '../../../../selectors/transactionController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { PerpsTransaction } from '../types/transactionHistory';
import { useUserHistory } from './useUserHistory';
import { usePerpsLiveFills } from './stream/usePerpsLiveFills';
import {
  transformFillsToTransactions,
  transformOrdersToTransactions,
  transformFundingToTransactions,
  transformUserHistoryToTransactions,
  transformWalletPerpsDepositsToTransactions,
} from '../utils/transactionTransforms';

interface UsePerpsTransactionHistoryParams {
  startTime?: number;
  endTime?: number;
  accountId?: CaipAccountId;
  skipInitialFetch?: boolean;
}

interface UsePerpsTransactionHistoryResult {
  transactions: PerpsTransaction[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Comprehensive hook to fetch and combine all perps transaction data
 * Includes trades, orders, funding, and user history (deposits/withdrawals)
 * Uses HyperLiquid user history as the single source of truth for withdrawals
 */
export const usePerpsTransactionHistory = ({
  startTime,
  endTime,
  accountId,
  skipInitialFetch = false,
}: UsePerpsTransactionHistoryParams = {}): UsePerpsTransactionHistoryResult => {
  const [transactions, setTransactions] = useState<PerpsTransaction[]>([]);
  const [restFills, setRestFills] = useState<OrderFill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Wallet perps deposits (TransactionType.perpsDeposit / perpsDepositAndOrder) for the Deposits tab
  const walletTransactions = useSelector(selectNonReplacedTransactions);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const walletDepositTransactions = useMemo(() => {
    const filtered = walletTransactions.filter(
      (tx) =>
        selectedAddress &&
        areAddressesEqual(tx.txParams?.from ?? '', selectedAddress) &&
        (tx.type === TransactionType.perpsDeposit ||
          tx.type === TransactionType.perpsDepositAndOrder),
    );
    return transformWalletPerpsDepositsToTransactions(filtered);
  }, [walletTransactions, selectedAddress]);

  // Store userHistory in ref to avoid recreating fetchAllTransactions callback
  const userHistoryRef = useRef(userHistory);
  // Track if initial fetch has been done to prevent duplicate fetches
  const initialFetchDone = useRef(false);
  // Track previous skipInitialFetch value to detect connection state transitions
  const prevSkipInitialFetch = usePrevious(skipInitialFetch);
  useEffect(() => {
    userHistoryRef.current = userHistory;
  }, [userHistory]);

  const fetchAllTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const controller = Engine.context.PerpsController;
      if (!controller) {
        throw new Error('PerpsController not available');
      }

      const provider = controller.getActiveProviderOrNull();
      if (!provider) {
        setIsLoading(false);
        return;
      }

      DevLogger.log('Fetching comprehensive transaction history...');

      // Fetch all transaction data in parallel
      const [fills, orders, funding] = await Promise.all([
        provider.getOrderFills({
          accountId,
          aggregateByTime: false,
        }),
        provider.getOrders({ accountId }),
        provider.getFunding({
          accountId,
          startTime,
          endTime,
        }),
      ]);

      DevLogger.log('Transaction data fetched:', { fills, orders, funding });

      const orderMap = new Map(orders.map((order) => [order.orderId, order]));

      // Attaching detailedOrderType allows us to display the TP/SL pill in the trades history list.
      const enrichedFills = fills.map((fill) => ({
        ...fill,
        detailedOrderType: orderMap.get(fill.orderId)?.detailedOrderType,
      }));

      // Build fill size map: orderId -> total filled size
      // This allows accurate filled percentage calculation for historical orders,
      // since HyperLiquid's historical orders API returns sz=0 for all completed orders
      const fillSizeByOrderId = new Map<string, BigNumber>();
      for (const fill of fills) {
        if (fill.orderId) {
          const current = fillSizeByOrderId.get(fill.orderId) || BigNumber(0);
          fillSizeByOrderId.set(fill.orderId, current.plus(fill.size || '0'));
        }
      }

      // Store raw enriched fills so mergedTransactions can merge at fill level
      // (prevents WS partial-snapshot from overwriting correctly aggregated REST data)
      setRestFills(enrichedFills);

      // Transform each data type to PerpsTransaction format
      const fillTransactions = transformFillsToTransactions(enrichedFills);
      const orderTransactions = transformOrdersToTransactions(
        orders,
        fillSizeByOrderId,
      );
      const fundingTransactions = transformFundingToTransactions(funding);
      const userHistoryTransactions = transformUserHistoryToTransactions(
        userHistoryRef.current,
      );

      // Combine all transactions (no Arbitrum withdrawals - using user history as single source of truth)
      const allTransactions = [
        ...fillTransactions,
        ...orderTransactions,
        ...fundingTransactions,
        ...userHistoryTransactions,
      ];

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

      DevLogger.log('Combined transactions:', uniqueTransactions);
      setTransactions(uniqueTransactions);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to fetch transaction history';
      DevLogger.log('Error fetching transaction history:', errorMessage);
      setError(errorMessage);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [startTime, endTime, accountId]);

  const refetch = useCallback(async () => {
    // Fetch user history first, then fetch all transactions
    const freshUserHistory = await refetchUserHistory();
    userHistoryRef.current = freshUserHistory;
    await fetchAllTransactions();
  }, [fetchAllTransactions, refetchUserHistory]);

  useEffect(() => {
    // Detect transition from skipping (not connected) to not skipping (connected)
    // This fixes the case where the component mounts before connection is established
    const justBecameConnected = prevSkipInitialFetch && !skipInitialFetch;

    // Trigger fetch if:
    // 1. Not skipping AND haven't fetched yet (normal initial fetch)
    // 2. Connection just became available (transition from disconnected to connected)
    if (
      !skipInitialFetch &&
      (!initialFetchDone.current || justBecameConnected)
    ) {
      initialFetchDone.current = true;
      refetch();
    }
  }, [skipInitialFetch, prevSkipInitialFetch, refetch]);

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

  // Merge live WebSocket fills with REST fills at the raw OrderFill level first,
  // then transform once. This ensures multi-fill trades (e.g. SL split into 10
  // sub-fills) are aggregated from the complete fill set rather than from the WS
  // partial snapshot, which would produce an incorrect (lower) PnL and size.
  const mergedTransactions = useMemo(() => {
    // Merge raw fills: REST fills first, then WS fills overwrite duplicates.
    // Dedup key matches usePerpsHomeData pattern: orderId-timestamp-size-price.
    const fillsMap = new Map<string, OrderFill>();

    for (const fill of restFills) {
      const key = `${fill.orderId}-${fill.timestamp}-${fill.size}-${fill.price}`;
      fillsMap.set(key, fill);
    }

    // WS fills overwrite REST duplicates (live data is fresher).
    // Preserve detailedOrderType and liquidation from REST when WS fill lacks them
    // so TP/SL pills remain visible.
    for (const fill of liveFills) {
      const key = `${fill.orderId}-${fill.timestamp}-${fill.size}-${fill.price}`;
      const existing = fillsMap.get(key);
      if (existing?.detailedOrderType && !fill.detailedOrderType) {
        fillsMap.set(key, {
          ...fill,
          detailedOrderType: existing.detailedOrderType,
          ...(existing.liquidation &&
            !fill.liquidation && { liquidation: existing.liquidation }),
        });
      } else {
        fillsMap.set(key, fill);
      }
    }

    // Transform once on the complete merged fill set
    const mergedFillTransactions = transformFillsToTransactions(
      Array.from(fillsMap.values()).sort((a, b) => b.timestamp - a.timestamp),
    );

    // Separate non-trade transactions (orders, funding, user history deposits)
    const nonTradeTransactions = transactions.filter(
      (tx) => tx.type !== 'trade',
    );

    // Deduplicate wallet deposits against REST (user history) deposits by txHash.
    // When a wallet-originated deposit is bridged and recorded by the perps backend,
    // it appears in both sources; we keep the REST version and drop the wallet duplicate.
    const restDepositTxHashes = new Set(
      nonTradeTransactions
        .filter(
          (tx) =>
            tx.type === 'deposit' &&
            tx.depositWithdrawal?.txHash?.trim() !== '',
        )
        .map((tx) => (tx.depositWithdrawal?.txHash ?? '').toLowerCase().trim()),
    );
    const walletDepositsDeduplicated = walletDepositTransactions.filter(
      (tx) => {
        const h = tx.depositWithdrawal?.txHash?.toLowerCase?.()?.trim() ?? '';
        return h === '' || !restDepositTxHashes.has(h);
      },
    );

    const allTransactions = [
      ...mergedFillTransactions,
      ...nonTradeTransactions,
      ...walletDepositsDeduplicated,
    ];

    return allTransactions.sort((a, b) => b.timestamp - a.timestamp);
  }, [liveFills, restFills, transactions, walletDepositTransactions]);

  return {
    transactions: mergedTransactions,
    isLoading: combinedIsLoading,
    error: combinedError,
    refetch,
  };
};
