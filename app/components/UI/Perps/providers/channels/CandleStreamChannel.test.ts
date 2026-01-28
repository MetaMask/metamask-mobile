import { CandleStreamChannel } from './CandleStreamChannel';
import { CandlePeriod, TimeDuration } from '../../constants/chartConfig';
import type { CandleData } from '../../types/perps-types';
import Engine from '../../../../../core/Engine';

jest.mock('../../../../../core/Engine');
jest.mock('../../../../../core/SDKConnect/utils/DevLogger');

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
    channel = new CandleStreamChannel();
    jest.clearAllMocks();
    jest.useFakeTimers();

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

  describe('Cache Management', () => {
    it('should generate correct cache key', () => {
      // Test via subscription - cache key format is symbol-interval
      const callback = jest.fn();
      mockSubscribeToCandles.mockReturnValue(jest.fn());

      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback,
      });

      // Verify subscription was called (implies cache key was used internally)
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

      // First subscription
      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: callback1,
      });

      // Simulate WebSocket data
      capturedCallback?.(mockCandleData);

      // Second subscription to same symbol+interval should get cached data
      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: callback2,
      });

      // Both callbacks should have been invoked
      expect(callback1).toHaveBeenCalledWith(mockCandleData);
      expect(callback2).toHaveBeenCalledWith(mockCandleData);
    });

    it('should maintain separate cache for different symbol+interval combinations', () => {
      const btcCallback = jest.fn();
      const ethCallback = jest.fn();

      const mockBtcData: CandleData = {
        ...mockCandleData,
        symbol: 'BTC',
      };

      const mockEthData: CandleData = {
        ...mockCandleData,
        symbol: 'ETH',
      };

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

      // Subscribe to BTC
      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: btcCallback,
      });

      // Subscribe to ETH
      channel.subscribe({
        symbol: 'ETH',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: ethCallback,
      });

      // Send BTC data
      btcCapturedCallback?.(mockBtcData);

      // Send ETH data
      ethCapturedCallback?.(mockEthData);

      // Each callback should only receive its own data
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

      // Subscribe and populate cache
      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback,
      });

      capturedCallback?.(mockCandleData);

      // Clear cache
      channel.clearCache();

      // Should notify subscribers with cleared data
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

      // Subscribe twice to same symbol+interval
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

      // Should only call subscribeToCandles once
      expect(mockSubscribeToCandles).toHaveBeenCalledTimes(1);
    });

    it('should create separate WebSocket connections for different symbol+interval', () => {
      mockSubscribeToCandles.mockReturnValue(jest.fn());

      // Subscribe to different combinations
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

      // Should call subscribeToCandles three times
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

      // Subscribe to BTC
      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: btcCallback,
      });

      // Subscribe to ETH
      channel.subscribe({
        symbol: 'ETH',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: ethCallback,
      });

      // Send BTC data
      btcCapturedCallback?.(mockCandleData);

      // Only BTC callback should be invoked
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

      // Unsubscribe first subscriber - WebSocket should stay connected
      unsubscribe1();
      expect(mockUnsubscribe).not.toHaveBeenCalled();

      // Unsubscribe last subscriber - WebSocket should disconnect
      unsubscribe2();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should not disconnect WebSocket when subscribers remain for different cacheKey', () => {
      const mockBtcUnsubscribe = jest.fn();
      const mockEthUnsubscribe = jest.fn();

      // Note:
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

      // Unsubscribe from BTC
      btcUnsubscribe();

      // BTC WebSocket should disconnect, but ETH should remain
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

      // Should not call subscribe immediately
      expect(mockSubscribeToCandles).not.toHaveBeenCalled();

      // Fast-forward timers to trigger retry
      mockIsCurrentlyReinitializing.mockReturnValue(false);
      jest.advanceTimersByTime(5000);

      // Should call subscribe after delay
      expect(mockSubscribeToCandles).toHaveBeenCalled();
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

      // First update should be immediate
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

      // First update - immediate
      capturedCallback?.(mockCandleData);
      expect(callback).toHaveBeenCalledTimes(1);

      // Second update - should be throttled
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

      // Should not call callback immediately
      expect(callback).toHaveBeenCalledTimes(1);

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Should call callback after throttle period
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

      // First update
      capturedCallback?.(mockCandleData);

      // Multiple updates during throttle period
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

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Should only send the latest update
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
        // No throttleMs
      });

      // All updates should be immediate
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

      // First update
      capturedCallback?.(mockCandleData);

      // Second update (throttled)
      capturedCallback?.(mockCandleData);

      // Unsubscribe before throttle expires
      unsubscribe();

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Should not call callback after unsubscribe
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

      // Pause channel
      channel.pause();

      // Send update
      capturedCallback?.(mockCandleData);

      // Callback should not be invoked
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

      // Pause and send update
      channel.pause();
      capturedCallback?.(mockCandleData);
      expect(callback).not.toHaveBeenCalled();

      // Resume and send another update
      channel.resume();
      capturedCallback?.(mockCandleData);

      // Callback should be invoked
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Disconnect All', () => {
    it('should disconnect all WebSocket subscriptions', () => {
      const mockBtcUnsubscribe = jest.fn();
      const mockEthUnsubscribe = jest.fn();

      // Note:
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

      // Disconnect all
      channel.disconnectAll();

      // Both unsubscribe functions should be called
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

      // Send first update
      capturedCallback?.(mockCandleData);

      // Send second update (throttled)
      capturedCallback?.(mockCandleData);

      // Disconnect all
      channel.disconnectAll();

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Should not invoke callback after disconnect
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

      // Send updates
      capturedCallback?.(mockCandleData);
      capturedCallback?.(mockCandleData);

      // Clear cache
      channel.clearCache();

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Should have called callback for cleared data (from clearCache)
      // but not from throttled update
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          candles: [],
        }),
      );
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

      expect(mockFetchHistoricalCandles).toHaveBeenCalledWith(
        'BTC',
        CandlePeriod.OneHour,
        50,
        expect.any(Number),
      );

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

  describe('Always Uses Maximum Duration', () => {
    it('always uses YEAR_TO_DATE duration when subscribing regardless of requested duration', () => {
      mockSubscribeToCandles.mockImplementation(({ duration }) => {
        // Verify YEAR_TO_DATE is always used
        expect(duration).toBe(TimeDuration.YearToDate);
        return jest.fn();
      });

      // Subscribe with ONE_DAY - should still use YEAR_TO_DATE internally
      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });

      expect(mockSubscribeToCandles).toHaveBeenCalledTimes(1);
    });

    it('shares WebSocket connection when subscribers use different durations for same symbol+interval', () => {
      mockSubscribeToCandles.mockReturnValue(jest.fn());

      // First subscriber with ONE_DAY
      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });

      // Second subscriber with YEAR_TO_DATE (different duration, same symbol+interval)
      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.YearToDate,
        callback: jest.fn(),
      });

      // WebSocket subscription created only once (connection is shared)
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

      // First subscriber
      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.YearToDate,
        callback: firstCallback,
      });

      // Simulate initial data load
      capturedCallback?.(mockCandleData);

      // Second subscriber
      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: secondCallback,
      });

      // Second callback receives cached data immediately
      expect(secondCallback).toHaveBeenCalledWith(mockCandleData);
    });
  });

  describe('disconnect without cacheKey', () => {
    it('calls disconnectAll when disconnect is called without cacheKey', () => {
      const mockBtcUnsubscribe = jest.fn();
      const mockEthUnsubscribe = jest.fn();

      // Set up subscriptions
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

      // Act - call disconnect without cacheKey
      channel.disconnect();

      // Assert - both unsubscribe functions should be called (via disconnectAll)
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

      // Act - call disconnect with undefined
      channel.disconnect(undefined);

      // Assert - unsubscribe function should be called (via disconnectAll)
      expect(mockBtcUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('reconnect', () => {
    it('should correctly parse cache keys with coin symbols containing hyphens', () => {
      const mockEthUsdUnsubscribe = jest.fn();
      const mockBtcUnsubscribe = jest.fn();

      // Setup subscriptions with coins that contain hyphens
      mockSubscribeToCandles
        .mockReturnValueOnce(mockEthUsdUnsubscribe)
        .mockReturnValueOnce(mockBtcUnsubscribe);

      // Subscribe to ETH-USD (coin with hyphen)
      channel.subscribe({
        symbol: 'ETH-USD',
        interval: CandlePeriod.OneHour,
        duration: TimeDuration.OneDay,
        callback: jest.fn(),
      });

      // Subscribe to BTC (coin without hyphen)
      channel.subscribe({
        symbol: 'BTC',
        interval: CandlePeriod.OneDay,
        duration: TimeDuration.OneWeek,
        callback: jest.fn(),
      });

      // Clear previous calls
      mockSubscribeToCandles.mockClear();

      // Act - reconnect all channels
      channel.reconnect();

      // Assert - both subscriptions should be re-established with correct coin and interval
      expect(mockSubscribeToCandles).toHaveBeenCalledTimes(2);

      // Verify ETH-USD subscription was reconnected correctly
      expect(mockSubscribeToCandles).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'ETH-USD',
          interval: CandlePeriod.OneHour,
        }),
      );

      // Verify BTC subscription was reconnected correctly
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

      // Subscribe to multiple coins with hyphens
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

      // Clear previous calls
      mockSubscribeToCandles.mockClear();

      // Act - reconnect
      channel.reconnect();

      // Assert - all three subscriptions should be re-established correctly
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
