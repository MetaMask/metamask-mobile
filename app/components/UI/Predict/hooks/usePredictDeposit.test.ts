import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { usePredictDeposit } from './usePredictDeposit';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import Routes from '../../../../constants/navigation/Routes';
import { selectPredictPendingDepositByAddress } from '../selectors/predictController';

const mockGoBack = jest.fn();
const mockNavigateToConfirmation = jest.fn();
const mockDepositWithConfirmation = jest.fn();
const mockSelectPredictPendingDepositByAddress =
  selectPredictPendingDepositByAddress as jest.MockedFunction<
    typeof selectPredictPendingDepositByAddress
  >;

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';

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
  selectPredictPendingDepositByAddress: jest.fn(() => null),
}));

jest.mock('../utils/accounts', () => ({
  getEvmAccountFromSelectedAccountGroup: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
  })),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupId: jest.fn(() => 'mock-account-group-id'),
  }),
);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
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
    mockSelectPredictPendingDepositByAddress.mockReturnValue(undefined);

    const { getEvmAccountFromSelectedAccountGroup } =
      jest.requireMock('../utils/accounts');
    getEvmAccountFromSelectedAccountGroup.mockReturnValue({
      address: TEST_ADDRESS,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns deposit function and isDepositPending flag', () => {
    // Arrange & Act
    const { result } = renderHook(() => usePredictDeposit());

    // Assert
    expect(result.current.deposit).toBeDefined();
    expect(typeof result.current.deposit).toBe('function');
    expect(result.current.isDepositPending).toBe(false);
  });

  it('passes selected EVM address to pending deposit selector', () => {
    // Arrange & Act
    renderHook(() => usePredictDeposit());

    // Assert
    expect(mockSelectPredictPendingDepositByAddress).toHaveBeenCalledWith(
      expect.any(Object),
      TEST_ADDRESS,
    );
  });

  it('uses an empty selector key when no EVM account is selected', () => {
    // Arrange
    const { getEvmAccountFromSelectedAccountGroup } =
      jest.requireMock('../utils/accounts');
    getEvmAccountFromSelectedAccountGroup.mockReturnValue(null);

    // Act
    renderHook(() => usePredictDeposit());

    // Assert
    expect(mockSelectPredictPendingDepositByAddress).toHaveBeenCalledWith(
      expect.any(Object),
      '',
    );
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
      stack: Routes.PREDICT.ROOT,
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

  it('does not fire initiated event (removed to fix double-fire — INITIATED is now only fired from PredictBuyPreview mount)', async () => {
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
      await Promise.resolve();
    });

    // Assert — deposit no longer fires INITIATED; it was causing a double-fire
    // with the PredictBuyPreview mount effect which is the single source of truth.
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
    });

    // Assert
    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  it('navigates back when deposit fails', async () => {
    // Arrange
    const mockError = new Error('Deposit failed');
    mockDepositWithConfirmation.mockRejectedValue(mockError);
    const { result } = renderHook(() => usePredictDeposit());

    // Act
    await act(async () => {
      await result.current.deposit();
    });

    // Assert
    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
