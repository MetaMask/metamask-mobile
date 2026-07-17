import {
  type TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsEventType,
  type HardwareWalletsSwapsEvent,
} from '../HardwareWalletsSwaps.state';
import { createBatchTrackingStrategy } from './batch-tracking-strategy';
import { createSequentialTrackingStrategy } from './sequential-tracking-strategy';
import {
  NO_ACTION,
  type SignedEventClassifier,
  type StrategyConfig,
} from './tracking-strategy';

const bridgeConfig: StrategyConfig = {
  targetFrom: '0xabc123',
  isSendMode: false,
};

interface MockMetaOverrides {
  id?: string;
  batchId?: string;
  status?: TransactionStatus;
}

function mockMeta(overrides: MockMetaOverrides = {}): TransactionMeta {
  return {
    id: 'tx-1',
    status: TransactionStatus.approved,
    type: TransactionType.bridgeApproval,
    txParams: { from: '0xabc123', to: '0xdef' },
    ...overrides,
  } as unknown as TransactionMeta;
}

const classifyAccept: SignedEventClassifier = () => {
  const event: HardwareWalletsSwapsEvent = {
    type: HardwareWalletsSwapsEventType.Signing,
    payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
  };
  return {
    event,
    shouldTrackAsPending: true,
    shouldCompleteTracking: false,
    shouldEnqueueApprovals: true,
    shouldTrackCancellation: false,
  };
};

describe('createBatchTrackingStrategy', () => {
  describe('checkRetryGeneration', () => {
    it('returns false for undefined retryGeneration', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      expect(strategy.checkRetryGeneration(undefined)).toBe(false);
    });

    it('returns false for same generation', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      strategy.checkRetryGeneration(0); // Initialize
      expect(strategy.checkRetryGeneration(0)).toBe(false);
    });

    it('returns true and marks seen batches stale on advance', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      // Process a tx to establish a batch
      strategy.processStatusUpdated(
        mockMeta({ batchId: 'batch-A' }),
        classifyAccept,
      );
      // Advance generation
      expect(strategy.checkRetryGeneration(1)).toBe(true);
      // After retry, batch-A events should be blocked
      const result = strategy.processStatusUpdated(
        mockMeta({
          id: 'tx-2',
          batchId: 'batch-A',
          status: TransactionStatus.signed,
        }),
        classifyAccept,
      );
      expect(result).toBe(NO_ACTION);
    });

    it('returns false on second call with same generation (idempotent)', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      expect(strategy.checkRetryGeneration(1)).toBe(true);
      expect(strategy.checkRetryGeneration(1)).toBe(false);
    });

    it('clears tracked tx ids', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      strategy.processStatusUpdated(
        mockMeta({ id: 'tx-1', batchId: 'batch-A' }),
        classifyAccept,
      );
      expect(strategy.getTrackedTxIds().size).toBe(1);
      strategy.checkRetryGeneration(1);
      expect(strategy.getTrackedTxIds().size).toBe(0);
    });
  });

  describe('processStatusUpdated batch locking', () => {
    it('accepts first batch event (locks)', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      const result = strategy.processStatusUpdated(
        mockMeta({ batchId: 'batch-A' }),
        classifyAccept,
      );
      expect(result).not.toBe(NO_ACTION);
    });

    it('rejects events from a different batch after locking', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      strategy.processStatusUpdated(
        mockMeta({ batchId: 'batch-A' }),
        classifyAccept,
      );
      const result = strategy.processStatusUpdated(
        mockMeta({ id: 'tx-2', batchId: 'batch-B' }),
        classifyAccept,
      );
      expect(result).toBe(NO_ACTION);
    });

    it('accepts events from the same batch after locking', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      strategy.processStatusUpdated(
        mockMeta({ batchId: 'batch-A' }),
        classifyAccept,
      );
      const result = strategy.processStatusUpdated(
        mockMeta({ id: 'tx-2', batchId: 'batch-A' }),
        classifyAccept,
      );
      expect(result).not.toBe(NO_ACTION);
    });

    it('blocks stale batch events after retry', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      strategy.processStatusUpdated(
        mockMeta({ batchId: 'batch-A' }),
        classifyAccept,
      );
      strategy.checkRetryGeneration(1); // Retry
      const result = strategy.processStatusUpdated(
        mockMeta({
          id: 'tx-2',
          batchId: 'batch-A',
          status: TransactionStatus.signed,
        }),
        classifyAccept,
      );
      expect(result).toBe(NO_ACTION);
    });

    it('accepts new batch events after retry', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      strategy.processStatusUpdated(
        mockMeta({ batchId: 'batch-A' }),
        classifyAccept,
      );
      strategy.checkRetryGeneration(1); // Retry
      const result = strategy.processStatusUpdated(
        mockMeta({ id: 'tx-2', batchId: 'batch-B' }),
        classifyAccept,
      );
      expect(result).not.toBe(NO_ACTION);
    });
  });

  describe('processRejected', () => {
    it('accepts events before any batch is locked', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      const result = strategy.processRejected(
        mockMeta({ batchId: 'batch-A' }),
        classifyAccept,
      );
      expect(result).not.toBe(NO_ACTION);
    });

    it('delegates to classifyFn for the current batch', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      strategy.processStatusUpdated(
        mockMeta({ batchId: 'batch-A' }),
        classifyAccept,
      );
      const result = strategy.processRejected(
        mockMeta({ id: 'tx-2', batchId: 'batch-A' }),
        classifyAccept,
      );
      expect(result).not.toBe(NO_ACTION);
    });

    it('returns NO_ACTION for a different batch', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      strategy.processStatusUpdated(
        mockMeta({ batchId: 'batch-A' }),
        classifyAccept,
      );
      const result = strategy.processRejected(
        mockMeta({ id: 'tx-2', batchId: 'batch-B' }),
        classifyAccept,
      );
      expect(result).toBe(NO_ACTION);
    });
  });

  describe('processFinished', () => {
    it('accepts events before any batch is locked (matches original hook)', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      const result = strategy.processFinished(
        mockMeta({ batchId: 'batch-A' }),
        classifyAccept,
      );
      expect(result).not.toBe(NO_ACTION);
    });

    it('delegates to classifyFn for the current batch', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      strategy.processStatusUpdated(
        mockMeta({ batchId: 'batch-A' }),
        classifyAccept,
      );
      const result = strategy.processFinished(
        mockMeta({
          id: 'tx-2',
          batchId: 'batch-A',
          status: TransactionStatus.confirmed,
        }),
        classifyAccept,
      );
      expect(result).not.toBe(NO_ACTION);
    });
  });

  describe('getTrackedTxIds', () => {
    it('returns all processed tx ids', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      strategy.processStatusUpdated(
        mockMeta({ id: 'tx-1', batchId: 'batch-A' }),
        classifyAccept,
      );
      strategy.processStatusUpdated(
        mockMeta({ id: 'tx-2', batchId: 'batch-A' }),
        classifyAccept,
      );
      expect(strategy.getTrackedTxIds()).toEqual(new Set(['tx-1', 'tx-2']));
    });
  });

  describe('reset', () => {
    it('clears all tracked tx ids and batch state', () => {
      const strategy = createBatchTrackingStrategy(bridgeConfig);
      strategy.processStatusUpdated(
        mockMeta({ batchId: 'batch-A' }),
        classifyAccept,
      );
      strategy.reset();
      expect(strategy.getTrackedTxIds().size).toBe(0);
      // After reset, first event should be accepted again (no batch locked)
      const result = strategy.processStatusUpdated(
        mockMeta({ id: 'tx-2', batchId: 'batch-B' }),
        classifyAccept,
      );
      expect(result).not.toBe(NO_ACTION);
    });
  });
});

describe('createSequentialTrackingStrategy', () => {
  it('accepts all events (no batch locking)', () => {
    const strategy = createSequentialTrackingStrategy(bridgeConfig);
    const result1 = strategy.processStatusUpdated(
      mockMeta({ id: 'tx-1', batchId: 'batch-A' }),
      classifyAccept,
    );
    const result2 = strategy.processStatusUpdated(
      mockMeta({ id: 'tx-2', batchId: 'batch-B' }),
      classifyAccept,
    );
    expect(result1).not.toBe(NO_ACTION);
    expect(result2).not.toBe(NO_ACTION);
  });

  it('checkRetryGeneration clears tracked tx ids', () => {
    const strategy = createSequentialTrackingStrategy(bridgeConfig);
    strategy.processStatusUpdated(mockMeta({ id: 'tx-1' }), classifyAccept);
    expect(strategy.getTrackedTxIds().size).toBe(1);
    strategy.checkRetryGeneration(1);
    expect(strategy.getTrackedTxIds().size).toBe(0);
  });

  it('reset clears all state', () => {
    const strategy = createSequentialTrackingStrategy(bridgeConfig);
    strategy.processStatusUpdated(mockMeta({ id: 'tx-1' }), classifyAccept);
    strategy.reset();
    expect(strategy.getTrackedTxIds().size).toBe(0);
  });
});
