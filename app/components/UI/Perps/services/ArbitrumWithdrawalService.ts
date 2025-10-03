import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { detectHyperLiquidWithdrawal } from '../utils/arbitrumWithdrawalDetection';
import { transformArbitrumWithdrawalsToHistoryItems } from '../utils/arbitrumWithdrawalTransforms';
import type { TransactionMeta } from '../../../../core/TransactionController/types';
import type { UserHistoryItem } from '../controllers/types';

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

/**
 * Service to detect HyperLiquid withdrawals from Arbitrum blockchain transactions
 *
 * This service can be used by non-React classes (like providers) to access
 * blockchain transaction data and detect withdrawals.
 */
export class ArbitrumWithdrawalService {
  /**
   * Get all transactions from MetaMask's TransactionController
   */
  private getTransactions(): TransactionMeta[] {
    try {
      const transactionController = Engine.context.TransactionController;
      const transactions = transactionController.state.transactions || {};
      return Object.values(transactions);
    } catch (error) {
      DevLogger.log(
        'Error getting transactions from TransactionController:',
        error,
      );
      return [];
    }
  }

  /**
   * Get current network chain ID
   */
  private getCurrentChainId(): string | null {
    try {
      const networkController = Engine.context.NetworkController;
      return networkController.state.provider?.chainId || null;
    } catch (error) {
      DevLogger.log('Error getting current chain ID:', error);
      return null;
    }
  }

  /**
   * Get current selected address
   */
  private getCurrentAddress(): string | null {
    try {
      const preferencesController = Engine.context.PreferencesController;
      return preferencesController.state.selectedAddress || null;
    } catch (error) {
      DevLogger.log('Error getting current address:', error);
      return null;
    }
  }

  /**
   * Detect HyperLiquid withdrawals from Arbitrum transactions
   *
   * @param userAddress - Optional user address to filter by
   * @param chainId - Optional chain ID to filter by
   * @returns Array of detected withdrawals
   */
  detectWithdrawals(
    userAddress?: string,
    chainId?: string,
  ): ArbitrumWithdrawal[] {
    try {
      const transactions = this.getTransactions();
      const currentAddress = userAddress || this.getCurrentAddress();
      const currentChainId = chainId || this.getCurrentChainId();

      if (!currentAddress || !currentChainId) {
        DevLogger.log('Missing required data for withdrawal detection:', {
          currentAddress,
          currentChainId,
        });
        return [];
      }

      const withdrawals: ArbitrumWithdrawal[] = [];

      transactions.forEach((tx) => {
        const withdrawal = detectHyperLiquidWithdrawal(
          tx,
          currentAddress,
          currentChainId,
        );
        if (withdrawal) {
          withdrawals.push(withdrawal);
        }
      });

      // Sort by timestamp descending (newest first)
      withdrawals.sort((a, b) => b.timestamp - a.timestamp);

      DevLogger.log('Detected Arbitrum withdrawals:', {
        count: withdrawals.length,
        withdrawals: withdrawals.map((w) => ({
          id: w.id,
          amount: w.amount,
          txHash: w.txHash,
          timestamp: w.timestamp,
        })),
      });

      return withdrawals;
    } catch (error) {
      DevLogger.log('Error detecting Arbitrum withdrawals:', error);
      return [];
    }
  }

  /**
   * Get withdrawal history as UserHistoryItem array
   *
   * @param userAddress - Optional user address to filter by
   * @param chainId - Optional chain ID to filter by
   * @returns Array of UserHistoryItem for transaction history
   */
  getWithdrawalHistory(
    userAddress?: string,
    chainId?: string,
  ): UserHistoryItem[] {
    const withdrawals = this.detectWithdrawals(userAddress, chainId);
    return transformArbitrumWithdrawalsToHistoryItems(withdrawals);
  }

  /**
   * Check if current network is Arbitrum
   *
   * @returns True if on Arbitrum network
   */
  isOnArbitrum(): boolean {
    const chainId = this.getCurrentChainId();
    return chainId === '0xa4b1' || chainId === '0x66eed'; // Arbitrum mainnet or testnet
  }
}
