import { act, renderHook, waitFor } from '@testing-library/react-native';
import { InitializationState } from '@metamask/perps-controller';
import { useSelector } from 'react-redux';
import { usePerpsChaseEligibility } from './usePerpsChaseEligibility';

const mockGetOrderCapabilities = jest.fn();
let mockFlagEnabled = true;
let mockActiveProvider = 'aggregated';
let mockPerpsNetwork = 'mainnet';
let mockInitializationState = InitializationState.Initialized;

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../selectors/featureFlags', () => ({
  selectPerpsMobileChaseEnabledFlag: () => mockFlagEnabled,
}));
jest.mock('../selectors/perpsController', () => ({
  selectPerpsProvider: () => mockActiveProvider,
  selectPerpsNetwork: () => mockPerpsNetwork,
  selectPerpsInitializationState: () => mockInitializationState,
}));
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getOrderCapabilities: (...args: unknown[]) =>
        mockGetOrderCapabilities(...args),
    },
  },
}));

describe('usePerpsChaseEligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFlagEnabled = true;
    mockActiveProvider = 'aggregated';
    mockPerpsNetwork = 'mainnet';
    mockInitializationState = InitializationState.Initialized;
    (useSelector as jest.Mock).mockImplementation((selector) => selector({}));
  });

  it('routes aggregated mode through the concrete market provider', async () => {
    mockGetOrderCapabilities.mockResolvedValue({
      status: 'ready',
      providerId: 'hyperliquid',
      supportedStrategies: ['chase'],
    });

    const { result } = renderHook(() =>
      usePerpsChaseEligibility('BTC', 'hyperliquid'),
    );

    await waitFor(() => expect(result.current.isChaseEnabled).toBe(true));
    expect(mockGetOrderCapabilities).toHaveBeenCalledWith({
      symbol: 'BTC',
      providerId: 'hyperliquid',
    });
    expect(result.current.resolvedProviderId).toBe('hyperliquid');
  });

  it('falls back to a concrete active provider when the market omits a route', async () => {
    mockActiveProvider = 'myx';
    mockGetOrderCapabilities.mockResolvedValue({
      status: 'ready',
      providerId: 'myx',
      supportedStrategies: ['chase'],
    });

    const { result } = renderHook(() =>
      usePerpsChaseEligibility('BTC', undefined),
    );

    await waitFor(() => expect(result.current.isChaseEnabled).toBe(true));
    expect(mockGetOrderCapabilities).toHaveBeenCalledWith({
      symbol: 'BTC',
      providerId: 'myx',
    });
    expect(result.current.resolvedProviderId).toBe('myx');
  });

  it('fails closed without a concrete market or active provider route', async () => {
    const { result } = renderHook(() =>
      usePerpsChaseEligibility('BTC', undefined),
    );

    await waitFor(() => expect(result.current.isChaseEnabled).toBe(false));
    expect(mockGetOrderCapabilities).not.toHaveBeenCalled();
    expect(result.current.resolvedProviderId).toBeNull();
  });

  it('fails closed when capability discovery rejects', async () => {
    jest.useFakeTimers();
    mockGetOrderCapabilities.mockRejectedValue(new Error('provider offline'));
    try {
      const { result } = renderHook(() =>
        usePerpsChaseEligibility('BTC', 'hyperliquid'),
      );

      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(500);
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1000);
      });

      expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(3);
      expect(result.current.isChaseEnabled).toBe(false);
      expect(result.current.isCapabilityPending).toBe(false);
      expect(result.current.resolvedProviderId).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('retries transient provider unavailability before enabling Chase', async () => {
    jest.useFakeTimers();
    try {
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
        usePerpsChaseEligibility('BTC', 'hyperliquid'),
      );

      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.isCapabilityPending).toBe(true);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(500);
      });

      expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(2);
      expect(result.current.isCapabilityPending).toBe(false);
      expect(result.current.isChaseEnabled).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('reports capability discovery as pending until the route resolves', async () => {
    let resolveCapability: ((value: unknown) => void) | undefined;
    mockGetOrderCapabilities.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCapability = resolve;
        }),
    );
    const { result } = renderHook(() =>
      usePerpsChaseEligibility('BTC', 'hyperliquid'),
    );

    expect(result.current.isCapabilityPending).toBe(true);
    await act(async () => {
      resolveCapability?.({
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: ['chase'],
      });
    });

    expect(result.current.isCapabilityPending).toBe(false);
    expect(result.current.isChaseEnabled).toBe(true);
  });

  it('ignores a stale capability response after the route changes', async () => {
    let resolveOld: ((value: unknown) => void) | undefined;
    mockGetOrderCapabilities
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValueOnce({
        status: 'ready',
        providerId: 'myx',
        supportedStrategies: ['chase'],
      });

    const { result, rerender } = renderHook<
      ReturnType<typeof usePerpsChaseEligibility>,
      { providerId: 'hyperliquid' | 'myx' }
    >(({ providerId }) => usePerpsChaseEligibility('BTC', providerId), {
      initialProps: { providerId: 'hyperliquid' },
    });
    rerender({ providerId: 'myx' });
    await waitFor(() => expect(result.current.resolvedProviderId).toBe('myx'));

    await act(async () => {
      resolveOld?.({
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: ['chase'],
      });
    });
    expect(result.current.resolvedProviderId).toBe('myx');
  });

  it('re-checks Chase support when the Perps network changes', async () => {
    mockGetOrderCapabilities
      .mockResolvedValueOnce({
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: ['chase'],
      })
      .mockResolvedValueOnce({
        status: 'ready',
        providerId: 'hyperliquid',
        supportedStrategies: ['twap'],
      });
    const { result, rerender } = renderHook(() =>
      usePerpsChaseEligibility('BTC', 'hyperliquid'),
    );
    await waitFor(() => {
      expect(result.current.isChaseEnabled).toBe(true);
    });

    mockPerpsNetwork = 'testnet';
    rerender({});

    await waitFor(() => {
      expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(2);
      expect(result.current.isCapabilityPending).toBe(false);
    });
    expect(result.current.isChaseEnabled).toBe(false);
  });
});
