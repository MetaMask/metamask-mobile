import { renderHook } from '@testing-library/react-native';
import { usePredictBuyConditions } from './usePredictBuyConditions';
import { ActiveOrderState, OrderPreview } from '../../../types';

let mockIsBalanceLoading = false;
let mockAvailableBalance = 100;
let mockActiveOrder: { state?: string } | null = null;
let mockPayTotals: Record<string, unknown> | null = null;
let mockIsPayTotalsLoading = false;
let mockIsPayQuoteLoading = false;
let mockQuotes:
  | {
      request?: { sourceTokenAddress?: string; sourceChainId?: string };
    }[]
  | null = null;
let mockRequiredTokens: { address: string; chainId: string }[] | null = null;
let mockIsPredictBalanceSelected = true;
let mockSelectedPaymentToken: {
  address?: string;
  chainId?: string;
} | null = null;
let mockIsDepositPending = false;
let mockInsufficientPayTokenBalanceAlert: { message: string } | null = null;
let mockPredictBalance = 0;
const mockResetSelectedPaymentToken = jest.fn();

jest.mock('./usePredictBuyAvailableBalance', () => ({
  usePredictBuyAvailableBalance: () => ({
    isBalanceLoading: mockIsBalanceLoading,
    availableBalance: mockAvailableBalance,
  }),
}));

jest.mock('../../../hooks/usePredictActiveOrder', () => ({
  usePredictActiveOrder: () => ({
    activeOrder: mockActiveOrder,
  }),
}));

jest.mock('../../../hooks/usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    isPredictBalanceSelected: mockIsPredictBalanceSelected,
    selectedPaymentToken: mockSelectedPaymentToken,
    resetSelectedPaymentToken: mockResetSelectedPaymentToken,
  }),
}));

jest.mock('../../../hooks/usePredictBalance', () => ({
  usePredictBalance: () => ({
    data: mockPredictBalance,
  }),
}));

jest.mock('../../../hooks/usePredictDeposit', () => ({
  usePredictDeposit: () => ({
    deposit: jest.fn(),
    isDepositPending: mockIsDepositPending,
  }),
}));

jest.mock(
  '../../../../../Views/confirmations/hooks/alerts/useInsufficientPayTokenBalanceAlert',
  () => ({
    useInsufficientPayTokenBalanceAlert: () => [
      mockInsufficientPayTokenBalanceAlert,
    ],
  }),
);

jest.mock(
  '../../../../../Views/confirmations/hooks/pay/useTransactionPayData',
  () => ({
    useTransactionPayTotals: () => mockPayTotals,
    useIsTransactionPayLoading: () => mockIsPayTotalsLoading,
    useIsTransactionPayQuoteLoading: () => mockIsPayQuoteLoading,
    useTransactionPayQuotes: () => mockQuotes,
    useTransactionPayRequiredTokens: () => mockRequiredTokens,
  }),
);

const defaultParams = {
  currentValue: 10,
  depositFee: 0,
  preview: {
    rateLimited: false,
    maxAmountSpent: 10,
    fees: { totalFee: 0.5 },
  } as OrderPreview | null,
  isPreviewCalculating: false,
  isUserInputChange: false,
  isConfirming: false,
  totalPayForPredictBalance: 0,
  isInputFocused: false,
};

describe('usePredictBuyConditions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBalanceLoading = false;
    mockAvailableBalance = 100;
    mockActiveOrder = null;
    mockPayTotals = null;
    mockIsPayTotalsLoading = false;
    mockIsPayQuoteLoading = false;
    mockQuotes = null;
    mockRequiredTokens = null;
    mockIsPredictBalanceSelected = true;
    mockSelectedPaymentToken = null;
    mockIsDepositPending = false;
    mockInsufficientPayTokenBalanceAlert = null;
    mockPredictBalance = 0;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isBelowMinimum', () => {
    it('returns true when currentValue is between 0 and MINIMUM_BET', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 0.5 }),
      );

      expect(result.current.isBelowMinimum).toBe(true);
    });

    it('returns false when currentValue equals MINIMUM_BET', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 1 }),
      );

      expect(result.current.isBelowMinimum).toBe(false);
    });

    it('returns false when currentValue is 0', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 0 }),
      );

      expect(result.current.isBelowMinimum).toBe(false);
    });

    it('returns false when currentValue is above MINIMUM_BET', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 10 }),
      );

      expect(result.current.isBelowMinimum).toBe(false);
    });
  });

  describe('isInsufficientBalance', () => {
    it('returns true when currentValue exceeds maxBetAmount', () => {
      mockAvailableBalance = 5;

      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          currentValue: 10,
        }),
      );

      expect(result.current.isInsufficientBalance).toBe(true);
    });

    it('returns false when currentValue is within maxBetAmount', () => {
      mockAvailableBalance = 100;

      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          currentValue: 10,
        }),
      );

      expect(result.current.isInsufficientBalance).toBe(false);
    });

    it('returns false when currentValue equals maxBetAmount', () => {
      mockAvailableBalance = 10.5;

      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          currentValue: 10,
          preview: {
            rateLimited: false,
            maxAmountSpent: 10,
            fees: { totalFee: 0.5, totalFeePercentage: 5 },
          } as OrderPreview,
        }),
      );

      expect(result.current.isInsufficientBalance).toBe(false);
    });

    it('returns false when currentValue is 0', () => {
      mockAvailableBalance = 0;

      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          currentValue: 0,
        }),
      );

      expect(result.current.isInsufficientBalance).toBe(false);
    });
  });

  describe('maxBetAmount', () => {
    it('returns balance divided by (1 + feeRate) when fees apply', () => {
      mockAvailableBalance = 104;

      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          preview: {
            rateLimited: false,
            fees: { totalFeePercentage: 4 },
          } as OrderPreview,
        }),
      );

      expect(result.current.maxBetAmount).toBe(100);
    });

    it('returns full available balance when fee rate is 0', () => {
      mockAvailableBalance = 50;

      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          preview: {
            rateLimited: false,
            fees: { totalFeePercentage: 0 },
          } as OrderPreview,
        }),
      );

      expect(result.current.maxBetAmount).toBe(50);
    });

    it('returns full available balance when preview has no fees', () => {
      mockAvailableBalance = 50;

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.maxBetAmount).toBe(50);
    });
  });

  describe('isRateLimited', () => {
    it('returns true when preview.rateLimited is true', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          preview: { rateLimited: true } as OrderPreview,
        }),
      );

      expect(result.current.isRateLimited).toBe(true);
    });

    it('returns false when preview is null', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, preview: null }),
      );

      expect(result.current.isRateLimited).toBe(false);
    });

    it('returns false when preview.rateLimited is false', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          preview: { rateLimited: false } as OrderPreview,
        }),
      );

      expect(result.current.isRateLimited).toBe(false);
    });
  });

  describe('canPlaceBet', () => {
    it('returns true when all conditions are favorable', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.canPlaceBet).toBe(true);
    });

    it('returns false when isBelowMinimum', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 0.5 }),
      );

      expect(result.current.canPlaceBet).toBe(false);
    });

    it('returns false when preview is null', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, preview: null }),
      );

      expect(result.current.canPlaceBet).toBe(false);
    });

    it('returns false when isBalanceLoading is true', () => {
      mockIsBalanceLoading = true;

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.canPlaceBet).toBe(false);
    });

    it('returns false when isConfirming is true', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, isConfirming: true }),
      );

      expect(result.current.canPlaceBet).toBe(false);
    });

    it('returns false when isInsufficientBalance', () => {
      mockAvailableBalance = 5;

      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 10.5 }),
      );

      expect(result.current.canPlaceBet).toBe(false);
    });

    it('returns false when isRateLimited', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          preview: { rateLimited: true } as OrderPreview,
        }),
      );

      expect(result.current.canPlaceBet).toBe(false);
    });

    it('returns false when isPayFeesLoading is true', () => {
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xabc', chainId: '0x1' };
      mockIsPayTotalsLoading = true;

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.canPlaceBet).toBe(false);
    });

    it('returns false when external payment token balance is insufficient', () => {
      mockIsPredictBalanceSelected = false;
      mockInsufficientPayTokenBalanceAlert = {
        message: 'Insufficient payment token balance',
      };

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.canPlaceBet).toBe(false);
    });
  });

  describe('isPayFeesLoading', () => {
    it('returns false when isPredictBalanceSelected is true', () => {
      mockIsPredictBalanceSelected = true;

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isPayFeesLoading).toBe(false);
    });

    it('returns true when external token selected and isPayTotalsLoading', () => {
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xabc', chainId: '0x1' };
      mockIsPayTotalsLoading = true;

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isPayFeesLoading).toBe(true);
    });

    it('returns true when external token selected and isPayQuoteLoading', () => {
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xabc', chainId: '0x1' };
      mockIsPayQuoteLoading = true;

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isPayFeesLoading).toBe(true);
    });

    it('returns false when activeOrder state does not affect pay fees loading', () => {
      mockActiveOrder = { state: ActiveOrderState.DEPOSITING };

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isPayFeesLoading).toBe(false);
    });

    it('returns false when source amount has not been set yet', () => {
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xabc', chainId: '0x1' };

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isPayFeesLoading).toBe(false);
    });
  });

  describe('isBalancePulsing', () => {
    it('returns true when deposit is pending and predict balance is selected', () => {
      mockIsDepositPending = true;
      mockIsPredictBalanceSelected = true;

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isBalancePulsing).toBe(true);
    });

    it('returns false when deposit is pending but predict balance is not selected', () => {
      mockIsDepositPending = true;
      mockIsPredictBalanceSelected = false;

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isBalancePulsing).toBe(false);
    });

    it('returns false when predict balance is selected but no deposit is pending', () => {
      mockIsDepositPending = false;
      mockIsPredictBalanceSelected = true;

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isBalancePulsing).toBe(false);
    });

    it('returns false when neither condition is met', () => {
      mockIsDepositPending = false;
      mockIsPredictBalanceSelected = false;

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isBalancePulsing).toBe(false);
    });
  });

  describe('isUserChangeTriggeringCalculation', () => {
    it('returns true when both isPreviewCalculating and isUserInputChange are true', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          isPreviewCalculating: true,
          isUserInputChange: true,
        }),
      );

      expect(result.current.isUserChangeTriggeringCalculation).toBe(true);
    });

    it('returns false when only isPreviewCalculating is true', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          isPreviewCalculating: true,
          isUserInputChange: false,
        }),
      );

      expect(result.current.isUserChangeTriggeringCalculation).toBe(false);
    });

    it('returns false when only isUserInputChange is true', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          isPreviewCalculating: false,
          isUserInputChange: true,
        }),
      );

      expect(result.current.isUserChangeTriggeringCalculation).toBe(false);
    });
  });

  describe('selected payment token reset effect', () => {
    it('resets the selected token when predict balance covers the total and input is not focused', () => {
      mockPredictBalance = 20;
      mockIsPredictBalanceSelected = false;

      renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          totalPayForPredictBalance: 20,
          isInputFocused: false,
        }),
      );

      expect(mockResetSelectedPaymentToken).toHaveBeenCalledTimes(1);
    });

    it('does not reset the selected token while the input is focused', () => {
      mockPredictBalance = 20;
      mockIsPredictBalanceSelected = false;

      renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          totalPayForPredictBalance: 20,
          isInputFocused: true,
        }),
      );

      expect(mockResetSelectedPaymentToken).not.toHaveBeenCalled();
    });

    it('does not reset the selected token when predict balance is already selected', () => {
      mockPredictBalance = 20;
      mockIsPredictBalanceSelected = true;

      renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          totalPayForPredictBalance: 20,
          isInputFocused: false,
        }),
      );

      expect(mockResetSelectedPaymentToken).not.toHaveBeenCalled();
    });

    it('does not reset the selected token when predict balance does not cover the total', () => {
      mockPredictBalance = 10;
      mockIsPredictBalanceSelected = false;

      renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          totalPayForPredictBalance: 20,
          isInputFocused: false,
        }),
      );

      expect(mockResetSelectedPaymentToken).not.toHaveBeenCalled();
    });

    it('does not reset the selected token when totalPayForPredictBalance is zero', () => {
      mockPredictBalance = 0.81;
      mockIsPredictBalanceSelected = false;

      renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          totalPayForPredictBalance: 0,
          isInputFocused: false,
        }),
      );

      expect(mockResetSelectedPaymentToken).not.toHaveBeenCalled();
    });
  });
});
