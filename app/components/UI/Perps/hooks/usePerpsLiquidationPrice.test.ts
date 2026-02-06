import { renderHook } from '@testing-library/react-hooks';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';
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

    const { result, waitForNextUpdate } = renderHook(() =>
      usePerpsLiquidationPrice(params),
    );

    // With 0ms debounce, still need to wait for async debounced function
    await waitForNextUpdate();

    expect(result.current.isCalculating).toBe(false);
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

    const { result, waitForNextUpdate } = renderHook(() =>
      usePerpsLiquidationPrice(params),
    );

    await waitForNextUpdate();

    expect(result.current.isCalculating).toBe(false);
    expect(result.current.liquidationPrice).toBe('0.00');
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

    const { result, waitForNextUpdate } = renderHook(() =>
      usePerpsLiquidationPrice(params),
    );

    await waitForNextUpdate();

    expect(result.current.isCalculating).toBe(false);
    expect(result.current.liquidationPrice).toBe(
      PERPS_CONSTANTS.FallbackPriceDisplay,
    );
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
    expect(result.current.liquidationPrice).toBe('0.00');
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
    expect(result.current.liquidationPrice).toBe('0.00');
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
    expect(result.current.liquidationPrice).toBe('0.00');
    expect(result.current.error).toBe(null);
    expect(mockCalculateLiquidationPrice).not.toHaveBeenCalled();
  });

  it('should recalculate when parameters change', async () => {
    mockCalculateLiquidationPrice
      .mockResolvedValueOnce('45000.00')
      .mockResolvedValueOnce('47500.00');

    const { result, rerender, waitForNextUpdate } = renderHook(
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

    await waitForNextUpdate();
    expect(result.current.liquidationPrice).toBe('45000.00');

    // Change leverage
    rerender({
      entryPrice: 50000,
      leverage: 20,
      direction: 'long' as const,
      asset: 'BTC',
    });

    await waitForNextUpdate();
    expect(result.current.liquidationPrice).toBe('47500.00');

    expect(mockCalculateLiquidationPrice).toHaveBeenCalledTimes(2);
    expect(mockCalculateLiquidationPrice).toHaveBeenLastCalledWith({
      entryPrice: 50000,
      leverage: 20,
      direction: 'long',
      asset: 'BTC',
      marginType: 'isolated',
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

    const { result, waitForNextUpdate } = renderHook(() =>
      usePerpsLiquidationPrice(params),
    );

    await waitForNextUpdate();

    expect(result.current.isCalculating).toBe(false);
    expect(result.current.liquidationPrice).toBe('0.00');
    expect(result.current.error).toBe('Failed to calculate liquidation price');
  });
});
