import { renderHook, waitFor } from '@testing-library/react-native';
import type { CrossLiquidationEstimate } from '@metamask/perps-controller';
import {
  usePerpsCrossLiquidationEstimate,
  type UsePerpsCrossLiquidationEstimateParams,
} from './usePerpsCrossLiquidationEstimate';
import { usePerpsTrading } from './usePerpsTrading';

jest.mock('./usePerpsTrading');

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
  },
}));

const baseParams: UsePerpsCrossLiquidationEstimateParams = {
  symbol: 'ETH',
  direction: 'long',
  size: '2',
  entryPrice: 2000,
  leverage: 10,
  providerId: 'hyperliquid',
  enabled: true,
};

describe('usePerpsCrossLiquidationEstimate', () => {
  const mockEstimateCrossLiquidation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockEstimateCrossLiquidation.mockReset();
    (usePerpsTrading as jest.Mock).mockReturnValue({
      estimateCrossLiquidation: mockEstimateCrossLiquidation,
    });
  });

  it('requests the Core estimate for the order and returns it', async () => {
    const estimate: CrossLiquidationEstimate = {
      status: 'price',
      price: '1650.5',
    };
    mockEstimateCrossLiquidation.mockResolvedValue(estimate);

    const { result } = renderHook(() =>
      usePerpsCrossLiquidationEstimate(baseParams),
    );

    await waitFor(() => {
      expect(result.current.estimate).toEqual(estimate);
    });
    expect(result.current.isCalculating).toBe(false);
    expect(mockEstimateCrossLiquidation).toHaveBeenCalledWith({
      symbol: 'ETH',
      direction: 'long',
      size: '2',
      entryPrice: '2000',
      leverage: 10,
      providerId: 'hyperliquid',
    });
  });

  it.each([
    ['disabled', { enabled: false }],
    ['missing a size', { size: '' }],
    ['missing a price', { entryPrice: 0 }],
    ['missing leverage', { leverage: 0 }],
    ['missing a symbol', { symbol: '' }],
  ])('skips the request when %s', async (_label, overrides) => {
    const { result } = renderHook(() =>
      usePerpsCrossLiquidationEstimate({ ...baseParams, ...overrides }),
    );

    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });
    expect(result.current.estimate).toBeUndefined();
    expect(mockEstimateCrossLiquidation).not.toHaveBeenCalled();
  });

  it('reports an unavailable estimate when the controller throws', async () => {
    mockEstimateCrossLiquidation.mockRejectedValue(new Error('not ready'));

    const { result } = renderHook(() =>
      usePerpsCrossLiquidationEstimate(baseParams),
    );

    await waitFor(() => {
      expect(result.current.estimate).toEqual({
        status: 'unavailable',
        reason: 'provider',
      });
    });
  });

  it('ignores a slower response for an older order', async () => {
    let resolveFirst: (value: CrossLiquidationEstimate) => void = () =>
      undefined;
    mockEstimateCrossLiquidation
      .mockImplementationOnce(
        async () =>
          new Promise<CrossLiquidationEstimate>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({ status: 'price', price: '1500' });

    const { result, rerender } = renderHook(
      (params: UsePerpsCrossLiquidationEstimateParams) =>
        usePerpsCrossLiquidationEstimate(params),
      { initialProps: baseParams },
    );

    await waitFor(() => {
      expect(mockEstimateCrossLiquidation).toHaveBeenCalledTimes(1);
    });
    rerender({ ...baseParams, size: '3' });

    await waitFor(() => {
      expect(result.current.estimate).toEqual({
        status: 'price',
        price: '1500',
      });
    });
    resolveFirst({ status: 'none', reason: 'covered_by_account' });

    await waitFor(() => {
      expect(result.current.estimate).toEqual({
        status: 'price',
        price: '1500',
      });
    });
  });

  it('clears the estimate when the market changes', async () => {
    mockEstimateCrossLiquidation
      .mockResolvedValueOnce({ status: 'price', price: '1650.5' })
      .mockImplementationOnce(async () => new Promise(() => undefined));

    const { result, rerender } = renderHook(
      (params: UsePerpsCrossLiquidationEstimateParams) =>
        usePerpsCrossLiquidationEstimate(params),
      { initialProps: baseParams },
    );

    await waitFor(() => {
      expect(result.current.estimate).toEqual({
        status: 'price',
        price: '1650.5',
      });
    });
    rerender({ ...baseParams, symbol: 'BTC' });

    await waitFor(() => {
      expect(result.current.estimate).toBeUndefined();
    });
    expect(result.current.isCalculating).toBe(true);
  });
});
