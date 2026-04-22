import { CandleStreamChannel } from './CandleStreamChannel';
import {
  CandlePeriod,
  PERFORMANCE_CONFIG,
  PERPS_CONSTANTS,
  TimeDuration,
  type CandleData,
} from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';

const mockGetIsInitialized = jest.fn().mockReturnValue(true);

jest.mock('../../../../../core/Engine');
jest.mock('../../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/Logger');

const mockEngine = Engine as jest.Mocked<typeof Engine>;

describe('CandleStreamChannel', () => {
  let channel: CandleStreamChannel;
  let mockSubscribeToCandles: jest.Mock;
  let mockIsCurrentlyReinitializing: jest.Mock;
  let mockFetchHistoricalCandles: jest.Mock;

  const mockCandleData: CandleData = {
    symbol: 'BTC',
    interval: CandlePeriod.OneHour,
    candles: [
      {
        time: 1700000000000,
        open: '50000',
        high: '51000',
        low: '49000',
        close: '50500',
        volume: '100',
      },
    ],
  };

  beforeEach(() => {
    channel = new CandleStreamChannel(mockGetIsInitialized);
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetIsInitialized.mockReturnValue(true);

    // Setup Engine.context.PerpsController mock
    mockSubscribeToCandles = jest.fn();
    mockIsCurrentlyReinitializing = jest.fn().mockReturnValue(false);
    mockFetchHistoricalCandles = jest.fn();
    mockEngine.context.PerpsController = {
      subscribeToCandles: mockSubscribeToCandles,
      isCurrentlyReinitializing: mockIsCurrentlyReinitializing,
      fetchHistoricalCandles: mockFetchHistoricalCandles,
    } as unknown as typeof mockEngine.context.PerpsController;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Flush the debounce delay used by connect() → deferConnect() (#28141)
  const flushConnectDebounce = () => jest.advanceTimersByTime(500);

  describe('Cache Management', () => {
    it('should generate correct cache key', () => {
      const callback = jest.fn();
      mockSubscribeToCandles.mockReturnValue(jest.fn());

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback,
      });
      flushConnectDebounce();

      expect(mockSubscribeToCandles).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTC',
          interval: CandlePeriod.OneHour,
        }),
      );
    });

    it('should return cached data immediately if available', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      let capturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ callback }) => {
        capturedCallback = callback;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: callback1,
      });
      flushConnectDebounce();

      capturedCallback?.(mockCandleData);

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: callback2,
      });

      expect(callback1).toHaveBeenCalledWith(mockCandleData);
      expect(callback2).toHaveBeenCalledWith(mockCandleData);
    });

    it('should maintain separate cache for different symbol+interval combinations', () => {
      const btcCallback = jest.fn();
      const ethCallback = jest.fn();

      const mockBtcData: CandleData = { ...mockCandleData, symbol: 'BTC' };
      const mockEthData: CandleData = { ...mockCandleData, symbol: 'ETH' };

      let btcCapturedCallback: ((data: CandleData) => void) | undefined;
      let ethCapturedCallback: ((data: CandleData) => void) | undefined;

      mockSubscribeToCandles.mockImplementation(({ symbol, callback }) => {
        if (symbol === 'BTC') {
          btcCapturedCallback = callback;
        } else if (symbol === 'ETH') {
          ethCapturedCallback = callback;
        }
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: btcCallback,
      });
      channel.subscribe({
        symbol: 'ETH',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: ethCallback,
      });
      flushConnectDebounce();

      btcCapturedCallback?.(mockBtcData);
      ethCapturedCallback?.(mockEthData);

      expect(btcCallback).toHaveBeenCalledWith(mockBtcData);
      expect(btcCallback).not.toHaveBeenCalledWith(mockEthData);
      expect(ethCallback).toHaveBeenCalledWith(mockEthData);
      expect(ethCallback).not.toHaveBeenCalledWith(mockBtcData);
    });

    it('should clear all cache on clearCache()', () => {
      const callback = jest.fn();

      let capturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ callback: cb }) => {
        capturedCallback = cb;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback,
      });
      flushConnectDebounce();

      capturedCallback?.(mockCandleData);
      channel.clearCache();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: '',
          interval: CandlePeriod.OneHour,
          candles: [],
        }),
      );
    });

    it('should return null when no cached data available', () => {
      const result = channel.getCachedData('BTC', CandlePeriod.OneHour);
      expect(result).toBeNull();
    });

    it('should return cached data via getCachedData', () => {
      let capturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ callback }) => {
        capturedCallback = callback;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      capturedCallback?.(mockCandleData);

      const result = channel.getCachedData('BTC', CandlePeriod.OneHour);
      expect(result).toEqual(mockCandleData);
    });
  });

  describe('Subscription Management', () => {
    it('should return unsubscribe function', () => {
      mockSubscribeToCandles.mockReturnValue(jest.fn());

      const unsubscribe = channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });

      expect(typeof unsubscribe).toBe('function');
    });

    it('should share WebSocket connection for same symbol+interval', () => {
      mockSubscribeToCandles.mockReturnValue(jest.fn());

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      expect(mockSubscribeToCandles).toHaveBeenCalledTimes(1);
    });

    it('should create separate WebSocket connections for different symbol+interval', () => {
      mockSubscribeToCandles.mockReturnValue(jest.fn());

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.FiveMinutes,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      channel.subscribe({
        symbol: 'ETH',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      expect(mockSubscribeToCandles).toHaveBeenCalledTimes(3);
    });

    it('should filter subscribers by cacheKey', () => {
      const btcCallback = jest.fn();
      const ethCallback = jest.fn();

      let btcCapturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ symbol, callback }) => {
        if (symbol === 'BTC') {
          btcCapturedCallback = callback;
        }
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: btcCallback,
      });
      channel.subscribe({
        symbol: 'ETH',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: ethCallback,
      });
      flushConnectDebounce();

      btcCapturedCallback?.(mockCandleData);

      expect(btcCallback).toHaveBeenCalledWith(mockCandleData);
      expect(ethCallback).not.toHaveBeenCalled();
    });

    it('should disconnect WebSocket when last subscriber unsubscribes', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToCandles.mockReturnValue(mockUnsubscribe);

      const unsubscribe1 = channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      const unsubscribe2 = channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      unsubscribe1();
      expect(mockUnsubscribe).not.toHaveBeenCalled();

      unsubscribe2();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should not disconnect WebSocket when subscribers remain for different cacheKey', () => {
      const mockBtcUnsubscribe = jest.fn();
      const mockEthUnsubscribe = jest.fn();

      mockSubscribeToCandles.mockImplementation(({ symbol }) =>
        symbol === 'BTC' ? mockBtcUnsubscribe : mockEthUnsubscribe,
      );

      const btcUnsubscribe = channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      channel.subscribe({
        symbol: 'ETH',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      btcUnsubscribe();

      expect(mockBtcUnsubscribe).toHaveBeenCalled();
      expect(mockEthUnsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('WebSocket Integration', () => {
    it('should call Engine.context.PerpsController.subscribeToCandles', () => {
      mockSubscribeToCandles.mockReturnValue(jest.fn());

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      expect(
        Engine.context.PerpsController.subscribeToCandles,
      ).toHaveBeenCalled();
    });

    it('should defer connection if controller is reinitializing', () => {
      mockIsCurrentlyReinitializing.mockReturnValue(true);
      mockSubscribeToCandles.mockReturnValue(jest.fn());

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });

      expect(mockSubscribeToCandles).not.toHaveBeenCalled();

      mockIsCurrentlyReinitializing.mockReturnValue(false);
      jest.advanceTimersByTime(5000);

      expect(mockSubscribeToCandles).toHaveBeenCalled();
    });

    it('should retry deferred connection until the controller initializes', () => {
      mockGetIsInitialized.mockReturnValue(false);
      mockSubscribeToCandles.mockReturnValue(jest.fn());

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });

      jest.advanceTimersByTime(PERFORMANCE_CONFIG.NavigationParamsDelayMs);
      expect(mockSubscribeToCandles).not.toHaveBeenCalled();

      mockGetIsInitialized.mockReturnValue(true);
      jest.advanceTimersByTime(PERPS_CONSTANTS.ConnectRetryDelayMs);

      expect(mockSubscribeToCandles).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTC',
          interval: CandlePeriod.OneHour,
          duration: TimeDuration.OneWeek,
        }),
      );
    });

    it('uses a lighter initial candle fetch when reconnecting with cached data', () => {
      let capturedCallback: ((data: CandleData) => void) | undefined;
      const mockUnsubscribe = jest.fn();
      mockSubscribeToCandles.mockImplementation(({ callback }) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const unsubscribe = channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();
      capturedCallback?.(mockCandleData);

      unsubscribe();

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      expect(mockSubscribeToCandles).toHaveBeenLastCalledWith(
        expect.objectContaining({
          symbol: 'BTC',
          interval: CandlePeriod.OneHour,
          duration: TimeDuration.OneDay,
        }),
      );
    });

    it('should disconnect WebSocket via stored cleanup function', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToCandles.mockReturnValue(mockUnsubscribe);

      const unsubscribe = channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      unsubscribe();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Throttling', () => {
    it('should send first update immediately', () => {
      const callback = jest.fn();

      let capturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ callback: cb }) => {
        capturedCallback = cb;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback,
        throttleMs: 1000,
      });
      flushConnectDebounce();

      capturedCallback?.(mockCandleData);

      expect(callback).toHaveBeenCalledWith(mockCandleData);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should throttle subsequent updates', () => {
      const callback = jest.fn();

      let capturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ callback: cb }) => {
        capturedCallback = cb;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback,
        throttleMs: 1000,
      });
      flushConnectDebounce();

      capturedCallback?.(mockCandleData);
      expect(callback).toHaveBeenCalledTimes(1);

      const updatedData = {
        ...mockCandleData,
        candles: [
          ...mockCandleData.candles,
          {
            time: 1700003600000,
            open: '50500',
            high: '52000',
            low: '50000',
            close: '51500',
            volume: '120',
          },
        ],
      };
      capturedCallback?.(updatedData);

      expect(callback).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1000);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith(updatedData);
    });

    it('should use latest update when throttling', () => {
      const callback = jest.fn();

      let capturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ callback: cb }) => {
        capturedCallback = cb;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback,
        throttleMs: 1000,
      });
      flushConnectDebounce();

      capturedCallback?.(mockCandleData);

      const update1 = {
        ...mockCandleData,
        candles: [{ ...mockCandleData.candles[0], close: '50600' }],
      };
      const update2 = {
        ...mockCandleData,
        candles: [{ ...mockCandleData.candles[0], close: '50700' }],
      };
      const update3 = {
        ...mockCandleData,
        candles: [{ ...mockCandleData.candles[0], close: '50800' }],
      };

      capturedCallback?.(update1);
      capturedCallback?.(update2);
      capturedCallback?.(update3);

      jest.advanceTimersByTime(1000);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith(update3);
    });

    it('should not throttle when throttleMs not provided', () => {
      const callback = jest.fn();

      let capturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ callback: cb }) => {
        capturedCallback = cb;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback,
      });
      flushConnectDebounce();

      capturedCallback?.(mockCandleData);
      expect(callback).toHaveBeenCalledTimes(1);

      capturedCallback?.(mockCandleData);
      expect(callback).toHaveBeenCalledTimes(2);

      capturedCallback?.(mockCandleData);
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should clear throttle timer on unsubscribe', () => {
      const callback = jest.fn();

      let capturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ callback: cb }) => {
        capturedCallback = cb;
        return jest.fn();
      });

      const unsubscribe = channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback,
        throttleMs: 1000,
      });
      flushConnectDebounce();

      capturedCallback?.(mockCandleData);
      capturedCallback?.(mockCandleData);

      unsubscribe();

      jest.advanceTimersByTime(1000);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pause and Resume', () => {
    it('should not notify subscribers when paused', () => {
      const callback = jest.fn();

      let capturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ callback: cb }) => {
        capturedCallback = cb;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback,
      });
      flushConnectDebounce();

      channel.pause();
      capturedCallback?.(mockCandleData);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should resume notifying subscribers after resume', () => {
      const callback = jest.fn();

      let capturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ callback: cb }) => {
        capturedCallback = cb;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback,
      });
      flushConnectDebounce();

      channel.pause();
      capturedCallback?.(mockCandleData);
      expect(callback).not.toHaveBeenCalled();

      channel.resume();
      capturedCallback?.(mockCandleData);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Disconnect All', () => {
    it('should disconnect all WebSocket subscriptions', () => {
      const mockBtcUnsubscribe = jest.fn();
      const mockEthUnsubscribe = jest.fn();

      mockSubscribeToCandles.mockImplementation(({ symbol }) =>
        symbol === 'BTC' ? mockBtcUnsubscribe : mockEthUnsubscribe,
      );

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      channel.subscribe({
        symbol: 'ETH',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      channel.disconnectAll();

      expect(mockBtcUnsubscribe).toHaveBeenCalled();
      expect(mockEthUnsubscribe).toHaveBeenCalled();
    });

    it('should clear all throttle timers on disconnectAll', () => {
      const callback = jest.fn();

      let capturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ callback: cb }) => {
        capturedCallback = cb;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback,
        throttleMs: 1000,
      });
      flushConnectDebounce();

      capturedCallback?.(mockCandleData);
      capturedCallback?.(mockCandleData);

      channel.disconnectAll();

      jest.advanceTimersByTime(1000);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Clear Cache', () => {
    it('should disconnect all WebSocket subscriptions on clearCache', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToCandles.mockReturnValue(mockUnsubscribe);

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      channel.clearCache();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should clear all throttle timers on clearCache', () => {
      const callback = jest.fn();

      let capturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ callback: cb }) => {
        capturedCallback = cb;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback,
        throttleMs: 1000,
      });
      flushConnectDebounce();

      capturedCallback?.(mockCandleData);
      capturedCallback?.(mockCandleData);

      channel.clearCache();

      jest.advanceTimersByTime(1000);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          candles: [],
        }),
      );
    });

    it('cancels deferred connect timers on clearCache', () => {
      mockGetIsInitialized.mockReturnValue(false);
      mockSubscribeToCandles.mockReturnValue(jest.fn());

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });

      channel.clearCache();
      jest.advanceTimersByTime(
        PERFORMANCE_CONFIG.NavigationParamsDelayMs +
          PERPS_CONSTANTS.ConnectRetryDelayMs,
      );

      expect(mockSubscribeToCandles).not.toHaveBeenCalled();
    });
  });

  describe('Fetch Historical Candles', () => {
    it('returns early when no cached data exists', async () => {
      await channel.fetchHistoricalCandles(
        'BTC',
        CandlePeriod.OneHour,
        TimeDuration.OneDay,
      );

      expect(mockFetchHistoricalCandles).not.toHaveBeenCalled();
    });

    it('returns early when cached data has no candles', async () => {
      let capturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ callback }) => {
        capturedCallback = callback;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      const emptyData: CandleData = {
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        candles: [],
      };
      capturedCallback?.(emptyData);

      await channel.fetchHistoricalCandles(
        'BTC',
        CandlePeriod.OneHour,
        TimeDuration.OneDay,
      );

      expect(mockFetchHistoricalCandles).not.toHaveBeenCalled();
    });

    it('fetches and merges historical candles successfully', async () => {
      let capturedCallback: ((data: CandleData) => void) | undefined;
      const subscriber = jest.fn();
      mockSubscribeToCandles.mockImplementation(({ callback }) => {
        capturedCallback = callback;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: subscriber,
      });
      flushConnectDebounce();

      capturedCallback?.(mockCandleData);

      const olderCandles: CandleData = {
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        candles: [
          {
            time: 1699996400000,
            open: '49000',
            high: '50000',
            low: '48500',
            close: '49500',
            volume: '80',
          },
        ],
      };

      mockFetchHistoricalCandles.mockResolvedValue(olderCandles);

      await channel.fetchHistoricalCandles(
        'BTC',
        CandlePeriod.OneHour,
        TimeDuration.OneDay,
      );

      expect(mockFetchHistoricalCandles).toHaveBeenCalledWith({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        limit: 50,
        endTime: expect.any(Number),
      });

      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTC',
          candles: expect.arrayContaining([
            expect.objectContaining({ time: 1699996400000 }),
            expect.objectContaining({ time: 1700000000000 }),
          ]),
        }),
      );
    });

    it('filters out duplicate candles when merging', async () => {
      let capturedCallback: ((data: CandleData) => void) | undefined;
      const subscriber = jest.fn();
      mockSubscribeToCandles.mockImplementation(({ callback }) => {
        capturedCallback = callback;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: subscriber,
      });
      flushConnectDebounce();

      capturedCallback?.(mockCandleData);

      const duplicateCandles: CandleData = {
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        candles: [mockCandleData.candles[0]],
      };

      mockFetchHistoricalCandles.mockResolvedValue(duplicateCandles);

      await channel.fetchHistoricalCandles(
        'BTC',
        CandlePeriod.OneHour,
        TimeDuration.OneDay,
      );

      const lastCall = subscriber.mock.calls[subscriber.mock.calls.length - 1];
      expect(lastCall[0].candles).toHaveLength(1);
    });

    it('handles fetch error gracefully', async () => {
      let capturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ callback }) => {
        capturedCallback = callback;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      capturedCallback?.(mockCandleData);

      const fetchError = new Error('Network error');
      mockFetchHistoricalCandles.mockRejectedValue(fetchError);

      await expect(
        channel.fetchHistoricalCandles(
          'BTC',
          CandlePeriod.OneHour,
          TimeDuration.OneDay,
        ),
      ).rejects.toThrow('Network error');
    });

    it('skips Sentry logging for abort errors', async () => {
      const Logger = jest.requireMock('../../../../../util/Logger').default;
      let capturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ callback }) => {
        capturedCallback = callback;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      capturedCallback?.(mockCandleData);

      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetchHistoricalCandles.mockRejectedValue(abortError);

      await expect(
        channel.fetchHistoricalCandles(
          'BTC',
          CandlePeriod.OneHour,
          TimeDuration.OneDay,
        ),
      ).rejects.toThrow();

      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('returns early when no additional candles available', async () => {
      let capturedCallback: ((data: CandleData) => void) | undefined;
      const subscriber = jest.fn();
      mockSubscribeToCandles.mockImplementation(({ callback }) => {
        capturedCallback = callback;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: subscriber,
      });
      flushConnectDebounce();

      capturedCallback?.(mockCandleData);
      subscriber.mockClear();

      mockFetchHistoricalCandles.mockResolvedValue(null);

      await channel.fetchHistoricalCandles(
        'BTC',
        CandlePeriod.OneHour,
        TimeDuration.OneDay,
      );

      expect(subscriber).not.toHaveBeenCalled();
    });
  });

  describe('Initial Fetch Duration', () => {
    it('uses OneWeek duration on cold cache for lighter initial fetch', () => {
      mockSubscribeToCandles.mockReturnValue(jest.fn());

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      expect(mockSubscribeToCandles).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: TimeDuration.OneWeek,
        }),
      );
    });

    it('uses OneDay duration on cache hit for minimal fetch', () => {
      let capturedCallback: ((data: CandleData) => void) | undefined;
      mockSubscribeToCandles.mockImplementation(({ callback }) => {
        capturedCallback = callback;
        return jest.fn();
      });

      // First subscribe — populates cache
      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();
      capturedCallback?.(mockCandleData);

      // Disconnect then re-subscribe (simulates market revisit)
      channel.disconnect('BTC-1h');
      mockSubscribeToCandles.mockClear();

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      expect(mockSubscribeToCandles).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: TimeDuration.OneDay,
        }),
      );
    });

    it('shares WebSocket connection when subscribers use different durations for same symbol+interval', () => {
      mockSubscribeToCandles.mockReturnValue(jest.fn());

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.YearToDate,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      expect(mockSubscribeToCandles).toHaveBeenCalledTimes(1);
    });

    it('second subscriber receives cached data immediately', () => {
      let capturedCallback: ((data: CandleData) => void) | undefined;
      const firstCallback = jest.fn();
      const secondCallback = jest.fn();

      mockSubscribeToCandles.mockImplementation(({ callback }) => {
        capturedCallback = callback;
        return jest.fn();
      });

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.YearToDate,
        callback: firstCallback,
      });
      flushConnectDebounce();

      capturedCallback?.(mockCandleData);

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: secondCallback,
      });

      expect(secondCallback).toHaveBeenCalledWith(mockCandleData);
    });
  });

  describe('disconnect without cacheKey', () => {
    it('calls disconnectAll when disconnect is called without cacheKey', () => {
      const mockBtcUnsubscribe = jest.fn();
      const mockEthUnsubscribe = jest.fn();

      mockSubscribeToCandles
        .mockReturnValueOnce(mockBtcUnsubscribe)
        .mockReturnValueOnce(mockEthUnsubscribe);

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      channel.subscribe({
        symbol: 'ETH',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      channel.disconnect();

      expect(mockBtcUnsubscribe).toHaveBeenCalled();
      expect(mockEthUnsubscribe).toHaveBeenCalled();
    });

    it('calls disconnectAll when disconnect is called with undefined cacheKey', () => {
      const mockBtcUnsubscribe = jest.fn();

      mockSubscribeToCandles.mockReturnValueOnce(mockBtcUnsubscribe);

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      channel.disconnect(undefined);

      expect(mockBtcUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('reconnect', () => {
    it('should correctly parse cache keys with coin symbols containing hyphens', () => {
      const mockEthUsdUnsubscribe = jest.fn();
      const mockBtcUnsubscribe = jest.fn();

      mockSubscribeToCandles
        .mockReturnValueOnce(mockEthUsdUnsubscribe)
        .mockReturnValueOnce(mockBtcUnsubscribe);

      channel.subscribe({
        symbol: 'ETH-USD',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneDay,
        duration: TimeDuration.OneWeek,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      mockSubscribeToCandles.mockClear();

      channel.reconnect();
      flushConnectDebounce();

      expect(mockSubscribeToCandles).toHaveBeenCalledTimes(2);
      expect(mockSubscribeToCandles).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'ETH-USD',
          interval: CandlePeriod.OneHour,
        }),
      );
      expect(mockSubscribeToCandles).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTC',
          interval: CandlePeriod.OneDay,
        }),
      );
    });

    it('should handle multiple coins with hyphens correctly', () => {
      const mockUnsubscribe1 = jest.fn();
      const mockUnsubscribe2 = jest.fn();
      const mockUnsubscribe3 = jest.fn();

      mockSubscribeToCandles
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe2)
        .mockReturnValueOnce(mockUnsubscribe3);

      channel.subscribe({
        symbol: 'ETH-USD',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      channel.subscribe({
        symbol: 'BTC-USD',
        interval: CandlePeriod.TwoHours,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });
      channel.subscribe({
        symbol: 'SOL-USD',
        interval: CandlePeriod.FourHours,
        duration: TimeDuration.OneWeek,
        callback: jest.fn(),
      });
      flushConnectDebounce();

      mockSubscribeToCandles.mockClear();

      channel.reconnect();
      flushConnectDebounce();

      expect(mockSubscribeToCandles).toHaveBeenCalledTimes(3);
      expect(mockSubscribeToCandles).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'ETH-USD',
          interval: CandlePeriod.OneHour,
        }),
      );
      expect(mockSubscribeToCandles).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTC-USD',
          interval: CandlePeriod.TwoHours,
        }),
      );
      expect(mockSubscribeToCandles).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'SOL-USD',
          interval: CandlePeriod.FourHours,
        }),
      );
    });
  });
});
