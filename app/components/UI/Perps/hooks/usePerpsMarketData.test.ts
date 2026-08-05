import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePerpsMarketData } from './usePerpsMarketData';
import { usePerpsTrading } from './usePerpsTrading';
import usePerpsToasts, { type PerpsToastOptionsConfig } from './usePerpsToasts';
import { type MarketInfo, wait } from '@metamask/perps-controller';

// Mock the usePerpsTrading hook
jest.mock('./usePerpsTrading');

// Keep the retry policy real but make its delay instant.
jest.mock('@metamask/perps-controller', () => ({
  ...jest.requireActual('@metamask/perps-controller'),
  wait: jest.fn().mockResolvedValue(undefined),
}));

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

    const { result } = renderHook(() => usePerpsMarketData('BTC'));

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.marketData).toBe(null);
    expect(result.current.error).toBe(null);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.marketData).toEqual(mockMarketData);
    expect(result.current.error).toBe(null);
    expect(mockGetMarkets).toHaveBeenCalledWith({ symbols: ['BTC'] });
  });

  it('should handle asset not found', async () => {
    mockGetMarkets.mockResolvedValue([
      { name: 'ETH', szDecimals: 6, maxLeverage: 40, marginTableId: 2 },
    ]);

    const { result } = renderHook(() => usePerpsMarketData('BTC'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.marketData).toBe(null);
    expect(result.current.error).toBe('Asset BTC is not tradable');
  });

  it('should handle errors', async () => {
    const error = new Error('Network error');
    mockGetMarkets.mockRejectedValue(error);

    const { result } = renderHook(() => usePerpsMarketData('BTC'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
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

    const { result } = renderHook(() => usePerpsMarketData('BTC'));

    await waitFor(() => {
      expect(mockGetMarkets).toHaveBeenCalledTimes(1);
    });

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(mockGetMarkets).toHaveBeenCalledTimes(2);
    });
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

    const { result, rerender } = renderHook(
      ({ asset }) => usePerpsMarketData(asset),
      { initialProps: { asset: 'BTC' } },
    );

    await waitFor(() => {
      expect(result.current.marketData).toEqual(btcMarket);
    });

    // Change asset
    rerender({ asset: 'ETH' });

    await waitFor(() => {
      expect(result.current.marketData).toEqual(ethMarket);
    });

    expect(mockGetMarkets).toHaveBeenCalledWith({ symbols: ['BTC'] });
    expect(mockGetMarkets).toHaveBeenCalledWith({ symbols: ['ETH'] });
  });

  describe('showErrorToast parameter', () => {
    it('should NOT show toast by default when using string parameter', async () => {
      const error = new Error('Network error');
      mockGetMarkets.mockRejectedValue(error);

      const { result } = renderHook(() => usePerpsMarketData('BTC'));

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
      // Toast should not be called with default string parameter
    });

    it('should NOT show toast when showErrorToast is false', async () => {
      const error = new Error('Network error');
      mockGetMarkets.mockRejectedValue(error);

      const { result } = renderHook(() =>
        usePerpsMarketData({ asset: 'BTC', showErrorToast: false }),
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
      // Toast should not be called
    });

    it('does not show the not-tradable toast when the fetch itself fails', async () => {
      // TAT-3645: a thrown error (e.g. CLIENT_NOT_INITIALIZED while the Perps
      // connection is still initialising) says nothing about tradability, so it
      // must never be reported as "<asset> is not a tradable asset".
      const mockShowToast = jest.fn();
      const mockMarketDataUnavailable = jest.fn(() => ({
        variant: 'error' as const,
        hasNoTimeout: false,
      }));
      const mockedUsePerpsToasts = jest.mocked(usePerpsToasts);
      mockedUsePerpsToasts.mockReturnValue({
        showToast: mockShowToast,
        PerpsToastOptions: {
          dataFetching: {
            market: {
              error: { marketDataUnavailable: mockMarketDataUnavailable },
            },
          },
        } as unknown as PerpsToastOptionsConfig,
      });
      mockGetMarkets.mockRejectedValue(new Error('CLIENT_NOT_INITIALIZED'));

      const { result } = renderHook(() =>
        usePerpsMarketData({ asset: 'BTC', showErrorToast: true }),
      );

      await waitFor(() => {
        expect(result.current.error).toBe('CLIENT_NOT_INITIALIZED');
      });

      expect(mockMarketDataUnavailable).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('shows the not-tradable toast when the market list comes back without the asset', async () => {
      // The only legitimate trigger: the fetch succeeded and the asset is
      // genuinely absent from the returned market list.
      const mockShowToast = jest.fn();
      const mockToastConfig = {
        variant: 'error' as const,
        hasNoTimeout: false,
      };
      const mockMarketDataUnavailable = jest.fn(() => mockToastConfig);
      const mockedUsePerpsToasts = jest.mocked(usePerpsToasts);
      mockedUsePerpsToasts.mockReturnValue({
        showToast: mockShowToast,
        PerpsToastOptions: {
          dataFetching: {
            market: {
              error: { marketDataUnavailable: mockMarketDataUnavailable },
            },
          },
        } as unknown as PerpsToastOptionsConfig,
      });
      mockGetMarkets.mockResolvedValue([{ ...mockMarketData, name: 'ETH' }]);

      const { result } = renderHook(() =>
        usePerpsMarketData({ asset: 'NOTREAL', showErrorToast: true }),
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Asset NOTREAL is not tradable');
      });

      expect(mockMarketDataUnavailable).toHaveBeenCalledWith('NOTREAL');
      expect(mockShowToast).toHaveBeenCalledWith(mockToastConfig);
    });

    it('recovers without a toast when a retry succeeds after a transient failure', async () => {
      // The connection finishes initialising mid-flight, so the market loads.
      const mockShowToast = jest.fn();
      const mockMarketDataUnavailable = jest.fn();
      const mockedUsePerpsToasts = jest.mocked(usePerpsToasts);
      mockedUsePerpsToasts.mockReturnValue({
        showToast: mockShowToast,
        PerpsToastOptions: {
          dataFetching: {
            market: {
              error: { marketDataUnavailable: mockMarketDataUnavailable },
            },
          },
        } as unknown as PerpsToastOptionsConfig,
      });
      mockGetMarkets
        .mockRejectedValueOnce(new Error('CLIENT_NOT_INITIALIZED'))
        .mockResolvedValue([mockMarketData]);

      const { result } = renderHook(() =>
        usePerpsMarketData({ asset: 'BTC', showErrorToast: true }),
      );

      await waitFor(() => {
        expect(result.current.marketData).toEqual(mockMarketData);
      });

      expect(result.current.error).toBe(null);
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('should support both string and object parameter formats', async () => {
      mockGetMarkets.mockResolvedValue([mockMarketData]);

      // Test string format
      const { result: stringResult } = renderHook(() =>
        usePerpsMarketData('BTC'),
      );
      await waitFor(() => {
        expect(stringResult.current.marketData).toEqual(mockMarketData);
      });

      // Test object format
      const { result: objectResult } = renderHook(() =>
        usePerpsMarketData({ asset: 'BTC', showErrorToast: false }),
      );
      await waitFor(() => {
        expect(objectResult.current.marketData).toEqual(mockMarketData);
      });
    });
  });

  describe('lifecycle races (TAT-3645 retry loop)', () => {
    // A deferred promise keeps a request in flight across an asset change,
    // which the instant-delay retry mock otherwise makes impossible to observe.
    const createDeferred = () => {
      let resolve!: (value: MarketInfo[]) => void;
      let reject!: (reason: Error) => void;
      const promise = new Promise<MarketInfo[]>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };

    const ethMarket: MarketInfo = { ...mockMarketData, name: 'ETH' };

    // Let every pending continuation run, so a stale write would land here if
    // the guards did not stop it. Without this the assertions pass vacuously.
    const flushPendingContinuations = async () => {
      await act(async () => {
        for (let i = 0; i < 5; i++) {
          await Promise.resolve();
        }
      });
    };

    it('ignores a superseded asset request that resolves after the current one', async () => {
      const btcDeferred = createDeferred();
      const ethDeferred = createDeferred();
      mockGetMarkets
        .mockReturnValueOnce(btcDeferred.promise)
        .mockReturnValueOnce(ethDeferred.promise);

      const { result, rerender } = renderHook(
        ({ asset }) => usePerpsMarketData(asset),
        { initialProps: { asset: 'BTC' } },
      );
      rerender({ asset: 'ETH' });
      ethDeferred.resolve([ethMarket]);
      await waitFor(() => {
        expect(result.current.marketData).toEqual(ethMarket);
      });
      btcDeferred.resolve([mockMarketData]);
      await flushPendingContinuations();

      expect(result.current.marketData).toEqual(ethMarket);
      expect(result.current.error).toBe(null);
    });

    it('does not let a superseded asset request raise a not-tradable verdict for the current asset', async () => {
      // BTC's list comes back without BTC — a real verdict, but for an asset
      // the user already navigated away from. Attributing it to ETH is exactly
      // what the toast effect would format.
      const btcDeferred = createDeferred();
      const ethDeferred = createDeferred();
      mockGetMarkets
        .mockReturnValueOnce(btcDeferred.promise)
        .mockReturnValueOnce(ethDeferred.promise);

      const { result, rerender } = renderHook(
        ({ asset }) => usePerpsMarketData(asset),
        { initialProps: { asset: 'BTC' } },
      );
      rerender({ asset: 'ETH' });
      ethDeferred.resolve([ethMarket]);
      await waitFor(() => {
        expect(result.current.marketData).toEqual(ethMarket);
      });
      btcDeferred.resolve([]);
      await flushPendingContinuations();

      expect(result.current.marketData).toEqual(ethMarket);
      expect(result.current.error).toBe(null);
    });

    it('ignores a superseded asset request that fails after the current one succeeds', async () => {
      const btcDeferred = createDeferred();
      const ethDeferred = createDeferred();
      mockGetMarkets
        .mockReturnValueOnce(btcDeferred.promise)
        .mockReturnValueOnce(ethDeferred.promise);

      const { result, rerender } = renderHook(
        ({ asset }) => usePerpsMarketData(asset),
        { initialProps: { asset: 'BTC' } },
      );
      rerender({ asset: 'ETH' });
      ethDeferred.resolve([ethMarket]);
      await waitFor(() => {
        expect(result.current.marketData).toEqual(ethMarket);
      });
      btcDeferred.reject(new Error('CLIENT_NOT_INITIALIZED'));
      await flushPendingContinuations();

      expect(result.current.marketData).toEqual(ethMarket);
      expect(result.current.error).toBe(null);
    });

    it('stops retrying once the component unmounts', async () => {
      // Park the loop inside its retry delay so the unmount lands while a
      // retry is genuinely pending — with an instant delay the loop would
      // already have finished and the assertion would be vacuous.
      const retryGate = createDeferred();
      jest
        .mocked(wait)
        .mockImplementationOnce(
          () => retryGate.promise as unknown as Promise<void>,
        );
      mockGetMarkets.mockRejectedValue(new Error('CLIENT_NOT_INITIALIZED'));

      const { unmount } = renderHook(() =>
        usePerpsMarketData({ asset: 'BTC', showErrorToast: true }),
      );
      await flushPendingContinuations();
      const callsWhileParked = mockGetMarkets.mock.calls.length;

      unmount();
      retryGate.resolve([]);
      await flushPendingContinuations();

      expect(mockGetMarkets.mock.calls.length).toBe(callsWhileParked);
    });
  });
});
