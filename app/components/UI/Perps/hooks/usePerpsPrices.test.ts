import { renderHook, act } from '@testing-library/react-hooks';
import { usePerpsPrices } from './usePerpsPrices';
import { usePerpsTrading } from './usePerpsTrading';

jest.mock('./usePerpsTrading');
jest.mock('./usePerpsConnection', () => ({
  usePerpsConnection: jest.fn(),
}));

describe('usePerpsPrices', () => {
  const mockSubscribeToPrices = jest.fn();
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (usePerpsTrading as jest.Mock).mockReturnValue({
      subscribeToPrices: mockSubscribeToPrices,
    });

    const { usePerpsConnection } = jest.requireMock('./usePerpsConnection');
    usePerpsConnection.mockReturnValue({
      isInitialized: true,
    });

    mockSubscribeToPrices.mockReturnValue(mockUnsubscribe);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return empty prices initially', () => {
    const { result } = renderHook(() => usePerpsPrices(['ETH', 'BTC'], {}));
    expect(result.current).toEqual({});
  });

  it('should subscribe to prices when initialized', () => {
    renderHook(() => usePerpsPrices(['ETH', 'BTC'], {}));

    expect(mockSubscribeToPrices).toHaveBeenCalledWith({
      symbols: ['ETH', 'BTC'],
      callback: expect.any(Function),
      includeOrderBook: false,
      includeMarketData: false,
    });
  });

  it('should update prices when callback is triggered', () => {
    const { result } = renderHook(() => usePerpsPrices(['ETH'], {}));

    // Get the callback that was passed to subscribeToPrices
    const callback = mockSubscribeToPrices.mock.calls[0][0].callback;

    // Trigger price update
    act(() => {
      callback([
        {
          symbol: 'ETH',
          price: '3000.00',
          change24h: 2.5,
          markPrice: '3001.00',
        },
      ]);
      // Run the debounce timer (1000ms - from PERFORMANCE_CONFIG.PRICE_UPDATE_DEBOUNCE_MS)
      jest.advanceTimersByTime(1000);
    });

    expect(result.current).toEqual({
      ETH: {
        symbol: 'ETH',
        price: '3000.00',
        change24h: 2.5,
        markPrice: '3001.00',
      },
    });
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => usePerpsPrices(['ETH'], {}));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should not subscribe when not initialized', () => {
    const { usePerpsConnection } = jest.requireMock('./usePerpsConnection');
    usePerpsConnection.mockReturnValue({
      isInitialized: false,
    });

    renderHook(() => usePerpsPrices(['ETH'], {}));

    expect(mockSubscribeToPrices).not.toHaveBeenCalled();
  });

  it('should handle includeOrderBook parameter', () => {
    renderHook(() => usePerpsPrices(['ETH'], { includeOrderBook: true }));

    expect(mockSubscribeToPrices).toHaveBeenCalledWith({
      symbols: ['ETH'],
      callback: expect.any(Function),
      includeOrderBook: true,
      includeMarketData: false,
    });
  });
});
