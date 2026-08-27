import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { InitializationState } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import {
  selectPerpsInitializationState,
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';
import { usePerpsProvider } from './usePerpsProvider';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getOrderCapabilities: jest.fn(),
      switchProvider: jest.fn(),
    },
  },
}));

const mockUseSelector = useSelector as jest.Mock;
const mockGetOrderCapabilities = jest.mocked(
  Engine.context.PerpsController.getOrderCapabilities,
);

type Capabilities = Awaited<
  ReturnType<typeof Engine.context.PerpsController.getOrderCapabilities>
>;

const createDeferredCapabilities = () => {
  let resolve = (_value: Capabilities): void => undefined;
  const promise = new Promise<Capabilities>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

const mockAggregatedProviderSelectors = (
  getInitializationState: () => InitializationState = () =>
    InitializationState.Initialized,
) => {
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectPerpsProvider) {
      return 'aggregated';
    }
    if (selector === selectPerpsNetwork) {
      return 'mainnet';
    }
    if (selector === selectPerpsInitializationState) {
      return getInitializationState();
    }
    return false;
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetOrderCapabilities.mockResolvedValue({
    status: 'ready',
    providerId: 'hyperliquid',
    supportedStrategies: [],
  });
  // Default: Hyperliquid active on mainnet, MYX flag off.
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectPerpsProvider) {
      return 'hyperliquid';
    }
    if (selector === selectPerpsNetwork) {
      return 'mainnet';
    }
    if (selector === selectPerpsInitializationState) {
      return InitializationState.Initialized;
    }
    return false;
  });
});

describe('usePerpsProvider', () => {
  describe('availableProviders', () => {
    it('includes only hyperliquid when MYX flag is disabled', () => {
      mockUseSelector
        .mockReturnValueOnce('hyperliquid') // activeProvider
        .mockReturnValueOnce(false); // isMYXProviderEnabled

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.availableProviders).toEqual(['hyperliquid']);
    });

    it('includes myx and aggregated when MYX flag is enabled', () => {
      mockUseSelector
        .mockReturnValueOnce('myx') // activeProvider
        .mockReturnValueOnce(true); // isMYXProviderEnabled

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.availableProviders).toEqual([
        'hyperliquid',
        'myx',
        'aggregated',
      ]);
    });
  });

  describe('activeProvider', () => {
    it('returns current active provider from selector', () => {
      mockUseSelector.mockReturnValueOnce('myx').mockReturnValueOnce(true);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.activeProvider).toBe('myx');
    });
  });

  describe('switchProvider', () => {
    it('calls PerpsController.switchProvider with the given providerId', async () => {
      mockUseSelector
        .mockReturnValueOnce('hyperliquid')
        .mockReturnValueOnce(false);
      (
        Engine.context.PerpsController.switchProvider as jest.Mock
      ).mockResolvedValue({ success: true });

      const { result } = renderHook(() => usePerpsProvider());
      await result.current.switchProvider('myx');

      expect(
        Engine.context.PerpsController.switchProvider,
      ).toHaveBeenCalledWith('myx');
    });

    it('returns the result from PerpsController.switchProvider', async () => {
      mockUseSelector
        .mockReturnValueOnce('hyperliquid')
        .mockReturnValueOnce(false);
      const mockResult = { success: false, error: 'Not supported' };
      (
        Engine.context.PerpsController.switchProvider as jest.Mock
      ).mockResolvedValue(mockResult);

      const { result } = renderHook(() => usePerpsProvider());
      const response = await result.current.switchProvider('myx');

      expect(response).toEqual(mockResult);
    });
  });

  describe('isProviderAvailable', () => {
    it('returns true for available provider', () => {
      mockUseSelector
        .mockReturnValueOnce('hyperliquid')
        .mockReturnValueOnce(false);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isProviderAvailable('hyperliquid')).toBe(true);
    });

    it('returns false for unavailable provider when flag is off', () => {
      mockUseSelector
        .mockReturnValueOnce('hyperliquid')
        .mockReturnValueOnce(false);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isProviderAvailable('myx')).toBe(false);
    });
  });

  describe('provider helpers', () => {
    it('isMYXProvider is true when activeProvider is myx', () => {
      mockUseSelector.mockReturnValueOnce('myx').mockReturnValueOnce(true);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isMYXProvider).toBe(true);
      expect(result.current.isHyperLiquidProvider).toBe(false);
      expect(result.current.supportsTwapOrders).toBe(false);
    });

    it('isHyperLiquidProvider is true when activeProvider is hyperliquid', () => {
      mockUseSelector
        .mockReturnValueOnce('hyperliquid')
        .mockReturnValueOnce(false);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isHyperLiquidProvider).toBe(true);
      expect(result.current.isMYXProvider).toBe(false);
      expect(result.current.supportsTwapOrders).toBe(false);
    });

    it('does not query capabilities without a market route', () => {
      mockUseSelector
        .mockReturnValueOnce('hyperliquid')
        .mockReturnValueOnce(false);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.supportsTwapOrders).toBe(false);
      expect(mockGetOrderCapabilities).not.toHaveBeenCalled();
    });

    it('returns TWAP support from a ready controller capability', async () => {
      mockAggregatedProviderSelectors();
      mockGetOrderCapabilities.mockResolvedValue({
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: ['twap'],
      });

      const { result } = renderHook(() =>
        usePerpsProvider({ symbol: 'BTC', providerId: 'hyperliquid' }),
      );

      await waitFor(() => {
        expect(result.current.supportsTwapOrders).toBe(true);
      });
      expect(result.current.orderCapabilities).toEqual({
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: ['twap'],
      });
      expect(mockGetOrderCapabilities).toHaveBeenCalledWith({
        symbol: 'BTC',
        providerId: 'hyperliquid',
      });
    });

    it('returns Scale support and rechecks the exact resolved route', async () => {
      mockAggregatedProviderSelectors();
      mockGetOrderCapabilities.mockResolvedValue({
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: ['scale'],
      });

      const { result } = renderHook(() => usePerpsProvider({ symbol: 'BTC' }));

      await waitFor(() => {
        expect(result.current.supportsScaleOrders).toBe(true);
      });

      let isSupported = false;
      await act(async () => {
        isSupported = await result.current.checkOrderCapability(
          'scale',
          'hyperliquid',
        );
      });

      expect(isSupported).toBe(true);
      expect(mockGetOrderCapabilities).toHaveBeenLastCalledWith({
        symbol: 'BTC',
        providerId: undefined,
      });
    });

    it('fails a capability recheck when the resolved route changes', async () => {
      mockAggregatedProviderSelectors();
      mockGetOrderCapabilities.mockResolvedValue({
        status: 'ready',
        providerId: 'myx',
        supportedStrategies: ['scale'],
      });

      const { result } = renderHook(() => usePerpsProvider({ symbol: 'BTC' }));

      await waitFor(() => {
        expect(result.current.supportsScaleOrders).toBe(true);
      });

      let isSupported = true;
      await act(async () => {
        isSupported = await result.current.checkOrderCapability(
          'scale',
          'hyperliquid',
        );
      });

      expect(isSupported).toBe(false);
    });

    it('preserves the provider route resolved by default capability routing', async () => {
      mockAggregatedProviderSelectors();
      mockGetOrderCapabilities.mockResolvedValue({
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: ['twap'],
      });

      const { result } = renderHook(() => usePerpsProvider({ symbol: 'BTC' }));

      await waitFor(() => {
        expect(result.current.isLoadingOrderCapabilities).toBe(false);
        expect(result.current.orderCapabilities?.providerId).toBe(
          'hyperliquid',
        );
      });
      expect(mockGetOrderCapabilities).toHaveBeenCalledWith({
        symbol: 'BTC',
        providerId: undefined,
      });
    });

    it('marks a new capability route pending before it resolves', () => {
      mockAggregatedProviderSelectors();
      mockGetOrderCapabilities.mockReturnValue(
        new Promise<never>(() => undefined),
      );

      const { result } = renderHook(() => usePerpsProvider({ symbol: 'BTC' }));

      expect(result.current.isLoadingOrderCapabilities).toBe(true);
      expect(result.current.orderCapabilities).toBeNull();
    });

    it('keeps TWAP disabled when capabilities are unavailable', async () => {
      mockAggregatedProviderSelectors();
      mockGetOrderCapabilities.mockResolvedValue({
        status: 'unavailable',
        providerId: 'hyperliquid',
        reason: 'strategy_market_unsupported',
      });

      const { result } = renderHook(() =>
        usePerpsProvider({ symbol: 'BTC', providerId: 'hyperliquid' }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingOrderCapabilities).toBe(false);
      });
      expect(result.current.supportsTwapOrders).toBe(false);
    });

    it('keeps capability discovery terminal after initialization fails', () => {
      mockAggregatedProviderSelectors(() => InitializationState.Failed);

      const { result } = renderHook(() =>
        usePerpsProvider({ symbol: 'BTC', providerId: 'hyperliquid' }),
      );

      expect(result.current.isLoadingOrderCapabilities).toBe(false);
      expect(result.current.supportsTwapOrders).toBe(false);
      expect(mockGetOrderCapabilities).not.toHaveBeenCalled();
    });

    it('retries transient provider unavailability before restoring TWAP support', async () => {
      jest.useFakeTimers();
      try {
        mockAggregatedProviderSelectors();
        mockGetOrderCapabilities
          .mockResolvedValueOnce({
            status: 'unavailable',
            providerId: 'hyperliquid',
            reason: 'provider_unavailable',
          })
          .mockResolvedValueOnce({
            status: 'ready',
            providerId: 'hyperliquid',
            supportedStrategies: ['twap'],
          });

        const { result } = renderHook(() =>
          usePerpsProvider({ symbol: 'BTC', providerId: 'hyperliquid' }),
        );
        await act(async () => {
          await Promise.resolve();
        });
        expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(1);
        expect(result.current.isLoadingOrderCapabilities).toBe(true);

        await act(async () => {
          jest.runOnlyPendingTimers();
          await Promise.resolve();
        });

        expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(2);
        expect(result.current.supportsTwapOrders).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    });

    it('refetches capabilities when the same provider returns to initialized', async () => {
      let initializationState = InitializationState.Initialized;
      const refreshedCapabilities = createDeferredCapabilities();
      mockAggregatedProviderSelectors(() => initializationState);
      mockGetOrderCapabilities
        .mockResolvedValueOnce({
          status: 'ready',
          providerId: 'hyperliquid',
          supportedStrategies: ['twap'],
        })
        .mockReturnValueOnce(refreshedCapabilities.promise);
      const { result, rerender } = renderHook(() =>
        usePerpsProvider({ symbol: 'BTC' }),
      );
      await waitFor(() => {
        expect(result.current.supportsTwapOrders).toBe(true);
      });

      initializationState = InitializationState.Uninitialized;
      rerender(undefined);
      expect(result.current.supportsTwapOrders).toBe(false);
      expect(result.current.isLoadingOrderCapabilities).toBe(true);

      initializationState = InitializationState.Initializing;
      rerender(undefined);
      expect(result.current.isLoadingOrderCapabilities).toBe(true);

      initializationState = InitializationState.Initialized;
      rerender(undefined);
      await waitFor(() => {
        expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(2);
      });
      expect(result.current.isLoadingOrderCapabilities).toBe(true);

      await act(async () => {
        refreshedCapabilities.resolve({
          status: 'ready',
          providerId: 'hyperliquid',
          supportedStrategies: ['twap'],
        });
        await refreshedCapabilities.promise;
      });

      expect(result.current.isLoadingOrderCapabilities).toBe(false);
      expect(result.current.supportsTwapOrders).toBe(true);
    });

    it('ignores a late response from a prior controller initialization', async () => {
      let initializationState = InitializationState.Initialized;
      const staleCapabilities = createDeferredCapabilities();
      mockAggregatedProviderSelectors(() => initializationState);
      mockGetOrderCapabilities
        .mockReturnValueOnce(staleCapabilities.promise)
        .mockResolvedValueOnce({
          status: 'ready',
          providerId: 'hyperliquid',
          supportedStrategies: [],
        });
      const { result, rerender } = renderHook(() =>
        usePerpsProvider({ symbol: 'BTC' }),
      );
      expect(result.current.isLoadingOrderCapabilities).toBe(true);

      initializationState = InitializationState.Initializing;
      rerender(undefined);
      initializationState = InitializationState.Initialized;
      rerender(undefined);
      await waitFor(() => {
        expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(2);
        expect(result.current.isLoadingOrderCapabilities).toBe(false);
      });
      await act(async () => {
        staleCapabilities.resolve({
          status: 'ready',
          providerId: 'hyperliquid',
          supportedStrategies: ['twap'],
        });
        await staleCapabilities.promise;
      });

      expect(result.current.supportsTwapOrders).toBe(false);
    });

    it('ignores a stale capability response after the market route changes', async () => {
      let resolveFirst = (_value: Capabilities): void => undefined;
      const firstResponse = new Promise<Capabilities>((resolve) => {
        resolveFirst = resolve;
      });
      mockGetOrderCapabilities
        .mockReturnValueOnce(firstResponse)
        .mockResolvedValueOnce({
          status: 'ready',
          providerId: 'hyperliquid',
          supportedStrategies: [],
        });
      mockAggregatedProviderSelectors();
      const { result, rerender } = renderHook(
        ({ symbol }) => usePerpsProvider({ symbol, providerId: 'hyperliquid' }),
        { initialProps: { symbol: 'BTC' } },
      );

      rerender({ symbol: 'ETH' });
      await waitFor(() => {
        expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(2);
      });
      await act(async () => {
        resolveFirst({
          status: 'ready',
          providerId: 'hyperliquid',
          supportedStrategies: ['twap'],
        });
        await firstResponse;
      });

      expect(result.current.supportsTwapOrders).toBe(false);
    });

    it.each([
      {
        lifecycleName: 'active provider',
        initialActiveProvider: 'aggregated',
        changedActiveProvider: 'hyperliquid',
        initialNetwork: 'mainnet',
        changedNetwork: 'mainnet',
      },
      {
        lifecycleName: 'perps network',
        initialActiveProvider: 'aggregated',
        changedActiveProvider: 'aggregated',
        initialNetwork: 'mainnet',
        changedNetwork: 'testnet',
      },
    ])(
      'refreshes capabilities when the $lifecycleName changes and ignores a late stale response',
      async ({
        initialActiveProvider,
        changedActiveProvider,
        initialNetwork,
        changedNetwork,
      }) => {
        let activeProvider = initialActiveProvider;
        let perpsNetwork = initialNetwork;
        const staleCapabilities = createDeferredCapabilities();
        mockUseSelector.mockImplementation((selector: unknown) => {
          if (selector === selectPerpsProvider) {
            return activeProvider;
          }
          if (selector === selectPerpsNetwork) {
            return perpsNetwork;
          }
          if (selector === selectPerpsInitializationState) {
            return InitializationState.Initialized;
          }
          return false;
        });
        mockGetOrderCapabilities
          .mockResolvedValueOnce({
            status: 'ready',
            providerId: 'hyperliquid',
            supportedStrategies: ['twap'],
          })
          .mockReturnValueOnce(staleCapabilities.promise)
          .mockResolvedValueOnce({
            status: 'ready',
            providerId: 'hyperliquid',
            supportedStrategies: [],
          });
        const { result, rerender } = renderHook(() =>
          usePerpsProvider({ symbol: 'BTC' }),
        );
        await waitFor(() => {
          expect(result.current.supportsTwapOrders).toBe(true);
        });

        activeProvider = changedActiveProvider;
        perpsNetwork = changedNetwork;
        rerender(undefined);

        expect(result.current.supportsTwapOrders).toBe(false);
        expect(result.current.isLoadingOrderCapabilities).toBe(true);
        await waitFor(() => {
          expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(2);
        });

        activeProvider = initialActiveProvider;
        perpsNetwork = initialNetwork;
        rerender(undefined);
        await waitFor(() => {
          expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(3);
          expect(result.current.isLoadingOrderCapabilities).toBe(false);
        });
        await act(async () => {
          staleCapabilities.resolve({
            status: 'ready',
            providerId: 'hyperliquid',
            supportedStrategies: ['twap'],
          });
          await staleCapabilities.promise;
        });

        expect(result.current.supportsTwapOrders).toBe(false);
        expect(mockGetOrderCapabilities).toHaveBeenNthCalledWith(2, {
          symbol: 'BTC',
          providerId: undefined,
        });
      },
    );

    it('isMultiProviderEnabled is false when only one provider available', () => {
      mockUseSelector
        .mockReturnValueOnce('hyperliquid')
        .mockReturnValueOnce(false);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isMultiProviderEnabled).toBe(false);
    });

    it('isMultiProviderEnabled is true when multiple providers available', () => {
      mockUseSelector.mockReturnValueOnce('myx').mockReturnValueOnce(true);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isMultiProviderEnabled).toBe(true);
    });
  });
});
