import { act, renderHook } from '@testing-library/react-native';

import {
  hasVisitedLimitTab,
  markLimitTabVisited,
  subscribeToLimitTabVisited,
} from './limitTabVisit';
import { useLimitTabNewDot } from './useLimitTabNewDot';

jest.mock('./limitTabVisit', () => ({
  hasVisitedLimitTab: jest.fn(),
  markLimitTabVisited: jest.fn(),
  subscribeToLimitTabVisited: jest.fn(),
}));

describe('useLimitTabNewDot', () => {
  const unsubscribe = jest.fn();
  let notifyLimitTabVisited: ((hasVisited: boolean) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    notifyLimitTabVisited = undefined;
    jest.mocked(hasVisitedLimitTab).mockReturnValue(false);
    jest.mocked(markLimitTabVisited).mockResolvedValue(undefined);
    jest.mocked(subscribeToLimitTabVisited).mockImplementation((listener) => {
      notifyLimitTabVisited = listener;
      return unsubscribe;
    });
  });

  it('shows the dot before the Limit tab has been opened', () => {
    const { result } = renderHook(() =>
      useLimitTabNewDot({ isLimitTabEnabled: true, isLimitTabOpen: false }),
    );

    expect(result.current).toBe(true);
    expect(markLimitTabVisited).not.toHaveBeenCalled();
  });

  it('hides the dot when a prior visit is persisted', () => {
    jest.mocked(hasVisitedLimitTab).mockReturnValue(true);

    const { result } = renderHook(() =>
      useLimitTabNewDot({ isLimitTabEnabled: true, isLimitTabOpen: false }),
    );

    expect(result.current).toBe(false);
  });

  it('persists the visit when the Limit tab opens', () => {
    const { rerender } = renderHook(
      (isLimitTabOpen: boolean) =>
        useLimitTabNewDot({ isLimitTabEnabled: true, isLimitTabOpen }),
      { initialProps: false },
    );

    rerender(true);

    expect(markLimitTabVisited).toHaveBeenCalledTimes(1);
  });

  it('hides the dot once the visit is persisted', () => {
    const { result } = renderHook(() =>
      useLimitTabNewDot({ isLimitTabEnabled: true, isLimitTabOpen: true }),
    );

    act(() => notifyLimitTabVisited?.(true));

    expect(result.current).toBe(false);
  });

  it('ignores a Limit deep link while the Limit tab is disabled', () => {
    const { result } = renderHook(() =>
      useLimitTabNewDot({ isLimitTabEnabled: false, isLimitTabOpen: true }),
    );

    expect(result.current).toBe(false);
    expect(markLimitTabVisited).not.toHaveBeenCalled();
    expect(subscribeToLimitTabVisited).not.toHaveBeenCalled();
  });

  it('unsubscribes from Limit tab visit updates on unmount', () => {
    const { unmount } = renderHook(() =>
      useLimitTabNewDot({ isLimitTabEnabled: true, isLimitTabOpen: false }),
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
