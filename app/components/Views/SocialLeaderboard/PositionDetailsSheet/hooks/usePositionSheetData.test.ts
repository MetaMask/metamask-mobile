import type { Position } from '@metamask/social-controllers';
import { act, renderHook } from '@testing-library/react-native';
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
              timestamp: NOW_MS - 2 * HOUR_MS,
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
      expect(result.current.formatValue(120)).toMatch(/^\$120/);
    });

    it('requests 1D prices until the user picks another range', () => {
      mockUseTraderPositionData.mockReturnValue(
        baseData({ activeTimePeriod: '1W' }),
      );

      const { result } = renderData(buildPosition());

      expect(mockSetActiveTimePeriod).toHaveBeenCalledWith('1D');

      act(() => {
        result.current.setChartPeriod('1M');
      });

      expect(mockSetActiveTimePeriod).toHaveBeenCalledWith('1M');
      expect(result.current.chartPeriod).toBe('1M');
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
      expect(result.current.summarySubtitle).toBe('Sold · 2d ago');
      expect(result.current.summaryTagLabel).toBeUndefined();
    });

    it('ages an open position from firstTradeAt', () => {
      mockUseTraderPositionData.mockReturnValue(baseData());

      const { result } = renderData(
        Object.assign(buildPosition(), {
          firstTradeAt: (NOW_MS - 5 * HOUR_MS) / 1000,
        }),
      );

      expect(result.current.summarySubtitle).toBe('Opened · 5 hr ago');
    });

    it('leaves the caption empty when a closed position has no trades', () => {
      mockUseTraderPositionData.mockReturnValue(
        baseData({ isClosed: true, historicalPrices: prices }),
      );

      const { result } = renderData(
        buildPosition({ trades: [], lastTradeAt: 0 }),
        true,
      );

      expect(result.current.summarySubtitle).toBe('');
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
        expect.objectContaining({
          symbol: 'BTC',
          period: '1D',
          enabled: true,
        }),
      );
      expect(result.current.currentPrice).toBe(104000);
      expect(result.current.isTrendPositive).toBe(false);
      expect(result.current.perpTradeSymbol).toBe('BTC');
      expect(result.current.summaryTitle).toBe('2 BTC');
      expect(result.current.summaryTagLabel).toBe('40x Short');
      expect(result.current.summarySubtitle).toBe('Opened · 2 hr ago');
      expect(result.current.markers[0].tooltipLabel).toMatch(
        /^Opened short @ \$107,469/,
      );
    });

    it('sizes an open perp from the leveraged amount', () => {
      mockUseTraderPositionData.mockReturnValue(
        baseData({ isPerp: true, symbol: 'BTC' }),
      );

      const { result } = renderData(
        buildPerpPosition({
          positionAmount: 1,
          positionAmountWithLeverage: 40,
        }),
      );

      expect(result.current.summaryTitle).toBe('40 BTC');
    });

    it('ages a closed perp from the latest fill when lastTradeAt is missing', () => {
      mockUseTraderPositionData.mockReturnValue(
        baseData({ isPerp: true, symbol: 'BTC', isClosed: true }),
      );

      const { result } = renderData(
        buildPerpPosition({
          lastTradeAt: 0,
          trades: [
            buildTrade({
              timestamp: NOW_MS - 3 * DAY_MS,
              direction: 'sell',
              perpPositionType: 'short',
            }),
          ],
        }),
        true,
      );

      expect(result.current.summarySubtitle).toBe('Closed · 3d ago');
      expect(result.current.summaryTagLabel).toBe('40x Short');
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
