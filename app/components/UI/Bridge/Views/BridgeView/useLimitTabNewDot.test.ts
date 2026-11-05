import { act, renderHook } from '@testing-library/react-native';

import {
  hasVisitedLimitTab,
  subscribeToLimitTabVisited,
} from './limitTabVisit';
import { useLimitTabNewDot } from './useLimitTabNewDot';

jest.mock('./limitTabVisit', () => ({
  hasVisitedLimitTab: jest.fn(),
  subscribeToLimitTabVisited: jest.fn(),
}));

describe('useLimitTabNewDot', () => {
  const unsubscribe = jest.fn();
  let notifyLimitTabVisited: ((hasVisited: boolean) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasVisitedLimitTab).mockReturnValue(false);
    jest.mocked(subscribeToLimitTabVisited).mockImplementation((listener) => {
      notifyLimitTabVisited = listener;
      return unsubscribe;
    });
  });

  it('shows the dot before the Limit tab has been opened', () => {
    const { result } = renderHook(() => useLimitTabNewDot(true));

    expect(result.current).toBe(true);
  });

  it('hides the dot when the Limit tab is disabled', () => {
    const { result } = renderHook(() => useLimitTabNewDot(false));

    expect(result.current).toBe(false);
    expect(subscribeToLimitTabVisited).not.toHaveBeenCalled();
  });

  it('keeps the dot hidden when a prior visit is persisted', () => {
    jest.mocked(hasVisitedLimitTab).mockReturnValue(true);

    const { result } = renderHook(() => useLimitTabNewDot(true));

    expect(result.current).toBe(false);
  });

  it('hides the dot when the Limit tab is first opened', () => {
    const { result } = renderHook(() => useLimitTabNewDot(true));

    act(() => notifyLimitTabVisited?.(true));

    expect(result.current).toBe(false);
  });

  it('unsubscribes from Limit tab visit updates on unmount', () => {
    const { unmount } = renderHook(() => useLimitTabNewDot(true));

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});