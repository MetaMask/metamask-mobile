import { renderHook } from '@testing-library/react-native';
import { OrderPreview, Side } from '../../../types';
import { usePredictBuyInfo } from './usePredictBuyInfo';

let mockIsPredictBalanceSelected = true;
let mockPayTotals: {
  fees?: {
    provider?: { usd?: number };
    sourceNetwork?: { estimate?: { usd?: number } };
    targetNetwork?: { usd?: number };
  };
} | null = null;
let mockActiveOrder: { error?: string } | null = null;
let mockPredictBalance = 0;
let mockAvailableBalance = 1000;
let mockIsBalanceLoading = false;
let mockInsufficientPayTokenBalanceAlert: { message: string } | null = null;

jest.mock('../../../hooks/usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    isPredictBalanceSelected: mockIsPredictBalanceSelected,
  }),
}));

jest.mock(
  '../../../../../Views/confirmations/hooks/pay/useTransactionPayData',
  () => ({
    useTransactionPayTotals: () => mockPayTotals,
  }),
);

jest.mock('../../../hooks/usePredictActiveOrder', () => ({
  usePredictActiveOrder: () => ({
    activeOrder: mockActiveOrder,
  }),
}));

jest.mock('../../../hooks/usePredictBalance', () => ({
  usePredictBalance: () => ({
    data: mockPredictBalance,
    isLoading: false,
  }),
}));

jest.mock('./usePredictBuyAvailableBalance', () => ({
  usePredictBuyAvailableBalance: () => ({
    availableBalance: mockAvailableBalance,
    isBalanceLoading: mockIsBalanceLoading,
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

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, options?: Record<string, unknown>) => {
    if (key === 'predict.order.prediction_minimum_bet') {
      return `Minimum bet: ${options?.amount}`;
    }
    if (key === 'predict.order.prediction_insufficient_funds') {
      return `Not enough funds. You can use up to ${options?.amount}.`;
    }
    if (key === 'predict.order.no_funds_enough') {
      return 'Not enough funds.';
    }
    return key;
  }),
}));

jest.mock('../../../utils/format', () => ({
  formatPrice: jest.fn((value: number) => `$${value.toFixed(2)}`),
}));

jest.mock('../../../constants/transactions', () => ({
  MINIMUM_BET: 1,
}));

const createMockPreview = (
  overrides?: Partial<OrderPreview>,
): OrderPreview => ({
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: 'token-1',
  timestamp: 1000000,
  side: Side.BUY,
  sharePrice: 0.5,
  maxAmountSpent: 100,
  minAmountReceived: 180,
  slippage: 0.01,
  tickSize: 0.01,
  minOrderSize: 1,
  negRisk: false,
  rateLimited: false,
  fees: {
    totalFee: 5,
    metamaskFee: 2,
    providerFee: 3,
    totalFeePercentage: 0.05,
    collector: '0xCollector',
  },
  ...overrides,
});

const defaultParams = {
  currentValue: 100,
  preview: createMockPreview(),
  previewError: null as string | null,
  isConfirming: false,
  isPlacingOrder: false,
};

describe('usePredictBuyInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPredictBalanceSelected = true;
    mockPayTotals = null;
    mockActiveOrder = null;
    mockPredictBalance = 0;
    mockAvailableBalance = 1000;
    mockIsBalanceLoading = false;
    mockInsufficientPayTokenBalanceAlert = null;
  });

  describe('depositFee', () => {
    it('calculates depositFee summing provider + sourceNetwork + targetNetwork usd fees', () => {
      mockIsPredictBalanceSelected = false;
      mockPayTotals = {
        fees: {
          provider: { usd: 1.5 },
          sourceNetwork: { estimate: { usd: 2.5 } },
          targetNetwork: { usd: 1.0 },
        },
      };

      const { result } = renderHook(() => usePredictBuyInfo(defaultParams));

      expect(result.current.depositFee).toBe(5);
    });

    it('returns 0 when isPredictBalanceSelected is true', () => {
      mockIsPredictBalanceSelected = true;
      mockPayTotals = {
        fees: {
          provider: { usd: 1.5 },
          sourceNetwork: { estimate: { usd: 2.5 } },
          targetNetwork: { usd: 1.0 },
        },
      };

      const { result } = renderHook(() => usePredictBuyInfo(defaultParams));

      expect(result.current.depositFee).toBe(0);
    });

    it('returns 0 when payTotals has no fees', () => {
      mockIsPredictBalanceSelected = false;
      mockPayTotals = {};

      const { result } = renderHook(() => usePredictBuyInfo(defaultParams));

      expect(result.current.depositFee).toBe(0);
    });

    it('handles missing individual fee components gracefully', () => {
      mockIsPredictBalanceSelected = false;
      mockPayTotals = {
        fees: {
          provider: { usd: 2.0 },
        },
      };

      const { result } = renderHook(() => usePredictBuyInfo(defaultParams));

      expect(result.current.depositFee).toBe(2.0);
    });

    it('returns 0 when there is an insufficient pay token balance alert', () => {
      mockIsPredictBalanceSelected = false;
      mockPayTotals = {
        fees: {
          provider: { usd: 1.5 },
          sourceNetwork: { estimate: { usd: 2.5 } },
          targetNetwork: { usd: 1.0 },
        },
      };
      mockInsufficientPayTokenBalanceAlert = {
        message: 'Insufficient payment token balance',
      };

      const { result } = renderHook(() => usePredictBuyInfo(defaultParams));

      expect(result.current.depositFee).toBe(0);
    });

    it('keeps the last accepted deposit fee while confirming', () => {
      mockIsPredictBalanceSelected = false;
      mockPayTotals = {
        fees: {
          provider: { usd: 1.5 },
          sourceNetwork: { estimate: { usd: 2.5 } },
          targetNetwork: { usd: 1.0 },
        },
      };

      const { result, rerender } = renderHook(
        (params: typeof defaultParams) => usePredictBuyInfo(params),
        {
          initialProps: { ...defaultParams, isConfirming: true },
        },
      );

      expect(result.current.depositFee).toBe(5);

      mockPayTotals = {};

      rerender({ ...defaultParams, isConfirming: true });

      expect(result.current.depositFee).toBe(5);
    });

    it('clears the accepted deposit fee after confirming ends', () => {
      mockIsPredictBalanceSelected = false;
      mockPayTotals = {
        fees: {
          provider: { usd: 1.5 },
          sourceNetwork: { estimate: { usd: 2.5 } },
          targetNetwork: { usd: 1.0 },
        },
      };

      const { result, rerender } = renderHook(
        (params: typeof defaultParams) => usePredictBuyInfo(params),
        {
          initialProps: { ...defaultParams, isConfirming: true },
        },
      );

      expect(result.current.depositFee).toBe(5);

      mockPayTotals = {};

      rerender({ ...defaultParams, isConfirming: false });

      expect(result.current.depositFee).toBe(0);
    });
  });

  describe('total', () => {
    it('calculates total as currentValue + providerFee + metamaskFee + depositFee', () => {
      mockIsPredictBalanceSelected = true;
      const params = {
        ...defaultParams,
        currentValue: 100,
        preview: createMockPreview({
          fees: {
            totalFee: 5,
            metamaskFee: 2,
            providerFee: 3,
            totalFeePercentage: 0.05,
            collector: '0xCollector',
          },
        }),
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      // 100 (currentValue) + 3 (providerFee) + 2 (metamaskFee) + 0 (depositFee, balance selected)
      expect(result.current.total).toBe(105);
    });

    it('includes depositFee when external token selected', () => {
      mockIsPredictBalanceSelected = false;
      mockPayTotals = {
        fees: {
          provider: { usd: 1.0 },
          sourceNetwork: { estimate: { usd: 1.0 } },
          targetNetwork: { usd: 1.0 },
        },
      };
      const params = {
        ...defaultParams,
        currentValue: 100,
        preview: createMockPreview({
          fees: {
            totalFee: 5,
            metamaskFee: 2,
            providerFee: 3,
            totalFeePercentage: 0.05,
            collector: '0xCollector',
          },
        }),
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.total).toBe(108);
    });
  });

  describe('toWin', () => {
    it('returns minAmountReceived from preview', () => {
      const params = {
        ...defaultParams,
        preview: createMockPreview({ minAmountReceived: 250 }),
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.toWin).toBe(250);
    });

    it('returns 0 when preview is null', () => {
      const params = {
        ...defaultParams,
        preview: null,
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.toWin).toBe(0);
    });
  });

  describe('depositAmount', () => {
    it('returns 0 when preview is null', () => {
      mockPredictBalance = 0;
      const params = { ...defaultParams, currentValue: 1, preview: null };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.depositAmount).toBe(0);
    });

    it('returns 0 when preview has no fees', () => {
      mockPredictBalance = 0;
      const params = {
        ...defaultParams,
        currentValue: 1,
        preview: createMockPreview({ fees: undefined }),
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.depositAmount).toBe(0);
    });

    it('returns 0 when currentValue is below minimum bet', () => {
      mockPredictBalance = 0;
      const params = {
        ...defaultParams,
        currentValue: 0.5,
        preview: createMockPreview(),
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.depositAmount).toBe(0);
    });

    it('returns the remaining amount needed after predict balance is applied', () => {
      mockPredictBalance = 80;

      const { result } = renderHook(() => usePredictBuyInfo(defaultParams));

      expect(result.current.depositAmount).toBe(25);
    });

    it('rounds the remaining amount up to 2 decimals when a deposit is still needed', () => {
      mockPredictBalance = 0;
      const params = {
        ...defaultParams,
        currentValue: 2,
        preview: createMockPreview({
          fees: {
            totalFee: 0.075,
            metamaskFee: 0.035,
            providerFee: 0.04,
            totalFeePercentage: 4,
            collector: '0xCollector',
          },
        }),
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.depositAmount).toBe(2.08);
    });

    it('rounds up even when the third decimal is below 5 so the deposit fully covers the shortfall', () => {
      mockPredictBalance = 0;
      const params = {
        ...defaultParams,
        currentValue: 2,
        preview: createMockPreview({
          fees: {
            totalFee: 0.074,
            metamaskFee: 0.034,
            providerFee: 0.04,
            totalFeePercentage: 4,
            collector: '0xCollector',
          },
        }),
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.depositAmount).toBe(2.08);
    });

    it('rounds a tiny positive shortfall up to the minimum cent instead of zero', () => {
      mockPredictBalance = 2.075889;
      const params = {
        ...defaultParams,
        currentValue: 2,
        preview: createMockPreview({
          fees: {
            totalFee: 0.08,
            metamaskFee: 0.04,
            providerFee: 0.04,
            totalFeePercentage: 4,
            collector: '0xCollector',
          },
        }),
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.depositAmount).toBe(0.01);
    });

    it('returns the full preview total when predict balance already covers the bet', () => {
      mockPredictBalance = 110;
      const params = {
        ...defaultParams,
        currentValue: 1,
        preview: createMockPreview({
          maxAmountSpent: 1,
          fees: {
            totalFee: 0.04,
            metamaskFee: 0.02,
            providerFee: 0.02,
            totalFeePercentage: 4,
            collector: '0xCollector',
          },
        }),
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.depositAmount).toBe(1.04);
    });
  });

  describe('totalPayForPredictBalance', () => {
    it('returns the bet amount plus provider and MetaMask fees', () => {
      const { result } = renderHook(() => usePredictBuyInfo(defaultParams));

      expect(result.current.totalPayForPredictBalance).toBe(105);
    });
  });

  describe('rewardsFeeAmount', () => {
    it('returns totalFee from preview fees', () => {
      const params = {
        ...defaultParams,
        isPlacingOrder: false,
        previewError: null,
        preview: createMockPreview({
          fees: {
            totalFee: 7,
            metamaskFee: 3,
            providerFee: 4,
            totalFeePercentage: 0.07,
            collector: '0xCollector',
          },
        }),
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.rewardsFeeAmount).toBe(7);
    });

    it('returns undefined when isPlacingOrder is true', () => {
      const params = {
        ...defaultParams,
        isPlacingOrder: true,
        previewError: null,
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.rewardsFeeAmount).toBeUndefined();
    });

    it('returns undefined when previewError exists', () => {
      const params = {
        ...defaultParams,
        isPlacingOrder: false,
        previewError: 'Preview failed',
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.rewardsFeeAmount).toBeUndefined();
    });
  });
});
