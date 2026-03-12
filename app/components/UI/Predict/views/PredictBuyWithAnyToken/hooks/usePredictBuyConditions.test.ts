import { renderHook } from '@testing-library/react-native';
import { usePredictBuyConditions } from './usePredictBuyConditions';
import { ActiveOrderState, OrderPreview } from '../../../types';

let mockIsBalanceLoading = false;
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

jest.mock('./usePredictBuyAvailableBalance', () => ({
  usePredictBuyAvailableBalance: () => ({
    isBalanceLoading: mockIsBalanceLoading,
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
  }),
}));

jest.mock('../../../hooks/usePredictDeposit', () => ({
  usePredictDeposit: () => ({
    deposit: jest.fn(),
    isDepositPending: mockIsDepositPending,
  }),
}));

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
  preview: { rateLimited: false } as OrderPreview | null,
  isPreviewCalculating: false,
  isPlaceOrderLoading: false,
  isUserInputChange: false,
  isConfirming: false,
};

describe('usePredictBuyConditions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBalanceLoading = false;
    mockActiveOrder = null;
    mockPayTotals = null;
    mockIsPayTotalsLoading = false;
    mockIsPayQuoteLoading = false;
    mockQuotes = null;
    mockRequiredTokens = null;
    mockIsPredictBalanceSelected = true;
    mockSelectedPaymentToken = null;
    mockIsDepositPending = false;
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

  describe('isPlacingOrder', () => {
    it('returns true when activeOrder state is PLACING_ORDER', () => {
      mockActiveOrder = { state: ActiveOrderState.PLACING_ORDER };

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isPlacingOrder).toBe(true);
    });

    it('returns true when isPlaceOrderLoading is true', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          isPlaceOrderLoading: true,
        }),
      );

      expect(result.current.isPlacingOrder).toBe(true);
    });

    it('returns true when activeOrder state is DEPOSITING', () => {
      mockActiveOrder = { state: ActiveOrderState.DEPOSITING };

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isPlacingOrder).toBe(true);
    });

    it('returns false when none of the placing conditions are met', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isPlacingOrder).toBe(false);
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

    it('returns false when isPlaceOrderLoading is true', () => {
      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          isPlaceOrderLoading: true,
        }),
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

    it('returns true when activeOrder state is REDIRECTING', () => {
      mockActiveOrder = { state: ActiveOrderState.REDIRECTING };

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isPayFeesLoading).toBe(true);
    });
  });

  describe('isQuotesStale', () => {
    it('returns false when isPredictBalanceSelected', () => {
      mockIsPredictBalanceSelected = true;

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isPayFeesLoading).toBe(false);
    });

    it('returns false when no selectedPaymentToken', () => {
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = null;

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isPayFeesLoading).toBe(false);
    });

    it('returns true when quote sourceTokenAddress differs from selectedPaymentToken', () => {
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xabc', chainId: '0x1' };
      mockQuotes = [
        { request: { sourceTokenAddress: '0xdef', sourceChainId: '0x1' } },
      ];
      mockPayTotals = { total: '100' };

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isPayFeesLoading).toBe(true);
    });

    it('returns true when quote sourceChainId differs from selectedPaymentToken', () => {
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xabc', chainId: '0x1' };
      mockQuotes = [
        { request: { sourceTokenAddress: '0xabc', sourceChainId: '0x89' } },
      ];
      mockPayTotals = { total: '100' };

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isPayFeesLoading).toBe(true);
    });

    it('returns false when requiredTokens include selected token', () => {
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xabc', chainId: '0x1' };
      mockQuotes = [];
      mockPayTotals = { total: '100' };
      mockRequiredTokens = [{ address: '0xABC', chainId: '0x1' }];

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
});
