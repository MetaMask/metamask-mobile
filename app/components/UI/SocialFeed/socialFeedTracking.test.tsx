import { renderHook } from '@testing-library/react-native';
import { SocialEvent } from '../../Views/SocialLeaderboard/analytics/socialEvents';
import { useSocialScreenAnalytics } from '../../Views/SocialLeaderboard/analytics';
import { useSocialFeedScreenView } from './socialFeedTracking';

jest.mock('../../Views/SocialLeaderboard/analytics', () => ({
  ...jest.requireActual('../../Views/SocialLeaderboard/analytics/socialEvents'),
  useSocialScreenAnalytics: jest.fn(),
  useSocialFeedInteractions: jest.fn(() => ({})),
  useSocialInteraction: jest.fn(() => jest.fn()),
}));

const mockUseSocialScreenAnalytics = jest.mocked(useSocialScreenAnalytics);

const { Screen, Tab } = SocialEvent;

describe('useSocialFeedScreenView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['social_trending', Screen.TRENDING, Tab.TRENDING],
    ['social_live', Screen.LIVE_TRADES, Tab.LIVE_TRADES],
  ] as const)(
    'records the %s screen view from the feed state',
    (location, screen, tab) => {
      const state: [boolean, boolean, boolean] = [false, false, true];

      renderHook(() => useSocialFeedScreenView(location, undefined, state));

      expect(mockUseSocialScreenAnalytics).toHaveBeenCalledWith(screen, {
        tabName: tab,
        source: undefined,
        state,
        isActive: true,
      });
    },
  );

  it('waits for the tab to be active', () => {
    renderHook(() =>
      useSocialFeedScreenView(
        'social_trending',
        undefined,
        [false, false, true],
        false,
      ),
    );

    expect(mockUseSocialScreenAnalytics).toHaveBeenCalledWith(
      Screen.TRENDING,
      expect.objectContaining({ isActive: false }),
    );
  });

  it('leaves the screen view to the host for an embedded feed', () => {
    renderHook(() =>
      useSocialFeedScreenView('perps_home', undefined, [false, false, true]),
    );

    expect(mockUseSocialScreenAnalytics).toHaveBeenCalledWith(
      Screen.TRENDING,
      expect.objectContaining({ state: undefined, isActive: false }),
    );
  });
});
