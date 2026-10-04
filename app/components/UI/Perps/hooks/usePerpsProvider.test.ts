import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { InitializationState } from '@metamask/perps-controller';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import Engine from '../../../../core/Engine';
import {
  selectPerpsInitializationState,
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';
import { usePerpsProvider } from './usePerpsProvider';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import { selectPerpsLighterProviderEnabledFlag } from '../selectors/featureFlags';

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

jest.mock('../services/PerpsConnectionManager', () => ({
  PerpsConnectionManager: {
    runWithContextChangePreparation: jest.fn(
      (transition: () => Promise<unknown>) => transition(),
    ),
  },
}));

const mockIsLighterProviderEnabled = jest.fn();
jest.mock('../utils/lighterFeatureFlags', () => ({
  isLighterProviderEnabled: () => mockIsLighterProviderEnabled(),
}));
const mockLighterRemoteFlagEnabled = jest.fn();

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
  mockIsLighterProviderEnabled.mockReturnValue(false);
  mockLighterRemoteFlagEnabled.mockReturnValue(false);
  mockGetOrderCapabilities.mockReset().mockResolvedValue({
    status: 'ready',
    providerId: 'hyperliquid',
    supportedStrategies: [],
  });
  // Default: Hyperliquid active on mainnet.
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectPerpsLighterProviderEnabledFlag) {
      return mockLighterRemoteFlagEnabled();
    }
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
    it('includes only Hyperliquid', () => {
      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.availableProviders).toEqual(['hyperliquid']);
    });

    it('includes Lighter and aggregated providers in development', () => {
      mockIsLighterProviderEnabled.mockReturnValue(true);
      mockLighterRemoteFlagEnabled.mockReturnValue(true);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.availableProviders).toEqual([
        'hyperliquid',
        'lighter',
        'aggregated',
      ]);
    });
  });

  describe('activeProvider', () => {
    it('returns current active provider from selector', () => {
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectPerpsProvider) return 'lighter';
        if (selector === selectPerpsNetwork) return 'mainnet';
        if (selector === selectPerpsInitializationState) {
          return InitializationState.Initialized;
        }
        return false;
      });

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.activeProvider).toBe('lighter');
    });
  });

  describe('switchProvider', () => {
    it('uses context preparation before switching provider', async () => {
      (
        Engine.context.PerpsController.switchProvider as jest.Mock
      ).mockResolvedValue({ success: true });
      const { result } = renderHook(() => usePerpsProvider());

      await result.current.switchProvider('hyperliquid');

      expect(
        PerpsConnectionManager.runWithContextChangePreparation,
      ).toHaveBeenCalledTimes(1);
    });

    it('calls PerpsController.switchProvider with the given providerId', async () => {
      (
        Engine.context.PerpsController.switchProvider as jest.Mock
      ).mockResolvedValue({ success: true });

      const { result } = renderHook(() => usePerpsProvider());
      await result.current.switchProvider('lighter');

      expect(
        Engine.context.PerpsController.switchProvider,
      ).toHaveBeenCalledWith('lighter');
    });

    it('returns the result from PerpsController.switchProvider', async () => {
      const mockResult = { success: false, error: 'Not supported' };
      (
        Engine.context.PerpsController.switchProvider as jest.Mock
      ).mockResolvedValue(mockResult);

      const { result } = renderHook(() => usePerpsProvider());
      const response = await result.current.switchProvider('lighter');

      expect(response).toEqual(mockResult);
    });
  });

  describe('isProviderAvailable', () => {
    it('returns true for available provider', () => {
      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isProviderAvailable('hyperliquid')).toBe(true);
    });

    it('returns false for an unavailable provider', () => {
      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isProviderAvailable('lighter')).toBe(false);
    });
  });

  describe('provider helpers', () => {
    it('isHyperLiquidProvider is true when activeProvider is hyperliquid', () => {
      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isHyperLiquidProvider).toBe(true);
      expect(result.current.supportsTwapOrders).toBe(false);
    });

    it('does not query capabilities without a market route', () => {
      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.supportsTwapOrders).toBe(false);
      expect(mockGetOrderCapabilities).not.toHaveBeenCalled();
    });

    it('does not infer trigger support from a ready provider name', async () => {
      mockAggregatedProviderSelectors();
      mockGetOrderCapabilities.mockResolvedValue({
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: [],
      });

      const { result } = renderHook(() => usePerpsProvider({ symbol: 'BTC' }));
      await waitFor(() =>
        expect(result.current.isLoadingOrderCapabilities).toBe(false),
      );

      expect(result.current).toMatchObject({ supportedTriggerOrderTypes: [] });
    });

    it('exposes only the standalone trigger types declared for the route', async () => {
      mockAggregatedProviderSelectors();
      mockGetOrderCapabilities.mockResolvedValue({
        status: 'ready',
        providerId: 'lighter',
        supportedStrategies: [],
        supportedTriggerOrderTypes: ['stop_market', 'take_profit_limit'],
      });

      const { result } = renderHook(() => usePerpsProvider({ symbol: 'BTC' }));
      await waitFor(() =>
        expect(result.current.isLoadingOrderCapabilities).toBe(false),
      );

      expect(result.current).toMatchObject({
        supportedTriggerOrderTypes: ['stop_market', 'take_profit_limit'],
      });
    });

    it('rejects trigger declarations attributed to a different explicit route', async () => {
      mockAggregatedProviderSelectors();
      mockGetOrderCapabilities.mockResolvedValue({
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: [],
        supportedTriggerOrderTypes: ['stop_market'],
      });

      const { result } = renderHook(() =>
        usePerpsProvider({ symbol: 'BTC', providerId: 'lighter' }),
      );
      await waitFor(() =>
        expect(result.current.isLoadingOrderCapabilities).toBe(false),
      );

      expect(result.current).toMatchObject({ supportedTriggerOrderTypes: [] });
    });

    it.each([
      { status: 'ready', providerId: 'hyperliquid', supportedStrategies: [] },
      {
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: [],
        supportedTriggerOrderTypes: ['take_profit_limit'],
      },
      {
        status: 'ready',
        providerId: 'lighter',
        supportedStrategies: [],
        supportedTriggerOrderTypes: ['stop_market'],
      },
      {
        status: 'unavailable',
        providerId: 'hyperliquid',
        reason: 'not_implemented',
      },
    ] as const)('rejects fresh trigger response %j', async (capabilities) => {
      const { result } = renderHook(() =>
        usePerpsProvider({ symbol: 'BTC', providerId: 'hyperliquid' }),
      );
      await waitFor(() =>
        expect(result.current.isLoadingOrderCapabilities).toBe(false),
      );
      mockGetOrderCapabilities.mockResolvedValue(capabilities);

      expect(
        await result.current.checkTriggerOrderSupport(
          'stop_market',
          'hyperliquid',
        ),
      ).toBe(false);
    });

    it('rechecks the exact declared trigger type', async () => {
      mockGetOrderCapabilities.mockResolvedValue({
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: [],
        supportedTriggerOrderTypes: ['stop_market'],
      });
      const { result } = renderHook(() =>
        usePerpsProvider({ symbol: 'BTC', providerId: 'hyperliquid' }),
      );
      await waitFor(() =>
        expect(result.current.isLoadingOrderCapabilities).toBe(false),
      );

      expect(
        await result.current.checkTriggerOrderSupport(
          'stop_market',
          'hyperliquid',
        ),
      ).toBe(true);
      expect(
        await result.current.checkTriggerOrderSupport(
          'stop_limit',
          'hyperliquid',
        ),
      ).toBe(false);
      mockGetOrderCapabilities.mockRejectedValue(new Error('Disconnected'));
      expect(
        await result.current.checkTriggerOrderSupport(
          'stop_market',
          'hyperliquid',
        ),
      ).toBe(false);
    });

    it.each([
      'account',
      'provider',
      'network',
      'initialization',
      'unmount',
    ] as const)(
      'discards a fresh trigger response after %s changes',
      async (transition) => {
        let activeProvider = 'hyperliquid';
        let network = 'mainnet';
        let initialization = InitializationState.Initialized;
        let address = '0x0000000000000000000000000000000000000001';
        mockUseSelector.mockImplementation((selector: unknown) => {
          if (selector === selectSelectedInternalAccountAddress) return address;
          if (selector === selectPerpsProvider) return activeProvider;
          if (selector === selectPerpsNetwork) return network;
          if (selector === selectPerpsInitializationState)
            return initialization;
          return false;
        });
        const { result, rerender, unmount } = renderHook(() =>
          usePerpsProvider({ symbol: 'BTC', providerId: 'hyperliquid' }),
        );
        await waitFor(() =>
          expect(result.current.isLoadingOrderCapabilities).toBe(false),
        );
        const deferred = createDeferredCapabilities();
        mockGetOrderCapabilities.mockReturnValueOnce(deferred.promise);
        const check = result.current.checkTriggerOrderSupport(
          'stop_market',
          'hyperliquid',
        );

        if (transition === 'unmount') unmount();
        else {
          if (transition === 'account')
            address = '0x0000000000000000000000000000000000000002';
          if (transition === 'provider') activeProvider = 'lighter';
          if (transition === 'network') network = 'testnet';
          if (transition === 'initialization')
            initialization = InitializationState.Uninitialized;
          rerender({});
          // Even returning to the original route must not revive the old request.
          address = '0x0000000000000000000000000000000000000001';
          activeProvider = 'hyperliquid';
          network = 'mainnet';
          initialization = InitializationState.Initialized;
          rerender({});
        }
        await act(async () =>
          deferred.resolve({
            status: 'ready',
            providerId: 'hyperliquid',
            supportedStrategies: [],
            supportedTriggerOrderTypes: ['stop_market'],
          }),
        );

        expect(await check).toBe(false);
      },
    );

    it.each(['twap', 'scale', 'chase'] as const)(
      'rejects %s declarations for a different explicit provider',
      async (strategy) => {
        mockAggregatedProviderSelectors();
        mockGetOrderCapabilities.mockResolvedValue({
          status: 'ready',
          providerId: 'hyperliquid',
          supportedStrategies: [strategy],
        });
        const { result } = renderHook(() =>
          usePerpsProvider({ symbol: 'BTC', providerId: 'lighter' }),
        );
        await waitFor(() =>
          expect(result.current.isLoadingOrderCapabilities).toBe(false),
        );

        expect(result.current.supportsTwapOrders).toBe(false);
        expect(result.current.supportsScaleOrders).toBe(false);
        expect(result.current.supportsChaseOrders).toBe(false);
        expect(await result.current.checkOrderCapability(strategy)).toBe(false);
        expect(
          await result.current.checkOrderCapability(strategy, 'hyperliquid'),
        ).toBe(false);
      },
    );

    it.each(
      (['twap', 'scale', 'chase'] as const).flatMap((strategy) =>
        (
          [
            'account',
            'provider',
            'network',
            'market',
            'initialization',
            'unmount',
          ] as const
        ).map((transition) => ({ strategy, transition })),
      ),
    )(
      'discards a pending $strategy check after $transition changes',
      async ({ strategy, transition }) => {
        let activeProvider = 'hyperliquid';
        let network = 'mainnet';
        let address = '0x0000000000000000000000000000000000000001';
        let initialization = InitializationState.Initialized;
        mockUseSelector.mockImplementation((selector: unknown) => {
          if (selector === selectPerpsProvider) return activeProvider;
          if (selector === selectPerpsNetwork) return network;
          if (selector === selectSelectedInternalAccountAddress) return address;
          if (selector === selectPerpsInitializationState)
            return initialization;
          return false;
        });
        mockGetOrderCapabilities.mockResolvedValue({
          status: 'ready',
          providerId: 'hyperliquid',
          supportedStrategies: [strategy],
        });
        const { result, rerender, unmount } = renderHook(
          ({ symbol }) =>
            usePerpsProvider({ symbol, providerId: 'hyperliquid' }),
          { initialProps: { symbol: 'BTC' } },
        );
        await waitFor(() =>
          expect(result.current.isLoadingOrderCapabilities).toBe(false),
        );
        const deferred = createDeferredCapabilities();
        mockGetOrderCapabilities.mockReturnValueOnce(deferred.promise);
        const check = result.current.checkOrderCapability(
          strategy,
          'hyperliquid',
        );

        if (transition === 'unmount') unmount();
        else {
          if (transition === 'account')
            address = '0x0000000000000000000000000000000000000002';
          if (transition === 'provider') activeProvider = 'lighter';
          if (transition === 'network') network = 'testnet';
          if (transition === 'initialization')
            initialization = InitializationState.Uninitialized;
          rerender({ symbol: transition === 'market' ? 'ETH' : 'BTC' });
          address = '0x0000000000000000000000000000000000000001';
          activeProvider = 'hyperliquid';
          network = 'mainnet';
          initialization = InitializationState.Initialized;
          rerender({ symbol: 'BTC' });
        }
        await act(async () =>
          deferred.resolve({
            status: 'ready',
            providerId: 'hyperliquid',
            supportedStrategies: [strategy],
          }),
        );

        expect(await check).toBe(false);
        if (transition !== 'unmount') unmount();
      },
    );

    it('invalidates displayed capabilities as the selected account changes', async () => {
      let address = '0x0000000000000000000000000000000000000001';
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectPerpsProvider) return 'hyperliquid';
        if (selector === selectPerpsNetwork) return 'testnet';
        if (selector === selectSelectedInternalAccountAddress) return address;
        if (selector === selectPerpsInitializationState)
          return InitializationState.Initialized;
        return false;
      });
      mockGetOrderCapabilities.mockResolvedValueOnce({
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: ['twap', 'scale', 'chase'],
      });
      const { result, rerender } = renderHook(() =>
        usePerpsProvider({ symbol: 'BTC', providerId: 'hyperliquid' }),
      );
      await waitFor(() => expect(result.current.supportsTwapOrders).toBe(true));
      const nextAccountCapabilities = createDeferredCapabilities();
      mockGetOrderCapabilities.mockReturnValue(nextAccountCapabilities.promise);

      address = '0x0000000000000000000000000000000000000002';
      rerender({});

      expect(result.current.supportsTwapOrders).toBe(false);
      expect(result.current.supportsScaleOrders).toBe(false);
      expect(result.current.supportsChaseOrders).toBe(false);
      expect(result.current.isLoadingOrderCapabilities).toBe(true);
      await act(async () =>
        nextAccountCapabilities.resolve({
          status: 'ready',
          providerId: 'hyperliquid',
          supportedStrategies: [],
        }),
      );
      expect(result.current.isLoadingOrderCapabilities).toBe(false);
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

    it('loads Chase support once per route with concrete provider identity', async () => {
      mockAggregatedProviderSelectors();
      mockGetOrderCapabilities.mockResolvedValue({
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: ['chase'],
      });
      const { result, rerender } = renderHook(
        ({ symbol }) => usePerpsProvider({ symbol, providerId: 'hyperliquid' }),
        { initialProps: { symbol: 'BTC' } },
      );
      await waitFor(() => {
        expect(result.current.supportsChaseOrders).toBe(true);
      });

      rerender({ symbol: 'BTC' });
      expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(1);

      rerender({ symbol: 'ETH' });
      await waitFor(() => {
        expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(2);
        expect(result.current.orderCapabilities?.providerId).toBe(
          'hyperliquid',
        );
      });
    });

    it('reports Chase capability independently of rollout state', async () => {
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectPerpsProvider) return 'hyperliquid';
        if (selector === selectPerpsNetwork) return 'mainnet';
        if (selector === selectPerpsInitializationState) {
          return InitializationState.Initialized;
        }
        return false;
      });
      mockGetOrderCapabilities.mockResolvedValue({
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: ['chase'],
      });

      const { result } = renderHook(() =>
        usePerpsProvider({ symbol: 'BTC', providerId: 'hyperliquid' }),
      );
      await waitFor(() => {
        expect(result.current.isLoadingOrderCapabilities).toBe(false);
      });

      expect(result.current.supportsChaseOrders).toBe(true);
    });

    it('supports Scale when the issuing Lighter route reports the capability', async () => {
      mockAggregatedProviderSelectors();
      mockGetOrderCapabilities.mockResolvedValue({
        status: 'ready',
        providerId: 'lighter',
        supportedStrategies: ['scale'],
      });

      const { result } = renderHook(() => usePerpsProvider({ symbol: 'BTC' }));

      await waitFor(() => {
        expect(result.current.isLoadingOrderCapabilities).toBe(false);
      });
      expect(result.current.supportsScaleOrders).toBe(true);

      let isSupported = true;
      await act(async () => {
        isSupported = await result.current.checkOrderCapability(
          'scale',
          'lighter',
        );
      });

      expect(isSupported).toBe(true);
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

    it('retries transient provider unavailability before restoring Chase support', async () => {
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
            supportedStrategies: ['chase'],
          });
        const { result } = renderHook(() =>
          usePerpsProvider({ symbol: 'BTC', providerId: 'hyperliquid' }),
        );
        await act(async () => {
          await Promise.resolve();
        });
        expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(1);

        await act(async () => {
          jest.runOnlyPendingTimers();
          await Promise.resolve();
        });

        expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(2);
        expect(result.current.supportsChaseOrders).toBe(true);
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

    it('ignores stale Chase capability after the market route changes', async () => {
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
          supportedStrategies: ['chase'],
        });
        await firstResponse;
      });

      expect(result.current.supportsChaseOrders).toBe(false);
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
      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isMultiProviderEnabled).toBe(false);
    });

    it('enables the provider selector in development', () => {
      mockIsLighterProviderEnabled.mockReturnValue(true);
      mockLighterRemoteFlagEnabled.mockReturnValue(true);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isProviderSelectorEnabled).toBe(true);
    });

    it('enables the multi-provider badge when both gates are enabled', () => {
      mockIsLighterProviderEnabled.mockReturnValue(true);
      mockLighterRemoteFlagEnabled.mockReturnValue(true);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isMultiProviderEnabled).toBe(true);
    });

    it('keeps Lighter unavailable when the runtime flag is enabled without the build gate', () => {
      mockLighterRemoteFlagEnabled.mockReturnValue(true);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isProviderSelectorEnabled).toBe(false);
      expect(result.current.availableProviders).toEqual(['hyperliquid']);
    });

    it('keeps Lighter unavailable when the build gate is enabled without the runtime flag', () => {
      mockIsLighterProviderEnabled.mockReturnValue(true);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isMultiProviderEnabled).toBe(false);
      expect(result.current.isProviderSelectorEnabled).toBe(false);
      expect(result.current.availableProviders).toEqual(['hyperliquid']);
    });
  });
});
