import { renderHook } from '@testing-library/react-native';
import { usePredictWithdraw } from './usePredictWithdraw';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';

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

// Helper to create mock withdraw transaction
function createMockWithdrawTransaction(overrides = {}) {
  return {
    amount: 100,
    chainId: 137,
    status: 'pending',
    providerId: 'polymarket',
    ...overrides,
  };
}

// Helper to setup test
function setupUsePredictWithdrawTest(stateOverrides = {}, hookOptions = {}) {
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
  return renderHook(() => usePredictWithdraw(hookOptions));
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

    it('calls prepareWithdraw with default providerId', async () => {
      mockPrepareWithdraw.mockResolvedValue({ success: true });

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockPrepareWithdraw).toHaveBeenCalledWith({
        providerId: 'polymarket',
      });
    });

    it('calls prepareWithdraw with custom providerId', async () => {
      mockPrepareWithdraw.mockResolvedValue({ success: true });

      const { result } = setupUsePredictWithdrawTest(
        {},
        { providerId: 'custom-provider' },
      );

      await result.current.withdraw();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockPrepareWithdraw).toHaveBeenCalledWith({
        providerId: 'custom-provider',
      });
    });

    it('returns response from prepareWithdraw on success', async () => {
      const mockResponse = { success: true, transactionId: 'tx-123' };
      mockPrepareWithdraw.mockResolvedValue(mockResponse);

      const { result } = setupUsePredictWithdrawTest();

      const response = await result.current.withdraw();

      expect(response).toEqual(mockResponse);
    });

    it('handles prepareWithdraw error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPrepareWithdraw.mockRejectedValue(new Error('Withdraw failed'));

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockGoBack).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to proceed with withdraw:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('shows error toast when prepareWithdraw fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPrepareWithdraw.mockRejectedValue(new Error('Withdraw failed'));

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      // Wait for async operation
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

      consoleErrorSpy.mockRestore();
    });

    it('shows error toast with default message for non-Error exceptions', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPrepareWithdraw.mockRejectedValue('String error');

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      // Wait for async operation
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

      consoleErrorSpy.mockRestore();
    });

    it('shows error toast when prepareWithdraw returns failure result', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPrepareWithdraw.mockRejectedValue(
        new Error('Provider not available'),
      );

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      // Wait for async operation
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

      consoleErrorSpy.mockRestore();
    });

    it('handles navigation error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockNavigateToConfirmation.mockImplementationOnce(() => {
        throw new Error('Navigation failed');
      });

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      expect(mockGoBack).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to proceed with withdraw:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('returns undefined when error occurs', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPrepareWithdraw.mockRejectedValue(new Error('Withdraw failed'));

      const { result } = setupUsePredictWithdrawTest();

      const response = await result.current.withdraw();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockGoBack).toHaveBeenCalled();
      expect(response).toBeUndefined();

      consoleErrorSpy.mockRestore();
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

  describe('providerId handling', () => {
    it('uses default providerId polymarket when not specified', async () => {
      mockPrepareWithdraw.mockResolvedValue({ success: true });

      const { result } = setupUsePredictWithdrawTest();

      await result.current.withdraw();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockPrepareWithdraw).toHaveBeenCalledWith({
        providerId: 'polymarket',
      });
    });

    it('uses custom providerId when provided', async () => {
      mockPrepareWithdraw.mockResolvedValue({ success: true });

      const { result } = setupUsePredictWithdrawTest(
        {},
        { providerId: 'test-provider' },
      );

      await result.current.withdraw();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockPrepareWithdraw).toHaveBeenCalledWith({
        providerId: 'test-provider',
      });
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
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPrepareWithdraw
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Withdraw failed'));

      const { result } = setupUsePredictWithdrawTest();

      const firstResponse = await result.current.withdraw();
      const secondResponse = await result.current.withdraw();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(firstResponse).toEqual({ success: true });
      expect(secondResponse).toBeUndefined();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to proceed with withdraw:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
