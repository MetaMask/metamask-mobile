import { renderHook } from '@testing-library/react-native';
import React from 'react';
import { usePredictDeposit } from './usePredictDeposit';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { ToastContext } from '../../../../component-library/components/Toast/Toast.context';

// Mock Logger
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

// Mock Engine with AccountTreeController
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      depositWithConfirmation: jest.fn(),
    },
    AccountTreeController: {
      getAccountsFromSelectedAccountGroup: jest.fn(() => [
        {
          id: 'test-account-id',
          address: '0x1234567890123456789012345678901234567890',
          type: 'eip155:eoa',
          name: 'Test Account',
          metadata: {
            lastSelected: 0,
          },
        },
      ]),
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
        pendingDeposits: {
          [providerId: string]: { [address: string]: boolean };
        };
      };
      AccountsController: {
        internalAccounts: {
          selectedAccount: string;
          accounts: {
            [key: string]: {
              address: string;
            };
          };
        };
      };
    };
  };
}

const mockAccountId = 'mock-account-id';
const mockAccountAddress = '0x1234567890123456789012345678901234567890';

let mockState: MockReduxState = {
  engine: {
    backgroundState: {
      PredictController: {
        pendingDeposits: {},
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: mockAccountId,
          accounts: {
            [mockAccountId]: {
              address: mockAccountAddress,
            },
          },
        },
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

// Typed mock for Logger.error
const mockLoggerError = Logger.error as jest.MockedFunction<
  typeof Logger.error
>;

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
          pendingDeposits: {},
          ...stateOverrides,
        },
        AccountsController: {
          internalAccounts: {
            selectedAccount: mockAccountId,
            accounts: {
              [mockAccountId]: {
                address: mockAccountAddress,
              },
            },
          },
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
    mockLoggerError.mockClear();
    mockEligibilityResult.isEligible = true;
    (
      Engine.context.PredictController.depositWithConfirmation as jest.Mock
    ).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns false for isDepositPending when no deposit transaction exists', () => {
      const { result } = setupUsePredictDepositTest();

      expect(result.current.isDepositPending).toBe(false);
      expect(typeof result.current.deposit).toBe('function');
    });

    it('returns callable deposit function', () => {
      const { result } = setupUsePredictDepositTest();

      expect(result.current.deposit).toBeDefined();
      expect(typeof result.current.deposit).toBe('function');
    });
  });

  describe('isDepositPending from pendingDeposits', () => {
    it('returns true when deposit is pending for current address', () => {
      const { result } = setupUsePredictDepositTest({
        pendingDeposits: {
          polymarket: {
            [mockAccountAddress]: true,
          },
        },
      });

      expect(result.current.isDepositPending).toBe(true);
    });

    it('returns false when deposit is not pending for current address', () => {
      const { result } = setupUsePredictDepositTest({
        pendingDeposits: {
          polymarket: {
            [mockAccountAddress]: false,
          },
        },
      });

      expect(result.current.isDepositPending).toBe(false);
    });

    it('returns false when pendingDeposits is empty', () => {
      const { result } = setupUsePredictDepositTest({
        pendingDeposits: {},
      });

      expect(result.current.isDepositPending).toBe(false);
    });

    it('returns false when provider does not exist in pendingDeposits', () => {
      const { result } = setupUsePredictDepositTest({
        pendingDeposits: {
          'other-provider': {
            [mockAccountAddress]: true,
          },
        },
      });

      expect(result.current.isDepositPending).toBe(false);
    });
  });

  describe('deposit function', () => {
    it('calls navigateToConfirmation with loader parameter and no stack by default', async () => {
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
        stack: undefined,
      });
    });

    it('calls navigateToConfirmation with stack parameter when provided', async () => {
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockResolvedValue({
        success: true,
        response: { batchId: 'batch-123' },
      });
      const { result } = setupUsePredictDepositTest({}, { stack: 'Predict' });

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

    it('updates isDepositPending when pendingDeposits changes', () => {
      const { result, rerender } = setupUsePredictDepositTest();

      expect(result.current.isDepositPending).toBe(false);

      // Update state with pending deposit
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              pendingDeposits: {
                polymarket: {
                  [mockAccountAddress]: true,
                },
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: mockAccountId,
                accounts: {
                  [mockAccountId]: {
                    address: mockAccountAddress,
                  },
                },
              },
            },
          },
        },
      };

      rerender({});

      expect(result.current.isDepositPending).toBe(true);
    });
  });

  describe('state transitions', () => {
    it('updates isDepositPending when pendingDeposits changes to true', () => {
      const { result, rerender } = setupUsePredictDepositTest();

      expect(result.current.isDepositPending).toBe(false);

      // Update state with pending deposit
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              pendingDeposits: {
                polymarket: {
                  [mockAccountAddress]: true,
                },
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: mockAccountId,
                accounts: {
                  [mockAccountId]: {
                    address: mockAccountAddress,
                  },
                },
              },
            },
          },
        },
      };

      rerender({});

      expect(result.current.isDepositPending).toBe(true);
    });

    it('updates isDepositPending when pendingDeposits changes to false', () => {
      const { result, rerender } = setupUsePredictDepositTest({
        pendingDeposits: {
          polymarket: {
            [mockAccountAddress]: true,
          },
        },
      });

      expect(result.current.isDepositPending).toBe(true);

      // Clear pending deposit
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              pendingDeposits: {
                polymarket: {
                  [mockAccountAddress]: false,
                },
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: mockAccountId,
                accounts: {
                  [mockAccountId]: {
                    address: mockAccountAddress,
                  },
                },
              },
            },
          },
        },
      };

      rerender({});

      expect(result.current.isDepositPending).toBe(false);
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

      expect(mockLoggerError).toHaveBeenCalledWith(mockError, {
        tags: {
          component: 'usePredictDeposit',
          feature: 'Predict',
        },
        context: {
          name: 'usePredictDeposit',
          data: {
            action: 'deposit_initialization',
            method: 'deposit',
            operation: 'financial_operations',
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

      expect(mockLoggerError).toHaveBeenCalledWith(new Error('String error'), {
        tags: {
          component: 'usePredictDeposit',
          feature: 'Predict',
        },
        context: {
          name: 'usePredictDeposit',
          data: {
            action: 'deposit_initialization',
            method: 'deposit',
            operation: 'financial_operations',
            providerId: 'polymarket',
          },
        },
      });

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

      expect(mockLoggerError).toHaveBeenCalledWith(mockError, {
        tags: {
          component: 'usePredictDeposit',
          feature: 'Predict',
        },
        context: {
          name: 'usePredictDeposit',
          data: {
            action: 'deposit_navigation',
            method: 'deposit',
            operation: 'financial_operations',
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

      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error('[object Object]'),
        {
          tags: {
            component: 'usePredictDeposit',
            feature: 'Predict',
          },
          context: {
            name: 'usePredictDeposit',
            data: {
              action: 'deposit_navigation',
              method: 'deposit',
              operation: 'financial_operations',
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
      expect(mockLoggerError).toHaveBeenCalled();
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
      expect(mockLoggerError).toHaveBeenCalled();
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
});
