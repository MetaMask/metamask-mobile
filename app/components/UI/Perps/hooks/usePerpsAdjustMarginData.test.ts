import { renderHook } from '@testing-library/react-hooks';
import { usePerpsAdjustMarginData } from './usePerpsAdjustMarginData';
import {
  usePerpsLivePositions,
  usePerpsLiveAccount,
  usePerpsLivePrices,
} from './stream';
import { usePerpsMarkets } from './usePerpsMarkets';

// Mock the dependencies
jest.mock('./stream', () => ({
  usePerpsLivePositions: jest.fn(),
  usePerpsLiveAccount: jest.fn(),
  usePerpsLivePrices: jest.fn(),
}));

jest.mock('./usePerpsMarkets', () => ({
  usePerpsMarkets: jest.fn(),
}));

const mockUsePerpsLivePositions = usePerpsLivePositions as jest.MockedFunction<
  typeof usePerpsLivePositions
>;
const mockUsePerpsLiveAccount = usePerpsLiveAccount as jest.MockedFunction<
  typeof usePerpsLiveAccount
>;
const mockUsePerpsLivePrices = usePerpsLivePrices as jest.MockedFunction<
  typeof usePerpsLivePrices
>;
const mockUsePerpsMarkets = usePerpsMarkets as jest.MockedFunction<
  typeof usePerpsMarkets
>;

describe('usePerpsAdjustMarginData', () => {
  const mockPosition = {
    coin: 'BTC',
    size: '0.5',
    entryPrice: '100000',
    liquidationPrice: '80000',
    marginUsed: '5000',
    positionValue: '50000',
    unrealizedPnl: '500',
    returnOnEquity: '10',
    leverage: { value: 10, type: 'isolated' as const },
  };

  const mockAccount = {
    availableBalance: '10000',
    totalBalance: '15000',
    marginUsed: '5000',
    unrealizedPnl: '500',
    returnOnEquity: '10',
  };

  const mockMarkets = [
    {
      symbol: 'BTC',
      maxLeverage: '50x',
      name: 'Bitcoin',
      price: '100000',
      change24h: '2.5%',
      volume24h: '$1B',
      fundingRate: '0.01%',
      openInterest: '$500M',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsePerpsLivePositions.mockReturnValue({
      positions: [mockPosition],
      isInitialLoading: false,
    });

    mockUsePerpsLiveAccount.mockReturnValue({
      account: mockAccount,
      isInitialLoading: false,
    });

    mockUsePerpsLivePrices.mockReturnValue({
      BTC: { price: '100000', symbol: 'BTC' },
    });

    mockUsePerpsMarkets.mockReturnValue({
      markets: mockMarkets,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  describe('position lookup', () => {
    it('returns the live position for the given coin', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.position).toEqual(mockPosition);
      expect(result.current.isLoading).toBe(false);
    });

    it('returns null when position is not found', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'ETH',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.position).toBeNull();
    });

    it('returns isLoading true when positions are loading', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: true,
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('margin values', () => {
    it('returns current margin from live position', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.currentMargin).toBe(5000);
    });

    it('returns position value from live position', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.positionValue).toBe(50000);
    });

    it('returns available balance from live account', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'add',
          inputAmount: 0,
        }),
      );

      expect(result.current.availableBalance).toBe(10000);
    });
  });

  describe('max amount calculation', () => {
    it('returns available balance as max for add mode', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'add',
          inputAmount: 0,
        }),
      );

      expect(result.current.maxAmount).toBe(10000);
      expect(result.current.isAddMode).toBe(true);
    });

    it('calculates max removable margin for remove mode', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      // positionValue = 50000, leverage = 10
      // initialMarginRequired = 50000 / 10 = 5000
      // tenPercentMargin = 50000 * 0.1 = 5000
      // transferMarginRequired = max(5000, 5000) = 5000
      // maxRemovable = 5000 - 5000 = 0
      expect(result.current.maxAmount).toBe(0);
      expect(result.current.isAddMode).toBe(false);
    });

    it('calculates positive max removable when margin exceeds requirement', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [
          {
            ...mockPosition,
            marginUsed: '8000', // Extra margin
          },
        ],
        isInitialLoading: false,
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      // marginUsed = 8000
      // transferMarginRequired = 5000 (same as before)
      // maxRemovable = 8000 - 5000 = 3000
      expect(result.current.maxAmount).toBe(3000);
    });
  });

  describe('liquidation price calculation', () => {
    it('returns current liquidation price from live position', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.currentLiquidationPrice).toBe(80000);
    });

    it('calculates new liquidation price when adding margin', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'add',
          inputAmount: 1000,
        }),
      );

      // newMargin = 5000 + 1000 = 6000
      // positionSize = 0.5
      // marginPerUnit = 6000 / 0.5 = 12000
      // For long: liquidationPrice = entryPrice - marginPerUnit = 100000 - 12000 = 88000
      expect(result.current.newLiquidationPrice).toBe(88000);
    });

    it('calculates new liquidation price when removing margin', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [
          {
            ...mockPosition,
            marginUsed: '8000',
          },
        ],
        isInitialLoading: false,
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'remove',
          inputAmount: 1000,
        }),
      );

      // newMargin = 8000 - 1000 = 7000
      // marginPerUnit = 7000 / 0.5 = 14000
      // For long: liquidationPrice = 100000 - 14000 = 86000
      expect(result.current.newLiquidationPrice).toBe(86000);
    });
  });

  describe('liquidation distance calculation', () => {
    it('calculates current liquidation distance as percentage', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      // currentPrice = 100000, liquidationPrice = 80000
      // distance = |100000 - 80000| / 100000 * 100 = 20%
      expect(result.current.currentLiquidationDistance).toBe(20);
    });

    it('returns 0 when current price is 0', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: { price: '0', symbol: 'BTC' },
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.currentLiquidationDistance).toBe(0);
    });
  });

  describe('mode handling', () => {
    it('correctly identifies add mode', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'add',
          inputAmount: 0,
        }),
      );

      expect(result.current.isAddMode).toBe(true);
    });

    it('correctly identifies remove mode', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.isAddMode).toBe(false);
    });
  });

  describe('leverage handling', () => {
    it('uses position leverage when available', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.positionLeverage).toBe(10);
    });

    it('falls back to market max leverage when position leverage not available', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [
          {
            ...mockPosition,
            leverage: undefined,
          },
        ],
        isInitialLoading: false,
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          coin: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.positionLeverage).toBe(50);
    });
  });
});
