import { renderHook, act } from '@testing-library/react-hooks';
import {
  usePredictPositionsForHomepage,
  _clearPositionsCache,
} from './usePredictPositionsForHomepage';
import type { PredictPosition } from '../../../../../UI/Predict/types';

const mockGetPositions = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getPositions: (...args: unknown[]) => mockGetPositions(...args),
    },
  },
}));

let mockIsPredictEnabled = true;
let mockUserAddress: string | null = '0xuser123';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (...args: unknown[]) => unknown) => {
    if (
      selector ===
      jest.requireMock('../../../../../UI/Predict/selectors/featureFlags')
        .selectPredictEnabledFlag
    ) {
      return mockIsPredictEnabled;
    }
    if (
      selector ===
      jest.requireMock('../../../../../../selectors/accountsController')
        .selectSelectedInternalAccountFormattedAddress
    ) {
      return mockUserAddress;
    }
    return undefined;
  },
}));

jest.mock('../../../../../UI/Predict/selectors/featureFlags', () => ({
  selectPredictEnabledFlag: jest.fn(),
}));

jest.mock('../../../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
}));

const createMockPosition = (id: string): PredictPosition =>
  ({
    outcomeId: `outcome-${id}`,
    outcomeIndex: 0,
    marketId: `market-${id}`,
    title: `Position ${id}`,
    outcome: 'Yes',
    icon: `https://example.com/icon-${id}.png`,
    initialValue: 10,
    currentValue: 12,
    size: 15,
    percentPnl: 20,
  }) as unknown as PredictPosition;

describe('usePredictPositionsForHomepage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _clearPositionsCache();
    mockIsPredictEnabled = true;
    mockUserAddress = '0xuser123';

    mockGetPositions.mockResolvedValue([
      createMockPosition('1'),
      createMockPosition('2'),
      createMockPosition('3'),
    ]);
  });

  it('fetches positions on mount when predict is enabled', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictPositionsForHomepage(5),
    );

    await waitForNextUpdate();

    expect(result.current.positions).toHaveLength(3);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetPositions).toHaveBeenCalledWith({
      address: '0xuser123',
    });
  });

  it('returns empty positions when predict is disabled', () => {
    mockIsPredictEnabled = false;

    const { result } = renderHook(() => usePredictPositionsForHomepage(5));

    expect(result.current.positions).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPositions).not.toHaveBeenCalled();
  });

  it('returns empty positions when user address is null', () => {
    mockUserAddress = null;

    const { result } = renderHook(() => usePredictPositionsForHomepage(5));

    expect(result.current.positions).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(mockGetPositions).not.toHaveBeenCalled();
  });

  it('limits positions to maxPositions parameter', async () => {
    mockGetPositions.mockResolvedValue([
      createMockPosition('1'),
      createMockPosition('2'),
      createMockPosition('3'),
      createMockPosition('4'),
      createMockPosition('5'),
    ]);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictPositionsForHomepage(2),
    );

    await waitForNextUpdate();

    expect(result.current.positions).toHaveLength(2);
  });

  it('sets error state when fetch fails', async () => {
    mockGetPositions.mockRejectedValue(new Error('API error'));

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictPositionsForHomepage(5),
    );

    await waitForNextUpdate();

    expect(result.current.error).toBe('API error');
    expect(result.current.positions).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('sets fallback error for non-Error throws', async () => {
    mockGetPositions.mockRejectedValue('string error');

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictPositionsForHomepage(5),
    );

    await waitForNextUpdate();

    expect(result.current.error).toBe('Failed to fetch positions');
  });

  it('handles null response from getPositions', async () => {
    mockGetPositions.mockResolvedValue(null);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictPositionsForHomepage(5),
    );

    await waitForNextUpdate();

    expect(result.current.positions).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('uses cached data on subsequent renders within TTL', async () => {
    const { waitForNextUpdate, unmount } = renderHook(() =>
      usePredictPositionsForHomepage(5),
    );

    await waitForNextUpdate();

    expect(mockGetPositions).toHaveBeenCalledTimes(1);
    unmount();

    const { result: result2 } = renderHook(() =>
      usePredictPositionsForHomepage(5),
    );

    expect(result2.current.positions).toHaveLength(3);
    expect(result2.current.isLoading).toBe(false);
    expect(mockGetPositions).toHaveBeenCalledTimes(1);
  });

  it('clears cache and refetches on refresh', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictPositionsForHomepage(5),
    );

    await waitForNextUpdate();

    expect(mockGetPositions).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetPositions).toHaveBeenCalledTimes(2);
  });
});
