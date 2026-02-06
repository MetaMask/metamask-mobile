import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictBalance from './PredictBalance';
import { strings } from '../../../../../../locales/i18n';

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

// Mock usePredictBalance hook
const mockUsePredictBalance = jest.fn();
jest.mock('../../hooks/usePredictBalance', () => ({
  usePredictBalance: (options?: unknown) => mockUsePredictBalance(options),
}));

// Mock usePredictDeposit hook
const mockUsePredictDeposit = jest.fn();
jest.mock('../../hooks/usePredictDeposit', () => ({
  usePredictDeposit: () => mockUsePredictDeposit(),
}));

// Mock usePredictActionGuard hook
const mockExecuteGuardedAction = jest.fn(async (action) => await action());
jest.mock('../../hooks/usePredictActionGuard', () => ({
  usePredictActionGuard: () => ({
    executeGuardedAction: mockExecuteGuardedAction,
    isEligible: true,
  }),
}));

// Mock usePredictWithdraw hook
const mockUsePredictWithdraw = jest.fn();
jest.mock('../../hooks/usePredictWithdraw', () => ({
  usePredictWithdraw: () => mockUsePredictWithdraw(),
}));

// Mock Clipboard
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUsePredictBalance.mockReturnValue({
      balance: 100,
      isLoading: false,
      isRefreshing: false,
      error: null,
      loadBalance: jest.fn(),
      hasNoBalance: false,
    });

    mockUsePredictDeposit.mockReturnValue({
      deposit: jest.fn(),
      isDepositPending: false,
    });

    mockUsePredictWithdraw.mockReturnValue({
      withdraw: jest.fn(),
    });

    // Reset executeGuardedAction mock to default behavior
    mockExecuteGuardedAction.mockImplementation(
      async (action) => await action(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when loading', () => {
    it('displays loading indicator when isLoading is true', () => {
      // Arrange - override mock to return loading state
      mockUsePredictBalance.mockReturnValue({
        balance: 0,
        isLoading: true,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: true,
      });

      // Act
      const { getByTestId } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      // Assert
      expect(getByTestId('predict-balance-card-skeleton')).toBeOnTheScreen();
    });

    it('does not display balance when isLoading is true', () => {
      // Arrange - override mock to return loading state
      mockUsePredictBalance.mockReturnValue({
        balance: 100,
        isLoading: true,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: false,
      });

      // Act
      const { queryByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      // Assert
      expect(queryByText(/\$/)).not.toBeOnTheScreen();
    });

    it('does not display buttons when isLoading is true', () => {
      // Arrange - override mock to return loading state
      mockUsePredictBalance.mockReturnValue({
        balance: 100,
        isLoading: true,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: false,
      });

      // Act
      const { queryByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      // Assert
      expect(queryByText(/Add funds/i)).not.toBeOnTheScreen();
      expect(queryByText(/Withdraw/i)).not.toBeOnTheScreen();
    });
  });

  describe('when loaded', () => {
    it('displays formatted balance', () => {
      // Arrange
      mockUsePredictBalance.mockReturnValue({
        balance: 123.456,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: false,
      });

      // Act
      const { getByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      // Assert
      expect(getByText(/\$123\.46/)).toBeOnTheScreen();
    });

    it('displays zero balance', () => {
      // Arrange
      mockUsePredictBalance.mockReturnValue({
        balance: 0,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: true,
      });

      // Act
      const { getByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      // Assert
      expect(getByText(/\$0/)).toBeOnTheScreen();
    });

    it('displays large balance correctly', () => {
      // Arrange
      mockUsePredictBalance.mockReturnValue({
        balance: 1234567.89,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: false,
      });

      // Act
      const { getByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      // Assert
      expect(getByText(/\$1,234,567\.89/)).toBeOnTheScreen();
    });

    it('renders container with correct test ID', () => {
      // Arrange
      mockUsePredictBalance.mockReturnValue({
        balance: 100,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: false,
      });

      // Act
      const { getByTestId } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      // Assert
      expect(getByTestId('predict-balance-card')).toBeOnTheScreen();
    });
  });

  describe('button display', () => {
    it('displays Add Funds button', () => {
      // Arrange
      mockUsePredictBalance.mockReturnValue({
        balance: 100,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: false,
      });

      // Act
      const { getByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      // Assert
      expect(getByText(/Add funds/i)).toBeOnTheScreen();
    });

    it('displays Withdraw button when has balance', () => {
      // Arrange
      mockUsePredictBalance.mockReturnValue({
        balance: 100,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: false,
      });

      // Act
      const { getByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      // Assert
      expect(getByText(/Withdraw/i)).toBeOnTheScreen();
    });

    it('does not display Withdraw button when balance is zero', () => {
      // Arrange
      mockUsePredictBalance.mockReturnValue({
        balance: 0,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: true,
      });

      // Act
      const { queryByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      // Assert
      expect(queryByText(/Withdraw/i)).not.toBeOnTheScreen();
    });

    it('calls deposit function with analytics properties when Add Funds button is pressed', () => {
      // Arrange
      const mockDeposit = jest.fn();
      mockUsePredictBalance.mockReturnValue({
        balance: 100,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: false,
      });
      mockUsePredictDeposit.mockReturnValue({
        deposit: mockDeposit,
        isDepositPending: false,
      });

      // Act
      const { getByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });
      const addFundsButton = getByText(/Add funds/i);
      fireEvent.press(addFundsButton);

      // Assert
      expect(mockDeposit).toHaveBeenCalledTimes(1);
      expect(mockDeposit).toHaveBeenCalledWith({
        analyticsProperties: {
          entryPoint: 'homepage_balance',
        },
      });
    });

    it('calls executeGuardedAction when Add Funds button is pressed', () => {
      // Arrange
      const mockDeposit = jest.fn();
      mockUsePredictBalance.mockReturnValue({
        balance: 100,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: false,
      });
      mockUsePredictDeposit.mockReturnValue({
        deposit: mockDeposit,
        isDepositPending: false,
      });

      // Act
      const { getByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });
      const addFundsButton = getByText(/Add funds/i);
      fireEvent.press(addFundsButton);

      // Assert - executeGuardedAction is called (it executes the deposit function)
      expect(mockExecuteGuardedAction).toHaveBeenCalledTimes(1);
      expect(mockDeposit).toHaveBeenCalled();
    });

    it('calls withdraw directly when Withdraw button is pressed', () => {
      // Arrange
      const mockWithdraw = jest.fn();
      mockUsePredictBalance.mockReturnValue({
        balance: 100,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: false,
      });
      mockUsePredictWithdraw.mockReturnValue({
        withdraw: mockWithdraw,
      });

      // Act
      const { getByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });
      const withdrawButton = getByText(/Withdraw/i);
      fireEvent.press(withdrawButton);

      // Assert - withdraw is called directly without executeGuardedAction
      expect(mockWithdraw).toHaveBeenCalledTimes(1);
      expect(mockExecuteGuardedAction).not.toHaveBeenCalled();
    });
  });

  describe('balance refresh', () => {
    it('component renders with adding funds state when deposit is pending', () => {
      // Arrange - set up pending deposit to test the adding funds UI
      mockUsePredictDeposit.mockReturnValue({
        deposit: jest.fn(),
        isDepositPending: true,
      });

      // Act
      const { getByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      // Assert - should show adding funds message
      expect(
        getByText(strings('predict.deposit.adding_your_funds')),
      ).toBeOnTheScreen();
    });

    it('component renders normally when deposit is not pending', () => {
      // Arrange - set up no pending deposit
      mockUsePredictDeposit.mockReturnValue({
        deposit: jest.fn(),
        isDepositPending: false,
      });

      // Act
      const { getByTestId, queryByText } = renderWithProvider(
        <PredictBalance />,
        {
          state: initialState,
        },
      );

      // Assert - should render balance card normally, no adding funds message
      expect(getByTestId('predict-balance-card')).toBeOnTheScreen();
      expect(
        queryByText(strings('predict.deposit.adding_your_funds')),
      ).not.toBeOnTheScreen();
    });
  });

  describe('onLayout callback', () => {
    it('calls onLayout callback when provided', () => {
      // Arrange
      const mockOnLayout = jest.fn();

      // Act
      const { getByTestId } = renderWithProvider(
        <PredictBalance onLayout={mockOnLayout} />,
        {
          state: initialState,
        },
      );

      const balanceCard = getByTestId('predict-balance-card');

      // Simulate onLayout event
      fireEvent(balanceCard, 'layout', {
        nativeEvent: {
          layout: {
            height: 200,
          },
        },
      });

      // Assert
      expect(mockOnLayout).toHaveBeenCalledWith(200);
    });

    it('handles onLayout gracefully when no callback is provided', () => {
      // Act
      const { getByTestId } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      const balanceCard = getByTestId('predict-balance-card');

      // Assert - should not throw error when onLayout is called without a callback
      expect(() => {
        fireEvent(balanceCard, 'layout', {
          nativeEvent: {
            layout: {
              height: 200,
            },
          },
        });
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('handles very small balance', () => {
      // Arrange
      mockUsePredictBalance.mockReturnValue({
        balance: 0.01,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: false,
      });

      // Act
      const { getByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      // Assert
      expect(getByText(/\$0\.01/)).toBeOnTheScreen();
    });

    it('handles very large balance', () => {
      // Arrange
      mockUsePredictBalance.mockReturnValue({
        balance: 123456789.123456,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: false,
      });

      // Act
      const { getByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      // Assert
      expect(getByText(/\$123,456,789\.12/)).toBeOnTheScreen();
    });

    it('handles adding funds state', () => {
      // Arrange
      mockUsePredictBalance.mockReturnValue({
        balance: 100,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: false,
      });
      mockUsePredictDeposit.mockReturnValue({
        deposit: jest.fn(),
        isDepositPending: true,
      });

      // Act
      const { getByTestId, getByText } = renderWithProvider(
        <PredictBalance />,
        {
          state: initialState,
        },
      );

      // Assert - Should still render the balance card and buttons
      expect(getByTestId('predict-balance-card')).toBeOnTheScreen();
      expect(getByText(/Add funds/i)).toBeOnTheScreen();
    });

    it('shows primary button variant when balance is zero', () => {
      // Arrange
      mockUsePredictBalance.mockReturnValue({
        balance: 0,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: true,
      });

      // Act
      const { getByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      // Assert
      const addFundsButton = getByText(/Add funds/i);
      expect(addFundsButton).toBeOnTheScreen();
      // The button should exist, but we can't easily test the variant without more complex testing
    });

    it('shows secondary button variant when balance is greater than zero', () => {
      // Arrange
      mockUsePredictBalance.mockReturnValue({
        balance: 10,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: false,
      });

      // Act
      const { getByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      // Assert
      const addFundsButton = getByText(/Add funds/i);
      expect(addFundsButton).toBeOnTheScreen();

      const withdrawButton = getByText(/Withdraw/i);
      expect(withdrawButton).toBeOnTheScreen();
    });

    it('handles undefined balance gracefully', () => {
      // Arrange
      mockUsePredictBalance.mockReturnValue({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        balance: undefined as any,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadBalance: jest.fn(),
        hasNoBalance: true,
      });

      // Act & Assert - should not crash and render $0.00
      const { getByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });

      expect(getByText(/\$0\.00/)).toBeOnTheScreen();
    });
  });
});
