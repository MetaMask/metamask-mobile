import { renderHook } from '@testing-library/react-native';
import React from 'react';
import { captureException } from '@sentry/react-native';
import { usePredictDeposit } from './usePredictDeposit';
import Engine from '../../../../core/Engine';
import { PredictDepositStatus } from '../types';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { ToastContext } from '../../../../component-library/components/Toast/Toast.context';

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      depositWithConfirmation: jest.fn(),
    },
  },
}));

// Mock useConfirmNavigation
const mockNavigateToConfirmation = jest.fn();
const mockConfirmNavigationResult = {
  navigateToConfirmation: mockNavigateToConfirmation,
};
jest.mock('../../../Views/confirmations/hooks/useConfirmNavigation', () => ({
  useConfirmNavigation: () => mockConfirmNavigationResult,
}));

// Mock usePredictEligibility
const mockEligibilityResult = { isEligible: true };
jest.mock('./usePredictEligibility', () => ({
  usePredictEligibility: () => mockEligibilityResult,
}));

// Mock theme
jest.mock('../../../../util/theme', () => ({
  useAppThemeFromContext: jest.fn(() => ({
    colors: {
      error: {
        default: '#ca3542',
      },
      accent04: {
        normal: '#89b0ff',
      },
    },
  })),
}));

// Mock useNavigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigationResult = {
  navigate: mockNavigate,
  goBack: mockGoBack,
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigationResult,
}));

// Mock react-redux
interface MockReduxState {
  engine: {
    backgroundState: {
      PredictController: {
        depositTransaction: unknown;
      };
    };
  };
}

let mockState: MockReduxState = {
  engine: {
    backgroundState: {
      PredictController: {
        depositTransaction: null,
      },
    },
  },
};

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useSelector: jest.fn((selector: (state: MockReduxState) => unknown) =>
      selector(mockState),
    ),
    connect: () => (component: React.ComponentType) => component,
  };
});

// Mock toast
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockToastRef: React.RefObject<{
  showToast: jest.Mock;
  closeToast: jest.Mock;
}> = {
  current: {
    showToast: mockShowToast,
    closeToast: mockCloseToast,
  },
};

// Typed mock for captureException
const mockCaptureException = captureException as jest.MockedFunction<
  typeof captureException
>;

// Helper to create mock deposit transaction
function createMockDepositTransaction(overrides = {}) {
  return {
    batchId: 'batch-123',
    chainId: 137,
    status: PredictDepositStatus.PENDING,
    providerId: 'polymarket',
    ...overrides,
  };
}

// Helper to setup test
function setupUsePredictDepositTest(
  stateOverrides = {},
  hookOptions = {},
  customToastRef?:
    | React.RefObject<{ showToast: jest.Mock; closeToast: jest.Mock }>
    | null
    | undefined,
) {
  jest.clearAllMocks();
  mockState = {
    engine: {
      backgroundState: {
        PredictController: {
          depositTransaction: null,
          ...stateOverrides,
        },
      },
    },
  };

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      ToastContext.Provider,
      {
        value: {
          toastRef:
            customToastRef !== undefined
              ? (customToastRef as React.RefObject<{
                  showToast: jest.Mock;
                  closeToast: jest.Mock;
                }>)
              : mockToastRef,
        },
      },
      children,
    );

  return renderHook(() => usePredictDeposit(hookOptions), { wrapper });
}

describe('usePredictDeposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigateToConfirmation.mockClear();
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockShowToast.mockClear();
    mockCaptureException.mockClear();
    mockEligibilityResult.isEligible = true;
    (
      Engine.context.PredictController.depositWithConfirmation as jest.Mock
    ).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns undefined status when no deposit transaction exists', () => {
      const { result } = setupUsePredictDepositTest();

      // No action needed - testing initial state

      expect(result.current.status).toBeUndefined();
      expect(typeof result.current.deposit).toBe('function');
    });

    it('returns callable deposit function', () => {
      const { result } = setupUsePredictDepositTest();

      // No action needed - testing initial state

      expect(result.current.deposit).toBeDefined();
      expect(typeof result.current.deposit).toBe('function');
    });
  });

  describe('status from depositTransaction', () => {
    it('returns confirmed status when transaction is confirmed', () => {
      const depositTransaction = createMockDepositTransaction({
        status: PredictDepositStatus.CONFIRMED,
      });

      const { result } = setupUsePredictDepositTest({ depositTransaction });

      expect(result.current.status).toBe(PredictDepositStatus.CONFIRMED);
    });

    it('returns pending status when transaction is pending', () => {
      const depositTransaction = createMockDepositTransaction({
        status: PredictDepositStatus.PENDING,
      });

      const { result } = setupUsePredictDepositTest({ depositTransaction });

      expect(result.current.status).toBe(PredictDepositStatus.PENDING);
    });

    it('returns error status when transaction has error status', () => {
      const depositTransaction = createMockDepositTransaction({
        status: PredictDepositStatus.ERROR,
      });

      const { result } = setupUsePredictDepositTest({ depositTransaction });

      expect(result.current.status).toBe(PredictDepositStatus.ERROR);
    });

    it('returns undefined status when transaction is null', () => {
      const { result } = setupUsePredictDepositTest({
        depositTransaction: null,
      });

      expect(result.current.status).toBeUndefined();
    });

    it('returns cancelled status when transaction is cancelled', () => {
      const depositTransaction = createMockDepositTransaction({
        status: PredictDepositStatus.CANCELLED,
      });

      const { result } = setupUsePredictDepositTest({ depositTransaction });

      expect(result.current.status).toBe(PredictDepositStatus.CANCELLED);
    });
  });

  describe('deposit function', () => {
    it('calls navigateToConfirmation with loader and stack parameters', async () => {
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockResolvedValue({
        success: true,
        response: { batchId: 'batch-123' },
      });
      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();

      expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
        loader: ConfirmationLoader.CustomAmount,
        stack: 'Predict',
      });
    });

    it('calls depositWithConfirmation with default providerId', async () => {
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockResolvedValue({
        success: true,
        response: { batchId: 'batch-123' },
      });

      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        Engine.context.PredictController.depositWithConfirmation,
      ).toHaveBeenCalledWith({
        providerId: 'polymarket',
      });
    });

    it('calls depositWithConfirmation with custom providerId', async () => {
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockResolvedValue({
        success: true,
        response: { batchId: 'batch-123' },
      });

      const { result } = setupUsePredictDepositTest(
        {},
        { providerId: 'custom-provider' },
      );

      await result.current.deposit();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        Engine.context.PredictController.depositWithConfirmation,
      ).toHaveBeenCalledWith({
        providerId: 'custom-provider',
      });
    });

    it('navigates back and logs error when depositWithConfirmation fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockRejectedValue(new Error('Deposit failed'));
      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockGoBack).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to initialize deposit:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('navigates back and logs error when navigation fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockNavigateToConfirmation.mockImplementationOnce(() => {
        throw new Error('Navigation failed');
      });
      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();

      expect(mockGoBack).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to proceed with deposit:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('hook stability', () => {
    it('returns stable deposit function reference across re-renders', () => {
      const { result, rerender } = setupUsePredictDepositTest();

      const initialDeposit = result.current.deposit;

      rerender({});

      expect(result.current.deposit).toBe(initialDeposit);
    });

    it('updates status when depositTransaction changes', () => {
      const { result, rerender } = setupUsePredictDepositTest();

      expect(result.current.status).toBeUndefined();

      // Update state with pending transaction
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.PENDING,
              }),
            },
          },
        },
      };

      rerender({});

      expect(result.current.status).toBe(PredictDepositStatus.PENDING);
    });
  });

  describe('state transitions', () => {
    it('updates status when depositTransaction changes to confirmed', () => {
      const { result, rerender } = setupUsePredictDepositTest();

      expect(result.current.status).toBeUndefined();

      // Update state with confirmed transaction
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.CONFIRMED,
              }),
            },
          },
        },
      };

      rerender({});

      expect(result.current.status).toBe(PredictDepositStatus.CONFIRMED);
    });

    it('updates status when depositTransaction changes to pending', () => {
      const { result, rerender } = setupUsePredictDepositTest();

      expect(result.current.status).toBeUndefined();

      // Add pending transaction
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.PENDING,
              }),
            },
          },
        },
      };

      rerender({});

      expect(result.current.status).toBe(PredictDepositStatus.PENDING);
    });

    it('updates status when depositTransaction changes to error', () => {
      const { result, rerender } = setupUsePredictDepositTest();

      expect(result.current.status).toBeUndefined();

      // Add error transaction
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.ERROR,
              }),
            },
          },
        },
      };

      rerender({});

      expect(result.current.status).toBe(PredictDepositStatus.ERROR);
    });
  });

  describe('providerId handling', () => {
    it('uses default providerId polymarket when not specified', async () => {
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockResolvedValue({ success: true });

      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        Engine.context.PredictController.depositWithConfirmation,
      ).toHaveBeenCalledWith({
        providerId: 'polymarket',
      });
    });

    it('uses custom providerId when provided', async () => {
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockResolvedValue({ success: true });

      const { result } = setupUsePredictDepositTest(
        {},
        { providerId: 'test-provider' },
      );

      await result.current.deposit();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        Engine.context.PredictController.depositWithConfirmation,
      ).toHaveBeenCalledWith({
        providerId: 'test-provider',
      });
    });
  });

  describe('error handling with Sentry', () => {
    it('captures exception to Sentry when depositWithConfirmation fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockError = new Error('Deposit failed');
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCaptureException).toHaveBeenCalledWith(mockError, {
        tags: {
          component: 'usePredictDeposit',
          action: 'deposit_initialization',
          operation: 'financial_operations',
        },
        extra: {
          depositContext: {
            providerId: 'polymarket',
          },
        },
      });

      consoleErrorSpy.mockRestore();
    });

    it('converts non-Error exceptions to Error for Sentry in depositWithConfirmation', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockRejectedValue('String error');

      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCaptureException).toHaveBeenCalledWith(
        new Error('String error'),
        {
          tags: {
            component: 'usePredictDeposit',
            action: 'deposit_initialization',
            operation: 'financial_operations',
          },
          extra: {
            depositContext: {
              providerId: 'polymarket',
            },
          },
        },
      );

      consoleErrorSpy.mockRestore();
    });

    it('captures exception to Sentry when navigation fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockError = new Error('Navigation failed');
      mockNavigateToConfirmation.mockImplementationOnce(() => {
        throw mockError;
      });

      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();

      expect(mockCaptureException).toHaveBeenCalledWith(mockError, {
        tags: {
          component: 'usePredictDeposit',
          action: 'deposit_navigation',
          operation: 'financial_operations',
        },
        extra: {
          depositContext: {
            providerId: 'polymarket',
          },
        },
      });

      consoleErrorSpy.mockRestore();
    });

    it('converts non-Error exceptions to Error for Sentry in navigation error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockNavigateToConfirmation.mockImplementationOnce(() => {
        throw { code: 'NAV_ERROR' };
      });

      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();

      expect(mockCaptureException).toHaveBeenCalledWith(
        new Error('[object Object]'),
        {
          tags: {
            component: 'usePredictDeposit',
            action: 'deposit_navigation',
            operation: 'financial_operations',
          },
          extra: {
            depositContext: {
              providerId: 'polymarket',
            },
          },
        },
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('toast notifications', () => {
    it('shows error toast when depositWithConfirmation fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockRejectedValue(new Error('Deposit failed'));

      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'Icon',
          iconName: 'Error',
          iconColor: '#ca3542',
          backgroundColor: '#89b0ff',
          hasNoTimeout: false,
          linkButtonOptions: expect.objectContaining({
            onPress: expect.any(Function),
          }),
        }),
      );

      consoleErrorSpy.mockRestore();
    });

    it('shows error toast when navigation fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockNavigateToConfirmation.mockImplementationOnce(() => {
        throw new Error('Navigation failed');
      });

      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'Icon',
          iconName: 'Error',
          iconColor: '#ca3542',
          backgroundColor: '#89b0ff',
          hasNoTimeout: false,
          linkButtonOptions: expect.objectContaining({
            onPress: expect.any(Function),
          }),
        }),
      );

      consoleErrorSpy.mockRestore();
    });

    it('does not show toast when toastRef is null and depositWithConfirmation fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockRejectedValue(new Error('Deposit failed'));
      const { result } = setupUsePredictDepositTest({}, {}, null);

      await result.current.deposit();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockGoBack).toHaveBeenCalled();
      expect(mockCaptureException).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('does not show toast when toastRef is null and navigation fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockNavigateToConfirmation.mockImplementationOnce(() => {
        throw new Error('Navigation failed');
      });
      const { result } = setupUsePredictDepositTest({}, {}, null);

      await result.current.deposit();

      expect(mockGoBack).toHaveBeenCalled();
      expect(mockCaptureException).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('retry button calls deposit again after depositWithConfirmation error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (Engine.context.PredictController.depositWithConfirmation as jest.Mock)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ success: true });

      const { result } = setupUsePredictDepositTest();

      // First deposit attempt fails
      await result.current.deposit();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Get retry function from toast call
      const toastCall = mockShowToast.mock.calls[0][0];
      const retryFunction = toastCall.linkButtonOptions.onPress;

      // Clear mocks
      mockShowToast.mockClear();
      mockNavigateToConfirmation.mockClear();

      // Call retry
      await retryFunction();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second attempt should succeed
      expect(mockNavigateToConfirmation).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('retry button calls deposit again after navigation error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockNavigateToConfirmation
        .mockImplementationOnce(() => {
          throw new Error('First error');
        })
        .mockImplementationOnce(() => undefined);

      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockResolvedValue({ success: true });

      const { result } = setupUsePredictDepositTest();

      // First deposit attempt fails
      await result.current.deposit();

      // Get retry function from toast call
      const toastCall = mockShowToast.mock.calls[0][0];
      const retryFunction = toastCall.linkButtonOptions.onPress;

      // Clear mocks
      mockShowToast.mockClear();
      mockNavigateToConfirmation.mockClear();

      // Call retry
      await retryFunction();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second attempt should succeed
      expect(mockNavigateToConfirmation).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('selector', () => {
    it('selects depositTransaction from Redux state', () => {
      const mockDepositTransaction = createMockDepositTransaction({
        status: PredictDepositStatus.CONFIRMED,
        batchId: 'custom-batch',
      });
      const { result } = setupUsePredictDepositTest({
        depositTransaction: mockDepositTransaction,
      });

      expect(result.current.status).toBe(PredictDepositStatus.CONFIRMED);
    });

    it('returns undefined status when depositTransaction has no status', () => {
      const { result } = setupUsePredictDepositTest({
        depositTransaction: { batchId: 'test' },
      });

      expect(result.current.status).toBeUndefined();
    });
  });
});
