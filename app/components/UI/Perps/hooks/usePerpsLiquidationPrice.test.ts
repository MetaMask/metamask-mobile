import { renderHook, waitFor, act } from '@testing-library/react-native';
import { PERPS_ERROR_CODES } from '@metamask/perps-controller';
import { usePerpsLiquidationPrice } from './usePerpsLiquidationPrice';
import { usePerpsTrading } from './usePerpsTrading';

// Mock the usePerpsTrading hook
jest.mock('./usePerpsTrading');

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
  },
}));

describe('usePerpsLiquidationPrice', () => {
  const mockCalculateLiquidationPrice = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCalculateLiquidationPrice.mockReset();
    (usePerpsTrading as jest.Mock).mockReturnValue({
      calculateLiquidationPrice: mockCalculateLiquidationPrice,
    });
  });

  it('calculates a liquidation price', async () => {
    mockCalculateLiquidationPrice.mockResolvedValue('45000.00');

    const params = {
      entryPrice: 50000,
      leverage: 10,
      direction: 'long' as const,
      asset: 'BTC',
    };

    const { result } = renderHook(() => usePerpsLiquidationPrice(params));

    // With 0ms debounce, still need to wait for async debounced function
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });
    expect(result.current.liquidationPrice).toBe('45000.00');
    expect(result.current.error).toBe(null);
    expect(mockCalculateLiquidationPrice).toHaveBeenCalledWith({
      entryPrice: 50000,
      leverage: 10,
      direction: 'long',
      asset: 'BTC',
      marginType: 'isolated',
    });
  });

  it('marks a rejected calculation as unavailable', async () => {
    const error = new Error('Calculation failed');
    mockCalculateLiquidationPrice.mockRejectedValue(error);

    const params = {
      entryPrice: 50000,
      leverage: 10,
      direction: 'short' as const,
      asset: 'ETH',
    };

    const { result } = renderHook(() => usePerpsLiquidationPrice(params));

    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });
    expect(result.current.liquidationPrice).toBeUndefined();
    expect(result.current.error).toBe('Calculation failed');
  });

  it('clears a stale price when Core rejects an unavailable estimate', async () => {
    mockCalculateLiquidationPrice
      .mockResolvedValueOnce('45000.00')
      .mockRejectedValueOnce(
        new Error(PERPS_ERROR_CODES.LIQUIDATION_PRICE_UNAVAILABLE),
      );
    const params = {
      entryPrice: 50000,
      leverage: 10,
      direction: 'long' as const,
      asset: 'BTC',
    };
    const { result, rerender } = renderHook(
      (props) => usePerpsLiquidationPrice(props),
      { initialProps: params },
    );
    await waitFor(() => {
      expect(result.current.liquidationPrice).toBe('45000.00');
    });

    rerender({ ...params, leverage: 20 });

    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
      expect(result.current.liquidationPrice).toBeUndefined();
    });
    expect(result.current.error).toBe(
      PERPS_ERROR_CODES.LIQUIDATION_PRICE_UNAVAILABLE,
    );
  });

  it('preserves a determinate isolated zero returned by Core', async () => {
    mockCalculateLiquidationPrice.mockResolvedValue('0.00');
    const params = {
      entryPrice: 50000,
      leverage: 1,
      direction: 'long' as const,
      asset: 'BTC',
    };

    const { result } = renderHook(() => usePerpsLiquidationPrice(params));

    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
      expect(result.current.liquidationPrice).toBe('0.00');
    });
    expect(result.current.error).toBeNull();
  });

  it('marks a rejected leverage estimate as unavailable', async () => {
    const error = new Error(
      'Invalid leverage: 100x exceeds maximum allowed leverage of 40x',
    );
    mockCalculateLiquidationPrice.mockRejectedValue(error);

    const params = {
      entryPrice: 50000,
      leverage: 100,
      direction: 'long' as const,
      asset: 'BTC',
    };

    const { result } = renderHook(() => usePerpsLiquidationPrice(params));

    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });
    expect(result.current.liquidationPrice).toBeUndefined();
    expect(result.current.error).toBe(
      'Invalid leverage: 100x exceeds maximum allowed leverage of 40x',
    );
  });

  it('skips calculation for invalid entry price', () => {
    const params = {
      entryPrice: 0,
      leverage: 10,
      direction: 'long' as const,
      asset: 'BTC',
    };

    const { result } = renderHook(() => usePerpsLiquidationPrice(params));

    // Should immediately return without calculating
    expect(result.current.isCalculating).toBe(false);
    expect(result.current.liquidationPrice).toBeUndefined();
    expect(result.current.error).toBe(null);
    expect(mockCalculateLiquidationPrice).not.toHaveBeenCalled();
  });

  it('skips calculation for invalid leverage', () => {
    const params = {
      entryPrice: 50000,
      leverage: 0,
      direction: 'long' as const,
      asset: 'BTC',
    };

    const { result } = renderHook(() => usePerpsLiquidationPrice(params));

    // Should immediately return without calculating
    expect(result.current.isCalculating).toBe(false);
    expect(result.current.liquidationPrice).toBeUndefined();
    expect(result.current.error).toBe(null);
    expect(mockCalculateLiquidationPrice).not.toHaveBeenCalled();
  });

  it('skips calculation for empty asset', () => {
    const params = {
      entryPrice: 50000,
      leverage: 10,
      direction: 'long' as const,
      asset: '',
    };

    const { result } = renderHook(() => usePerpsLiquidationPrice(params));

    // Should immediately return without calculating
    expect(result.current.isCalculating).toBe(false);
    expect(result.current.liquidationPrice).toBeUndefined();
    expect(result.current.error).toBe(null);
    expect(mockCalculateLiquidationPrice).not.toHaveBeenCalled();
  });

  it('recalculates when parameters change', async () => {
    mockCalculateLiquidationPrice
      .mockResolvedValueOnce('45000.00')
      .mockResolvedValueOnce('47500.00');

    const { result, rerender } = renderHook(
      (props) => usePerpsLiquidationPrice(props),
      {
        initialProps: {
          entryPrice: 50000,
          leverage: 10,
          direction: 'long' as const,
          asset: 'BTC',
        },
      },
    );

    await waitFor(() => {
      expect(result.current.liquidationPrice).toBe('45000.00');
    });

    // Change leverage
    rerender({
      entryPrice: 50000,
      leverage: 20,
      direction: 'long' as const,
      asset: 'BTC',
    });

    await waitFor(() => {
      expect(result.current.liquidationPrice).toBe('47500.00');
    });

    expect(mockCalculateLiquidationPrice).toHaveBeenCalledTimes(2);
    expect(mockCalculateLiquidationPrice).toHaveBeenLastCalledWith({
      entryPrice: 50000,
      leverage: 20,
      direction: 'long',
      asset: 'BTC',
      marginType: 'isolated',
    });
  });

  it('marks a non-Error rejection as unavailable', async () => {
    mockCalculateLiquidationPrice.mockRejectedValue('String error');

    const params = {
      entryPrice: 50000,
      leverage: 10,
      direction: 'long' as const,
      asset: 'BTC',
    };

    const { result } = renderHook(() => usePerpsLiquidationPrice(params));

    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });
    expect(result.current.liquidationPrice).toBeUndefined();
    expect(result.current.error).toBe('Failed to calculate liquidation price');
  });

  it('clears the value when the entry price becomes undefined', async () => {
    mockCalculateLiquidationPrice.mockResolvedValue('45000.00');

    // Typed from the hook's own parameter type, so renderHook's TProps —
    // inferred from initialProps — allows the undefined entry price below.
    const initialProps: Parameters<
      typeof usePerpsLiquidationPrice
    >[0] = {
      entryPrice: 50000,
      leverage: 10,
      direction: 'long',
      asset: 'BTC',
    };

    const { result, rerender } = renderHook(
      (props) => usePerpsLiquidationPrice(props),
      { initialProps },
    );

    await waitFor(() => {
      expect(result.current.liquidationPrice).toBe('45000.00');
    });

    rerender({
      entryPrice: undefined,
      leverage: 10,
      direction: 'long' as const,
      asset: 'BTC',
    });

    await waitFor(() => {
      expect(result.current.liquidationPrice).toBeUndefined();
    });
    expect(result.current.isCalculating).toBe(false);
  });

  it('drops a pending calculation when the inputs change before the timer fires', async () => {
    jest.useFakeTimers();
    try {
      mockCalculateLiquidationPrice.mockResolvedValue('45000.00');

      const { rerender } = renderHook(
        (props) => usePerpsLiquidationPrice(props, { debounceMs: 1000 }),
        {
          initialProps: {
            entryPrice: 50000,
            leverage: 10,
            direction: 'long' as const,
            asset: 'BTC',
          },
        },
      );

      // A new input restarts the timer; the first (stale) timer must be
      // cancelled, so only the latest parameters ever reach Core.
      rerender({
        entryPrice: 51000,
        leverage: 10,
        direction: 'long' as const,
        asset: 'BTC',
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      // Flush the microtasks enqueued by the timer's async callback.
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockCalculateLiquidationPrice).toHaveBeenCalledTimes(1);
      expect(mockCalculateLiquidationPrice).toHaveBeenCalledWith(
        expect.objectContaining({ entryPrice: 51000 }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('drops a late response for inputs that have since changed', async () => {
    let resolveStale: (price: string) => void = jest.fn();
    mockCalculateLiquidationPrice
      .mockImplementationOnce(
        async () =>
          new Promise<string>((resolve) => {
            resolveStale = resolve;
          }),
      )
      .mockResolvedValueOnce('46000.00');

    const { result, rerender } = renderHook(
      (props) => usePerpsLiquidationPrice(props),
      {
        initialProps: {
          entryPrice: 50000,
          leverage: 10,
          direction: 'long' as const,
          asset: 'BTC',
        },
      },
    );
    await waitFor(() => {
      expect(mockCalculateLiquidationPrice).toHaveBeenCalledTimes(1);
    });

    rerender({
      entryPrice: 51000,
      leverage: 10,
      direction: 'long' as const,
      asset: 'BTC',
    });
    await waitFor(() => {
      expect(result.current.liquidationPrice).toBe('46000.00');
    });

    // The first request settles after the newer one; it must not overwrite it.
    await act(async () => {
      resolveStale('45000.00');
    });

    expect(result.current.liquidationPrice).toBe('46000.00');
  });
});
