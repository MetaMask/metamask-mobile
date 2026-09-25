import { act, renderHook } from '@testing-library/react-native';
import type { Position } from '@metamask/perps-controller';
import { useMyOpenPerpsPositionCount } from './useMyOpenPerpsPositionCount';

const mockGetPreloadedData = jest.fn();
const mockUseSelector = jest.fn();
const mockUnsubscribe = jest.fn();
let positionsCallback: ((positions: Position[]) => void) | undefined;
const mockSubscribeToPositions = jest.fn(
  ({ callback }: { callback: (positions: Position[]) => void }) => {
    positionsCallback = callback;
    return mockUnsubscribe;
  },
);

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../../../UI/Perps/hooks/stream/hasCachedPerpsData', () => ({
  getPreloadedData: (...args: unknown[]) => mockGetPreloadedData(...args),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PerpsController: {
        subscribeToPositions: (...args: unknown[]) =>
          mockSubscribeToPositions(...args),
      },
    },
  },
}));

describe('useMyOpenPerpsPositionCount', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    positionsCallback = undefined;
    mockUseSelector.mockReturnValue(true);
    mockSubscribeToPositions.mockImplementation(
      ({ callback }: { callback: (positions: Position[]) => void }) => {
        positionsCallback = callback;
        return mockUnsubscribe;
      },
    );
  });

  it('returns the wallet perps cache length when perps is enabled', () => {
    mockGetPreloadedData.mockReturnValue([{}, {}]);

    const { result } = renderHook(() => useMyOpenPerpsPositionCount());

    expect(result.current).toBe(2);
    expect(mockGetPreloadedData).toHaveBeenCalledWith('cachedPositions');
    expect(mockSubscribeToPositions).toHaveBeenCalledTimes(1);
  });

  it('returns 0 when perps is disabled', () => {
    mockUseSelector.mockReturnValue(false);
    mockGetPreloadedData.mockReturnValue([{}]);

    const { result } = renderHook(() => useMyOpenPerpsPositionCount());

    expect(result.current).toBe(0);
    expect(mockGetPreloadedData).not.toHaveBeenCalled();
    expect(mockSubscribeToPositions).not.toHaveBeenCalled();
  });

  it('returns 0 when the cache is empty', () => {
    mockGetPreloadedData.mockReturnValue(undefined);

    const { result } = renderHook(() => useMyOpenPerpsPositionCount());

    expect(result.current).toBe(0);
  });

  it('updates the count when live positions arrive', () => {
    mockGetPreloadedData.mockReturnValue([]);

    const { result } = renderHook(() => useMyOpenPerpsPositionCount());

    expect(result.current).toBe(0);

    act(() => {
      positionsCallback?.([{} as Position, {} as Position, {} as Position]);
    });

    expect(result.current).toBe(3);
  });

  it('unsubscribes when the hook unmounts', () => {
    mockGetPreloadedData.mockReturnValue([]);

    const { unmount } = renderHook(() => useMyOpenPerpsPositionCount());
    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
