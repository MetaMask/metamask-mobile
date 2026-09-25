import { renderHook } from '@testing-library/react-native';
import { useMyOpenPerpsPositionCount } from './useMyOpenPerpsPositionCount';

const mockGetPreloadedData = jest.fn();
const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../../../UI/Perps/hooks/stream/hasCachedPerpsData', () => ({
  getPreloadedData: (...args: unknown[]) => mockGetPreloadedData(...args),
}));

describe('useMyOpenPerpsPositionCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(true);
  });

  it('returns the wallet perps cache length when perps is enabled', () => {
    mockGetPreloadedData.mockReturnValue([{}, {}]);

    const { result } = renderHook(() => useMyOpenPerpsPositionCount());

    expect(result.current).toBe(2);
    expect(mockGetPreloadedData).toHaveBeenCalledWith('cachedPositions');
  });

  it('returns 0 when perps is disabled', () => {
    mockUseSelector.mockReturnValue(false);
    mockGetPreloadedData.mockReturnValue([{}]);

    const { result } = renderHook(() => useMyOpenPerpsPositionCount());

    expect(result.current).toBe(0);
    expect(mockGetPreloadedData).not.toHaveBeenCalled();
  });

  it('returns 0 when the cache is empty', () => {
    mockGetPreloadedData.mockReturnValue(undefined);

    const { result } = renderHook(() => useMyOpenPerpsPositionCount());

    expect(result.current).toBe(0);
  });
});
