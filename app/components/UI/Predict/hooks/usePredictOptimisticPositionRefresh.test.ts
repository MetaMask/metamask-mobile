import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePredictOptimisticPositionRefresh } from './usePredictOptimisticPositionRefresh';
import { PredictPosition, PredictPositionStatus } from '../types';
import { usePredictPositions } from './usePredictPositions';

jest.mock('./usePredictPositions');

const basePosition: PredictPosition = {
  id: 'pos-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcome: 'Yes',
  outcomeTokenId: 'token-1',
  title: 'Test Position',
  icon: 'https://example.com/icon.png',
  size: 100,
  amount: 100,
  price: 0.5,
  outcomeIndex: 0,
  avgPrice: 0.5,
  initialValue: 1000,
  currentValue: 1200,
  percentPnl: 20,
  cashPnl: 200,
  claimable: false,
  endDate: '2025-12-31T23:59:59Z',
  optimistic: false,
  status: PredictPositionStatus.OPEN,
};

const mockLoadPositions = jest.fn();
const mockUsePredictPositions = usePredictPositions as jest.MockedFunction<
  typeof usePredictPositions
>;

describe('usePredictOptimisticPositionRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockLoadPositions.mockClear();
    mockLoadPositions.mockResolvedValue(undefined);
    mockUsePredictPositions.mockReturnValue({
      positions: [],
      loadPositions: mockLoadPositions,
      isLoading: false,
      isRefreshing: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('returns the initial position', () => {
    const { result } = renderHook(() =>
      usePredictOptimisticPositionRefresh({
        position: basePosition,
      }),
    );

    expect(result.current).toEqual(basePosition);
  });

  it('updates position when positions array changes', async () => {
    const updatedPosition = {
      ...basePosition,
      currentValue: 1500,
      percentPnl: 50,
    };
    mockUsePredictPositions.mockReturnValue({
      positions: [],
      loadPositions: mockLoadPositions,
      isLoading: false,
      isRefreshing: false,
      error: null,
    });

    const { result, rerender } = renderHook(() =>
      usePredictOptimisticPositionRefresh({
        position: basePosition,
      }),
    );

    expect(result.current.currentValue).toBe(1200);

    mockUsePredictPositions.mockReturnValue({
      positions: [updatedPosition],
      loadPositions: mockLoadPositions,
      isLoading: false,
      isRefreshing: false,
      error: null,
    });

    await act(async () => {
      // @ts-expect-error - rerender doesn't need args when hook has no props
      rerender();
    });

    expect(result.current.currentValue).toBe(1500);
    expect(result.current.percentPnl).toBe(50);
  });

  it('starts auto-refresh immediately when position is optimistic', async () => {
    const optimisticPosition = { ...basePosition, optimistic: true };

    renderHook(() =>
      usePredictOptimisticPositionRefresh({
        position: optimisticPosition,
      }),
    );

    await waitFor(() => {
      expect(mockLoadPositions).toHaveBeenCalledWith({ isRefresh: true });
    });
  });

  it('does not start auto-refresh when position is not optimistic', async () => {
    renderHook(() =>
      usePredictOptimisticPositionRefresh({
        position: basePosition,
      }),
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });

    expect(mockLoadPositions).not.toHaveBeenCalled();
  });

  it('continues auto-refresh at specified intervals after each load completes', async () => {
    const optimisticPosition = { ...basePosition, optimistic: true };

    renderHook(() =>
      usePredictOptimisticPositionRefresh({
        position: optimisticPosition,
        pollingInterval: 1000,
      }),
    );

    await waitFor(() => {
      expect(mockLoadPositions).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(mockLoadPositions).toHaveBeenCalledTimes(2);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(mockLoadPositions).toHaveBeenCalledTimes(3);
  });

  it('uses default polling interval of 2000ms when not specified', async () => {
    const optimisticPosition = { ...basePosition, optimistic: true };

    renderHook(() =>
      usePredictOptimisticPositionRefresh({
        position: optimisticPosition,
      }),
    );

    await waitFor(() => {
      expect(mockLoadPositions).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1999);
    });

    expect(mockLoadPositions).toHaveBeenCalledTimes(1);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });

    expect(mockLoadPositions).toHaveBeenCalledTimes(2);
  });

  it('stops auto-refresh when position becomes non-optimistic', async () => {
    const optimisticPosition = { ...basePosition, optimistic: true };
    const resolvedPosition = { ...basePosition, optimistic: false };
    mockUsePredictPositions.mockReturnValue({
      positions: [],
      loadPositions: mockLoadPositions,
      isLoading: false,
      isRefreshing: false,
      error: null,
    });

    const { rerender } = renderHook(
      ({ position }) =>
        usePredictOptimisticPositionRefresh({
          position,
        }),
      { initialProps: { position: optimisticPosition } },
    );

    await waitFor(() => {
      expect(mockLoadPositions).toHaveBeenCalledTimes(1);
    });
    mockLoadPositions.mockClear();
    mockUsePredictPositions.mockReturnValue({
      positions: [resolvedPosition],
      loadPositions: mockLoadPositions,
      isLoading: false,
      isRefreshing: false,
      error: null,
    });
    rerender({ position: resolvedPosition });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });

    expect(mockLoadPositions).not.toHaveBeenCalled();
  });

  it('cleans up auto-refresh on unmount', async () => {
    const optimisticPosition = { ...basePosition, optimistic: true };

    const { unmount } = renderHook(() =>
      usePredictOptimisticPositionRefresh({
        position: optimisticPosition,
      }),
    );

    await waitFor(() => {
      expect(mockLoadPositions).toHaveBeenCalledTimes(1);
    });
    mockLoadPositions.mockClear();
    unmount();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });

    expect(mockLoadPositions).not.toHaveBeenCalled();
  });

  it('finds and updates position from positions array by marketId and outcomeId', async () => {
    const position1 = { ...basePosition, outcomeId: 'outcome-1' };
    const position2 = {
      ...basePosition,
      id: 'pos-2',
      outcomeId: 'outcome-2',
      currentValue: 1500,
    };
    const updatedPosition1 = {
      ...position1,
      currentValue: 1800,
      percentPnl: 80,
    };
    mockUsePredictPositions.mockReturnValue({
      positions: [],
      loadPositions: mockLoadPositions,
      isLoading: false,
      isRefreshing: false,
      error: null,
    });

    const { result, rerender } = renderHook(() =>
      usePredictOptimisticPositionRefresh({
        position: position1,
      }),
    );

    expect(result.current.currentValue).toBe(1200);

    mockUsePredictPositions.mockReturnValue({
      positions: [position2, updatedPosition1],
      loadPositions: mockLoadPositions,
      isLoading: false,
      isRefreshing: false,
      error: null,
    });

    await act(async () => {
      // @ts-expect-error - rerender doesn't need args when hook has no props
      rerender();
    });

    expect(result.current.currentValue).toBe(1800);
    expect(result.current.percentPnl).toBe(80);
  });

  it('handles slow network by waiting for each request to complete', async () => {
    const optimisticPosition = { ...basePosition, optimistic: true };
    let resolveLoad: (() => void) | null = null;
    mockLoadPositions.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLoad = resolve;
        }),
    );

    renderHook(() =>
      usePredictOptimisticPositionRefresh({
        position: optimisticPosition,
        pollingInterval: 1000,
      }),
    );

    await waitFor(() => {
      expect(mockLoadPositions).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(mockLoadPositions).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLoad?.();
      await jest.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(mockLoadPositions).toHaveBeenCalledTimes(2);
  });

  it('handles loadPositions errors gracefully', async () => {
    const optimisticPosition = { ...basePosition, optimistic: true };
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mockLoadPositions.mockRejectedValue(new Error('Network error'));

    renderHook(() =>
      usePredictOptimisticPositionRefresh({
        position: optimisticPosition,
        pollingInterval: 1000,
      }),
    );

    await waitFor(() => {
      expect(mockLoadPositions).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(mockLoadPositions).toHaveBeenCalledTimes(2);

    consoleErrorSpy.mockRestore();
  });
});
