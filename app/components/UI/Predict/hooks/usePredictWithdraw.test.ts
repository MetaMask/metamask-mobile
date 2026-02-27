import { renderHook } from '@testing-library/react-native';
import { usePredictWithdraw } from './usePredictWithdraw';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
import Logger from '../../../../util/Logger';
import { invalidatePredictCaches } from '../utils/invalidatePredictCaches';

// Create mock functions
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigateToConfirmation = jest.fn();
const mockPrepareWithdraw = jest.fn();

// Mock dependencies
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {},
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('./usePredictTrading', () => ({
  usePredictTrading: jest.fn(() => ({
    prepareWithdraw: mockPrepareWithdraw,
  })),
}));

jest.mock('../../../Views/confirmations/hooks/useConfirmNavigation', () => ({
  useConfirmNavigation: jest.fn(() => ({
    navigateToConfirmation: mockNavigateToConfirmation,
  })),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  })),
}));

// Mock toast context
const mockToastRef = {
  current: {
    showToast: jest.fn(),
  },
};

jest.mock('../../../../component-library/components/Toast', () => ({
  ToastContext: {
    Consumer: ({ children }: { children: (value: unknown) => unknown }) =>
      children({ toastRef: mockToastRef }),
  },
  ToastVariants: {
    Icon: 'Icon',
  },
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(() => ({ toastRef: mockToastRef })),
}));

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

jest.mock('../utils/invalidatePredictCaches', () => ({
  invalidatePredictCaches: jest.fn(),
}));

const mockInvalidatePredictCaches =
  invalidatePredictCaches as jest.MockedFunction<
    typeof invalidatePredictCaches
  >;

// Mock react-redux
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockState: any = {
  engine: {
    backgroundState: {
      PredictController: {
        withdrawTransaction: null,
      },
    },
  },
};

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useSelector: jest.fn((selector: any) => selector(mockState)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connect: () => (component: any) => component,
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'predict.withdraw.error_title': 'Withdraw Error',
    };
    return translations[key] || key;
  },
}));

const mockLoggerError = Logger.error as jest.MockedFunction<
  typeof Logger.error
>;

// Helper to create mock withdraw transaction
function createMockWithdrawTransaction(overrides = {}) {
  return {
    amount: 100,
    chainId: 137,
    status: 'pending',
    providerId: POLYMARKET_PROVIDER_ID,
    ...overrides,
  };
}

// Helper to setup test
function setupUsePredictWithdrawTest(stateOverrides = {}) {
  jest.clearAllMocks();
  mockState = {
    engine: {
      backgroundState: {
        PredictController: {
          withdrawTransaction: null,
          ...stateOverrides,
        },
      },
    },
  };
  return renderHook(() => usePredictWithdraw());
}

describe('usePredictWithdraw', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigateToConfirmation.mockClear();
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockPrepareWithdraw.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('returns withdraw function and withdrawTransaction', () => {
      const { result } = setupUsePredictWithdrawTest();

      expect(typeof result.current.withdraw).toBe('function');
      expect(result.current.withdrawTransaction).toBeNull();
    });

    it('returns withdraw function that is callable', () => {
      const { result } = setupUsePredictWithdrawTest();

      expect(result.current.withdraw).toBeDefined();
      expect(typeof result.current.withdraw).toBe('function');
    });
  });

  describe('withdrawTransaction from state', () => {
    it('returns null when no withdraw transaction exists', () => {
      const { result } = setupUsePredictWithdrawTest({
        withdrawTransaction: null,
      });

      expect(result.current.withdrawTransaction).toBeNull();
    });

    it('returns withdraw transaction when it exists in state', () => {
      const withdrawTransaction = createMockWithdrawTransaction({
        amount: 250,
      });

      const { result } = setupUsePredictWithdrawTest({ withdrawTransaction });

      expect(result.current.withdrawTransaction).toEqual(withdrawTransaction);
    });

    it('returns updated withdraw transaction when state changes', () => {
      const initialTransaction = createMockWithdrawTransaction({
        amount: 100,
      });
      const updatedTransaction = createMockWithdrawTransaction({
        amount: 200,
      });

      const { result, rerender } = setupUsePredictWithdrawTest({
        withdrawTransaction: initialTransaction,
      });

      expect(result.current.withdrawTransaction).toEqual(initialTransaction);

      // Update state
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              withdrawTransaction: updatedTransaction,
            },
          },
        },
      };

      rerender({});

      expect(result.current.withdrawTransaction).toEqual(updatedTransaction);
    });
  });

  describe('withdraw function', () => {
    it('calls navigateToConfirmation with correct params when eligible', async () => {
      mockPrepareWithdraw.mockResolvedValue({ success: true });

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
        loader: ConfirmationLoader.CustomAmount,
      });
    });

    it('calls prepareWithdraw with empty options object', async () => {
      mockPrepareWithdraw.mockResolvedValue({ success: true });

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockPrepareWithdraw).toHaveBeenCalledWith({});
    });

    it('calls prepareWithdraw with explicit empty options object', async () => {
      mockPrepareWithdraw.mockResolvedValue({ success: true });

      const { result } = setupUsePredictWithdrawTest({});

      await result.current.withdraw();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockPrepareWithdraw).toHaveBeenCalledWith({});
    });

    it('returns response from prepareWithdraw on success', async () => {
      const mockResponse = { success: true, transactionId: 'tx-123' };
      mockPrepareWithdraw.mockResolvedValue(mockResponse);

      const { result } = setupUsePredictWithdrawTest();

      const response = await result.current.withdraw();

      expect(response).toEqual(mockResponse);
    });

    it('handles prepareWithdraw error gracefully', async () => {
      mockPrepareWithdraw.mockRejectedValue(new Error('Withdraw failed'));

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockGoBack).toHaveBeenCalled();
      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error('Withdraw failed'),
        expect.objectContaining({
          tags: {
            feature: 'Predict',
            component: 'usePredictWithdraw',
          },
        }),
      );
    });

    it('shows error toast when prepareWithdraw fails', async () => {
      mockPrepareWithdraw.mockRejectedValue(new Error('Withdraw failed'));

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockGoBack).toHaveBeenCalled();
      expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'Icon',
          iconName: 'Danger',
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: 'Withdraw Error',
              isBold: true,
            }),
            expect.objectContaining({
              label: 'Withdraw failed',
              isBold: false,
            }),
          ]),
          hasNoTimeout: false,
        }),
      );
    });

    it('shows error toast with default message for non-Error exceptions', async () => {
      mockPrepareWithdraw.mockRejectedValue('String error');

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockGoBack).toHaveBeenCalled();
      expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'Icon',
          iconName: 'Danger',
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: 'Withdraw Error',
              isBold: true,
            }),
            expect.objectContaining({
              label: 'Failed to prepare withdraw',
              isBold: false,
            }),
          ]),
          hasNoTimeout: false,
        }),
      );
    });

    it('shows error toast when prepareWithdraw returns failure result', async () => {
      mockPrepareWithdraw.mockRejectedValue(
        new Error('Provider not available'),
      );

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockGoBack).toHaveBeenCalled();
      expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'Icon',
          iconName: 'Danger',
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: 'Withdraw Error',
              isBold: true,
            }),
            expect.objectContaining({
              label: 'Provider not available',
              isBold: false,
            }),
          ]),
          hasNoTimeout: false,
        }),
      );
    });

    it('handles navigation error gracefully', async () => {
      mockNavigateToConfirmation.mockImplementationOnce(() => {
        throw new Error('Navigation failed');
      });

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      expect(mockGoBack).toHaveBeenCalled();
      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error('Navigation failed'),
        expect.objectContaining({
          tags: {
            feature: 'Predict',
            component: 'usePredictWithdraw',
          },
        }),
      );
    });

    it('returns undefined when error occurs', async () => {
      mockPrepareWithdraw.mockRejectedValue(new Error('Withdraw failed'));

      const { result } = setupUsePredictWithdrawTest();

      const response = await result.current.withdraw();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockGoBack).toHaveBeenCalled();
      expect(response).toBeUndefined();
    });
  });

  describe('hook stability', () => {
    it('updates withdrawTransaction when state changes', () => {
      const { result, rerender } = setupUsePredictWithdrawTest();

      expect(result.current.withdrawTransaction).toBeNull();

      // Update state with new transaction
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              withdrawTransaction: createMockWithdrawTransaction({
                amount: 500,
              }),
            },
          },
        },
      };

      rerender({});

      expect(result.current.withdrawTransaction).toEqual(
        createMockWithdrawTransaction({ amount: 500 }),
      );
    });
  });

  describe('withdraw payload handling', () => {
    it('calls prepareWithdraw with empty object by default', async () => {
      mockPrepareWithdraw.mockResolvedValue({ success: true });

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockPrepareWithdraw).toHaveBeenCalledWith({});
    });

    it('calls prepareWithdraw with empty object when not specified', async () => {
      mockPrepareWithdraw.mockResolvedValue({ success: true });

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockPrepareWithdraw).toHaveBeenCalledWith({});
    });

    it('calls prepareWithdraw with empty object for repeated calls', async () => {
      mockPrepareWithdraw.mockResolvedValue({ success: true });

      const { result } = setupUsePredictWithdrawTest({});

      await result.current.withdraw();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockPrepareWithdraw).toHaveBeenCalledWith({});
    });
  });

  describe('sequential withdraw calls', () => {
    it('handles multiple withdraw calls independently', async () => {
      mockPrepareWithdraw.mockResolvedValue({ success: true });

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();
      await result.current.withdraw();

      expect(mockPrepareWithdraw).toHaveBeenCalledTimes(2);
      expect(mockNavigateToConfirmation).toHaveBeenCalledTimes(2);
    });

    it('handles mixed success and failure withdraw calls', async () => {
      const { result } = setupUsePredictWithdrawTest();

      mockPrepareWithdraw
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Withdraw failed'));

      const firstResponse = await result.current.withdraw();
      const secondResponse = await result.current.withdraw();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(firstResponse).toEqual({ success: true });
      expect(secondResponse).toBeUndefined();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error('Withdraw failed'),
        expect.objectContaining({
          tags: {
            feature: 'Predict',
            component: 'usePredictWithdraw',
          },
        }),
      );
    });
  });

  describe('cache invalidation', () => {
    it('invalidates caches after successful withdraw', async () => {
      mockPrepareWithdraw.mockResolvedValue(undefined);

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      expect(mockInvalidatePredictCaches).toHaveBeenCalledTimes(1);
    });

    it('does not invalidate caches when withdraw fails', async () => {
      mockPrepareWithdraw.mockRejectedValue(new Error('Withdraw failed'));

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      expect(mockInvalidatePredictCaches).not.toHaveBeenCalled();
    });
  });
});
