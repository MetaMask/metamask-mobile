import { renderHook, waitFor } from '@testing-library/react-native';
import { useOrderLiquidationRow } from './useOrderLiquidationRow';

const mockEstimateCrossLiquidation = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      estimateCrossLiquidation: (...args: unknown[]) =>
        mockEstimateCrossLiquidation(...args),
    },
  },
}));

const baseParams: Parameters<typeof useOrderLiquidationRow>[0] = {
  isCrossOrder: true,
  symbol: 'ETH',
  direction: 'long',
  entryPrice: 2500,
  positionSize: '0.5',
  leverage: 10,
  providerId: 'lighter',
  refreshKey: 'a',
  hasValidAmount: true,
  isolatedPrice: '1900',
};

describe('useOrderLiquidationRow', () => {
  beforeEach(() => {
    mockEstimateCrossLiquidation.mockReset();
    mockEstimateCrossLiquidation.mockResolvedValue({
      status: 'price',
      price: '2183.6',
    });
  });

  it('estimates a cross order against the venue it goes to', async () => {
    const { result } = renderHook(() => useOrderLiquidationRow(baseParams));

    await waitFor(() => expect(result.current.rawPrice).toBe('2183.6'));
    expect(mockEstimateCrossLiquidation).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'ETH', providerId: 'lighter' }),
    );
  });

  it('keeps the cross estimate unavailable when the venue is unknown', () => {
    const { result } = renderHook(() =>
      useOrderLiquidationRow({ ...baseParams, providerId: undefined }),
    );

    expect(mockEstimateCrossLiquidation).not.toHaveBeenCalled();
    expect(result.current.contentKey).toBe(
      'cross_liquidation_estimate_unavailable',
    );
    expect(result.current.rawPrice).toBe('');
    expect(result.current.isCrossEstimateLoading).toBe(false);
  });

  it('uses the isolated price for an isolated order without calling the controller', () => {
    const { result } = renderHook(() =>
      useOrderLiquidationRow({ ...baseParams, isCrossOrder: false }),
    );

    expect(mockEstimateCrossLiquidation).not.toHaveBeenCalled();
    expect(result.current.contentKey).toBe('liquidation_price');
    expect(result.current.rawPrice).toBe('1900');
  });
});
