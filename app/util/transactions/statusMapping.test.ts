import { StatusTypes } from '@metamask/bridge-controller';
import {
  TransactionMeta,
  TransactionType,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { Transaction } from '@metamask/keyring-api';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import {
  mapIntentStatusToTransactionStatus,
  mapBridgeStatusToTransactionStatus,
  getEffectiveTransactionStatus,
} from './statusMapping';

describe('statusMapping', () => {
  describe('mapIntentStatusToTransactionStatus', () => {
    it('returns submitted for PENDING status', () => {
      const result = mapIntentStatusToTransactionStatus(StatusTypes.PENDING);

      expect(result).toBe('submitted');
    });

    it('returns confirmed for COMPLETE status', () => {
      const result = mapIntentStatusToTransactionStatus(StatusTypes.COMPLETE);

      expect(result).toBe('confirmed');
    });

    it('returns failed for FAILED status', () => {
      const result = mapIntentStatusToTransactionStatus(StatusTypes.FAILED);

      expect(result).toBe('failed');
    });

    it('returns submitted for SUBMITTED status', () => {
      const result = mapIntentStatusToTransactionStatus(StatusTypes.SUBMITTED);

      expect(result).toBe('submitted');
    });

    it('returns failed for UNKNOWN status', () => {
      const result = mapIntentStatusToTransactionStatus(StatusTypes.UNKNOWN);

      expect(result).toBe('failed');
    });
  });

  describe('mapBridgeStatusToTransactionStatus', () => {
    it('returns confirmed for COMPLETE status', () => {
      const result = mapBridgeStatusToTransactionStatus(StatusTypes.COMPLETE);

      expect(result).toBe('confirmed');
    });

    it('returns submitted for PENDING status', () => {
      const result = mapBridgeStatusToTransactionStatus(StatusTypes.PENDING);

      expect(result).toBe('submitted');
    });

    it('returns submitted for SUBMITTED status', () => {
      const result = mapBridgeStatusToTransactionStatus(StatusTypes.SUBMITTED);

      expect(result).toBe('submitted');
    });

    it('returns failed for FAILED status', () => {
      const result = mapBridgeStatusToTransactionStatus(StatusTypes.FAILED);

      expect(result).toBe('failed');
    });

    it('returns failed for UNKNOWN status', () => {
      const result = mapBridgeStatusToTransactionStatus(StatusTypes.UNKNOWN);

      expect(result).toBe('failed');
    });
  });

  describe('getEffectiveTransactionStatus', () => {
    const createMockEvmTransaction = (
      overrides?: Partial<TransactionMeta>,
    ): TransactionMeta =>
      ({
        id: 'test-tx-id',
        status: TransactionStatus.submitted,
        type: TransactionType.swap,
        chainId: '0xa4b1',
        ...overrides,
      }) as TransactionMeta;

    const createMockNonEvmTransaction = (
      overrides?: Partial<Transaction>,
    ): Transaction =>
      ({
        id: 'test-tx-id',
        status: 'submitted',
        chain: 'solana:mainnet',
        ...overrides,
      }) as Transaction;

    const createMockBridgeHistoryItem = (
      overrides?: Partial<BridgeHistoryItem>,
    ): BridgeHistoryItem =>
      ({
        quote: {
          srcChainId: 42161,
          destChainId: 42161,
          intent: undefined,
        },
        status: {
          status: StatusTypes.PENDING,
          srcChain: {
            chainId: 42161,
            txHash: '0x123',
          },
        },
        ...overrides,
      }) as BridgeHistoryItem;

    it('returns transaction status for non-bridge/swap transactions', () => {
      const tx = createMockEvmTransaction({
        type: TransactionType.contractInteraction,
        status: TransactionStatus.confirmed,
      });

      const result = getEffectiveTransactionStatus(tx, undefined);

      expect(result).toBe(TransactionStatus.confirmed);
    });

    it('returns transaction status when no bridge history item exists', () => {
      const tx = createMockEvmTransaction({
        type: TransactionType.swap,
        status: TransactionStatus.confirmed,
      });

      const result = getEffectiveTransactionStatus(tx, undefined);

      expect(result).toBe(TransactionStatus.confirmed);
    });

    it('returns transaction status for confirmed same-chain swap', () => {
      const tx = createMockEvmTransaction({
        type: TransactionType.swap,
        status: TransactionStatus.confirmed,
      });
      const bridgeHistoryItem = createMockBridgeHistoryItem({
        status: {
          status: StatusTypes.PENDING, // Bridge status not updated yet
          srcChain: {
            chainId: 42161,
            txHash: '0x123',
          },
        },
      });

      const result = getEffectiveTransactionStatus(tx, bridgeHistoryItem);

      expect(result).toBe(TransactionStatus.confirmed);
    });

    it('returns bridge status for pending same-chain swap', () => {
      const tx = createMockEvmTransaction({
        type: TransactionType.swap,
        status: TransactionStatus.submitted,
      });
      const bridgeHistoryItem = createMockBridgeHistoryItem({
        status: {
          status: StatusTypes.PENDING,
          srcChain: {
            chainId: 42161,
            txHash: '0x123',
          },
        },
      });

      const result = getEffectiveTransactionStatus(tx, bridgeHistoryItem);

      expect(result).toBe('submitted');
    });

    it('returns mapped bridge status for cross-chain bridge', () => {
      const tx = createMockEvmTransaction({
        type: TransactionType.bridge,
        status: TransactionStatus.submitted,
      });
      const bridgeHistoryItem = createMockBridgeHistoryItem({
        quote: {
          srcChainId: 1,
          destChainId: 10, // Different chains = bridge
        } as BridgeHistoryItem['quote'],
        status: {
          status: StatusTypes.COMPLETE,
          srcChain: {
            chainId: 1,
            txHash: '0x123',
          },
        },
      });

      const result = getEffectiveTransactionStatus(tx, bridgeHistoryItem);

      expect(result).toBe('confirmed');
    });

    it('returns mapped intent status for intent-based swap', () => {
      const tx = createMockEvmTransaction({
        type: TransactionType.swap,
        status: TransactionStatus.submitted,
      });
      const bridgeHistoryItem = createMockBridgeHistoryItem({
        quote: {
          intent: {} as BridgeHistoryItem['quote']['intent'], // Intent-based
        } as BridgeHistoryItem['quote'],
        status: {
          status: StatusTypes.COMPLETE,
          srcChain: {
            chainId: 42161,
            txHash: '0x123',
          },
        },
      });

      const result = getEffectiveTransactionStatus(tx, bridgeHistoryItem);

      expect(result).toBe('confirmed');
    });

    it('returns failed for intent transaction with FAILED status', () => {
      const tx = createMockEvmTransaction({
        type: TransactionType.swap,
        status: TransactionStatus.submitted,
      });
      const bridgeHistoryItem = createMockBridgeHistoryItem({
        quote: {
          intent: {} as BridgeHistoryItem['quote']['intent'],
        } as BridgeHistoryItem['quote'],
        status: {
          status: StatusTypes.FAILED,
          srcChain: {
            chainId: 42161,
            txHash: '0x123',
          },
        },
      });

      const result = getEffectiveTransactionStatus(tx, bridgeHistoryItem);

      expect(result).toBe('failed');
    });

    it('handles non-EVM transactions correctly', () => {
      const tx = createMockNonEvmTransaction({
        status: 'confirmed',
      });
      const bridgeHistoryItem = createMockBridgeHistoryItem();

      const result = getEffectiveTransactionStatus(tx, bridgeHistoryItem);

      expect(result).toBe('confirmed');
    });

    it('returns failed for UNKNOWN bridge status on non-intent transaction', () => {
      const tx = createMockEvmTransaction({
        type: TransactionType.bridge,
        status: TransactionStatus.submitted,
      });
      const bridgeHistoryItem = createMockBridgeHistoryItem({
        quote: {
          srcChainId: 1,
          destChainId: 10,
        } as BridgeHistoryItem['quote'],
        status: {
          status: StatusTypes.UNKNOWN,
          srcChain: {
            chainId: 1,
            txHash: '0x123',
          },
        },
      });

      const result = getEffectiveTransactionStatus(tx, bridgeHistoryItem);

      expect(result).toBe('failed');
    });
  });
});
