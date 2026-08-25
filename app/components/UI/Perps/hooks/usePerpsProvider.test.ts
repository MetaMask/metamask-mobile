import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
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

beforeEach(() => {
  jest.clearAllMocks();
  mockGetOrderCapabilities.mockResolvedValue({
    status: 'ready',
    providerId: 'hyperliquid',
    supportedStrategies: [],
  });
  // Default: hyperliquid active, MYX flag off
  mockUseSelector.mockImplementation((selector: unknown) => {
    const fn = selector as (s: unknown) => unknown;
    const fakeState = {};
    // First call = selectPerpsProvider, second = selectPerpsMYXProviderEnabledFlag
    const result = fn(fakeState);
    return result ?? 'hyperliquid';
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
      mockUseSelector.mockReturnValue('aggregated');
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
      expect(mockGetOrderCapabilities).toHaveBeenCalledWith({
        symbol: 'BTC',
        providerId: 'hyperliquid',
      });
    });

    it('keeps TWAP disabled when capabilities are unavailable', async () => {
      mockUseSelector
        .mockReturnValueOnce('aggregated')
        .mockReturnValueOnce(true);
      mockGetOrderCapabilities.mockResolvedValue({
        status: 'unavailable',
        providerId: 'hyperliquid',
        reason: 'provider_unavailable',
      });

      const { result } = renderHook(() =>
        usePerpsProvider({ symbol: 'BTC', providerId: 'hyperliquid' }),
      );

      await waitFor(() => {
        expect(mockGetOrderCapabilities).toHaveBeenCalled();
      });
      expect(result.current.supportsTwapOrders).toBe(false);
    });

    it('ignores a stale capability response after the market route changes', async () => {
      type Capabilities = Awaited<
        ReturnType<typeof Engine.context.PerpsController.getOrderCapabilities>
      >;
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
      mockUseSelector.mockReturnValue('aggregated');
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
