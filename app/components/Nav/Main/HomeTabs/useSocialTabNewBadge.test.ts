import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';

import {
  hasVisitedSocialTab,
  subscribeToSocialTabVisited,
} from '../../../Views/SocialLeaderboard/utils/socialTabVisit';
import { useSocialTabNewBadge } from './useSocialTabNewBadge';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../Views/SocialLeaderboard/utils/socialTabVisit', () => ({
  hasVisitedSocialTab: jest.fn(),
  subscribeToSocialTabVisited: jest.fn(),
}));

describe('useSocialTabNewBadge', () => {
  const unsubscribe = jest.fn();
  let notifySocialTabVisited:
    | ((hasVisitedSocialTab: boolean) => void)
    | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useSelector).mockReturnValue(true);
    jest.mocked(hasVisitedSocialTab).mockReturnValue(false);
    jest.mocked(subscribeToSocialTabVisited).mockImplementation((listener) => {
      notifySocialTabVisited = listener;
      return unsubscribe;
    });
  });

  it('shows the badge for an existing user who has not visited Social', () => {
    const { result } = renderHook(() => useSocialTabNewBadge(true));

    expect(result.current.showSocialTabNewBadge).toBe(true);
  });

  it('hides the badge for a new user', () => {
    jest.mocked(useSelector).mockReturnValue(false);

    const { result } = renderHook(() => useSocialTabNewBadge(true));

    expect(result.current.showSocialTabNewBadge).toBe(false);
  });

  it('hides the badge when Social is disabled', () => {
    const { result } = renderHook(() => useSocialTabNewBadge(false));

    expect(result.current.showSocialTabNewBadge).toBe(false);
    expect(subscribeToSocialTabVisited).not.toHaveBeenCalled();
  });

  it('keeps the badge hidden when a prior visit is persisted', () => {
    jest.mocked(hasVisitedSocialTab).mockReturnValue(true);

    const { result } = renderHook(() => useSocialTabNewBadge(true));

    expect(result.current.showSocialTabNewBadge).toBe(false);
  });

  it('hides the badge when Social is first visited through any entry point', () => {
    const { result } = renderHook(() => useSocialTabNewBadge(true));

    act(() => notifySocialTabVisited?.(true));

    expect(result.current.showSocialTabNewBadge).toBe(false);
  });

  it('unsubscribes from Social visit updates on unmount', () => {
    const { unmount } = renderHook(() => useSocialTabNewBadge(true));

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
