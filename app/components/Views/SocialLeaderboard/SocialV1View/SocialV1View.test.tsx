import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Routes from '../../../../constants/navigation/Routes';
import SocialV1View from './SocialV1View';
import { SocialV1ViewSelectorsIDs } from './SocialV1View.testIds';
import { SOCIAL_V1_AB_KEY } from './abTestConfig';
import { SocialFeedPostingBannerSelectorsIDs } from './feed/components/SocialFeedPostingBanner.testIds';
import {
  MOCK_SOCIAL_V1_FEED_ITEMS,
  mockOpenPerpsFeedItem,
} from './feed/mocks/socialV1Feed.mock';
import { getSocialFeedPositionCardTestId } from './feed/components/SocialFeedPositionCard.testIds';
import {
  COMPOSER_POSTING_DELAY_MS,
  resetSocialV1ComposedFeedStore,
  submitSocialV1ComposedPost,
} from './feed/store/socialV1ComposedFeedStore';
import { LiveTradesViewSelectorsIDs } from '../LiveTradesView/LiveTradesView.testIds';
import type { UseMyProfileResult } from '../MyProfileView/hooks';

const mockPlaySelection = jest.fn().mockResolvedValue(undefined);
const mockTrack = jest.fn();
const mockNavigate = jest.fn();
const mockOpenSystemSettings = jest.fn();
const mockRefreshMyProfile = jest.fn().mockResolvedValue(undefined);
const mockUseMyProfile = jest.fn<UseMyProfileResult, []>(() => ({
  profile: null,
  isLoading: false,
  error: null,
  refresh: mockRefreshMyProfile,
}));
let mockRouteParams: { showNotificationsBanner?: boolean } = {};

jest.mock('../MyProfileView/hooks', () => ({
  useMyProfile: () => mockUseMyProfile(),
}));

// The feed pages now fetch through `useTraderFeed`, which reads keyring state
// and React Query. This suite is about the V1 chrome -- tabs, header, filters --
// so stub the data source and let the feed's own suites cover it.
// The feed now fetches through `useTraderFeed`, which needs keyring state and
// React Query. This suite covers the V1 chrome, so stand in for the data source
// while still driving the real composed-post store the banner tests depend on.
jest.mock('./feed/hooks/useSocialV1Feed', () => ({
  useSocialV1Feed: jest.requireActual('./feed/mocks/mockComposedFeedHook')
    .mockUseSocialV1Feed,
}));

const mockUseABTest = jest.fn();
jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: (...args: unknown[]) => {
    mockUseABTest(...args);
    return {
      variant: { useSocialV1: true },
      variantName: 'treatment',
      isActive: true,
    };
  },
}));

jest.mock('../analytics', () => {
  const events = jest.requireActual('../analytics/socialLeaderboardEvents');
  return {
    ...events,
    useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
  };
});

jest.mock('./feed/components/SocialFeedPostShell', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ post }: { post: { item: { id: string } } }) => (
      <View testID={`social-v1-feed-card-${post.item.id}`} />
    ),
  };
});

jest.mock('./feed/components/PopularTradersCarousel', () => {
  const ReactActual = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, {
        testID: 'popular-traders-carousel-section',
      }),
  };
});

jest.mock('./feed/components', () => ({
  HotTokensCarousel: () => null,
}));

jest.mock('../components/PositionTokenAvatar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('react-native-pager-view', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockPagerView = ReactActual.forwardRef(
    (
      props: {
        children?: React.ReactNode;
        onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
        testID?: string;
      },
      _ref: React.Ref<unknown>,
    ) => (
      <View testID={props.testID} onPageSelected={props.onPageSelected}>
        {props.children}
      </View>
    ),
  );
  MockPagerView.displayName = 'MockPagerView';
  return { __esModule: true, default: MockPagerView };
});

jest.mock('../../../../util/haptics', () => ({
  playSelection: () => mockPlaySelection(),
}));

jest.mock('../TopTradersView', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'top-traders-view' }),
  };
});

jest.mock('../shell/LeaderboardShellTabPage', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ isActive }: { isActive?: boolean }) =>
      isActive
        ? ReactActual.createElement(View, { testID: 'top-traders-view' })
        : null,
  };
});

jest.mock(
  '../../../../util/notifications/services/NotificationService',
  () => ({
    __esModule: true,
    default: { openSystemSettings: () => mockOpenSystemSettings() },
  }),
);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const ReactActual = jest.requireActual('react');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
    useRoute: () => ({ params: mockRouteParams, name: 'SocialV1View' }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => callback(), [callback]);
    },
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useReducedMotion: jest.fn(() => false),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const chainable = () => {
    const api: Record<string, unknown> = {};
    const returnApi = () => api;
    [
      'enabled',
      'onBegin',
      'onStart',
      'onUpdate',
      'onEnd',
      'onFinalize',
      'activeOffsetX',
      'failOffsetY',
      'hitSlop',
      'minDistance',
      'maxPointers',
    ].forEach((method) => {
      api[method] = jest.fn(returnApi);
    });
    return api;
  };

  return {
    Gesture: {
      Pan: jest.fn(chainable),
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

describe('SocialV1View', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    act(() => {
      resetSocialV1ComposedFeedStore();
    });
    mockUseMyProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error: null,
      refresh: mockRefreshMyProfile,
    });
  });

  afterEach(() => {
    act(() => {
      resetSocialV1ComposedFeedStore();
    });
  });

  it('renders Trending, Following, Leaderboard, and Live trades tabs', () => {
    renderWithProvider(<SocialV1View />);

    expect(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-0-label`),
    ).toHaveTextContent('social_leaderboard.feed.tabs.trending');
    expect(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-1-label`),
    ).toHaveTextContent('social_leaderboard.feed.tabs.following');
    expect(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-2-label`),
    ).toHaveTextContent('social_leaderboard.feed.tabs.leaderboard');
    expect(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-3-label`),
    ).toHaveTextContent('social_leaderboard.feed.tabs.live_trades');
  });

  it('omits tab sub-navigation pills', () => {
    renderWithProvider(<SocialV1View />);

    expect(screen.queryByTestId('social-shell-subnav')).toBeNull();
  });

  it('mounts the leaderboard list once the Leaderboard tab is opened', () => {
    renderWithProvider(<SocialV1View />);

    expect(screen.queryByTestId('top-traders-view')).toBeNull();

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-2`),
    );

    expect(screen.getByTestId('top-traders-view')).toBeOnTheScreen();
  });

  it('renders the three mocked position cards on Trending', () => {
    renderWithProvider(<SocialV1View />);

    MOCK_SOCIAL_V1_FEED_ITEMS.forEach((item) => {
      expect(
        screen.getByTestId(getSocialFeedPositionCardTestId(item.id)),
      ).toBeOnTheScreen();
    });
  });

  it('emits TSA-1122 exposure when the v1 home opens', () => {
    renderWithProvider(<SocialV1View />);

    expect(mockUseABTest).toHaveBeenCalledWith(
      SOCIAL_V1_AB_KEY,
      expect.anything(),
      expect.objectContaining({ experimentName: 'Social V1' }),
    );
  });

  it('opens My Profile from the avatar', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(screen.getByTestId(SocialV1ViewSelectorsIDs.AVATAR_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.MY_PROFILE);
  });

  it('opens the post composer from the plus button', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(screen.getByTestId(SocialV1ViewSelectorsIDs.PLUS_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POST_COMPOSER);
  });

  it('consumes the focus-trending flag when the screen gains focus', () => {
    act(() => {
      submitSocialV1ComposedPost({
        id: 'composed-focus',
        authorHandle: 'giga-whale',
        timestampMs: Date.now(),
        reactions: [],
        item: mockOpenPerpsFeedItem({ id: 'focus-item', comment: 'focus me' }),
      });
    });

    renderWithProvider(<SocialV1View />);

    expect(
      screen.getByTestId(SocialFeedPostingBannerSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('shows the posting progress banner then prepends the composed post', () => {
    jest.useFakeTimers();
    renderWithProvider(<SocialV1View />);

    act(() => {
      submitSocialV1ComposedPost({
        id: 'composed-1',
        authorHandle: 'giga-whale',
        timestampMs: Date.now(),
        reactions: [],
        item: mockOpenPerpsFeedItem({
          id: 'composed-item',
          comment: 'this is alpha',
        }),
      });
    });

    expect(
      screen.getByTestId(SocialFeedPostingBannerSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialFeedPostingBannerSelectorsIDs.PROGRESS),
    ).toBeOnTheScreen();

    act(() => {
      jest.advanceTimersByTime(COMPOSER_POSTING_DELAY_MS);
    });

    expect(
      screen.queryByTestId(SocialFeedPostingBannerSelectorsIDs.CONTAINER),
    ).toBeNull();
    expect(
      screen.getByTestId('social-v1-feed-card-composed-item'),
    ).toBeOnTheScreen();

    jest.useRealTimers();
  });

  it('renders the Live trades filter icon on the Live trades page', () => {
    renderWithProvider(<SocialV1View />);

    expect(
      screen.getByTestId(LiveTradesViewSelectorsIDs.FILTER_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(LiveTradesViewSelectorsIDs.STREAM_BUTTON),
    ).toBeOnTheScreen();
  });

  it('opens the filters bottom sheet from the Live trades filter button', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(LiveTradesViewSelectorsIDs.FILTER_BUTTON),
    );

    expect(screen.getByTestId('social-filters-bottom-sheet')).toBeOnTheScreen();
  });

  it('closes the filters bottom sheet when Apply is pressed', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(LiveTradesViewSelectorsIDs.FILTER_BUTTON),
    );
    fireEvent.press(screen.getByTestId('social-filters-bottom-sheet-apply'));

    expect(screen.queryByTestId('social-filters-bottom-sheet')).toBeNull();
  });

  it('closes the filters bottom sheet when the backdrop is pressed', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(LiveTradesViewSelectorsIDs.FILTER_BUTTON),
    );
    fireEvent.press(screen.getByTestId('social-filters-bottom-sheet-backdrop'));

    expect(screen.queryByTestId('social-filters-bottom-sheet')).toBeNull();
  });

  it('opens the filters bottom sheet from the Following filter button', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-1`),
    );
    fireEvent.press(
      screen.getByTestId(SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BUTTON),
    );

    expect(screen.getByTestId('social-filters-bottom-sheet')).toBeOnTheScreen();
  });

  it('omits the header back button', () => {
    renderWithProvider(<SocialV1View />);

    expect(screen.queryByTestId('social-v1-view-back-button')).toBeNull();
  });

  it('tracks Live trades tab selection', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-3`),
    );

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_INTERACTION,
      expect.objectContaining({
        interaction_type: 'tab_changed',
        tab: 'tab_live_trades',
      }),
    );
  });

  it('tracks Following tab selection', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-1`),
    );

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_INTERACTION,
      expect.objectContaining({
        interaction_type: 'tab_changed',
        tab: 'tab_following',
        tab_change_method: 'tap',
      }),
    );
  });

  it('tracks Leaderboard tab selection', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-2`),
    );

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_INTERACTION,
      expect.objectContaining({
        interaction_type: 'tab_changed',
        tab: 'tab_leaderboard',
      }),
    );
  });

  it('tracks Trending tab selection', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-1`),
    );
    mockTrack.mockClear();

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-0`),
    );

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_INTERACTION,
      expect.objectContaining({
        interaction_type: 'tab_changed',
        tab: 'tab_trending',
        tab_change_method: 'tap',
      }),
    );
  });

  it('tracks swipe tab changes via Follow Trading Interaction', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-1`),
    );
    mockTrack.mockClear();

    const pager = screen.getByTestId(SocialV1ViewSelectorsIDs.PAGER);
    act(() => {
      pager.props.onPageSelected({ nativeEvent: { position: 0 } });
    });

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_INTERACTION,
      expect.objectContaining({
        interaction_type: 'tab_changed',
        tab: 'tab_trending',
        tab_change_method: 'swipe',
      }),
    );
  });

  it('does not mislabel a swipe as tap after tapping the already-active tab', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-0`),
    );
    expect(mockTrack).not.toHaveBeenCalled();
    mockTrack.mockClear();

    const pager = screen.getByTestId(SocialV1ViewSelectorsIDs.PAGER);
    act(() => {
      pager.props.onPageSelected({ nativeEvent: { position: 1 } });
    });

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_INTERACTION,
      expect.objectContaining({
        interaction_type: 'tab_changed',
        tab: 'tab_following',
        tab_change_method: 'swipe',
      }),
    );
  });

  it('renders the animated header title', () => {
    renderWithProvider(<SocialV1View />);

    expect(
      screen.getByTestId(SocialV1ViewSelectorsIDs.HEADER_TITLE),
    ).toHaveTextContent('homepage.sections.top_traders');
  });

  it('marks Live trades filters active after applying a draft change', () => {
    renderWithProvider(<SocialV1View />);

    const filterButton = () =>
      screen.getByTestId(LiveTradesViewSelectorsIDs.FILTER_BUTTON);
    const inactiveStyle = StyleSheet.flatten(filterButton().props.style);

    fireEvent.press(filterButton());
    fireEvent.press(screen.getByTestId('social-filters-type-tokens'));
    fireEvent.press(screen.getByTestId('social-filters-bottom-sheet-apply'));

    const activeStyle = StyleSheet.flatten(filterButton().props.style);
    expect(activeStyle?.backgroundColor).not.toBe(
      inactiveStyle?.backgroundColor,
    );
  });

  it('plays a selection haptic when switching to a different tab', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-1`),
    );

    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
  });

  it('does not play a haptic when pressing the already-active tab', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-0`),
    );

    expect(mockPlaySelection).not.toHaveBeenCalled();
  });

  it('renders the mocked feed on Following after that tab is opened', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-1`),
    );

    expect(
      screen.getByTestId(SocialV1ViewSelectorsIDs.FOLLOWING_PAGE),
    ).toBeOnTheScreen();
    expect(
      screen.getAllByTestId(
        getSocialFeedPositionCardTestId(MOCK_SOCIAL_V1_FEED_ITEMS[0].id),
      ),
    ).toHaveLength(2);
  });

  it('uses the profile image URL for the header avatar when available', () => {
    mockUseMyProfile.mockReturnValue({
      profile: {
        profileId: 'current-user',
        displayName: 'Test User',
        handle: 'test-user',
        imageUrl: 'https://example.com/avatar.png',
        shareUrl: 'https://metamask.io/social/test-user',
      },
      isLoading: false,
      error: null,
      refresh: mockRefreshMyProfile,
    });

    renderWithProvider(<SocialV1View />);

    expect(
      screen.getByTestId(SocialV1ViewSelectorsIDs.AVATAR_BUTTON),
    ).toBeOnTheScreen();
  });

  describe('notifications nudge banner', () => {
    it('is hidden by default when the route param is unset', () => {
      renderWithProvider(<SocialV1View />);

      expect(
        screen.queryByTestId(SocialV1ViewSelectorsIDs.NOTIFICATIONS_BANNER),
      ).toBeNull();
    });

    it('renders when the showNotificationsBanner route param is set', () => {
      mockRouteParams = { showNotificationsBanner: true };

      renderWithProvider(<SocialV1View />);

      expect(
        screen.getByTestId(SocialV1ViewSelectorsIDs.NOTIFICATIONS_BANNER),
      ).toBeOnTheScreen();
    });

    it('opens system settings and dismisses when the CTA is pressed', () => {
      mockRouteParams = { showNotificationsBanner: true };

      renderWithProvider(<SocialV1View />);
      fireEvent.press(
        screen.getByText(
          'social_leaderboard.top_traders_view.notifications_banner.open_settings',
        ),
      );

      expect(mockOpenSystemSettings).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByTestId(SocialV1ViewSelectorsIDs.NOTIFICATIONS_BANNER),
      ).toBeNull();
    });

    it('dismisses when the close button is pressed', () => {
      mockRouteParams = { showNotificationsBanner: true };

      renderWithProvider(<SocialV1View />);
      fireEvent.press(screen.getByLabelText('Close banner'));

      expect(mockOpenSystemSettings).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId(SocialV1ViewSelectorsIDs.NOTIFICATIONS_BANNER),
      ).toBeNull();
    });

    it('auto-dismisses after the timeout window', () => {
      jest.useFakeTimers();
      try {
        mockRouteParams = { showNotificationsBanner: true };
        renderWithProvider(<SocialV1View />);

        expect(
          screen.getByTestId(SocialV1ViewSelectorsIDs.NOTIFICATIONS_BANNER),
        ).toBeOnTheScreen();

        act(() => {
          jest.advanceTimersByTime(20000);
        });

        expect(
          screen.queryByTestId(SocialV1ViewSelectorsIDs.NOTIFICATIONS_BANNER),
        ).toBeNull();
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
