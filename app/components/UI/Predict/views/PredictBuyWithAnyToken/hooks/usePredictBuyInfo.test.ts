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
  placeOrderError: null as string | null,
  isOrderNotFilled: false,
  isPlaceOrderLoading: false,
  isConfirming: false,
};

describe('usePredictBuyInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPredictBalanceSelected = true;
    mockPayTotals = null;
    mockActiveOrder = null;
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

  describe('rewardsFeeAmount', () => {
    it('returns totalFee from preview fees', () => {
      const params = {
        ...defaultParams,
        isPlaceOrderLoading: false,
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

    it('returns undefined when isPlaceOrderLoading is true', () => {
      const params = {
        ...defaultParams,
        isPlaceOrderLoading: true,
        previewError: null,
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.rewardsFeeAmount).toBeUndefined();
    });

    it('returns undefined when previewError exists', () => {
      const params = {
        ...defaultParams,
        isPlaceOrderLoading: false,
        previewError: 'Preview failed',
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.rewardsFeeAmount).toBeUndefined();
    });
  });

  describe('errorMessage', () => {
    it('returns undefined when isOrderNotFilled is true', () => {
      const params = {
        ...defaultParams,
        isOrderNotFilled: true,
        previewError: 'Some error',
        placeOrderError: 'Place error',
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.errorMessage).toBeUndefined();
    });

    it('returns undefined when isConfirming is true', () => {
      const params = {
        ...defaultParams,
        isConfirming: true,
        previewError: 'Some error',
        placeOrderError: 'Place error',
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.errorMessage).toBeUndefined();
    });

    it('returns previewError as priority error', () => {
      mockActiveOrder = { error: 'Active order error' };
      const params = {
        ...defaultParams,
        previewError: 'Preview error',
        placeOrderError: 'Place order error',
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.errorMessage).toBe('Preview error');
    });

    it('returns placeOrderError when no previewError', () => {
      mockActiveOrder = { error: 'Active order error' };
      const params = {
        ...defaultParams,
        previewError: null,
        placeOrderError: 'Place order error',
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.errorMessage).toBe('Place order error');
    });

    it('returns activeOrder.error as fallback', () => {
      mockActiveOrder = { error: 'Active order error' };
      const params = {
        ...defaultParams,
        previewError: null,
        placeOrderError: null,
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.errorMessage).toBe('Active order error');
    });

    it('returns undefined when no errors exist', () => {
      mockActiveOrder = null;
      const params = {
        ...defaultParams,
        previewError: null,
        placeOrderError: null,
      };

      const { result } = renderHook(() => usePredictBuyInfo(params));

      expect(result.current.errorMessage).toBeUndefined();
    });
  });
});
