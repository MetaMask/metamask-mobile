import { renderHook, act } from '@testing-library/react-hooks';
import { usePerpsPrices } from './usePerpsPrices';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsConnection } from './index';

// Mock dependencies
jest.mock('./usePerpsTrading');
jest.mock('./index');

describe('usePerpsPrices', () => {
  const mockSubscribeToPrices = jest.fn();
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (usePerpsTrading as jest.Mock).mockReturnValue({
      subscribeToPrices: mockSubscribeToPrices,
    });

    (usePerpsConnection as jest.Mock).mockReturnValue({
      isInitialized: true,
    });

    mockSubscribeToPrices.mockReturnValue(mockUnsubscribe);
  });

  it('should return empty prices initially', () => {
    const { result } = renderHook(() => usePerpsPrices(['ETH', 'BTC']));
    expect(result.current).toEqual({});
  });

  it('should subscribe to prices when initialized', () => {
    renderHook(() => usePerpsPrices(['ETH', 'BTC']));

    expect(mockSubscribeToPrices).toHaveBeenCalledWith({
      symbols: ['ETH', 'BTC'],
      callback: expect.any(Function),
      includeOrderBook: false,
    });
  });

  it('should update prices when callback is triggered', () => {
    const { result } = renderHook(() => usePerpsPrices(['ETH']));

    // Get the callback that was passed to subscribeToPrices
    const callback = mockSubscribeToPrices.mock.calls[0][0].callback;

    // Trigger price update
    act(() => {
      callback([
        {
          coin: 'ETH',
          price: '3000.00',
          change24h: 2.5,
          markPrice: '3001.00',
        },
      ]);
    });

    expect(result.current).toEqual({
      ETH: {
        coin: 'ETH',
        price: '3000.00',
        change24h: 2.5,
        markPrice: '3001.00',
      },
    });
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => usePerpsPrices(['ETH']));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should not subscribe when not initialized', () => {
    (usePerpsConnection as jest.Mock).mockReturnValue({
      isInitialized: false,
    });

    renderHook(() => usePerpsPrices(['ETH']));

    expect(mockSubscribeToPrices).not.toHaveBeenCalled();
  });

  it('should handle includeOrderBook parameter', () => {
    renderHook(() => usePerpsPrices(['ETH'], true));

    expect(mockSubscribeToPrices).toHaveBeenCalledWith({
      symbols: ['ETH'],
      callback: expect.any(Function),
      includeOrderBook: true,
    });
  });
});
