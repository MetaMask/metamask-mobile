import { renderHook } from '@testing-library/react-hooks';
import { usePerpsAdjustMarginData } from './usePerpsAdjustMarginData';
import {
  usePerpsLivePositions,
  usePerpsLiveAccount,
  usePerpsLivePrices,
} from './stream';
import { usePerpsMarkets } from './usePerpsMarkets';
import { usePerpsMarginAdjustmentLimits } from './usePerpsMarginAdjustmentLimits';

// Mock the dependencies
jest.mock('./stream', () => ({
  usePerpsLivePositions: jest.fn(),
  usePerpsLiveAccount: jest.fn(),
  usePerpsLivePrices: jest.fn(),
}));

jest.mock('react-redux', () => ({ useSelector: () => '0xaccount' }));

jest.mock('./usePerpsNetwork', () => ({ usePerpsNetwork: () => 'testnet' }));

jest.mock('./usePerpsMarginAdjustmentLimits', () => ({
  usePerpsMarginAdjustmentLimits: jest.fn(),
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

const mockUsePerpsMarginAdjustmentLimits = jest.mocked(
  usePerpsMarginAdjustmentLimits,
);

describe('usePerpsAdjustMarginData', () => {
  const mockPosition = {
    symbol: 'BTC',
    size: '0.5',
    entryPrice: '100000',
    liquidationPrice: '80000',
    marginUsed: '5000',
    positionValue: '50000',
    unrealizedPnl: '500',
    returnOnEquity: '10',
    leverage: { value: 10, type: 'isolated' as const },
    maxLeverage: 50,
    cumulativeFunding: {
      allTime: '0',
      sinceOpen: '0',
      sinceChange: '0',
    },
    takeProfitCount: 0,
    stopLossCount: 0,
  };

  const mockAccount = {
    spendableBalance: '10000',
    withdrawableBalance: '10000',
    totalBalance: '15000',
    marginUsed: '5000',
    unrealizedPnl: '500',
    returnOnEquity: '10',
  };

  const mockMarkets = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      maxLeverage: '50x',
      price: '$100,000',
      change24h: '+$2,500',
      change24hPercent: '2.5%',
      volume: '$1B',
      openInterest: '$500M',
      volumeNumber: 1000000000,
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
      BTC: {
        price: '100000',
        symbol: 'BTC',
        timestamp: Date.now(),
        isTradable: true,
      },
    });

    // A provider without limits: the streamed figures apply.
    mockUsePerpsMarginAdjustmentLimits.mockReturnValue({
      status: 'unavailable',
      reason: 'provider',
    });

    mockUsePerpsMarkets.mockReturnValue({
      markets: mockMarkets,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });
  });

  describe('position lookup', () => {
    it('returns the live position for the given coin', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.position).toEqual(mockPosition);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasValidPositionData).toBe(true);
    });

    it('uses the position on the requested venue', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [
          { ...mockPosition, providerId: 'hyperliquid', marginUsed: '111' },
          { ...mockPosition, providerId: 'lighter', marginUsed: '222' },
        ],
        isInitialLoading: false,
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: mockPosition.symbol,
          providerId: 'lighter',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.position?.providerId).toBe('lighter');
      expect(result.current.position?.marginUsed).toBe('222');
    });

    it('returns null when position is not found', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'ETH',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.position).toBeNull();
    });

    it('accepts a position without a liquidation price', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [{ ...mockPosition, liquidationPrice: null }],
        isInitialLoading: false,
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.hasValidPositionData).toBe(true);
      expect(result.current.currentLiquidationPrice).toBeUndefined();
      expect(result.current.newLiquidationPrice).toBeUndefined();
      expect(result.current.currentLiquidationDistance).toBeUndefined();
    });

    it('returns isLoading true when positions are loading', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: true,
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
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
          symbol: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.currentMargin).toBe(5000);
    });

    it('returns position value from live position', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.positionValue).toBe(50000);
    });

    it('keeps malformed price, balance and liquidation price unknown, not 0', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [
          {
            ...mockPosition,
            marginUsed: 'invalid',
            positionValue: 'Infinity',
            liquidationPrice: 'NaN',
            size: 'invalid',
            entryPrice: 'invalid',
            leverage: { value: Number.NaN, type: 'isolated' },
          },
        ],
        isInitialLoading: false,
      });
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          ...mockAccount,
          spendableBalance: 'Infinity',
        },
        isInitialLoading: false,
      });
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: 'invalid',
          symbol: 'BTC',
          timestamp: Date.now(),
          isTradable: true,
        },
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'add',
          inputAmount: 100,
        }),
      );

      expect(result.current.currentMargin).toBe(0);
      expect(result.current.positionValue).toBe(0);
      expect(result.current.currentLiquidationPrice).toBeUndefined();
      expect(result.current.currentPrice).toBeUndefined();
      expect(result.current.maxAmount).toBeUndefined();
      expect(Number.isFinite(result.current.positionLeverage)).toBe(true);
      expect(result.current.hasValidPositionData).toBe(false);
    });

    it.each([
      { marginUsed: '0' },
      { marginUsed: '100abc' },
      { positionValue: '0' },
      { size: '0' },
      { entryPrice: 'Infinity' },
      { leverage: { value: 0, type: 'isolated' as const } },
    ])('rejects incomplete authoritative position data: %o', (overrides) => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [{ ...mockPosition, ...overrides }],
        isInitialLoading: false,
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'add',
          inputAmount: 0,
        }),
      );

      expect(result.current.hasValidPositionData).toBe(false);
    });
  });

  describe('max amount calculation', () => {
    it('returns available balance as max for add mode', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'add',
          inputAmount: 0,
        }),
      );

      expect(result.current.maxAmount).toBe(10000);
      expect(result.current.isAddMode).toBe(true);
    });

    it("limits the add max to the position venue's balance", () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [{ ...mockPosition, providerId: 'lighter' }],
        isInitialLoading: false,
      });
      // The account hook scopes the aggregated account to the venue.
      mockUsePerpsLiveAccount.mockImplementation((options) => ({
        account: {
          ...mockAccount,
          spendableBalance:
            options?.providerId === 'lighter' ? '3000' : '13000',
        },
        isInitialLoading: false,
      }));

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          providerId: 'lighter',
          mode: 'add',
          inputAmount: 0,
        }),
      );

      expect(result.current.maxAmount).toBe(3000);
    });

    it('keeps the add max unknown while the position venue has not reported', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [{ ...mockPosition, providerId: 'lighter' }],
        isInitialLoading: false,
      });
      mockUsePerpsLiveAccount.mockImplementation((options) => ({
        account: options?.providerId === 'lighter' ? null : mockAccount,
        isInitialLoading: false,
      }));

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          providerId: 'lighter',
          mode: 'add',
          inputAmount: 0,
        }),
      );

      expect(result.current.maxAmount).toBeUndefined();
    });

    it('calculates max removable margin for remove mode', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
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
          symbol: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      // marginUsed = 8000
      // transferMarginRequired = 5000 (same as before)
      // priceMoveBuffer = 50000 * 0.01 = 500
      // maxRemovable = 8000 - 5000 - 500 = 2500
      expect(result.current.maxAmount).toBe(2500);
      // The exchange itself accepts up to 8000 - 5000 = 3000
      expect(result.current.exchangeMaxAmount).toBe(3000);
    });
  });

  describe('venue limits', () => {
    it.each([
      ['add' as const, 315.35],
      ['remove' as const, 12.5],
    ])('shows the venue maximum as it is in %s mode', (mode, expected) => {
      mockUsePerpsMarginAdjustmentLimits.mockReturnValue({
        status: 'available',
        maxAdd: '315.35',
        maxRemove: '12.5',
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({ symbol: 'BTC', mode, inputAmount: 0 }),
      );

      expect(result.current.maxAmount).toBe(expected);
    });

    it('removes nothing from a strict isolated market', () => {
      mockUsePerpsMarginAdjustmentLimits.mockReturnValue({
        status: 'available',
        maxAdd: '315.35',
        maxRemove: '0',
      });
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [{ ...mockPosition, marginUsed: '8000' }],
        isInitialLoading: false,
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.maxAmount).toBe(0);
      expect(result.current.exchangeMaxAmount).toBe(0);
    });

    it.each([
      ['add' as const, undefined],
      ['remove' as const, undefined],
      ['add' as const, 'account_unknown' as const],
      ['remove' as const, 'account_unknown' as const],
    ])(
      'keeps the %s maximum unknown while the limits are %s',
      (mode, reason) => {
        mockUsePerpsMarginAdjustmentLimits.mockReturnValue(
          reason && { status: 'unavailable', reason },
        );

        const { result } = renderHook(() =>
          usePerpsAdjustMarginData({ symbol: 'BTC', mode, inputAmount: 0 }),
        );

        expect(result.current.maxAmount).toBeUndefined();
        expect(result.current.exchangeMaxAmount).toBeUndefined();
      },
    );

    it('re-reads the limits for the position and settled balance, not its PnL', () => {
      const { rerender } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'add',
          inputAmount: 0,
        }),
      );
      const first = mockUsePerpsMarginAdjustmentLimits.mock.lastCall?.[0];

      // $100 more PnL: margin, total and PnL all move together.
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [
          { ...mockPosition, marginUsed: '5100', unrealizedPnl: '600' },
        ],
        isInitialLoading: false,
      });
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          ...mockAccount,
          totalBalance: '15100',
          unrealizedPnl: '600',
        },
        isInitialLoading: false,
      });
      rerender();
      const second = mockUsePerpsMarginAdjustmentLimits.mock.lastCall?.[0];

      expect(first).toMatchObject({
        symbol: 'BTC',
        contextKey: '0xaccount|testnet',
        settledBalance: 14500,
        enabled: true,
      });
      expect(second).toEqual(first);
    });
  });

  describe('liquidation price calculation', () => {
    it('returns current liquidation price from live position', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.currentLiquidationPrice).toBe(80000);
    });

    it('calculates new liquidation price when adding margin', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'add',
          inputAmount: 1000,
        }),
      );

      // Uses anchored + delta approach with maintenance margin factor:
      // marginDelta = 1000, positionSize = 0.5, currentLiqPrice = 80000
      // maintenanceMarginRate = 1/(2*50) = 0.01, denominator = 1 - 0.01 = 0.99
      // For long (direction=-1): newLiqPrice = 80000 + (-1 * 1000 / 0.5) / 0.99 ≈ 77979.80
      expect(result.current.newMargin).toBe(6000);
      expect(result.current.newLiquidationPrice).toBeCloseTo(77979.8, 1);
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
          symbol: 'BTC',
          mode: 'remove',
          inputAmount: 1000,
        }),
      );

      // Uses anchored + delta approach with maintenance margin factor:
      // marginDelta = -1000 (removing), positionSize = 0.5, currentLiqPrice = 80000
      // maintenanceMarginRate = 1/(2*50) = 0.01, denominator = 0.99
      // For long (direction=-1): newLiqPrice = 80000 + (-1 * -1000 / 0.5) / 0.99 ≈ 82020.20
      expect(result.current.newMargin).toBe(7000);
      expect(result.current.newLiquidationPrice).toBeCloseTo(82020.2, 1);
    });
  });

  describe('liquidation distance calculation', () => {
    it('calculates current liquidation distance as percentage', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      // Core formatLiquidationDistance: |100000 - 80000| / 100000 = 20.00%
      expect(result.current.currentLiquidationDistance).toBe('20.00%');
    });

    it('measures the distance from the venue mark when it is known', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '100000',
          markPrice: '160000',
          symbol: 'BTC',
          timestamp: Date.now(),
          isTradable: true,
        },
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.currentLiquidationDistance).toBe('50.00%');
      expect(result.current.currentPrice).toBe(100000);
    });

    it('measures the distance from the mid when the mark is 0', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '100000',
          markPrice: '0',
          symbol: 'BTC',
          timestamp: Date.now(),
          isTradable: true,
        },
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.currentLiquidationDistance).toBe('20.00%');
    });

    it('returns undefined, never "at liquidation", when current price is 0', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '0',
          symbol: 'BTC',
          timestamp: Date.now(),
          isTradable: true,
        },
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.currentLiquidationDistance).toBeUndefined();
      expect(result.current.newLiquidationDistance).toBeUndefined();
    });

    it('returns undefined when there is no live price', () => {
      mockUsePerpsLivePrices.mockReturnValue({});

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.currentPrice).toBeUndefined();
      expect(result.current.currentLiquidationDistance).toBeUndefined();
    });
  });

  describe('24h percent change', () => {
    it('parses the percent change from the live price', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '100000',
          percentChange24h: '-2.35',
          symbol: 'BTC',
          timestamp: Date.now(),
          isTradable: true,
        },
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'add',
          inputAmount: 0,
        }),
      );

      expect(result.current.percentChange24h).toBe(-2.35);
    });

    it.each([
      { percentChange24h: undefined, label: 'missing' },
      { percentChange24h: '', label: 'empty' },
      { percentChange24h: 'abc', label: 'malformed' },
    ])(
      'returns null when the percent change is $label',
      ({ percentChange24h }) => {
        mockUsePerpsLivePrices.mockReturnValue({
          BTC: {
            price: '100000',
            percentChange24h,
            symbol: 'BTC',
            timestamp: Date.now(),
            isTradable: true,
          },
        });

        const { result } = renderHook(() =>
          usePerpsAdjustMarginData({
            symbol: 'BTC',
            mode: 'add',
            inputAmount: 0,
          }),
        );

        expect(result.current.percentChange24h).toBeNull();
      },
    );

    it('returns null when there is no live price for the symbol', () => {
      mockUsePerpsLivePrices.mockReturnValue({});

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'add',
          inputAmount: 0,
        }),
      );

      expect(result.current.percentChange24h).toBeNull();
    });
  });

  describe('mode handling', () => {
    it('correctly identifies add mode', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'add',
          inputAmount: 0,
        }),
      );

      expect(result.current.isAddMode).toBe(true);
    });

    it('correctly identifies remove mode', () => {
      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
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
          symbol: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.positionLeverage).toBe(10);
    });

    it('falls back to market max leverage when position leverage value is 0', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [
          {
            ...mockPosition,
            leverage: { value: 0, type: 'cross' as const },
          },
        ],
        isInitialLoading: false,
      });
      mockUsePerpsMarkets.mockReturnValue({
        markets: [{ ...mockMarkets[0], maxLeverage: '25x' }],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.positionLeverage).toBe(25);
    });

    it("prefers the position venue's market over an untagged row", () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [
          {
            ...mockPosition,
            providerId: 'lighter',
            leverage: { value: 0, type: 'cross' as const },
          },
        ],
        isInitialLoading: false,
      });
      mockUsePerpsMarkets.mockReturnValue({
        markets: [
          { ...mockMarkets[0], maxLeverage: '40x' },
          { ...mockMarkets[0], providerId: 'lighter', maxLeverage: '20x' },
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          providerId: 'lighter',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.positionLeverage).toBe(20);
    });

    it('uses an untagged market when the venue has no row of its own', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [
          {
            ...mockPosition,
            providerId: 'lighter',
            leverage: { value: 0, type: 'cross' as const },
          },
        ],
        isInitialLoading: false,
      });
      mockUsePerpsMarkets.mockReturnValue({
        markets: [
          { ...mockMarkets[0], providerId: 'hyperliquid', maxLeverage: '40x' },
          { ...mockMarkets[0], maxLeverage: '30x' },
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          providerId: 'lighter',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(result.current.positionLeverage).toBe(30);
    });

    it("falls back to the position venue's market from the full catalog", () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [
          {
            ...mockPosition,
            providerId: 'lighter',
            leverage: { value: 0, type: 'cross' as const },
          },
        ],
        isInitialLoading: false,
      });
      mockUsePerpsMarkets.mockReturnValue({
        markets: [
          { ...mockMarkets[0], providerId: 'hyperliquid', maxLeverage: '40x' },
          { ...mockMarkets[0], providerId: 'lighter', maxLeverage: '20x' },
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      const { result } = renderHook(() =>
        usePerpsAdjustMarginData({
          symbol: 'BTC',
          providerId: 'lighter',
          mode: 'remove',
          inputAmount: 0,
        }),
      );

      expect(mockUsePerpsMarkets).toHaveBeenCalledWith({ fullCatalog: true });
      expect(result.current.positionLeverage).toBe(20);
    });
  });
});
