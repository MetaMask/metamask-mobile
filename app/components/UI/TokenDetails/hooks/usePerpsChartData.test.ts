import { renderHook, waitFor } from '@testing-library/react-native';
import { usePerpsChartData } from './usePerpsChartData';
import { usePerpsMarketForAsset } from '../../Perps/hooks/usePerpsMarketForAsset';
import { usePerpsLiveCandles } from '../../Perps/hooks/stream/usePerpsLiveCandles';
import { CandlePeriod, TimeDuration } from '../../Perps/constants/chartConfig';

jest.mock('../../Perps/hooks/usePerpsMarketForAsset');
jest.mock('../../Perps/hooks/stream/usePerpsLiveCandles');

const mockUsePerpsMarketForAsset = jest.mocked(usePerpsMarketForAsset);
const mockUsePerpsLiveCandles = jest.mocked(usePerpsLiveCandles);

describe('usePerpsChartData', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: no perps market
    mockUsePerpsMarketForAsset.mockReturnValue({
      hasPerpsMarket: false,
      marketData: null,
      isLoading: false,
      error: null,
    });

    // Default: no candle data
    mockUsePerpsLiveCandles.mockReturnValue({
      candleData: null,
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: false,
      error: null,
      fetchMoreHistory: jest.fn(),
    });
  });

  describe('market check', () => {
    it('returns hasPerpsMarket false when no market exists', async () => {
      mockUsePerpsMarketForAsset.mockReturnValue({
        hasPerpsMarket: false,
        marketData: null,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        usePerpsChartData({ symbol: 'UNKNOWN', timePeriod: '1d' }),
      );

      await waitFor(() => {
        expect(result.current.hasPerpsMarket).toBe(false);
        expect(result.current.isRealtime).toBe(false);
      });
    });

    it('returns hasPerpsMarket true when market exists', async () => {
      mockUsePerpsMarketForAsset.mockReturnValue({
        hasPerpsMarket: true,
        marketData: {
          symbol: 'ETH',
          name: 'ETH',
          maxLeverage: '50x',
          price: '',
          change24h: '',
          change24hPercent: '',
          volume: '',
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        usePerpsChartData({ symbol: 'ETH', timePeriod: '1d' }),
      );

      await waitFor(() => {
        expect(result.current.hasPerpsMarket).toBe(true);
      });
    });

    it('passes uppercase symbol to usePerpsMarketForAsset', async () => {
      renderHook(() => usePerpsChartData({ symbol: 'eth', timePeriod: '1d' }));

      await waitFor(() => {
        expect(mockUsePerpsMarketForAsset).toHaveBeenCalledWith('eth');
      });
    });

    it('does not check market when enabled is false', async () => {
      renderHook(() =>
        usePerpsChartData({ symbol: 'ETH', timePeriod: '1d', enabled: false }),
      );

      await waitFor(() => {
        expect(mockUsePerpsMarketForAsset).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe('candle data transformation', () => {
    beforeEach(() => {
      mockUsePerpsMarketForAsset.mockReturnValue({
        hasPerpsMarket: true,
        marketData: {
          symbol: 'ETH',
          name: 'ETH',
          maxLeverage: '50x',
          price: '',
          change24h: '',
          change24hPercent: '',
          volume: '',
        },
        isLoading: false,
        error: null,
      });
    });

    it('transforms candle data to TokenPrice format', async () => {
      mockUsePerpsLiveCandles.mockReturnValue({
        candleData: {
          symbol: 'ETH',
          interval: CandlePeriod.FifteenMinutes,
          candles: [
            {
              time: 1700000000000,
              open: '1800',
              high: '1850',
              low: '1780',
              close: '1820',
              volume: '1000',
            },
            {
              time: 1700001000000,
              open: '1820',
              high: '1900',
              low: '1810',
              close: '1880',
              volume: '1200',
            },
          ],
        },
        isLoading: false,
        isLoadingMore: false,
        hasHistoricalData: true,
        error: null,
        fetchMoreHistory: jest.fn(),
      });

      const { result } = renderHook(() =>
        usePerpsChartData({ symbol: 'ETH', timePeriod: '1d' }),
      );

      await waitFor(() => {
        expect(result.current.prices).toEqual([
          ['1700000000000', 1820],
          ['1700001000000', 1880],
        ]);
      });
    });

    it('calculates price metrics correctly', async () => {
      mockUsePerpsLiveCandles.mockReturnValue({
        candleData: {
          symbol: 'ETH',
          interval: CandlePeriod.FifteenMinutes,
          candles: [
            {
              time: 1700000000000,
              open: '1800',
              high: '1850',
              low: '1780',
              close: '1800',
              volume: '1000',
            },
            {
              time: 1700001000000,
              open: '1800',
              high: '1900',
              low: '1790',
              close: '1900',
              volume: '1200',
            },
          ],
        },
        isLoading: false,
        isLoadingMore: false,
        hasHistoricalData: true,
        error: null,
        fetchMoreHistory: jest.fn(),
      });

      const { result } = renderHook(() =>
        usePerpsChartData({ symbol: 'ETH', timePeriod: '1d' }),
      );

      await waitFor(() => {
        expect(result.current.currentPrice).toBe(1900);
        expect(result.current.comparePrice).toBe(1800);
        expect(result.current.priceDiff).toBe(100);
      });
    });

    it('returns isRealtime true when has perps market and prices', async () => {
      mockUsePerpsLiveCandles.mockReturnValue({
        candleData: {
          symbol: 'ETH',
          interval: CandlePeriod.FifteenMinutes,
          candles: [
            {
              time: 1700000000000,
              open: '1800',
              high: '1850',
              low: '1780',
              close: '1820',
              volume: '1000',
            },
          ],
        },
        isLoading: false,
        isLoadingMore: false,
        hasHistoricalData: true,
        error: null,
        fetchMoreHistory: jest.fn(),
      });

      const { result } = renderHook(() =>
        usePerpsChartData({ symbol: 'ETH', timePeriod: '1d' }),
      );

      await waitFor(() => {
        expect(result.current.isRealtime).toBe(true);
      });
    });

    it('returns empty prices when no candle data', async () => {
      mockUsePerpsLiveCandles.mockReturnValue({
        candleData: null,
        isLoading: false,
        isLoadingMore: false,
        hasHistoricalData: false,
        error: null,
        fetchMoreHistory: jest.fn(),
      });

      const { result } = renderHook(() =>
        usePerpsChartData({ symbol: 'ETH', timePeriod: '1d' }),
      );

      await waitFor(() => {
        expect(result.current.prices).toEqual([]);
        expect(result.current.isRealtime).toBe(false);
      });
    });
  });

  describe('time period mapping', () => {
    beforeEach(() => {
      mockUsePerpsMarketForAsset.mockReturnValue({
        hasPerpsMarket: true,
        marketData: {
          symbol: 'ETH',
          name: 'ETH',
          maxLeverage: '50x',
          price: '',
          change24h: '',
          change24hPercent: '',
          volume: '',
        },
        isLoading: false,
        error: null,
      });
    });

    it('maps 1d time period to 15m candles', async () => {
      renderHook(() => usePerpsChartData({ symbol: 'ETH', timePeriod: '1d' }));

      await waitFor(() => {
        expect(mockUsePerpsLiveCandles).toHaveBeenCalledWith(
          expect.objectContaining({
            symbol: 'ETH',
            interval: CandlePeriod.FifteenMinutes,
            duration: TimeDuration.OneDay,
          }),
        );
      });
    });

    it('maps 1w time period to 2h candles', async () => {
      renderHook(() => usePerpsChartData({ symbol: 'ETH', timePeriod: '1w' }));

      await waitFor(() => {
        expect(mockUsePerpsLiveCandles).toHaveBeenCalledWith(
          expect.objectContaining({
            interval: CandlePeriod.TwoHours,
            duration: TimeDuration.OneWeek,
          }),
        );
      });
    });

    it('maps 1m time period to 8h candles', async () => {
      renderHook(() => usePerpsChartData({ symbol: 'ETH', timePeriod: '1m' }));

      await waitFor(() => {
        expect(mockUsePerpsLiveCandles).toHaveBeenCalledWith(
          expect.objectContaining({
            interval: CandlePeriod.EightHours,
            duration: TimeDuration.OneMonth,
          }),
        );
      });
    });

    it('maps 1y time period to 1w candles', async () => {
      renderHook(() => usePerpsChartData({ symbol: 'ETH', timePeriod: '1y' }));

      await waitFor(() => {
        expect(mockUsePerpsLiveCandles).toHaveBeenCalledWith(
          expect.objectContaining({
            interval: CandlePeriod.OneWeek,
            duration: TimeDuration.Max,
          }),
        );
      });
    });
  });

  describe('loading states', () => {
    it('returns isLoading true when market is loading', async () => {
      mockUsePerpsMarketForAsset.mockReturnValue({
        hasPerpsMarket: false,
        marketData: null,
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() =>
        usePerpsChartData({ symbol: 'ETH', timePeriod: '1d' }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });
    });

    it('returns isLoading true when candles are loading for existing market', async () => {
      mockUsePerpsMarketForAsset.mockReturnValue({
        hasPerpsMarket: true,
        marketData: {
          symbol: 'ETH',
          name: 'ETH',
          maxLeverage: '50x',
          price: '',
          change24h: '',
          change24hPercent: '',
          volume: '',
        },
        isLoading: false,
        error: null,
      });

      mockUsePerpsLiveCandles.mockReturnValue({
        candleData: null,
        isLoading: true,
        isLoadingMore: false,
        hasHistoricalData: false,
        error: null,
        fetchMoreHistory: jest.fn(),
      });

      const { result } = renderHook(() =>
        usePerpsChartData({ symbol: 'ETH', timePeriod: '1d' }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });
    });
  });

  describe('error handling', () => {
    it('returns error from market check', async () => {
      mockUsePerpsMarketForAsset.mockReturnValue({
        hasPerpsMarket: false,
        marketData: null,
        isLoading: false,
        error: 'Failed to check market',
      });

      const { result } = renderHook(() =>
        usePerpsChartData({ symbol: 'ETH', timePeriod: '1d' }),
      );

      await waitFor(() => {
        expect(result.current.error?.message).toBe('Failed to check market');
      });
    });

    it('returns error from candle fetch', async () => {
      mockUsePerpsMarketForAsset.mockReturnValue({
        hasPerpsMarket: true,
        marketData: {
          symbol: 'ETH',
          name: 'ETH',
          maxLeverage: '50x',
          price: '',
          change24h: '',
          change24hPercent: '',
          volume: '',
        },
        isLoading: false,
        error: null,
      });

      mockUsePerpsLiveCandles.mockReturnValue({
        candleData: null,
        isLoading: false,
        isLoadingMore: false,
        hasHistoricalData: false,
        error: new Error('WebSocket error'),
        fetchMoreHistory: jest.fn(),
      });

      const { result } = renderHook(() =>
        usePerpsChartData({ symbol: 'ETH', timePeriod: '1d' }),
      );

      await waitFor(() => {
        expect(result.current.error?.message).toBe('WebSocket error');
      });
    });
  });
});
