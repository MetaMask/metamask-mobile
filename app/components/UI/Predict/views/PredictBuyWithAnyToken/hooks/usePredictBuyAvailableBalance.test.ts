import { renderHook } from '@testing-library/react-native';
import { formatPrice } from '../../../utils/format';
import { usePredictBuyAvailableBalance } from './usePredictBuyAvailableBalance';

let mockIsPredictBalanceSelected = true;
let mockBalance = 100;
let mockIsBalanceLoading = false;
let mockPayToken: { balanceUsd?: number } | null = null;

jest.mock('../../../hooks/usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    isPredictBalanceSelected: mockIsPredictBalanceSelected,
  }),
}));

jest.mock('../../../hooks/usePredictBalance', () => ({
  usePredictBalance: () => ({
    data: mockBalance,
    isLoading: mockIsBalanceLoading,
  }),
}));

jest.mock(
  '../../../../../Views/confirmations/hooks/pay/useTransactionPayToken',
  () => ({
    useTransactionPayToken: () => ({
      payToken: mockPayToken,
    }),
  }),
);

jest.mock('../../../utils/format', () => ({
  formatPrice: jest.fn((value: number) => `$${value.toFixed(2)}`),
}));

describe('usePredictBuyAvailableBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPredictBalanceSelected = true;
    mockBalance = 100;
    mockIsBalanceLoading = false;
    mockPayToken = null;
  });

  describe('availableBalance', () => {
    it('returns formatted Predict balance when isPredictBalanceSelected is true', () => {
      // Arrange
      mockIsPredictBalanceSelected = true;
      mockBalance = 250.5;

      // Act
      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      // Assert
      expect(result.current.availableBalance).toBe('$250.50');
    });

    it('returns formatted payToken balanceUsd when isPredictBalanceSelected is false', () => {
      // Arrange
      mockIsPredictBalanceSelected = false;
      mockPayToken = { balanceUsd: 150.75 };

      // Act
      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      // Assert
      expect(result.current.availableBalance).toBe('$150.75');
    });

    it('returns "$0.00" when payToken has no balanceUsd and isPredictBalanceSelected is false', () => {
      // Arrange
      mockIsPredictBalanceSelected = false;
      mockPayToken = {};

      // Act
      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      // Assert
      expect(result.current.availableBalance).toBe('$0.00');
    });

    it('returns "$0.00" when payToken is null and isPredictBalanceSelected is false', () => {
      // Arrange
      mockIsPredictBalanceSelected = false;
      mockPayToken = null;

      // Act
      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      // Assert
      expect(result.current.availableBalance).toBe('$0.00');
    });
  });

  describe('isBalanceLoading', () => {
    it('returns isBalanceLoading from usePredictBalance', () => {
      // Arrange
      mockIsBalanceLoading = true;

      // Act
      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      // Assert
      expect(result.current.isBalanceLoading).toBe(true);
    });

    it('returns false when balance is not loading', () => {
      // Arrange
      mockIsBalanceLoading = false;

      // Act
      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      // Assert
      expect(result.current.isBalanceLoading).toBe(false);
    });
  });

  describe('formatPrice', () => {
    it('calls formatPrice with correct options when using Predict balance', () => {
      // Arrange
      mockIsPredictBalanceSelected = true;
      mockBalance = 500;

      // Act
      renderHook(() => usePredictBuyAvailableBalance());

      // Assert
      expect(formatPrice).toHaveBeenCalledWith(500, {
        minimumDecimals: 2,
        maximumDecimals: 2,
      });
    });

    it('does not call formatPrice when using payToken balance', () => {
      // Arrange
      mockIsPredictBalanceSelected = false;
      mockPayToken = { balanceUsd: 100 };

      // Act
      renderHook(() => usePredictBuyAvailableBalance());

      // Assert
      expect(formatPrice).not.toHaveBeenCalled();
    });
  });
});
