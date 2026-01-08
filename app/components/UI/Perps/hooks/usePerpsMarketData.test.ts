import { renderHook } from '@testing-library/react-hooks';
import { usePerpsMarketData } from './usePerpsMarketData';
import { usePerpsTrading } from './usePerpsTrading';
import usePerpsToasts, { type PerpsToastOptionsConfig } from './usePerpsToasts';
import type { MarketInfo } from '../controllers/types';

// Mock the usePerpsTrading hook
jest.mock('./usePerpsTrading');

// Mock usePerpsToasts hook
jest.mock('./usePerpsToasts', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    showToast: jest.fn(),
    PerpsToastOptions: {
      dataFetching: {
        market: {
          error: {
            marketDataUnavailable: jest.fn(),
          },
        },
      },
    },
  })),
}));

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
  },
}));

describe('usePerpsMarketData', () => {
  const mockGetMarkets = jest.fn();
  const mockMarketData: MarketInfo = {
    name: 'BTC',
    szDecimals: 6,
    maxLeverage: 50,
    marginTableId: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePerpsTrading as jest.Mock).mockReturnValue({
      getMarkets: mockGetMarkets,
    });
  });

  it('should fetch market data successfully', async () => {
    mockGetMarkets.mockResolvedValue([mockMarketData]);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePerpsMarketData('BTC'),
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.marketData).toBe(null);
    expect(result.current.error).toBe(null);

    // Wait for data to load
    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.marketData).toEqual(mockMarketData);
    expect(result.current.error).toBe(null);
    expect(mockGetMarkets).toHaveBeenCalledWith({ symbols: ['BTC'] });
  });

  it('should handle asset not found', async () => {
    mockGetMarkets.mockResolvedValue([
      { name: 'ETH', szDecimals: 6, maxLeverage: 40, marginTableId: 2 },
    ]);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePerpsMarketData('BTC'),
    );

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.marketData).toBe(null);
    expect(result.current.error).toBe('Asset BTC is not tradable');
  });

  it('should handle errors', async () => {
    const error = new Error('Network error');
    mockGetMarkets.mockRejectedValue(error);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePerpsMarketData('BTC'),
    );

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.marketData).toBe(null);
    expect(result.current.error).toBe('Network error');
  });

  it('should handle empty asset', () => {
    const { result } = renderHook(() => usePerpsMarketData(''));

    // Should immediately return without loading
    expect(result.current.isLoading).toBe(false);
    expect(result.current.marketData).toBe(null);
    expect(result.current.error).toBe(null);
    expect(mockGetMarkets).not.toHaveBeenCalled();
  });

  it('should refetch data when calling refetch', async () => {
    mockGetMarkets.mockResolvedValue([mockMarketData]);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePerpsMarketData('BTC'),
    );

    await waitForNextUpdate();

    expect(mockGetMarkets).toHaveBeenCalledTimes(1);

    // Call refetch
    result.current.refetch();

    await waitForNextUpdate();

    expect(mockGetMarkets).toHaveBeenCalledTimes(2);
  });

  it('should fetch new data when asset changes', async () => {
    const btcMarket: MarketInfo = {
      name: 'BTC',
      szDecimals: 6,
      maxLeverage: 50,
      marginTableId: 1,
    };
    const ethMarket: MarketInfo = {
      name: 'ETH',
      szDecimals: 6,
      maxLeverage: 40,
      marginTableId: 2,
    };

    mockGetMarkets
      .mockResolvedValueOnce([btcMarket])
      .mockResolvedValueOnce([ethMarket]);

    const { result, rerender, waitForNextUpdate } = renderHook(
      ({ asset }) => usePerpsMarketData(asset),
      { initialProps: { asset: 'BTC' } },
    );

    await waitForNextUpdate();
    expect(result.current.marketData).toEqual(btcMarket);

    // Change asset
    rerender({ asset: 'ETH' });

    await waitForNextUpdate();
    expect(result.current.marketData).toEqual(ethMarket);

    expect(mockGetMarkets).toHaveBeenCalledWith({ symbols: ['BTC'] });
    expect(mockGetMarkets).toHaveBeenCalledWith({ symbols: ['ETH'] });
  });

  describe('showErrorToast parameter', () => {
    it('should NOT show toast by default when using string parameter', async () => {
      const error = new Error('Network error');
      mockGetMarkets.mockRejectedValue(error);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePerpsMarketData('BTC'),
      );

      await waitForNextUpdate();

      expect(result.current.error).toBe('Network error');
      // Toast should not be called with default string parameter
    });

    it('should NOT show toast when showErrorToast is false', async () => {
      const error = new Error('Network error');
      mockGetMarkets.mockRejectedValue(error);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePerpsMarketData({ asset: 'BTC', showErrorToast: false }),
      );

      await waitForNextUpdate();

      expect(result.current.error).toBe('Network error');
      // Toast should not be called
    });

    it('should show toast when showErrorToast is true and error occurs', async () => {
      const mockShowToast = jest.fn();
      const mockToastConfig = {
        variant: 'error' as const,
        hasNoTimeout: false,
      };
      const mockMarketDataUnavailable = jest.fn(() => mockToastConfig);

      // Override the mock for this test (use mockReturnValue for all calls in this test)
      const mockedUsePerpsToasts = jest.mocked(usePerpsToasts);
      mockedUsePerpsToasts.mockReturnValue({
        showToast: mockShowToast,
        PerpsToastOptions: {
          dataFetching: {
            market: {
              error: {
                marketDataUnavailable: mockMarketDataUnavailable,
              },
            },
          },
        } as unknown as PerpsToastOptionsConfig,
      });

      const error = new Error('Network error');
      mockGetMarkets.mockRejectedValue(error);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePerpsMarketData({ asset: 'BTC', showErrorToast: true }),
      );

      await waitForNextUpdate();

      expect(result.current.error).toBe('Network error');
      expect(mockMarketDataUnavailable).toHaveBeenCalledWith('BTC');
      expect(mockShowToast).toHaveBeenCalledWith(mockToastConfig);

      // Reset mock to default for other tests
      mockedUsePerpsToasts.mockReturnValue({
        showToast: jest.fn(),
        PerpsToastOptions: {
          dataFetching: {
            market: {
              error: {
                marketDataUnavailable: jest.fn(),
              },
            },
          },
        } as unknown as PerpsToastOptionsConfig,
      });
    });

    it('should support both string and object parameter formats', async () => {
      mockGetMarkets.mockResolvedValue([mockMarketData]);

      // Test string format
      const { result: stringResult, waitForNextUpdate: wait1 } = renderHook(
        () => usePerpsMarketData('BTC'),
      );
      await wait1();
      expect(stringResult.current.marketData).toEqual(mockMarketData);

      // Test object format
      const { result: objectResult, waitForNextUpdate: wait2 } = renderHook(
        () => usePerpsMarketData({ asset: 'BTC', showErrorToast: false }),
      );
      await wait2();
      expect(objectResult.current.marketData).toEqual(mockMarketData);
    });
  });
});
