import { act, renderHook, waitFor } from '@testing-library/react-native';
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

const mockEstimateCrossLiquidation = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PerpsController: {
        estimateCrossLiquidation: (params: unknown) =>
          mockEstimateCrossLiquidation(params),
      },
    },
  },
}));

describe('usePerpsLiquidationPrice', () => {
  const mockCalculateLiquidationPrice = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePerpsTrading as jest.Mock).mockReturnValue({
      calculateLiquidationPrice: mockCalculateLiquidationPrice,
    });
  });

  it('should calculate liquidation price successfully', async () => {
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

  it('should handle calculation errors', async () => {
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

  it('should handle invalid leverage errors', async () => {
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

  it('should skip calculation for invalid entry price', () => {
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

  it('should skip calculation for invalid leverage', () => {
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

  it('should skip calculation for empty asset', () => {
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

  it('should recalculate when parameters change', async () => {
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

  it('keeps the last quote while the same draft reprices, but not across markets', async () => {
    let resolveRepriced: (value: string) => void = () => undefined;
    mockCalculateLiquidationPrice
      .mockResolvedValueOnce('45000.00')
      .mockReturnValueOnce(
        new Promise<string>((resolve) => {
          resolveRepriced = resolve;
        }),
      )
      .mockReturnValueOnce(new Promise<string>(() => undefined));
    const draft = { leverage: 10, direction: 'long' as const, asset: 'BTC' };
    const { result, rerender } = renderHook(
      (props) => usePerpsLiquidationPrice(props),
      { initialProps: { ...draft, entryPrice: 50000 } },
    );
    await waitFor(() =>
      expect(result.current.liquidationPrice).toBe('45000.00'),
    );

    rerender({ ...draft, entryPrice: 50100 });

    expect(result.current.liquidationPrice).toBe('45000.00');
    expect(result.current.isCalculating).toBe(true);
    await waitFor(() =>
      expect(mockCalculateLiquidationPrice).toHaveBeenCalledTimes(2),
    );
    await act(async () => resolveRepriced('45090.00'));
    await waitFor(() =>
      expect(result.current.liquidationPrice).toBe('45090.00'),
    );

    rerender({ ...draft, asset: 'ETH', entryPrice: 3000 });

    expect(result.current.liquidationPrice).toBeUndefined();
    expect(result.current.isCalculating).toBe(true);
    await waitFor(() =>
      expect(mockCalculateLiquidationPrice).toHaveBeenCalledTimes(3),
    );
  });

  it.each([
    ['leverage', { leverage: 20 }],
    ['position size', { positionSize: 2 }],
  ])('drops the last quote when the %s changes', async (_label, change) => {
    mockCalculateLiquidationPrice
      .mockReset()
      .mockResolvedValueOnce('45000.00')
      .mockReturnValueOnce(new Promise<string>(() => undefined));
    const draft = {
      leverage: 10,
      direction: 'long' as const,
      asset: 'BTC',
      entryPrice: 50000,
      positionSize: 1,
    };
    const { result, rerender } = renderHook(
      (props) => usePerpsLiquidationPrice(props),
      { initialProps: draft },
    );
    await waitFor(() =>
      expect(result.current.liquidationPrice).toBe('45000.00'),
    );

    rerender({ ...draft, ...change });

    expect(result.current.liquidationPrice).toBeUndefined();
    expect(result.current.isCalculating).toBe(true);
    await waitFor(() =>
      expect(mockCalculateLiquidationPrice).toHaveBeenCalledTimes(2),
    );
  });

  describe('Cross orders', () => {
    const params = {
      entryPrice: 50000,
      leverage: 10,
      direction: 'long' as const,
      asset: 'BTC',
      positionSize: 0.1,
      marginType: 'cross' as const,
      providerId: 'hyperliquid' as const,
    };

    beforeEach(() => {
      mockEstimateCrossLiquidation.mockReset();
    });

    it('estimates the price from the account', async () => {
      mockEstimateCrossLiquidation.mockResolvedValue({
        status: 'price',
        price: '45000',
      });

      const { result } = renderHook(() => usePerpsLiquidationPrice(params));

      await waitFor(() =>
        expect(result.current.liquidationPrice).toBe('45000'),
      );
      expect(result.current.isCoveredByAccount).toBe(false);
      expect(mockEstimateCrossLiquidation).toHaveBeenCalledWith({
        symbol: 'BTC',
        direction: 'long',
        size: '0.1',
        entryPrice: '50000',
        leverage: 10,
        providerId: 'hyperliquid',
      });
      expect(mockCalculateLiquidationPrice).not.toHaveBeenCalled();
    });

    it('reports an order its account covers, with no price', async () => {
      mockEstimateCrossLiquidation.mockResolvedValue({
        status: 'none',
        reason: 'covered_by_account',
      });

      const { result } = renderHook(() => usePerpsLiquidationPrice(params));

      await waitFor(() => expect(result.current.isCoveredByAccount).toBe(true));
      expect(result.current.liquidationPrice).toBeUndefined();
    });

    it('is neither a price nor covered while the estimate is unavailable', async () => {
      mockEstimateCrossLiquidation.mockResolvedValue({
        status: 'unavailable',
        reason: 'provider',
      });

      const { result, rerender } = renderHook(
        ({ priceTick }) => usePerpsLiquidationPrice(params, { priceTick }),
        { initialProps: { priceTick: 1 } },
      );

      await waitFor(() => expect(result.current.isCalculating).toBe(false));
      expect(result.current.liquidationPrice).toBeUndefined();
      expect(result.current.isCoveredByAccount).toBe(false);

      // A provider without estimates is not asked again on every tick.
      rerender({ priceTick: 2 });
      rerender({ priceTick: 3 });
      expect(mockEstimateCrossLiquidation).toHaveBeenCalledTimes(1);
    });

    it('retries an unknown account on the next price tick', async () => {
      mockEstimateCrossLiquidation
        .mockResolvedValueOnce({
          status: 'unavailable',
          reason: 'account_unknown',
        })
        .mockResolvedValueOnce({ status: 'price', price: '45000' });
      const { result, rerender } = renderHook(
        ({ priceTick }) => usePerpsLiquidationPrice(params, { priceTick }),
        { initialProps: { priceTick: 1 } },
      );
      await waitFor(() => expect(result.current.isCalculating).toBe(false));

      rerender({ priceTick: 2 });

      await waitFor(() =>
        expect(result.current.liquidationPrice).toBe('45000'),
      );
      expect(mockEstimateCrossLiquidation).toHaveBeenCalledTimes(2);
    });

    it('estimates again when the account moves and keeps the last price meanwhile', async () => {
      mockEstimateCrossLiquidation
        .mockResolvedValueOnce({ status: 'price', price: '45000' })
        .mockResolvedValueOnce({ status: 'price', price: '44000' });
      const { result, rerender } = renderHook(
        ({ accountKey }) => usePerpsLiquidationPrice(params, { accountKey }),
        { initialProps: { accountKey: 'a' } },
      );
      await waitFor(() =>
        expect(result.current.liquidationPrice).toBe('45000'),
      );

      rerender({ accountKey: 'b' });

      expect(result.current.liquidationPrice).toBe('45000');
      await waitFor(() =>
        expect(result.current.liquidationPrice).toBe('44000'),
      );
    });

    it('ignores a result from the previous account', async () => {
      let resolvePrevious: (value: unknown) => void = () => undefined;
      mockEstimateCrossLiquidation
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolvePrevious = resolve;
          }),
        )
        .mockResolvedValueOnce({
          status: 'none',
          reason: 'covered_by_account',
        });
      const { result, rerender } = renderHook(
        ({ contextKey }) => usePerpsLiquidationPrice(params, { contextKey }),
        { initialProps: { contextKey: 'account-a' } },
      );
      await waitFor(() =>
        expect(mockEstimateCrossLiquidation).toHaveBeenCalledTimes(1),
      );

      rerender({ contextKey: 'account-b' });

      await waitFor(() => expect(result.current.isCoveredByAccount).toBe(true));
      await act(async () =>
        resolvePrevious({ status: 'price', price: '45000' }),
      );
      expect(result.current.liquidationPrice).toBeUndefined();
      expect(result.current.isCoveredByAccount).toBe(true);
    });
  });

  it('should handle non-Error objects in catch', async () => {
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
});
