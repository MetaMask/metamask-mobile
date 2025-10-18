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
 * Transform Arbitrum withdrawal data into UserHistoryItem format
 *
 * @param withdrawal - Arbitrum withdrawal data
 * @returns UserHistoryItem for transaction history
 */
export const transformArbitrumWithdrawalToHistoryItem = (
  withdrawal: ArbitrumWithdrawal,
): UserHistoryItem => {
  return {
    id: withdrawal.id,
    timestamp: withdrawal.timestamp,
    type: 'withdrawal',
    amount: withdrawal.amount,
    asset: 'USDC',
    txHash: withdrawal.txHash,
    status:
      withdrawal.status === 'completed'
        ? 'completed'
        : withdrawal.status === 'failed'
        ? 'failed'
        : 'pending',
    details: {
      source: 'arbitrum_blockchain',
      bridgeContract: withdrawal.from,
      recipient: withdrawal.to,
      blockNumber: withdrawal.blockNumber,
      chainId: '0xa4b1', // Arbitrum mainnet
      synthetic: false, // This is real blockchain data
    },
  };
};

/**
 * Transform multiple Arbitrum withdrawals into UserHistoryItem array
 *
 * @param withdrawals - Array of Arbitrum withdrawal data
 * @returns Array of UserHistoryItem for transaction history
 */
export const transformArbitrumWithdrawalsToHistoryItems = (
  withdrawals: ArbitrumWithdrawal[],
): UserHistoryItem[] => {
  return withdrawals.map(transformArbitrumWithdrawalToHistoryItem);
};
