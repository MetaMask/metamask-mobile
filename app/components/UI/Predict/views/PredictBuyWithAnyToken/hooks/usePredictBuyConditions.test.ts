import { act, renderHook } from '@testing-library/react-native';
import { usePredictBuyConditions } from './usePredictBuyConditions';
import { ActiveOrderState, OrderPreview } from '../../../types';
import {
  PAYMENT_SELECTOR_NAVIGATION_SAFETY_UNLOCK_MS,
  PAYMENT_SELECTOR_NAVIGATION_UNLOCK_DELAY_MS,
} from '../../../constants/transactions';

let mockIsBalanceLoading = false;
let mockAvailableBalance = 100;
let mockActiveOrder: { state?: string } | null = null;
let mockPayTotals: Record<string, unknown> | null = null;
let mockIsPayTotalsLoading = false;
let mockIsPayQuoteLoading = false;
let mockRequiredTokens: { address: string; chainId: string }[] | null = null;
let mockIsPredictBalanceSelected = true;
let mockSelectedPaymentToken: {
  address: string;
  chainId?: string;
} | null = null;
let mockIsDepositPending = false;
let mockAvailableTokens: {
  isSelected?: boolean;
  disabled?: boolean;
  fiat?: { balance?: number };
}[] = [];

let mockPredictBalance = 0;
let mockQuotes: unknown[] = [];
const mockResetSelectedPaymentToken = jest.fn();
const mockNavigationListeners: Record<string, Set<() => void>> = {};
const mockAddListener = jest.fn((eventName: string, callback: () => void) => {
  if (!mockNavigationListeners[eventName]) {
    mockNavigationListeners[eventName] = new Set();
  }

  mockNavigationListeners[eventName].add(callback);

  return () => {
    mockNavigationListeners[eventName]?.delete(callback);
  };
});
const mockEmitNavigationEvent = (eventName: string) => {
  mockNavigationListeners[eventName]?.forEach((callback) => callback());
};
const mockNavigation = {
  addListener: mockAddListener,
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

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
  '../../../../../Views/confirmations/hooks/pay/useTransactionPayData',
  () => ({
    useTransactionPayTotals: () => mockPayTotals,
    useIsTransactionPayLoading: () => mockIsPayTotalsLoading,
    useIsTransactionPayQuoteLoading: () => mockIsPayQuoteLoading,
    useTransactionPayRequiredTokens: () => mockRequiredTokens,
    useTransactionPayQuotes: () => mockQuotes,
  }),
);

jest.mock(
  '../../../../../Views/confirmations/hooks/pay/useTransactionPayAvailableTokens',
  () => ({
    useTransactionPayAvailableTokens: () => ({
      availableTokens: mockAvailableTokens,
      hasTokens: mockAvailableTokens.length > 0,
    }),
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
  totalPayForPredictBalance: 10.5,
  hasBlockingPayAlerts: false,
};

describe('usePredictBuyConditions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockNavigationListeners).forEach((eventName) => {
      delete mockNavigationListeners[eventName];
    });
    mockIsBalanceLoading = false;
    mockAvailableBalance = 100;
    mockActiveOrder = null;
    mockPayTotals = null;
    mockIsPayTotalsLoading = false;
    mockIsPayQuoteLoading = false;
    mockRequiredTokens = null;
    mockIsPredictBalanceSelected = true;
    mockSelectedPaymentToken = null;
    mockIsDepositPending = false;
    mockAvailableTokens = [];
    mockPredictBalance = 0;
    mockQuotes = [];
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('payment selector navigation lock', () => {
    it('locks immediately and unlocks one second after focus returns from the selector', () => {
      jest.useFakeTimers();

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isPaymentSelectorNavigationLocked).toBe(false);
      expect(result.current.canPlaceBet).toBe(true);

      act(() => {
        result.current.lockPaymentSelectorNavigation();
      });

      expect(result.current.isPaymentSelectorNavigationLocked).toBe(true);
      expect(result.current.canPlaceBet).toBe(false);

      act(() => {
        mockEmitNavigationEvent('blur');
        mockEmitNavigationEvent('focus');
      });

      act(() => {
        jest.advanceTimersByTime(
          PAYMENT_SELECTOR_NAVIGATION_UNLOCK_DELAY_MS - 1,
        );
      });

      expect(result.current.isPaymentSelectorNavigationLocked).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(result.current.isPaymentSelectorNavigationLocked).toBe(false);
      expect(result.current.canPlaceBet).toBe(true);
    });

    it('unlocks after the safety timeout when navigation events do not fire', () => {
      jest.useFakeTimers();

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      act(() => {
        result.current.lockPaymentSelectorNavigation();
      });

      expect(result.current.isPaymentSelectorNavigationLocked).toBe(true);
      expect(result.current.canPlaceBet).toBe(false);

      act(() => {
        jest.advanceTimersByTime(
          PAYMENT_SELECTOR_NAVIGATION_SAFETY_UNLOCK_MS - 1,
        );
      });

      expect(result.current.isPaymentSelectorNavigationLocked).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(result.current.isPaymentSelectorNavigationLocked).toBe(false);
      expect(result.current.canPlaceBet).toBe(true);
    });
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
      mockIsPayTotalsLoading = true;

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.canPlaceBet).toBe(false);
    });

    it('returns false when external payment token balance is insufficient', () => {
      mockIsPredictBalanceSelected = false;

      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          hasBlockingPayAlerts: true,
        }),
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
      mockIsPayTotalsLoading = true;

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isPayFeesLoading).toBe(true);
    });

    it('returns true when external token selected and isPayQuoteLoading', () => {
      mockIsPredictBalanceSelected = false;
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

    it('returns false when external token selected but no loading is in progress', () => {
      mockIsPredictBalanceSelected = false;

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

  describe('isCurrentTokenInsufficient', () => {
    it('is false when neither isInsufficientBalance nor hasBlockingPayAlerts', () => {
      mockAvailableBalance = 100;

      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          currentValue: 10,
          hasBlockingPayAlerts: false,
        }),
      );

      expect(result.current.isCurrentTokenInsufficient).toBe(false);
    });

    it('is true when Predict balance is insufficient (isInsufficientBalance)', () => {
      mockAvailableBalance = 5;

      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          currentValue: 10,
          hasBlockingPayAlerts: false,
        }),
      );

      expect(result.current.isCurrentTokenInsufficient).toBe(true);
    });

    it('is false when pay fees are still loading even if blocking alerts are present', () => {
      mockIsPredictBalanceSelected = false;
      mockIsPayTotalsLoading = true;

      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          currentValue: 1,
          hasBlockingPayAlerts: true,
        }),
      );

      // While quotes are fetching, transient alerts must not surface the CTA
      expect(result.current.isCurrentTokenInsufficient).toBe(false);
    });

    it('is false when pay quote is loading even if blocking alerts are present', () => {
      mockIsPredictBalanceSelected = false;
      mockIsPayQuoteLoading = true;

      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          currentValue: 1,
          hasBlockingPayAlerts: true,
        }),
      );

      expect(result.current.isCurrentTokenInsufficient).toBe(false);
    });

    it('is false for ERC20 while the pay system is still settling (pre-loading gap)', () => {
      // Simulate a token just selected with no loading yet — the settling guard
      // keeps the CTA hidden during the window before isLoading = true fires.
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xDAI', chainId: '1' };
      mockIsPayTotalsLoading = false;
      mockIsPayQuoteLoading = false;

      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          currentValue: 1,
          hasBlockingPayAlerts: true,
        }),
      );

      expect(result.current.isCurrentTokenInsufficient).toBe(false);
    });

    it('is true for Predict balance even when settling guard is not engaged', () => {
      // Predict balance never goes through the quote pipeline, so settling
      // is always false when isPredictBalanceSelected = true.
      mockIsPredictBalanceSelected = true;
      mockAvailableBalance = 5;

      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          currentValue: 10,
        }),
      );

      expect(result.current.isCurrentTokenInsufficient).toBe(true);
    });
  });

  describe('hasAlternativeBalance', () => {
    it('is false when currentValue is 0', () => {
      mockAvailableTokens = [
        { isSelected: false, disabled: false, fiat: { balance: 50 } },
      ];

      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 0 }),
      );

      expect(result.current.hasAlternativeBalance).toBe(false);
    });

    it('is true when Predict balance selected and an ERC20 token covers the bet', () => {
      mockIsPredictBalanceSelected = true;
      mockAvailableTokens = [
        { isSelected: false, disabled: false, fiat: { balance: 50 } },
      ];

      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 10 }),
      );

      expect(result.current.hasAlternativeBalance).toBe(true);
    });

    it('is false when Predict balance selected and no ERC20 token has sufficient USD balance', () => {
      mockIsPredictBalanceSelected = true;
      mockAvailableTokens = [
        { isSelected: false, disabled: false, fiat: { balance: 5 } },
      ];

      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 10 }),
      );

      expect(result.current.hasAlternativeBalance).toBe(false);
    });

    it('is true when external token selected and fee-adjusted Predict balance covers the bet', () => {
      mockIsPredictBalanceSelected = false;
      mockPredictBalance = 50;
      mockAvailableTokens = [];

      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 10 }),
      );

      expect(result.current.hasAlternativeBalance).toBe(true);
    });

    it('is true when external token selected and fee-adjusted Predict balance covers the bet with fees applied', () => {
      mockIsPredictBalanceSelected = false;
      // predictBalance = 10.5, feeRate = 5%, predictMaxBetAmount = floor(10.5 / 1.05 * 100) / 100 = 10
      mockPredictBalance = 10.5;
      mockAvailableTokens = [];

      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          currentValue: 10,
          preview: {
            rateLimited: false,
            fees: { totalFeePercentage: 5 },
          } as OrderPreview,
        }),
      );

      expect(result.current.hasAlternativeBalance).toBe(true);
    });

    it('is false when external token selected and fee-adjusted Predict balance is insufficient', () => {
      mockIsPredictBalanceSelected = false;
      // predictBalance = 10, feeRate = 5%, predictMaxBetAmount = floor(10 / 1.05 * 100) / 100 = 9.52
      mockPredictBalance = 10;
      mockAvailableTokens = [];

      const { result } = renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          currentValue: 10,
          preview: {
            rateLimited: false,
            fees: { totalFeePercentage: 5 },
          } as OrderPreview,
        }),
      );

      expect(result.current.hasAlternativeBalance).toBe(false);
    });

    it('is false when external token selected and neither Predict balance nor ERC20 covers the bet', () => {
      mockIsPredictBalanceSelected = false;
      mockPredictBalance = 5;
      mockAvailableTokens = [
        { isSelected: false, disabled: false, fiat: { balance: 3 } },
      ];

      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 10 }),
      );

      expect(result.current.hasAlternativeBalance).toBe(false);
    });

    it('skips disabled tokens when evaluating alternatives', () => {
      mockIsPredictBalanceSelected = true;
      mockAvailableTokens = [
        { isSelected: false, disabled: true, fiat: { balance: 50 } },
      ];

      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 10 }),
      );

      expect(result.current.hasAlternativeBalance).toBe(false);
    });
  });

  describe('isPaySystemSettling', () => {
    it('is false when Predict balance is selected', () => {
      mockIsPredictBalanceSelected = true;
      mockSelectedPaymentToken = null;

      const { result } = renderHook(() =>
        usePredictBuyConditions(defaultParams),
      );

      expect(result.current.isPaySystemSettling).toBe(false);
    });

    it('is true immediately after an ERC20 token is selected (synchronous — no 1-frame gap)', () => {
      // isPaySystemSettling is derived synchronously from lastSettledTokenKey,
      // so it is true from the very first render after the token identity changes.
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xDAI', chainId: '1' };
      mockIsPayTotalsLoading = false;

      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 1 }),
      );

      expect(result.current.isPaySystemSettling).toBe(true);
    });

    it('remains true while pay fees are loading', () => {
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xDAI', chainId: '1' };
      mockIsPayTotalsLoading = true;
      mockIsPayQuoteLoading = true;

      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 1 }),
      );

      expect(result.current.isPaySystemSettling).toBe(true);
    });

    it('becomes false after loading started and completed with quotes (Path A)', () => {
      // Path A: controller finishes AND quotes are present → exit immediately,
      // even before isTransactionDataUpdating has cleared.
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xDAI', chainId: '1' };
      mockIsPayQuoteLoading = true;
      mockIsPayTotalsLoading = true;
      mockQuotes = [];

      const { result, rerender } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 1 }),
      );

      expect(result.current.isPaySystemSettling).toBe(true);

      // Controller finishes loading and quotes arrive (isTransactionDataUpdating still active)
      act(() => {
        mockIsPayQuoteLoading = false;
        mockIsPayTotalsLoading = true; // isTransactionDataUpdating still true
        mockQuotes = [{ id: 'q1' }]; // quotes present → Path A exit
      });
      rerender({});

      expect(result.current.isPaySystemSettling).toBe(false);
    });

    it('becomes false after loading completed with no quotes (Path B)', () => {
      // Path B: no quotes arrived, but both isPayQuoteLoading and
      // isPayFeesLoading (incl. isTransactionDataUpdating) are fully false.
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xDAI', chainId: '1' };
      mockIsPayQuoteLoading = true;
      mockIsPayTotalsLoading = true;
      mockQuotes = [];

      const { result, rerender } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 1 }),
      );

      expect(result.current.isPaySystemSettling).toBe(true);

      act(() => {
        mockIsPayQuoteLoading = false;
        mockIsPayTotalsLoading = false;
        mockQuotes = []; // no quotes → Path B (wait for isPayFeesLoading = false)
      });
      rerender({});

      expect(result.current.isPaySystemSettling).toBe(false);
    });

    it('does not exit settling when only isTransactionDataUpdating cycles (Bug 3 regression)', () => {
      // Regression: effect 1 previously used isPayFeesLoading which includes
      // isTransactionDataUpdating. When updateTokenAmount fires,
      // isTransactionDataUpdating briefly cycles true→false BEFORE the
      // controller starts loading. This falsely marked hasSeenLoadingRef = true,
      // and the subsequent isPayFeesLoading = false gap triggered a premature
      // settling exit — causing the CTA flash.
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xUSDC', chainId: '1' };
      mockIsPayQuoteLoading = false; // controller NOT yet loading
      mockIsPayTotalsLoading = true; // only isTransactionDataUpdating is true

      const { result, rerender } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 1 }),
      );

      expect(result.current.isPaySystemSettling).toBe(true);

      // isTransactionDataUpdating goes false while controller still hasn't started
      act(() => {
        mockIsPayTotalsLoading = false;
        mockIsPayQuoteLoading = false;
        mockQuotes = [];
      });
      rerender({});

      // Settling must remain true — hasSeenLoadingRef was never set because
      // isPayQuoteLoading (the real controller flag) never went true.
      expect(result.current.isPaySystemSettling).toBe(true);

      // Now the controller starts loading for the new amount
      act(() => {
        mockIsPayQuoteLoading = true;
        mockIsPayTotalsLoading = true;
      });
      rerender({});
      expect(result.current.isPaySystemSettling).toBe(true);

      // Controller loading completes with quotes — now settles correctly
      act(() => {
        mockIsPayQuoteLoading = false;
        mockIsPayTotalsLoading = false;
        mockQuotes = [{ id: 'q1' }];
      });
      rerender({});
      expect(result.current.isPaySystemSettling).toBe(false);
    });

    it('remains settling when token selected with currentValue = 0 (Bug 2 regression)', () => {
      // Regression: the old !shouldWaitForPayFees exit caused settling to clear
      // immediately when currentValue = 0, so when the user typed an amount,
      // "Change Payment Method" showed for the entire loading duration.
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xUSDC', chainId: '1' };
      mockIsPayQuoteLoading = false;
      mockQuotes = [];

      const { result, rerender } = renderHook(
        ({ currentValue }: { currentValue: number }) =>
          usePredictBuyConditions({ ...defaultParams, currentValue }),
        { initialProps: { currentValue: 0 } },
      );

      expect(result.current.isPaySystemSettling).toBe(true);

      // User types $1 but loading hasn't started yet
      rerender({ currentValue: 1 });
      expect(result.current.isPaySystemSettling).toBe(true);

      // Controller starts loading
      act(() => {
        mockIsPayQuoteLoading = true;
        mockIsPayTotalsLoading = true;
      });
      rerender({ currentValue: 1 });
      expect(result.current.isPaySystemSettling).toBe(true);

      // Loading completes with quotes
      act(() => {
        mockIsPayQuoteLoading = false;
        mockIsPayTotalsLoading = false;
        mockQuotes = [{ id: 'q1' }];
      });
      rerender({ currentValue: 1 });
      expect(result.current.isPaySystemSettling).toBe(false);
    });

    it('resets to true when a different ERC20 token is selected mid-session', () => {
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xUSDC', chainId: '1' };
      mockIsPayQuoteLoading = true;
      mockIsPayTotalsLoading = true;
      mockQuotes = [];

      const { result, rerender } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 1 }),
      );

      // Complete the first loading cycle
      act(() => {
        mockIsPayQuoteLoading = false;
        mockIsPayTotalsLoading = false;
        mockQuotes = [{ id: 'q1' }];
      });
      rerender({});
      expect(result.current.isPaySystemSettling).toBe(false);

      // User switches to DAI — immediately settling again (synchronous)
      act(() => {
        mockSelectedPaymentToken = { address: '0xDAI', chainId: '1' };
        mockIsPayQuoteLoading = false; // gap: loading not yet active
        mockIsPayTotalsLoading = false;
      });
      rerender({});

      expect(result.current.isPaySystemSettling).toBe(true);
    });

    it('resets to true when the same ERC20 address is selected on a different chain', () => {
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xUSDC', chainId: '0x1' };
      mockIsPayQuoteLoading = true;
      mockIsPayTotalsLoading = true;
      mockQuotes = [];

      const { result, rerender } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 1 }),
      );

      act(() => {
        mockIsPayQuoteLoading = false;
        mockIsPayTotalsLoading = false;
        mockQuotes = [{ id: 'q1' }];
      });
      rerender({});
      expect(result.current.isPaySystemSettling).toBe(false);

      act(() => {
        mockSelectedPaymentToken = { address: '0xUSDC', chainId: '0x2' };
        mockQuotes = [];
      });
      rerender({});

      expect(result.current.isPaySystemSettling).toBe(true);
      expect(result.current.canPlaceBet).toBe(false);
    });

    it('keeps canPlaceBet false while settling, even if all other conditions are met', () => {
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xDAI', chainId: '1' };
      mockIsPayTotalsLoading = false;
      mockAvailableBalance = 100;

      const { result } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 1 }),
      );

      expect(result.current.isPaySystemSettling).toBe(true);
      expect(result.current.canPlaceBet).toBe(false);
    });

    it('keeps the same token settled when switching through Predict balance without changing amount', () => {
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xUSDC', chainId: '1' };
      mockIsPayQuoteLoading = true;
      mockIsPayTotalsLoading = true;
      mockQuotes = [];

      const { result, rerender } = renderHook(() =>
        usePredictBuyConditions({ ...defaultParams, currentValue: 1 }),
      );

      // Complete settling for USDC
      act(() => {
        mockIsPayQuoteLoading = false;
        mockIsPayTotalsLoading = false;
        mockQuotes = [{ id: 'q1' }];
      });
      rerender({});
      expect(result.current.isPaySystemSettling).toBe(false);

      // Switch back to Predict balance — keeps the settled payment key.
      act(() => {
        mockIsPredictBalanceSelected = true;
        mockSelectedPaymentToken = null;
      });
      rerender({});
      expect(result.current.isPaySystemSettling).toBe(false);

      // Re-select USDC for the same amount — can reuse the existing quote state.
      act(() => {
        mockIsPredictBalanceSelected = false;
        mockSelectedPaymentToken = { address: '0xUSDC', chainId: '1' };
      });
      rerender({});
      expect(result.current.isPaySystemSettling).toBe(false);
      expect(result.current.canPlaceBet).toBe(true);
    });

    it('settles again when the same token is re-selected after the amount changes', () => {
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xUSDC', chainId: '1' };
      mockIsPayQuoteLoading = true;
      mockIsPayTotalsLoading = true;
      mockQuotes = [];

      const { result, rerender } = renderHook(
        ({
          totalPayForPredictBalance,
        }: {
          totalPayForPredictBalance: number;
        }) =>
          usePredictBuyConditions({
            ...defaultParams,
            currentValue: 1,
            totalPayForPredictBalance,
          }),
        { initialProps: { totalPayForPredictBalance: 10.5 } },
      );

      act(() => {
        mockIsPayQuoteLoading = false;
        mockIsPayTotalsLoading = false;
        mockQuotes = [{ id: 'q1' }];
      });
      rerender({ totalPayForPredictBalance: 10.5 });
      expect(result.current.isPaySystemSettling).toBe(false);

      act(() => {
        mockIsPredictBalanceSelected = true;
        mockSelectedPaymentToken = null;
      });
      rerender({ totalPayForPredictBalance: 10.5 });

      act(() => {
        mockIsPredictBalanceSelected = false;
        mockSelectedPaymentToken = { address: '0xUSDC', chainId: '1' };
      });
      rerender({ totalPayForPredictBalance: 11 });

      expect(result.current.isPaySystemSettling).toBe(true);
      expect(result.current.canPlaceBet).toBe(false);
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

  describe('manual payment token selection', () => {
    it('does not reset the selected token after initialization, even when Predict balance covers the total', () => {
      mockPredictBalance = 20;
      mockIsPredictBalanceSelected = false;

      renderHook(() =>
        usePredictBuyConditions({
          ...defaultParams,
          totalPayForPredictBalance: 20,
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
        }),
      );

      expect(mockResetSelectedPaymentToken).not.toHaveBeenCalled();
    });
  });
});
