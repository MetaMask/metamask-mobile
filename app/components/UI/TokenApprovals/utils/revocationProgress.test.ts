import type { ChainProgressEntry } from '../types';
import {
  getChainTransactionCount,
  getCurrentProcessingTransactionIndex,
  getTotalTransactionCount,
} from './revocationProgress';

const createChainProgress = (
  overrides: Partial<ChainProgressEntry>,
): ChainProgressEntry => ({
  chainId: '0x1',
  chainName: 'Ethereum',
  isBatch: false,
  totalApprovals: 2,
  totalTransactions: 2,
  currentIndex: 0,
  status: 'waiting',
  ...overrides,
});

describe('revocationProgress', () => {
  describe('getChainTransactionCount', () => {
    it('returns one transaction for a batch chain', () => {
      const count = getChainTransactionCount({
        isBatch: true,
        totalApprovals: 4,
      });

      expect(count).toBe(1);
    });

    it('returns one transaction per approval for a sequential chain', () => {
      const count = getChainTransactionCount({
        isBatch: false,
        totalApprovals: 4,
      });

      expect(count).toBe(4);
    });
  });

  describe('getTotalTransactionCount', () => {
    it('sums batch and sequential transaction counts', () => {
      const chainProgress = [
        createChainProgress({
          chainId: '0x1',
          isBatch: true,
          totalApprovals: 3,
          totalTransactions: 1,
        }),
        createChainProgress({
          chainId: '0x89',
          chainName: 'Polygon',
          totalApprovals: 2,
          totalTransactions: 2,
        }),
      ];

      const totalTransactionCount = getTotalTransactionCount(chainProgress);

      expect(totalTransactionCount).toBe(3);
    });
  });

  describe('getCurrentProcessingTransactionIndex', () => {
    it('advances to the next ordinal for mixed batch and sequential progress', () => {
      const chainProgress = [
        createChainProgress({
          chainId: '0x1',
          isBatch: true,
          totalApprovals: 3,
          totalTransactions: 1,
          currentIndex: 1,
          status: 'done',
        }),
        createChainProgress({
          chainId: '0x89',
          chainName: 'Polygon',
          totalApprovals: 2,
          totalTransactions: 2,
          currentIndex: 0,
          status: 'signing',
        }),
      ];

      const currentTransactionIndex =
        getCurrentProcessingTransactionIndex(chainProgress);

      expect(currentTransactionIndex).toBe(2);
    });

    it('counts a failed sequential transaction as processed', () => {
      const chainProgress = [
        createChainProgress({
          currentIndex: 1,
          status: 'failed',
        }),
      ];

      const currentTransactionIndex =
        getCurrentProcessingTransactionIndex(chainProgress);

      expect(currentTransactionIndex).toBe(2);
    });

    it('returns the total after all transactions finish', () => {
      const chainProgress = [
        createChainProgress({
          isBatch: true,
          totalApprovals: 3,
          totalTransactions: 1,
          currentIndex: 1,
          status: 'done',
        }),
        createChainProgress({
          chainId: '0x89',
          chainName: 'Polygon',
          totalApprovals: 2,
          totalTransactions: 2,
          currentIndex: 2,
          status: 'done',
        }),
      ];

      const currentTransactionIndex =
        getCurrentProcessingTransactionIndex(chainProgress);

      expect(currentTransactionIndex).toBe(3);
    });
  });
});
