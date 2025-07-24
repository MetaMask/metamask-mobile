import { renderHook, act } from '@testing-library/react-hooks';
import { usePerpsPositionData } from './usePerpsPositionData';
import Engine from '../../../../core/Engine';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      fetchHistoricalCandles: jest.fn(),
      subscribeToPrices: jest.fn(),
    },
  },
}));

describe('usePerpsPositionData', () => {
  const mockFetchHistoricalCandles = Engine.context.PerpsController
    .fetchHistoricalCandles as jest.Mock;
  const mockSubscribeToPrices = Engine.context.PerpsController
    .subscribeToPrices as jest.Mock;
  const mockUnsubscribe = jest.fn();

  const mockCandleData = {
    candles: [
      { time: 1234567890, open: 3000, high: 3100, low: 2900, close: 3050 },
    ],
  };

  const mockPriceUpdate = {
    coin: 'ETH',
    price: '3000.00',
    change24h: 2.5,
    markPrice: '3001.00',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchHistoricalCandles.mockResolvedValue(mockCandleData);
    mockSubscribeToPrices.mockReturnValue(mockUnsubscribe);
  });

  it('should fetch historical candles on mount', async () => {
    const { waitForNextUpdate } = renderHook(() =>
      usePerpsPositionData({ coin: 'ETH', selectedInterval: '1h' }),
    );

    await waitForNextUpdate();

    expect(mockFetchHistoricalCandles).toHaveBeenCalledWith('ETH', '1h', 100);
  });

  it('should subscribe to price updates on mount', () => {
    renderHook(() =>
      usePerpsPositionData({ coin: 'ETH', selectedInterval: '1h' }),
    );

    expect(mockSubscribeToPrices).toHaveBeenCalledWith({
      symbols: ['ETH'],
      callback: expect.any(Function),
    });
  });

  it('should update price data when receiving updates', async () => {
    const { result } = renderHook(() =>
      usePerpsPositionData({ coin: 'ETH', selectedInterval: '1h' }),
    );

    // Get the callback that was passed to subscribeToPrices
    const callback = mockSubscribeToPrices.mock.calls[0][0].callback;

    // Trigger price update
    act(() => {
      callback([mockPriceUpdate]);
    });

    expect(result.current.priceData).toEqual(mockPriceUpdate);
  });

  it('should handle loading state correctly', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      usePerpsPositionData({ coin: 'ETH', selectedInterval: '1h' }),
    );

    // Initially loading
    expect(result.current.isLoadingHistory).toBe(true);

    // Wait for historical data to load
    await waitForNextUpdate();

    expect(result.current.isLoadingHistory).toBe(false);
    expect(result.current.candleData).toEqual(mockCandleData);
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() =>
      usePerpsPositionData({ coin: 'ETH', selectedInterval: '1h' }),
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should handle errors in fetching historical data', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetchHistoricalCandles.mockRejectedValue(new Error('Failed to fetch'));

    const { result, waitForNextUpdate } = renderHook(() =>
      usePerpsPositionData({ coin: 'ETH', selectedInterval: '1h' }),
    );

    await waitForNextUpdate();

    expect(result.current.isLoadingHistory).toBe(false);
    expect(result.current.candleData).toBe(null);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error loading historical candles:',
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
