import { renderHook } from '@testing-library/react-native';
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

describe('usePredictBuyAvailableBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPredictBalanceSelected = true;
    mockBalance = 100;
    mockIsBalanceLoading = false;
    mockPayToken = null;
  });

  describe('availableBalance', () => {
    it('returns Predict balance when isPredictBalanceSelected is true', () => {
      mockIsPredictBalanceSelected = true;
      mockBalance = 250.5;

      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      expect(result.current.availableBalance).toBe(250.5);
    });

    it('returns predict balance plus payToken balanceUsd when isPredictBalanceSelected is false', () => {
      mockIsPredictBalanceSelected = false;
      mockBalance = 100;
      mockPayToken = { balanceUsd: 150.75 };

      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      expect(result.current.availableBalance).toBe(250.75);
    });

    it('returns predict balance when payToken has no balanceUsd and isPredictBalanceSelected is false', () => {
      mockIsPredictBalanceSelected = false;
      mockBalance = 100;
      mockPayToken = {};

      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      expect(result.current.availableBalance).toBe(100);
    });

    it('falls back to Predict balance when payToken is null', () => {
      mockIsPredictBalanceSelected = false;
      mockPayToken = null;

      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      expect(result.current.availableBalance).toBe(100);
    });
  });

  describe('isBalanceLoading', () => {
    it('returns isBalanceLoading from usePredictBalance', () => {
      mockIsBalanceLoading = true;

      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      expect(result.current.isBalanceLoading).toBe(true);
    });

    it('returns false when balance is not loading', () => {
      mockIsBalanceLoading = false;

      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      expect(result.current.isBalanceLoading).toBe(false);
    });
  });
});
