import { renderHook, act } from '@testing-library/react-hooks';
import {
  usePredictMarketsForHomepage,
  _clearMarketsCache,
} from './usePredictMarketsForHomepage';
import type { PredictMarket } from '../../../../../UI/Predict/types';

const mockGetMarkets = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getMarkets: (...args: unknown[]) => mockGetMarkets(...args),
    },
  },
}));

let mockIsPredictEnabled = true;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (...args: unknown[]) => unknown) => {
    if (
      selector ===
      jest.requireMock('../../../../../UI/Predict').selectPredictEnabledFlag
    ) {
      return mockIsPredictEnabled;
    }
    return undefined;
  },
}));

jest.mock('../../../../../UI/Predict', () => ({
  selectPredictEnabledFlag: jest.fn(),
}));

const createMockMarket = (id: string): PredictMarket =>
  ({
    id,
    title: `Market ${id}`,
    endDate: '2026-06-01',
    outcomes: [
      {
        id: `outcome-${id}`,
        title: 'Yes',
        tokens: [{ title: 'Yes', price: 0.55 }],
      },
    ],
  }) as unknown as PredictMarket;

describe('usePredictMarketsForHomepage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _clearMarketsCache();
    mockIsPredictEnabled = true;

    mockGetMarkets.mockResolvedValue([
      createMockMarket('1'),
      createMockMarket('2'),
      createMockMarket('3'),
    ]);
  });

  it('fetches markets on mount when predict is enabled', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketsForHomepage(5),
    );

    await waitForNextUpdate();

    expect(result.current.markets).toHaveLength(3);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetMarkets).toHaveBeenCalledWith({
      category: 'trending',
      limit: 5,
    });
  });

  it('returns empty markets when predict is disabled', () => {
    mockIsPredictEnabled = false;

    const { result } = renderHook(() => usePredictMarketsForHomepage(5));

    expect(result.current.markets).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(mockGetMarkets).not.toHaveBeenCalled();
  });

  it('limits markets to the specified limit', async () => {
    mockGetMarkets.mockResolvedValue([
      createMockMarket('1'),
      createMockMarket('2'),
      createMockMarket('3'),
      createMockMarket('4'),
      createMockMarket('5'),
    ]);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketsForHomepage(3),
    );

    await waitForNextUpdate();

    expect(result.current.markets).toHaveLength(3);
  });

  it('sets error state when fetch fails', async () => {
    mockGetMarkets.mockRejectedValue(new Error('Network error'));

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketsForHomepage(5),
    );

    await waitForNextUpdate();

    expect(result.current.error).toBe('Network error');
    expect(result.current.markets).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('sets fallback error for non-Error throws', async () => {
    mockGetMarkets.mockRejectedValue('string error');

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketsForHomepage(5),
    );

    await waitForNextUpdate();

    expect(result.current.error).toBe('Failed to fetch prediction markets');
  });

  it('handles null response from getMarkets', async () => {
    mockGetMarkets.mockResolvedValue(null);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketsForHomepage(5),
    );

    await waitForNextUpdate();

    expect(result.current.markets).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('uses cached data on subsequent renders within TTL', async () => {
    const { waitForNextUpdate, unmount } = renderHook(() =>
      usePredictMarketsForHomepage(5),
    );

    await waitForNextUpdate();

    expect(mockGetMarkets).toHaveBeenCalledTimes(1);
    unmount();

    const { result: result2 } = renderHook(() =>
      usePredictMarketsForHomepage(5),
    );

    expect(result2.current.markets).toHaveLength(3);
    expect(result2.current.isLoading).toBe(false);
    expect(mockGetMarkets).toHaveBeenCalledTimes(1);
  });

  it('clears cache and refetches on refresh', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketsForHomepage(5),
    );

    await waitForNextUpdate();

    expect(mockGetMarkets).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetMarkets).toHaveBeenCalledTimes(2);
  });

  it('returns error when Engine context is null', async () => {
    const engineMock = jest.requireMock('../../../../../../core/Engine');
    const savedContext = engineMock.context;
    engineMock.context = null;

    const { result } = renderHook(() => usePredictMarketsForHomepage(5));

    // Allow the async fetchMarkets to settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe('Engine not initialized');
    expect(result.current.isLoading).toBe(false);

    engineMock.context = savedContext;
  });

  it('returns error when PredictController is null', async () => {
    const engineMock = jest.requireMock('../../../../../../core/Engine');
    const savedController = engineMock.context.PredictController;
    engineMock.context.PredictController = null;

    const { result } = renderHook(() => usePredictMarketsForHomepage(5));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe('Predict controller not available');
    expect(result.current.isLoading).toBe(false);

    engineMock.context.PredictController = savedController;
  });
});
