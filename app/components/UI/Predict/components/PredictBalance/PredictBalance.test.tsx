import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictBalance from './PredictBalance';

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
  PredictDepositStatus: {
    IDLE: 'IDLE',
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    FAILED: 'FAILED',
  },
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
      status: 'IDLE',
    });
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
      expect(getByText(/\$0\.00/)).toBeOnTheScreen();
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

    it('calls deposit function when Add Funds button is pressed', () => {
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
        status: 'IDLE',
      });

      // Act
      const { getByText } = renderWithProvider(<PredictBalance />, {
        state: initialState,
      });
      const addFundsButton = getByText(/Add funds/i);
      fireEvent.press(addFundsButton);

      // Assert
      expect(mockDeposit).toHaveBeenCalledTimes(1);
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
        status: 'PENDING',
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
  });
});
