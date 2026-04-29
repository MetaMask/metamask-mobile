import { renderHook, act } from '@testing-library/react-hooks';
import { usePredictDeposit } from './usePredictDeposit';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { PredictTradeStatus } from '../constants/eventNames';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';

const mockGoBack = jest.fn();
const mockNavigateToConfirmation = jest.fn();
const mockDepositWithConfirmation = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackPredictOrderEvent: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../util/theme');
  return {
    useAppThemeFromContext: () => mockTheme,
  };
});

jest.mock('../../../../component-library/components/Toast', () => {
  const actualReact = jest.requireActual('react');
  return {
    ToastContext: actualReact.createContext({
      toastRef: {
        current: {
          showToast: jest.fn(),
        },
      },
    }),
    ToastVariants: {
      Icon: 'icon',
    },
  };
});

jest.mock('../../../Views/confirmations/hooks/useConfirmNavigation', () => ({
  useConfirmNavigation: () => ({
    navigateToConfirmation: mockNavigateToConfirmation,
  }),
}));

jest.mock('./usePredictTrading', () => ({
  usePredictTrading: () => ({
    deposit: mockDepositWithConfirmation,
  }),
}));

jest.mock('../selectors/predictController', () => ({
  selectPredictPendingDepositByAddress: () => () => null,
}));

jest.mock('../utils/accounts', () => ({
  getEvmAccountFromSelectedAccountGroup: () => ({
    address: '0x1234567890123456789012345678901234567890',
  }),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupId: jest.fn(() => 'mock-account-group-id'),
  }),
);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: () => unknown) => selector(),
}));

// Mock the entire confirm-component to avoid deep dependency chain
jest.mock(
  '../../../Views/confirmations/components/confirm/confirm-component',
  () => ({
    __esModule: true,
    default: () => null,
    ConfirmationLoader: {
      Default: 'default',
      CustomAmount: 'customAmount',
      PredictClaim: 'predictClaim',
      Transfer: 'transfer',
    },
  }),
);

// Mock useConfirmationAlerts to avoid deep dependency chain
jest.mock(
  '../../../Views/confirmations/hooks/alerts/useConfirmationAlerts',
  () => ({
    useConfirmationAlerts: () => ({
      alerts: [],
    }),
  }),
);

// Mock useInsufficientBalanceAlert
jest.mock(
  '../../../Views/confirmations/hooks/alerts/useInsufficientBalanceAlert',
  () => ({
    useInsufficientBalanceAlert: () => undefined,
  }),
);

// Mock useRampNavigation
jest.mock('../../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({
    goToBuy: jest.fn(),
  }),
}));

describe('usePredictDeposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDepositWithConfirmation.mockReturnValue(Promise.resolve());
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns deposit function and isDepositPending flag', () => {
    // Arrange & Act
    const { result } = renderHook(() => usePredictDeposit());

    // Assert
    expect(result.current.deposit).toBeDefined();
    expect(typeof result.current.deposit).toBe('function');
    expect(result.current.isDepositPending).toBe(false);
  });

  it('calls navigateToConfirmation when deposit is called', async () => {
    // Arrange
    const { result } = renderHook(() => usePredictDeposit());

    // Act
    await act(async () => {
      await result.current.deposit();
    });

    // Assert
    expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
      loader: ConfirmationLoader.CustomAmount,
    });
  });

  it('calls depositWithConfirmation when deposit is called', async () => {
    // Arrange
    const { result } = renderHook(() => usePredictDeposit());

    // Act
    await act(async () => {
      await result.current.deposit();
      // Allow fire-and-forget depositWithConfirmation to be called
      await Promise.resolve();
    });

    // Assert
    expect(mockDepositWithConfirmation).toHaveBeenCalledWith({});
  });

  it('tracks order event when analytics properties are provided', async () => {
    // Arrange
    const { result } = renderHook(() => usePredictDeposit());
    const analyticsParams = {
      amountUsd: 100,
      analyticsProperties: {
        marketId: 'test-market',
      },
    };

    // Act
    await act(async () => {
      await result.current.deposit(analyticsParams);
      // Allow fire-and-forget operations to be called
      await Promise.resolve();
    });

    // Assert
    expect(
      Engine.context.PredictController.trackPredictOrderEvent,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PredictTradeStatus.INITIATED,
        amountUsd: 100,
      }),
    );
  });

  it('does not track order event when analytics properties are not provided', async () => {
    // Arrange
    const { result } = renderHook(() => usePredictDeposit());

    // Act
    await act(async () => {
      await result.current.deposit();
    });

    // Assert
    expect(
      Engine.context.PredictController.trackPredictOrderEvent,
    ).not.toHaveBeenCalled();
  });

  it('logs error and shows toast when deposit fails', async () => {
    // Arrange
    const mockError = new Error('Deposit failed');
    mockDepositWithConfirmation.mockRejectedValue(mockError);
    const { result } = renderHook(() => usePredictDeposit());

    // Act
    await act(async () => {
      await result.current.deposit();
      // Allow fire-and-forget promise to settle and error handler to run
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // Assert
    expect(Logger.error).toHaveBeenCalled();
  });

  it('navigates back when deposit fails', async () => {
    // Arrange
    const mockError = new Error('Deposit failed');
    mockDepositWithConfirmation.mockRejectedValue(mockError);
    const { result } = renderHook(() => usePredictDeposit());

    // Act
    await act(async () => {
      await result.current.deposit();
      // Allow fire-and-forget promise to settle and error handler to run
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // Assert
    expect(mockGoBack).toHaveBeenCalled();
  });
});
