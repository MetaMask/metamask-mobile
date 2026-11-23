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

const { Screen, Tab } = SocialEvent;

describe('useSocialFeedScreenView', () => {
  it('records the Trending screen view from the feed state', () => {
    const state: [boolean, boolean, boolean] = [false, false, true];

    renderHook(() =>
      useSocialFeedScreenView('social_trending', undefined, state),
    );

    expect(jest.mocked(useSocialScreenAnalytics)).toHaveBeenCalledWith(
      Screen.TRENDING,
      { tabName: Tab.TRENDING, source: undefined, state, isActive: true },
    );
  });
});
