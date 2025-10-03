import { renderHook, act } from '@testing-library/react-native';

// Mock Engine first - needs to be before the hook import
jest.mock('../../../../core/Engine', () => {
  const mockClearClaimTransactions = jest.fn();
  return {
    context: {
      PredictController: {
        clearClaimTransactions: mockClearClaimTransactions,
        claimTransactions: {},
      },
    },
  };
});

// eslint-disable-next-line
const mockClearClaimTransactions = require('../../../../core/Engine').context
  .PredictController.clearClaimTransactions;

// Mock usePredictTrading hook
const mockClaim = jest.fn();
jest.mock('./usePredictTrading', () => ({
  usePredictTrading: () => ({
    claim: mockClaim,
  }),
}));

// Factory function to create mock state
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockState(overrides: any = {}): any {
  return {
    engine: {
      backgroundState: {
        PredictController: {
          claimTransactions: {},
          ...overrides.PredictController,
        },
        ...overrides,
      },
    },
  };
}

// Create initial mock state
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockState: any = createMockState();

// Mock react-redux useSelector to evaluate selectors against our mock state
jest.mock('react-redux', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: jest.fn((selector: any) => selector(mockState)),
}));

// Now import the hook after all mocks are set up
import { usePredictClaim } from './usePredictClaim';
import { PredictPositionStatus } from '../types';

// Cast the mocked function - use the mock directly instead of accessing through Engine
const mockClearClaimTransactionsCasted = mockClearClaimTransactions;

// Helper function to setup test with mock state
function setupUsePredictClaimTest(stateOverrides = {}, hookOptions = {}) {
  jest.clearAllMocks();
  mockState = createMockState(stateOverrides);
  return renderHook(() => usePredictClaim(hookOptions));
}

// Helper function to create mock position
function createMockPosition(overrides = {}) {
  return {
    id: 'position-123',
    providerId: 'provider-456',
    marketId: 'market-789',
    outcomeId: 'outcome-101',
    outcome: 'UP',
    outcomeTokenId: 'outcome-token-202',
    title: 'BTC UP',
    icon: 'btc-icon.png',
    amount: 50,
    price: 1.5,
    status: PredictPositionStatus.WON,
    size: 50,
    outcomeIndex: 0,
    realizedPnl: 25,
    curPrice: 1.8,
    conditionId: 'condition-303',
    percentPnl: 50,
    cashPnl: 25,
    initialValue: 50,
    avgPrice: 1.5,
    currentValue: 90,
    endDate: '2025-12-31',
    claimable: true,
    ...overrides,
  };
}

// Helper function to create mock claim transaction
function createMockClaimTransaction(overrides = {}) {
  return {
    positionId: 'position-123',
    chainId: 1,
    to: '0x1234567890123456789012345678901234567890' as const,
    data: '0xabcdef' as const,
    value: '0x0' as const,
    status: 'confirmed' as const,
    ...overrides,
  };
}

// Common mock data
const mockClaimParams = {
  positions: [createMockPosition(), createMockPosition({ id: 'position-456' })],
};

const mockClaimResult = {
  success: true,
  ids: ['tx-123', 'tx-456'],
};

describe('usePredictClaim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = createMockState();
    // Ensure the mock function is reset
    mockClearClaimTransactionsCasted.mockReset();
  });

  describe('initial state', () => {
    it('returns initial state correctly when no claim transactions exist', () => {
      const { result } = setupUsePredictClaimTest();

      expect(result.current.loading).toBe(false);
      expect(result.current.completed).toBe(false);
      expect(result.current.error).toBe(false);
      expect(result.current.cancelled).toBe(false);
      expect(result.current.completedClaimPositionIds).toEqual(new Set());
      expect(typeof result.current.claim).toBe('function');
    });

    it('returns initial state correctly when claim transactions are null', () => {
      const { result } = setupUsePredictClaimTest({
        PredictController: {
          claimTransactions: null,
        },
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.completed).toBe(false);
      expect(result.current.error).toBe(false);
      expect(result.current.cancelled).toBe(false);
      expect(result.current.completedClaimPositionIds).toEqual(new Set());
    });
  });

  describe('state computation from claim transactions', () => {
    it('computes completed state when all transactions are confirmed', () => {
      const claimTransactions = {
        'tx-1': [
          createMockClaimTransaction({
            status: 'confirmed',
            positionId: 'pos-1',
          }),
          createMockClaimTransaction({
            status: 'confirmed',
            positionId: 'pos-2',
          }),
        ],
        'tx-2': [
          createMockClaimTransaction({
            status: 'confirmed',
            positionId: 'pos-3',
          }),
        ],
      };

      const { result } = setupUsePredictClaimTest({
        PredictController: { claimTransactions },
      });

      expect(result.current.completed).toBe(true);
      expect(result.current.completedClaimPositionIds).toEqual(
        new Set(['pos-1', 'pos-2', 'pos-3']),
      );
    });

    it('computes pending state when any transaction is pending', () => {
      const claimTransactions = {
        'tx-1': [createMockClaimTransaction({ status: 'confirmed' })],
        'tx-2': [createMockClaimTransaction({ status: 'pending' })],
      };

      const { result } = setupUsePredictClaimTest({
        PredictController: { claimTransactions },
      });

      expect(result.current.loading).toBe(true); // loading = claiming || pending
    });

    it('computes error state when any transaction has error status', () => {
      const claimTransactions = {
        'tx-1': [createMockClaimTransaction({ status: 'confirmed' })],
        'tx-2': [createMockClaimTransaction({ status: 'error' })],
      };

      const { result } = setupUsePredictClaimTest({
        PredictController: { claimTransactions },
      });

      expect(result.current.error).toBe(true);
    });

    it('computes cancelled state when any transaction is cancelled', () => {
      const claimTransactions = {
        'tx-1': [createMockClaimTransaction({ status: 'confirmed' })],
        'tx-2': [createMockClaimTransaction({ status: 'cancelled' })],
      };

      const { result } = setupUsePredictClaimTest({
        PredictController: { claimTransactions },
      });

      expect(result.current.cancelled).toBe(true);
    });

    it('computes mixed states correctly', () => {
      const claimTransactions = {
        'tx-1': [
          createMockClaimTransaction({
            status: 'confirmed',
            positionId: 'pos-1',
          }),
        ],
        'tx-2': [
          createMockClaimTransaction({
            status: 'pending',
            positionId: 'pos-2',
          }),
        ],
        'tx-3': [
          createMockClaimTransaction({ status: 'error', positionId: 'pos-3' }),
        ],
        'tx-4': [
          createMockClaimTransaction({
            status: 'cancelled',
            positionId: 'pos-4',
          }),
        ],
      };

      const { result } = setupUsePredictClaimTest({
        PredictController: { claimTransactions },
      });

      expect(result.current.completed).toBe(false);
      expect(result.current.loading).toBe(true); // has pending
      expect(result.current.error).toBe(true); // has error
      expect(result.current.cancelled).toBe(true); // has cancelled
      expect(result.current.completedClaimPositionIds).toEqual(
        new Set(['pos-1']),
      );
    });

    it('handles empty transaction arrays', () => {
      const claimTransactions = {
        'tx-1': [],
        'tx-2': [],
      };

      const { result } = setupUsePredictClaimTest({
        PredictController: { claimTransactions },
      });

      // When there are transaction arrays but they're empty, completed should be false
      expect(result.current.completed).toBe(false);
      expect(result.current.completedClaimPositionIds).toEqual(new Set());
    });

    it('handles mixed null and valid transaction arrays', () => {
      const claimTransactions = {
        'tx-1': null,
        'tx-2': [
          createMockClaimTransaction({
            status: 'confirmed',
            positionId: 'pos-1',
          }),
        ],
      };

      const { result } = setupUsePredictClaimTest({
        PredictController: { claimTransactions },
      });

      // When there's a null transaction array, completed should be false
      // but completedClaimPositionIds should still collect confirmed transactions
      expect(result.current.completed).toBe(false);
      expect(result.current.completedClaimPositionIds).toEqual(
        new Set(['pos-1']),
      );
    });
  });

  describe('claim function', () => {
    it('claims winnings successfully and returns result', async () => {
      mockClaim.mockResolvedValue(mockClaimResult);

      const { result } = setupUsePredictClaimTest();

      let claimResult;
      await act(async () => {
        claimResult = await result.current.claim(mockClaimParams);
      });

      expect(mockClaim).toHaveBeenCalledWith(mockClaimParams);
      expect(claimResult).toEqual(mockClaimResult);
    });

    it('handles errors from claimWinnings and calls onError callback', async () => {
      const mockError = new Error('Claim failed');
      const onErrorMock = jest.fn();

      mockClaim.mockRejectedValue(mockError);

      const { result } = setupUsePredictClaimTest({}, { onError: onErrorMock });

      let claimResult;
      await act(async () => {
        claimResult = await result.current.claim(mockClaimParams);
      });

      expect(mockClaim).toHaveBeenCalledWith(mockClaimParams);
      expect(onErrorMock).toHaveBeenCalledWith(mockError);
      expect(claimResult).toEqual({
        success: false,
        error: mockError,
      });
    });

    it('handles non-success results from claimWinnings', async () => {
      const mockErrorResult = {
        success: false,
        error: 'Insufficient balance',
      };
      const onErrorMock = jest.fn();

      mockClaim.mockResolvedValue(mockErrorResult);

      const { result } = setupUsePredictClaimTest({}, { onError: onErrorMock });

      let claimResult;
      await act(async () => {
        claimResult = await result.current.claim(mockClaimParams);
      });

      expect(mockClaim).toHaveBeenCalledWith(mockClaimParams);
      expect(onErrorMock).toHaveBeenCalledWith(
        new Error('Insufficient balance'),
      );
      expect(claimResult).toEqual({
        success: false,
        error: new Error('Insufficient balance'),
      });
    });
  });

  describe('error handling in claim function', () => {
    it('calls onError callback when claimWinnings throws an error', async () => {
      const mockError = new Error('Network error');
      const onErrorMock = jest.fn();

      mockClaim.mockRejectedValue(mockError);

      const { result } = setupUsePredictClaimTest({}, { onError: onErrorMock });

      await act(async () => {
        await result.current.claim(mockClaimParams);
      });

      expect(onErrorMock).toHaveBeenCalledWith(mockError);
    });

    it('calls onError callback when claimWinnings returns unsuccessful result', async () => {
      const mockErrorResult = {
        success: false,
        error: 'Insufficient funds',
      };
      const onErrorMock = jest.fn();

      mockClaim.mockResolvedValue(mockErrorResult);

      const { result } = setupUsePredictClaimTest({}, { onError: onErrorMock });

      await act(async () => {
        await result.current.claim(mockClaimParams);
      });

      expect(onErrorMock).toHaveBeenCalledWith(new Error('Insufficient funds'));
    });
  });

  describe('hook stability', () => {
    it('returns stable function references', () => {
      const { result, rerender } = setupUsePredictClaimTest();

      const initialClaim = result.current.claim;

      rerender({});

      expect(result.current.claim).toBe(initialClaim);
    });
  });

  describe('memoization', () => {
    it('recomputes completed state when claimTransactions change', () => {
      const { result, rerender } = setupUsePredictClaimTest();

      expect(result.current.completed).toBe(false);

      // Update state with completed transactions
      mockState = createMockState({
        PredictController: {
          claimTransactions: {
            'tx-1': [createMockClaimTransaction({ status: 'confirmed' })],
          },
        },
      });

      rerender(mockState);

      expect(result.current.completed).toBe(true);
    });

    it('recomputes loading state when pending transactions change', () => {
      const { result, rerender } = setupUsePredictClaimTest();

      expect(result.current.loading).toBe(false);

      // Add pending transaction
      mockState = createMockState({
        PredictController: {
          claimTransactions: {
            'tx-1': [createMockClaimTransaction({ status: 'pending' })],
          },
        },
      });

      rerender(mockState);

      expect(result.current.loading).toBe(true);
    });
  });

  describe('useEffect side effects', () => {
    it('calls onComplete callback when completed becomes true while claiming', async () => {
      const onComplete = jest.fn();

      // Start with no transactions
      mockState = createMockState({
        PredictController: {
          claimTransactions: {},
        },
      });

      const { result, rerender } = renderHook(() =>
        usePredictClaim({ onComplete }),
      );

      // Mock successful claim to set claiming to true
      mockClaim.mockResolvedValueOnce({ success: true });

      await act(async () => {
        await result.current.claim({ positions: [createMockPosition()] });
      });

      // Verify claiming is true
      expect(result.current.loading).toBe(true);

      // Now simulate completion by updating state with confirmed transactions
      mockState = createMockState({
        PredictController: {
          claimTransactions: {
            'tx-1': [createMockClaimTransaction({ status: 'confirmed' })],
          },
        },
      });

      // Re-render to trigger useEffect with new state
      await act(async () => {
        rerender({ onComplete });
      });

      expect(onComplete).toHaveBeenCalled();
    });

    it('calls onError when error status is detected while claiming', async () => {
      const onError = jest.fn();

      // Start with no transactions, then simulate error
      mockState = createMockState({
        PredictController: {
          claimTransactions: {},
        },
      });

      const { result, rerender } = renderHook(() =>
        usePredictClaim({ onError }),
      );

      // Mock successful claim to set claiming to true
      mockClaim.mockResolvedValueOnce({ success: true });

      await act(async () => {
        await result.current.claim({ positions: [createMockPosition()] });
      });

      // Now simulate error by updating state with error transactions
      mockState = createMockState({
        PredictController: {
          claimTransactions: {
            'tx-1': [createMockClaimTransaction({ status: 'error' })],
          },
        },
      });

      // Re-render to trigger useEffect with error state
      await act(async () => {
        rerender({ onError });
      });

      expect(onError).toHaveBeenCalledWith(
        new Error('Error claiming winnings'),
      );
      expect(mockClearClaimTransactionsCasted).toHaveBeenCalled();
    });

    it('calls onError when cancelled status is detected while claiming', async () => {
      const onError = jest.fn();

      // Start with no transactions, then simulate cancellation
      mockState = createMockState({
        PredictController: {
          claimTransactions: {},
        },
      });

      const { result, rerender } = renderHook(() =>
        usePredictClaim({ onError }),
      );

      // Mock successful claim to set claiming to true
      mockClaim.mockResolvedValueOnce({ success: true });

      await act(async () => {
        await result.current.claim({ positions: [createMockPosition()] });
      });

      // Now simulate cancellation by updating state with cancelled transactions
      mockState = createMockState({
        PredictController: {
          claimTransactions: {
            'tx-1': [createMockClaimTransaction({ status: 'cancelled' })],
          },
        },
      });

      // Re-render to trigger useEffect with cancelled state
      await act(async () => {
        rerender({ onError });
      });

      expect(onError).toHaveBeenCalledWith(new Error('Claim cancelled'));
      expect(mockClearClaimTransactionsCasted).toHaveBeenCalled();
    });
  });
});
