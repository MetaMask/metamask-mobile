import { renderHook, waitFor } from '@testing-library/react-native';
import type { CrossLiquidationEstimate } from '@metamask/perps-controller';
import {
  usePerpsCrossLiquidationEstimate,
  type UsePerpsCrossLiquidationEstimateParams,
} from './usePerpsCrossLiquidationEstimate';

const mockEstimateCrossLiquidation = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      estimateCrossLiquidation: (...args: unknown[]) =>
        mockEstimateCrossLiquidation(...args),
    },
  },
}));

const createDeferred = <Value>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const baseParams: UsePerpsCrossLiquidationEstimateParams = {
  enabled: true,
  symbol: 'BTC',
  direction: 'long',
  size: '0.1',
  entryPrice: 100_000,
  leverage: 10,
  providerId: 'hyperliquid',
  refreshKey: 'a',
};

describe('usePerpsCrossLiquidationEstimate', () => {
  beforeEach(() => {
    mockLoggerError.mockReset();
    mockEstimateCrossLiquidation.mockReset();
    mockEstimateCrossLiquidation.mockResolvedValue({
      status: 'price',
      price: '91919.19',
    });
  });

  it('requests the controller estimate for the order', async () => {
    const { result } = renderHook(() =>
      usePerpsCrossLiquidationEstimate(baseParams),
    );

    await waitFor(() =>
      expect(result.current.estimate).toEqual({
        status: 'price',
        price: '91919.19',
      }),
    );
    expect(result.current.isCalculating).toBe(false);
    expect(mockEstimateCrossLiquidation).toHaveBeenCalledWith({
      symbol: 'BTC',
      direction: 'long',
      size: '0.1',
      entryPrice: '100000',
      leverage: 10,
      providerId: 'hyperliquid',
    });
  });

  it('skips the controller while disabled', () => {
    const { result } = renderHook(() =>
      usePerpsCrossLiquidationEstimate({ ...baseParams, enabled: false }),
    );

    expect(result.current.estimate).toBeUndefined();
    expect(mockEstimateCrossLiquidation).not.toHaveBeenCalled();
  });

  it('re-estimates when the refresh key changes', async () => {
    const { rerender } = renderHook(
      (params: UsePerpsCrossLiquidationEstimateParams) =>
        usePerpsCrossLiquidationEstimate(params),
      { initialProps: baseParams },
    );
    await waitFor(() =>
      expect(mockEstimateCrossLiquidation).toHaveBeenCalledTimes(1),
    );

    rerender({ ...baseParams, refreshKey: 'b' });

    await waitFor(() =>
      expect(mockEstimateCrossLiquidation).toHaveBeenCalledTimes(2),
    );
  });

  it('ignores a slower response for an older order', async () => {
    const older = createDeferred<CrossLiquidationEstimate>();
    mockEstimateCrossLiquidation
      .mockReturnValueOnce(older.promise)
      .mockResolvedValueOnce({ status: 'price', price: '80000' });
    const { result, rerender } = renderHook(
      (params: UsePerpsCrossLiquidationEstimateParams) =>
        usePerpsCrossLiquidationEstimate(params),
      { initialProps: baseParams },
    );
    await waitFor(() =>
      expect(mockEstimateCrossLiquidation).toHaveBeenCalledTimes(1),
    );

    rerender({ ...baseParams, size: '0.2' });
    await waitFor(() =>
      expect(result.current.estimate).toEqual({
        status: 'price',
        price: '80000',
      }),
    );
    older.resolve({ status: 'none', reason: 'covered_by_account' });

    await waitFor(() =>
      expect(result.current.estimate).toEqual({
        status: 'price',
        price: '80000',
      }),
    );
  });

  it('reports a distinct request failure and logs it when the controller rejects', async () => {
    const failure = new Error('boom');
    mockEstimateCrossLiquidation.mockRejectedValue(failure);

    const { result } = renderHook(() =>
      usePerpsCrossLiquidationEstimate(baseParams),
    );

    await waitFor(() =>
      expect(result.current.estimate).toEqual({
        status: 'unavailable',
        reason: 'request_failed',
      }),
    );
    expect(result.current.isCalculating).toBe(false);
    expect(mockLoggerError).toHaveBeenCalledWith(
      failure,
      expect.objectContaining({
        tags: expect.objectContaining({
          component: 'usePerpsCrossLiquidationEstimate',
        }),
      }),
    );
  });

  it('keeps the controller account_unknown reason distinct from a request failure', async () => {
    mockEstimateCrossLiquidation.mockResolvedValue({
      status: 'unavailable',
      reason: 'account_unknown',
    });

    const { result } = renderHook(() =>
      usePerpsCrossLiquidationEstimate(baseParams),
    );

    await waitFor(() =>
      expect(result.current.estimate).toEqual({
        status: 'unavailable',
        reason: 'account_unknown',
      }),
    );
    expect(mockLoggerError).not.toHaveBeenCalled();
  });
});
