import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../../../core/Engine';
import { usePerpsScaleOrderSupport } from './usePerpsScaleOrderSupport';

const mockGetOrderCapabilities = jest.fn();

jest.mock('../../../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getOrderCapabilities: (...args: unknown[]) =>
        mockGetOrderCapabilities(...args),
    },
  },
}));

describe('usePerpsScaleOrderSupport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires ready Scale capabilities for the selected symbol and provider', async () => {
    // Arrange
    mockGetOrderCapabilities.mockResolvedValue({
      status: 'ready',
      supportedStrategies: ['twap', 'scale'],
    });

    // Act
    const { result } = renderHook(() =>
      usePerpsScaleOrderSupport({
        enabled: true,
        symbol: 'ETH',
        providerId: 'hyperliquid',
      }),
    );

    // Assert
    expect(result.current.supportsScaleOrders).toBe(false);
    expect(result.current.isScaleOrderSupportPending).toBe(true);
    await waitFor(() => {
      expect(result.current.supportsScaleOrders).toBe(true);
    });
    expect(result.current.isScaleOrderSupportPending).toBe(false);
    expect(mockGetOrderCapabilities).toHaveBeenCalledWith({
      symbol: 'ETH',
      providerId: 'hyperliquid',
    });

    let isSupported = false;
    await act(async () => {
      isSupported = await result.current.checkScaleOrderSupport();
    });
    expect(isSupported).toBe(true);
    expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(2);
  });

  it('preserves support while a same-route refresh is pending', async () => {
    mockGetOrderCapabilities.mockResolvedValueOnce({
      status: 'ready',
      supportedStrategies: ['scale'],
    });
    const { result } = renderHook(() =>
      usePerpsScaleOrderSupport({
        enabled: true,
        symbol: 'ETH',
        providerId: 'hyperliquid',
      }),
    );
    await waitFor(() => {
      expect(result.current.supportsScaleOrders).toBe(true);
    });

    let resolveRefresh:
      | ((value: { status: string; supportedStrategies: string[] }) => void)
      | undefined;
    mockGetOrderCapabilities.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    let refreshPromise: Promise<boolean> | undefined;

    act(() => {
      refreshPromise = result.current.checkScaleOrderSupport();
    });

    expect(result.current.isScaleOrderSupportPending).toBe(true);
    expect(result.current.supportsScaleOrders).toBe(true);

    await act(async () => {
      resolveRefresh?.({
        status: 'ready',
        supportedStrategies: ['scale'],
      });
      await refreshPromise;
    });

    expect(result.current.isScaleOrderSupportPending).toBe(false);
    expect(result.current.supportsScaleOrders).toBe(true);
  });

  it('preserves support during a route change until unsupported resolves', async () => {
    mockGetOrderCapabilities.mockResolvedValueOnce({
      status: 'ready',
      supportedStrategies: ['scale'],
    });
    const { result, rerender } = renderHook(
      ({ providerId }) =>
        usePerpsScaleOrderSupport({
          enabled: true,
          symbol: 'ETH',
          providerId,
        }),
      { initialProps: { providerId: 'hyperliquid' } },
    );
    await waitFor(() => {
      expect(result.current.supportsScaleOrders).toBe(true);
    });

    let resolveMyx:
      | ((value: { status: string; supportedStrategies: string[] }) => void)
      | undefined;
    mockGetOrderCapabilities.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveMyx = resolve;
      }),
    );

    rerender({ providerId: 'myx' });

    expect(result.current.isScaleOrderSupportPending).toBe(true);
    expect(result.current.supportsScaleOrders).toBe(true);

    await act(async () => {
      resolveMyx?.({
        status: 'ready',
        supportedStrategies: ['twap'],
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.isScaleOrderSupportPending).toBe(false);
    });
    expect(result.current.supportsScaleOrders).toBe(false);
  });

  it.each([
    { status: 'ready', supportedStrategies: ['twap'] },
    { status: 'loading', supportedStrategies: ['scale'] },
  ])('fails closed for unsupported capabilities %#', async (capabilities) => {
    // Arrange
    mockGetOrderCapabilities.mockResolvedValue(capabilities);

    // Act
    const { result } = renderHook(() =>
      usePerpsScaleOrderSupport({
        enabled: true,
        symbol: 'ETH',
        providerId: 'hyperliquid',
      }),
    );

    // Assert
    await waitFor(() => {
      expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.supportsScaleOrders).toBe(false);
    expect(result.current.isScaleOrderSupportPending).toBe(false);
  });

  it('does not query capabilities when the Scale flag or Pro mode gate is off', () => {
    // Arrange / Act
    const { result } = renderHook(() =>
      usePerpsScaleOrderSupport({
        enabled: false,
        symbol: 'ETH',
        providerId: 'hyperliquid',
      }),
    );

    // Assert
    expect(result.current.supportsScaleOrders).toBe(false);
    expect(result.current.isScaleOrderSupportPending).toBe(false);
    expect(mockGetOrderCapabilities).not.toHaveBeenCalled();
  });

  it('fails closed when the selected provider route is unresolved', async () => {
    const { result } = renderHook(() =>
      usePerpsScaleOrderSupport({
        enabled: true,
        symbol: 'ETH',
      }),
    );

    expect(result.current.supportsScaleOrders).toBe(false);
    expect(result.current.isScaleOrderSupportPending).toBe(false);
    let isSupported = true;
    await act(async () => {
      isSupported = await result.current.checkScaleOrderSupport();
    });
    expect(isSupported).toBe(false);
    expect(mockGetOrderCapabilities).not.toHaveBeenCalled();
  });

  it('fails closed when the provisional v12 controller has no capability API', async () => {
    // Arrange
    const controller = Engine.context.PerpsController as unknown as {
      getOrderCapabilities?: typeof mockGetOrderCapabilities;
    };
    const originalGetOrderCapabilities = controller.getOrderCapabilities;
    controller.getOrderCapabilities = undefined;

    try {
      // Act
      const { result } = renderHook(() =>
        usePerpsScaleOrderSupport({
          enabled: true,
          symbol: 'ETH',
          providerId: 'hyperliquid',
        }),
      );

      // Assert
      expect(result.current.supportsScaleOrders).toBe(false);
      expect(mockGetOrderCapabilities).not.toHaveBeenCalled();
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.isScaleOrderSupportPending).toBe(false);
    } finally {
      controller.getOrderCapabilities = originalGetOrderCapabilities;
    }
  });

  it('ignores capability results from a previously selected provider route', async () => {
    // Arrange
    let resolveHyperliquid:
      | ((value: { status: string; supportedStrategies: string[] }) => void)
      | undefined;
    mockGetOrderCapabilities
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveHyperliquid = resolve;
        }),
      )
      .mockResolvedValueOnce({
        status: 'ready',
        supportedStrategies: ['twap'],
      });
    const { result, rerender } = renderHook(
      ({ providerId }) =>
        usePerpsScaleOrderSupport({
          enabled: true,
          symbol: 'ETH',
          providerId,
        }),
      { initialProps: { providerId: 'hyperliquid' } },
    );

    // Act
    rerender({ providerId: 'myx' });
    expect(result.current.isScaleOrderSupportPending).toBe(true);
    await waitFor(() => {
      expect(mockGetOrderCapabilities).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(result.current.isScaleOrderSupportPending).toBe(false);
    });
    await act(async () => {
      resolveHyperliquid?.({
        status: 'ready',
        supportedStrategies: ['scale'],
      });
      await Promise.resolve();
    });

    // Assert
    expect(result.current.supportsScaleOrders).toBe(false);
    expect(result.current.isScaleOrderSupportPending).toBe(false);
  });
});
