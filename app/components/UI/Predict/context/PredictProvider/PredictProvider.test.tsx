import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import {
  TransactionStatus,
  TransactionType,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { PredictProvider } from './PredictProvider';
import { usePredictContext, usePredictContextSafe } from './usePredictContext';
import Engine from '../../../../../core/Engine';
import { PredictTransactionEvent } from './PredictProvider.types';

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  context: {
    PredictController: {
      state: {
        withdrawTransaction: null,
      },
      clearPendingDeposit: jest.fn(),
      confirmClaim: jest.fn(),
      clearWithdrawTransaction: jest.fn(),
    },
  },
}));

// Mock the PredictTransactionToastHandler since it has many dependencies
// and the PredictProvider tests focus on the context functionality, not the toast handler
jest.mock('./PredictTransactionToastHandler', () => ({
  PredictTransactionToastHandler: () => null,
}));

const mockEngine = Engine as jest.Mocked<typeof Engine>;

describe('PredictProvider', () => {
  let transactionStatusCallback:
    | ((payload: { transactionMeta: TransactionMeta }) => void)
    | null = null;

  const createTransactionMeta = (
    overrides: Partial<TransactionMeta> = {},
  ): TransactionMeta =>
    ({
      id: 'test-tx-id',
      status: TransactionStatus.confirmed,
      nestedTransactions: [],
      ...overrides,
    }) as TransactionMeta;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PredictProvider>{children}</PredictProvider>
  );

  beforeEach(() => {
    transactionStatusCallback = null;

    (mockEngine.controllerMessenger.subscribe as jest.Mock).mockImplementation(
      (
        eventName: string,
        callback: (payload: { transactionMeta: TransactionMeta }) => void,
      ) => {
        if (eventName === 'TransactionController:transactionStatusUpdated') {
          transactionStatusCallback = callback;
        }
      },
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('subscribes to TransactionController events on mount', () => {
      renderHook(() => usePredictContext(), { wrapper });

      expect(mockEngine.controllerMessenger.subscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
    });

    it('unsubscribes from TransactionController events on unmount', () => {
      const { unmount } = renderHook(() => usePredictContext(), { wrapper });

      unmount();

      expect(mockEngine.controllerMessenger.unsubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
    });
  });

  describe('subscribeToDepositEvents', () => {
    it('notifies subscribers for deposit transactions', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => usePredictContext(), { wrapper });
      const transactionMeta = createTransactionMeta({
        nestedTransactions: [{ type: TransactionType.predictDeposit }],
      });

      act(() => {
        result.current.subscribeToDepositEvents(mockCallback);
      });
      act(() => {
        transactionStatusCallback?.({ transactionMeta });
      });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionMeta,
          type: 'deposit',
          status: TransactionStatus.confirmed,
        }),
      );
    });

    it('ignores non-deposit transactions', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => usePredictContext(), { wrapper });
      const transactionMeta = createTransactionMeta({
        nestedTransactions: [{ type: TransactionType.predictClaim }],
      });

      act(() => {
        result.current.subscribeToDepositEvents(mockCallback);
      });
      act(() => {
        transactionStatusCallback?.({ transactionMeta });
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('stops notifying after unsubscribe', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => usePredictContext(), { wrapper });
      const transactionMeta = createTransactionMeta({
        nestedTransactions: [{ type: TransactionType.predictDeposit }],
      });

      let unsubscribe: () => void;
      act(() => {
        unsubscribe = result.current.subscribeToDepositEvents(mockCallback);
      });
      act(() => {
        unsubscribe();
      });
      act(() => {
        transactionStatusCallback?.({ transactionMeta });
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('subscribeToClaimEvents', () => {
    it('notifies subscribers for claim transactions', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => usePredictContext(), { wrapper });
      const transactionMeta = createTransactionMeta({
        nestedTransactions: [{ type: TransactionType.predictClaim }],
      });

      act(() => {
        result.current.subscribeToClaimEvents(mockCallback);
      });
      act(() => {
        transactionStatusCallback?.({ transactionMeta });
      });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionMeta,
          type: 'claim',
          status: TransactionStatus.confirmed,
        }),
      );
    });

    it('ignores non-claim transactions', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => usePredictContext(), { wrapper });
      const transactionMeta = createTransactionMeta({
        nestedTransactions: [{ type: TransactionType.predictDeposit }],
      });

      act(() => {
        result.current.subscribeToClaimEvents(mockCallback);
      });
      act(() => {
        transactionStatusCallback?.({ transactionMeta });
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('subscribeToWithdrawEvents', () => {
    it('notifies subscribers for withdraw transactions', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => usePredictContext(), { wrapper });
      const transactionMeta = createTransactionMeta({
        nestedTransactions: [{ type: TransactionType.predictWithdraw }],
      });

      act(() => {
        result.current.subscribeToWithdrawEvents(mockCallback);
      });
      act(() => {
        transactionStatusCallback?.({ transactionMeta });
      });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionMeta,
          type: 'withdraw',
          status: TransactionStatus.confirmed,
        }),
      );
    });

    it('ignores non-withdraw transactions', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => usePredictContext(), { wrapper });
      const transactionMeta = createTransactionMeta({
        nestedTransactions: [{ type: TransactionType.predictDeposit }],
      });

      act(() => {
        result.current.subscribeToWithdrawEvents(mockCallback);
      });
      act(() => {
        transactionStatusCallback?.({ transactionMeta });
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('transaction filtering', () => {
    it('ignores transactions without predict nested transaction type', () => {
      const depositCallback = jest.fn();
      const claimCallback = jest.fn();
      const withdrawCallback = jest.fn();
      const { result } = renderHook(() => usePredictContext(), { wrapper });
      const transactionMeta = createTransactionMeta({
        nestedTransactions: [{ type: TransactionType.swap }],
      });

      act(() => {
        result.current.subscribeToDepositEvents(depositCallback);
        result.current.subscribeToClaimEvents(claimCallback);
        result.current.subscribeToWithdrawEvents(withdrawCallback);
      });
      act(() => {
        transactionStatusCallback?.({ transactionMeta });
      });

      expect(depositCallback).not.toHaveBeenCalled();
      expect(claimCallback).not.toHaveBeenCalled();
      expect(withdrawCallback).not.toHaveBeenCalled();
    });

    it('ignores transactions with empty nested transactions', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => usePredictContext(), { wrapper });
      const transactionMeta = createTransactionMeta({
        nestedTransactions: [],
      });

      act(() => {
        result.current.subscribeToDepositEvents(mockCallback);
      });
      act(() => {
        transactionStatusCallback?.({ transactionMeta });
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('ignores transactions with undefined nested transactions', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => usePredictContext(), { wrapper });
      const transactionMeta = createTransactionMeta({
        nestedTransactions: undefined,
      });

      act(() => {
        result.current.subscribeToDepositEvents(mockCallback);
      });
      act(() => {
        transactionStatusCallback?.({ transactionMeta });
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('multiple subscribers', () => {
    it('notifies all deposit subscribers', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      const { result } = renderHook(() => usePredictContext(), { wrapper });
      const transactionMeta = createTransactionMeta({
        nestedTransactions: [{ type: TransactionType.predictDeposit }],
      });

      act(() => {
        result.current.subscribeToDepositEvents(mockCallback1);
        result.current.subscribeToDepositEvents(mockCallback2);
      });
      act(() => {
        transactionStatusCallback?.({ transactionMeta });
      });

      expect(mockCallback1).toHaveBeenCalled();
      expect(mockCallback2).toHaveBeenCalled();
    });
  });

  describe('event timestamp', () => {
    it('includes timestamp in event', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => usePredictContext(), { wrapper });
      const transactionMeta = createTransactionMeta({
        nestedTransactions: [{ type: TransactionType.predictDeposit }],
      });
      const beforeTimestamp = Date.now();

      act(() => {
        result.current.subscribeToDepositEvents(mockCallback);
      });
      act(() => {
        transactionStatusCallback?.({ transactionMeta });
      });

      const afterTimestamp = Date.now();
      const event = mockCallback.mock.calls[0][0] as PredictTransactionEvent;
      expect(event.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(event.timestamp).toBeLessThanOrEqual(afterTimestamp);
    });
  });
});

describe('usePredictContext', () => {
  it('throws error when used outside PredictProvider', () => {
    expect(() => {
      renderHook(() => usePredictContext());
    }).toThrow('usePredictContext must be used within a PredictProvider');
  });
});

describe('usePredictContextSafe', () => {
  it('returns null when used outside PredictProvider', () => {
    const { result } = renderHook(() => usePredictContextSafe());

    expect(result.current).toBeNull();
  });

  it('returns context when used inside PredictProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PredictProvider>{children}</PredictProvider>
    );
    const { result } = renderHook(() => usePredictContextSafe(), { wrapper });

    expect(result.current).not.toBeNull();
    expect(result.current?.subscribeToDepositEvents).toBeDefined();
  });
});
