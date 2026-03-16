import { renderHook } from '@testing-library/react-native';
import { usePredictPositionsForHomepage } from './usePredictPositionsForHomepage';
import type { PredictPosition } from '../../../../../UI/Predict/types';

const mockRefetch = jest.fn().mockResolvedValue(undefined);
let mockUsePredictPositionsReturn: {
  data: PredictPosition[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: jest.Mock;
} = {
  data: undefined,
  isLoading: false,
  error: null,
  refetch: mockRefetch,
};

jest.mock('../../../../../UI/Predict/hooks/usePredictPositions', () => ({
  usePredictPositions: () => mockUsePredictPositionsReturn,
}));

const createMockPosition = (id: string, currentValue = 12): PredictPosition =>
  ({
    outcomeId: `outcome-${id}`,
    outcomeIndex: 0,
    marketId: `market-${id}`,
    title: `Position ${id}`,
    outcome: 'Yes',
    icon: `https://example.com/icon-${id}.png`,
    initialValue: 10,
    currentValue,
    size: 15,
    percentPnl: 20,
  }) as unknown as PredictPosition;

describe('usePredictPositionsForHomepage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictPositionsReturn = {
      data: [
        createMockPosition('1'),
        createMockPosition('2'),
        createMockPosition('3'),
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };
  });

  it('returns positions from usePredictPositions', () => {
    const { result } = renderHook(() => usePredictPositionsForHomepage());

    expect(result.current.positions).toHaveLength(3);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns empty positions when data is undefined', () => {
    mockUsePredictPositionsReturn.data = undefined;

    const { result } = renderHook(() => usePredictPositionsForHomepage());

    expect(result.current.positions).toHaveLength(0);
  });

  it('slices positions to maxPositions', () => {
    mockUsePredictPositionsReturn.data = [
      createMockPosition('1'),
      createMockPosition('2'),
      createMockPosition('3'),
      createMockPosition('4'),
      createMockPosition('5'),
    ];

    const { result } = renderHook(() =>
      usePredictPositionsForHomepage({ maxPositions: 2 }),
    );

    expect(result.current.positions).toHaveLength(2);
    expect(result.current.positions[0].outcomeId).toBe('outcome-1');
    expect(result.current.positions[1].outcomeId).toBe('outcome-2');
  });

  it('returns all positions when maxPositions is omitted', () => {
    const { result } = renderHook(() => usePredictPositionsForHomepage());

    expect(result.current.positions).toHaveLength(3);
  });

  it('maps Error to error string', () => {
    mockUsePredictPositionsReturn.error = new Error('API error');

    const { result } = renderHook(() => usePredictPositionsForHomepage());

    expect(result.current.error).toBe('API error');
  });

  it('maps non-Error to error string', () => {
    mockUsePredictPositionsReturn.error = 'string error' as unknown as Error;

    const { result } = renderHook(() => usePredictPositionsForHomepage());

    expect(result.current.error).toBe('string error');
  });

  it('returns null error when no error', () => {
    const { result } = renderHook(() => usePredictPositionsForHomepage());

    expect(result.current.error).toBeNull();
  });

  it('forwards isLoading from usePredictPositions', () => {
    mockUsePredictPositionsReturn.isLoading = true;

    const { result } = renderHook(() => usePredictPositionsForHomepage());

    expect(result.current.isLoading).toBe(true);
  });

  it('exposes refetch from usePredictPositions', async () => {
    const { result } = renderHook(() => usePredictPositionsForHomepage());

    await result.current.refetch();

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  describe('claimable option', () => {
    it('defaults claimable to false', () => {
      const { result } = renderHook(() => usePredictPositionsForHomepage());

      expect(result.current.totalClaimableValue).toBe(0);
    });

    it('computes totalClaimableValue as sum of currentValue when claimable is true', () => {
      mockUsePredictPositionsReturn.data = [
        createMockPosition('c1', 5),
        createMockPosition('c2', 10),
        createMockPosition('c3', 3),
      ];

      const { result } = renderHook(() =>
        usePredictPositionsForHomepage({ claimable: true }),
      );

      expect(result.current.totalClaimableValue).toBe(18);
    });

    it('returns totalClaimableValue 0 when claimable is false', () => {
      mockUsePredictPositionsReturn.data = [createMockPosition('1', 100)];

      const { result } = renderHook(() =>
        usePredictPositionsForHomepage({ claimable: false }),
      );

      expect(result.current.totalClaimableValue).toBe(0);
    });

    it('treats undefined currentValue as 0 in totalClaimableValue sum', () => {
      mockUsePredictPositionsReturn.data = [
        {
          ...createMockPosition('c1', 5),
          currentValue: undefined,
        } as unknown as PredictPosition,
      ];

      const { result } = renderHook(() =>
        usePredictPositionsForHomepage({ claimable: true }),
      );

      expect(result.current.totalClaimableValue).toBe(0);
    });
  });
});
