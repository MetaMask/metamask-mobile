import type { Position } from '@metamask/social-controllers';
import { renderHook } from '@testing-library/react-native';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import {
  useTraderPositionData,
  type TraderPositionData,
} from '../../TraderPositionView/useTraderPositionData';
import {
  DAY_MS,
  HOUR_MS,
  NOW_MS,
  buildPerpPosition,
  buildPosition,
  buildTrade,
} from '../positionDetailsSheet.fixtures';
import { usePerpsSheetPrices } from './usePerpsSheetPrices';
import { usePositionSheetData } from './usePositionSheetData';

jest.mock('../../TraderPositionView/useTraderPositionData', () => ({
  useTraderPositionData: jest.fn(),
}));
jest.mock('./usePerpsSheetPrices', () => ({
  usePerpsSheetPrices: jest.fn(),
}));

const mockUseTraderPositionData = jest.mocked(useTraderPositionData);
const mockUsePerpsSheetPrices = jest.mocked(usePerpsSheetPrices);
const mockSetActiveTimePeriod = jest.fn();

const hourlyPrices = (from: number, to: number, values: number[]) =>
  values.map(
    (value, index): TokenPrice => [
      String(from + ((to - from) * index) / (values.length - 1)),
      value,
    ],
  );

const baseData = (
  overrides: Partial<TraderPositionData> = {},
): TraderPositionData =>
  ({
    symbol: 'PEPE',
    tokenImageUrl: undefined,
    marketCap: undefined,
    currentPrice: undefined,
    isPerp: false,
    historicalPrices: [],
    priceDiff: 0,
    isPricesLoading: false,
    pricePercentChange: undefined,
    isClosed: false,
    positionValue: 240,
    pnlValue: 40,
    pnlPercent: 20,
    isPnlPositive: true,
    allTrades: [],
    tradeActions: [],
    chartTrades: [],
    activeTimePeriod: '1W',
    isTimePeriodAutoSelected: true,
    setActiveTimePeriod: mockSetActiveTimePeriod,
    setAutomaticTimePeriod: jest.fn(),
    timePeriods: [],
    ...overrides,
  }) as TraderPositionData;

const renderData = (position: Position, isClosed?: boolean) =>
  renderHook(() => usePositionSheetData(position, isClosed));

describe('usePositionSheetData', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW_MS });
    jest.clearAllMocks();
    mockUsePerpsSheetPrices.mockReturnValue({ prices: [], isLoading: false });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('spot', () => {
    const prices = hourlyPrices(NOW_MS - 6 * DAY_MS, NOW_MS, [90, 100, 120]);

    it('labels values in market cap when one is known', () => {
      mockUseTraderPositionData.mockReturnValue(
        baseData({
          historicalPrices: prices,
          currentPrice: 120,
          marketCap: 1_200_000,
          tradeActions: ['opened'],
        }),
      );

      const { result } = renderData(
        buildPosition({
          trades: [
            buildTrade({
              marketCap: 1_000_000,
              timestamp: NOW_MS - 3 * DAY_MS,
              action: 'opened',
            }),
          ],
        }),
      );

      expect(result.current.isMarketCapMode).toBe(true);
      expect(result.current.formatValue(120)).toBe('$1.2M');
      expect(result.current.markers).toHaveLength(1);
      expect(result.current.markers[0].tooltipLabel).toBe('Bought @ $1M');
      expect(result.current.isTrendPositive).toBe(true);
      expect(result.current.summaryTitle).toBe('2 PEPE');
    });

    it('falls back to price without a market cap', () => {
      mockUseTraderPositionData.mockReturnValue(
        baseData({ historicalPrices: prices, currentPrice: 120 }),
      );

      const { result } = renderData(buildPosition());

      expect(result.current.isMarketCapMode).toBe(false);
      expect(result.current.levels.map((level) => level.kind)).toEqual([
        'entry',
        'current',
      ]);
      expect(result.current.levels[0].label).toMatch(/^Entry · /);
    });

    it('asks for the narrowest spot period that covers the window', () => {
      mockUseTraderPositionData.mockReturnValue(
        baseData({ activeTimePeriod: '1W' }),
      );

      renderData(
        buildPosition({
          trades: [buildTrade({ timestamp: NOW_MS - 20 * DAY_MS })],
        }),
      );

      expect(mockSetActiveTimePeriod).toHaveBeenCalledWith('1M');
    });

    it('reports loading until the requested period is active', () => {
      mockUseTraderPositionData.mockReturnValue(
        baseData({ activeTimePeriod: '1M' }),
      );

      const { result } = renderData(buildPosition());

      expect(result.current.isPricesLoading).toBe(true);
    });

    it('sums the entry fills for a closed position', () => {
      mockUseTraderPositionData.mockReturnValue(
        baseData({ isClosed: true, historicalPrices: prices }),
      );

      const { result } = renderData(
        buildPosition({
          positionAmount: 0,
          trades: [
            buildTrade({ tokenAmount: 3 }),
            buildTrade({ tokenAmount: 4, transactionHash: '0xenter-2' }),
          ],
        }),
        true,
      );

      expect(result.current.summaryTitle).toBe('7 PEPE');
    });
  });

  describe('perps', () => {
    it('reads the line and current price from the hourly candles', () => {
      mockUseTraderPositionData.mockReturnValue(
        baseData({ isPerp: true, symbol: 'BTC', tradeActions: ['opened'] }),
      );
      mockUsePerpsSheetPrices.mockReturnValue({
        prices: hourlyPrices(NOW_MS - 6 * DAY_MS, NOW_MS, [110000, 104000]),
        isLoading: false,
      });

      const { result } = renderData(
        buildPerpPosition({
          trades: [
            buildTrade({
              direction: 'sell',
              tokenAmount: 1,
              usdCost: 107469,
              perpPositionType: 'short',
              action: 'opened',
              timestamp: NOW_MS - 2 * HOUR_MS,
            }),
          ],
        }),
      );

      expect(mockUsePerpsSheetPrices).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'BTC', enabled: true }),
      );
      expect(result.current.currentPrice).toBe(104000);
      expect(result.current.isTrendPositive).toBe(false);
      expect(result.current.perpTradeSymbol).toBe('BTC');
      expect(result.current.summaryTitle).toBe('BTC · 40x Short');
      expect(result.current.markers[0].tooltipLabel).toMatch(
        /^Opened short @ \$107,469/,
      );
    });

    it('skips the candle request offline', () => {
      mockUseTraderPositionData.mockReturnValue(baseData({ isPerp: true }));

      const { result } = renderHook(() =>
        usePositionSheetData(buildPerpPosition(), undefined, {
          isNetworkAvailable: false,
        }),
      );

      expect(mockUsePerpsSheetPrices).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
      expect(result.current.isPricesLoading).toBe(false);
    });
  });
});
