import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { RootState } from '../../../../reducers';
import type { TransactionMeta } from '../../../../core/TransactionController/types';
import {
  ARBITRUM_MAINNET_CHAIN_ID,
  ARBITRUM_TESTNET_CHAIN_ID,
  detectHyperLiquidWithdrawal,
} from '../utils/arbitrumWithdrawalDetection';

interface ArbitrumWithdrawal {
  id: string;
  timestamp: number;
  amount: string;
  txHash: string;
  from: string;
  to: string;
  status: 'completed' | 'failed' | 'pending';
  blockNumber?: string;
}

interface UseArbitrumTransactionMonitorResult {
  withdrawals: ArbitrumWithdrawal[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to monitor Arbitrum transactions for HyperLiquid withdrawals
 *
 * This hook:
 * 1. Monitors transactions on Arbitrum network
 * 2. Detects USDC transfers from HyperLiquid bridge contracts
 * 3. Creates withdrawal records for the transaction history
 */
export const useArbitrumTransactionMonitor =
  (): UseArbitrumTransactionMonitorResult => {
    const [withdrawals, setWithdrawals] = useState<ArbitrumWithdrawal[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get current account and network info
    const selectedAddress = useSelector(
      (state: RootState) =>
        state.engine.backgroundState.PreferencesController?.selectedAddress,
    );

    const currentChainId = useSelector(
      (state: RootState) =>
        state.engine.backgroundState.NetworkController?.provider?.chainId,
    );

    // Get all transactions from TransactionController
    const allTransactions = useSelector(
      (state: RootState) =>
        state.engine.backgroundState.TransactionController?.transactions || {},
    );

    // Check if we're on Arbitrum
    const isArbitrum = useMemo(() => {
      return (
        currentChainId === ARBITRUM_MAINNET_CHAIN_ID ||
        currentChainId === ARBITRUM_TESTNET_CHAIN_ID
      );
    }, [currentChainId]);

    /**
     * Detect if a transaction is a HyperLiquid withdrawal using utility function
     */
    const detectWithdrawal = useCallback(
      (tx: TransactionMeta): ArbitrumWithdrawal | null => {
        if (!currentChainId || !selectedAddress) {
          return null;
        }

        return detectHyperLiquidWithdrawal(tx, selectedAddress, currentChainId);
      },
      [currentChainId, selectedAddress],
    );

    /**
     * Process transactions to find withdrawals
     */
    const processTransactions = useCallback(() => {
      if (!isArbitrum || !selectedAddress) {
        setWithdrawals([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const transactionList = Object.values(allTransactions);
        const detectedWithdrawals: ArbitrumWithdrawal[] = [];

        transactionList.forEach((tx) => {
          const withdrawal = detectWithdrawal(tx);
          if (withdrawal) {
            detectedWithdrawals.push(withdrawal);
          }
        });

        // Sort by timestamp descending (newest first)
        detectedWithdrawals.sort((a, b) => b.timestamp - a.timestamp);

        setWithdrawals(detectedWithdrawals);

        DevLogger.log('Arbitrum withdrawals detected:', {
          count: detectedWithdrawals.length,
          withdrawals: detectedWithdrawals,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to process transactions';
        setError(errorMessage);
        DevLogger.log('Error processing Arbitrum transactions:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    }, [isArbitrum, selectedAddress, allTransactions, detectWithdrawal]);

    /**
     * Refetch withdrawals
     */
    const refetch = useCallback(() => {
      processTransactions();
    }, [processTransactions]);

    // Process transactions when dependencies change
    useEffect(() => {
      processTransactions();
    }, [processTransactions]);

    return {
      withdrawals,
      isLoading,
      error,
      refetch,
    };
  };
