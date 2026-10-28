import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Routes from '../../../../constants/navigation/Routes';
import SocialV1View from './SocialV1View';
import { SocialV1ViewSelectorsIDs } from './SocialV1View.testIds';
import { SOCIAL_V1_AB_KEY } from './abTestConfig';
import {
  MOCK_SOCIAL_V1_FEED_ITEMS,
  mockOpenPerpsFeedItem,
} from '../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import { getSocialFeedPositionCardTestId } from '../../../UI/SocialFeed/components/SocialFeedPositionCard.testIds';
import {
  addPendingPost,
  resetPendingPosts,
} from '../pendingPosts/pendingPostsStore';
import { LiveViewSelectorsIDs } from '../LiveView/LiveView.testIds';
import type { UseMyProfileResult } from '../MyProfileView/hooks';
import type { SocialShellTab } from '../shell/types';
import { getFilterChipTestId } from '../shell/filters/SocialFiltersBottomSheet.testIds';

const mockPlaySelection = jest.fn().mockResolvedValue(undefined);
const mockOpenComposer = jest.fn();
const mockTrack = jest.fn();
const mockFeedInteractions = {};
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
const mockOpenSystemSettings = jest.fn();
const mockRefreshMyProfile = jest.fn().mockResolvedValue(undefined);
const mockMarkSocialTabVisited = jest.fn();
const mockSocialFeed = jest.fn();
const mockUseMyProfile = jest.fn<UseMyProfileResult, []>(() => ({
  profile: null,
  isLoading: false,
  error: null,
  refresh: mockRefreshMyProfile,
}));
let mockRouteParams: {
  showNotificationsBanner?: boolean;
  initialTab?: SocialShellTab;
} = {};

jest.mock('../../../UI/SocialFeed/hooks/useSocialBlockLists', () => ({
  useSocialBlockLists: () => ({
    blockedProfileIds: new Set(),
    blockedCommentIds: new Set(),
  }),
}));

jest.mock('../MyProfileView/hooks', () => ({
  useMyProfile: () => mockUseMyProfile(),
}));

jest.mock('../hooks/useOpenSocialPostComposer', () => ({
  useOpenSocialPostComposer: () => ({ openComposer: mockOpenComposer }),
}));

jest.mock('../utils/socialTabVisit', () => ({
  markSocialTabVisited: () => mockMarkSocialTabVisited(),
}));

// The feed pages fetch through `useSocialFeed`, which reads keyring state and
// React Query. This suite covers the V1 chrome, so stand in for both data
// sources while still driving the real pending-post store the pinning tests
// depend on.
jest.mock('./feed/hooks/useSocialV1Feed', () => ({
  useSocialV1Feed: jest.requireActual('./feed/mocks/mockComposedFeedHook')
    .mockUseSocialV1Feed,
}));

jest.mock('../../../UI/SocialFeed/data/useSocialFeed', () => ({
  useSocialFeed: jest.fn(() => ({
    posts: [],
    rows: [],
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    loadMore: jest.fn(),
    error: null,
    refresh: jest.fn(async () => undefined),
    dataUpdatedAt: undefined,
  })),
}));

jest.mock('../../../UI/SocialFeed/components/SocialFeed', () => {
  const ReactActual = jest.requireActual('react') as typeof React;
  const { View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');

  interface MockSocialFeedProps {
    location?: string;
    realtime?: boolean;
    filterPost?: (post: unknown) => boolean;
    renderHeader?: (props: {
      pendingNewCount: number;
      onRevealPending: () => void;
    }) => React.ReactNode;
    scrollTestID?: string;
    testID?: string;
  }

  return {
    __esModule: true,
    default: (props: MockSocialFeedProps) => {
      mockSocialFeed(props);
      return ReactActual.createElement(
        View,
        { testID: props.testID },
        props.renderHeader?.({
          pendingNewCount: 0,
          onRevealPending: jest.fn(),
        }),
        ReactActual.createElement(View, { testID: props.scrollTestID }),
      );
    },
  };
});

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
  const socialEvents = jest.requireActual('../analytics/socialEvents');
  return {
    ...events,
    ...socialEvents,
    useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
    useSocialFeedInteractions: () => mockFeedInteractions,
    useSocialInteraction: () => mockTrack,
    useSocialScreenAnalytics: () => mockTrack,
  };
});

jest.mock('../../../UI/SocialFeed/components/SocialFeedPostShell', () => {
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

jest.mock('../../../UI/SocialFeed/components/PositionTokenAvatar', () => ({
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
  ...jest.requireActual('../../../../util/haptics'),
  playSelection: () => mockPlaySelection(),
  fireImpact: jest.fn(),
}));

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'HIGH',
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'WIFI',
}));

jest.mock('../../../../selectors/featureFlagController/socialV1', () => ({
  selectIsSocialV1Enabled: () => true,
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
    useNavigation: () => ({
      navigate: mockNavigate,
      setParams: mockSetParams,
    }),
    useRoute: () => ({ params: mockRouteParams, name: 'SocialV1View' }),
    useIsFocused: () => true,
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
      resetPendingPosts();
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
      resetPendingPosts();
    });
  });

  it('renders Trending, Following, Leaderboard, and Live tabs', () => {
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
    ).toHaveTextContent('social_leaderboard.feed.tabs.live');
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

  it('switches the mounted view to a newly requested initial tab and clears the request', () => {
    const { rerender } = renderWithProvider(<SocialV1View />);
    expect(screen.queryByTestId('top-traders-view')).toBeNull();

    mockRouteParams = { initialTab: 'leaderboard' };
    rerender(<SocialV1View />);

    expect(screen.getByTestId('top-traders-view')).toBeOnTheScreen();
    expect(mockSetParams).toHaveBeenCalledWith({ initialTab: undefined });
    expect(mockTrack).not.toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_INTERACTION,
      expect.anything(),
    );
  });

  it('renders Trending through the shared virtualized feed', () => {
    renderWithProvider(<SocialV1View />);

    const trendingFeed = mockSocialFeed.mock.calls
      .map(([props]) => props)
      .filter((props) => props.location === 'social_trending')
      .pop();

    expect(trendingFeed).toEqual(
      expect.objectContaining({
        scrollMode: 'virtualized',
        showMockedFields: true,
        isActive: true,
        onCopyTrade: expect.any(Function),
        performance: expect.objectContaining({ tab: 'trending' }),
        testID: `${SocialV1ViewSelectorsIDs.TRENDING_PAGE}-content`,
        scrollTestID: `${SocialV1ViewSelectorsIDs.TRENDING_PAGE}-scroll`,
      }),
    );
  });

  it('emits TSA-1122 exposure when the v1 home opens', () => {
    renderWithProvider(<SocialV1View />);

    expect(mockUseABTest).toHaveBeenCalledWith(
      SOCIAL_V1_AB_KEY,
      expect.anything(),
      expect.objectContaining({ experimentName: 'Social V1' }),
    );
  });

  it('marks Social as visited when the v1 home opens', () => {
    renderWithProvider(<SocialV1View />);

    expect(mockMarkSocialTabVisited).toHaveBeenCalledTimes(1);
  });

  it('shows the account mask icon when no profile exists', () => {
    renderWithProvider(<SocialV1View />);

    expect(
      screen.getByTestId(SocialV1ViewSelectorsIDs.ACCOUNT_AVATAR),
    ).toBeOnTheScreen();
  });

  it('opens My Profile from the avatar', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(screen.getByTestId(SocialV1ViewSelectorsIDs.AVATAR_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.MY_PROFILE);
  });

  it('opens the post composer from the plus button', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(screen.getByTestId(SocialV1ViewSelectorsIDs.PLUS_BUTTON));

    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
    expect(mockOpenComposer).toHaveBeenCalledTimes(1);
  });

  it('opens Rewards from the gift button', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(SocialV1ViewSelectorsIDs.REWARDS_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
  });

  it('keeps the header action icons transparent while pressed', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent(
      screen.getByTestId(SocialV1ViewSelectorsIDs.REWARDS_BUTTON),
      'pressIn',
    );
    fireEvent(
      screen.getByTestId(SocialV1ViewSelectorsIDs.PLUS_BUTTON),
      'pressIn',
    );

    expect(
      StyleSheet.flatten(
        screen.getByTestId(SocialV1ViewSelectorsIDs.REWARDS_BUTTON).props.style,
      ).backgroundColor,
    ).toBe('transparent');
    expect(
      StyleSheet.flatten(
        screen.getByTestId(SocialV1ViewSelectorsIDs.PLUS_BUTTON).props.style,
      ).backgroundColor,
    ).toBe('transparent');
  });

  describe('after posting', () => {
    const PENDING_ITEM_ID = 'pending-item';

    beforeEach(() => {
      mockUseMyProfile.mockReturnValue({
        profile: {
          profileId: 'viewer-profile',
          displayName: 'Giga Whale',
          handle: 'giga_whale',
        },
        isLoading: false,
        error: null,
        refresh: mockRefreshMyProfile,
      });
      act(() => {
        addPendingPost({
          ownerProfileId: 'viewer-profile',
          post: {
            id: 'pending-comment-1',
            commentId: 'comment-1',
            authorHandle: 'Giga Whale',
            timestampMs: Date.now(),
            reactions: [],
            item: mockOpenPerpsFeedItem({
              id: PENDING_ITEM_ID,
              comment: 'this is alpha',
            }),
          },
        });
      });
    });

    it('pins the new post on top of Following', () => {
      renderWithProvider(<SocialV1View />);
      fireEvent.press(
        screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-1`),
      );

      const followingCards = within(
        screen.getByTestId(SocialV1ViewSelectorsIDs.FOLLOWING_PAGE),
      ).getAllByTestId(/^social-v1-feed-card-/);
      expect(followingCards[0].props.testID).toBe(
        getSocialFeedPositionCardTestId(PENDING_ITEM_ID),
      );
    });

    it('stays on Trending, without the post, when no post was just written', () => {
      renderWithProvider(<SocialV1View />);

      expect(
        screen.queryByTestId(getSocialFeedPositionCardTestId(PENDING_ITEM_ID)),
      ).toBeNull();
    });
  });

  it('renders the Live filter icon on the Live page', () => {
    renderWithProvider(<SocialV1View />);

    expect(
      screen.getByTestId(LiveViewSelectorsIDs.FILTER_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(LiveViewSelectorsIDs.STREAM_BUTTON),
    ).toBeOnTheScreen();
  });

  it('enables Live realtime only while the Live tab is active', () => {
    renderWithProvider(<SocialV1View />);

    expect(mockSocialFeed).toHaveBeenLastCalledWith(
      expect.objectContaining({ realtime: false }),
    );

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-3`),
    );

    expect(mockSocialFeed).toHaveBeenLastCalledWith(
      expect.objectContaining({ realtime: true }),
    );

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-0`),
    );

    expect(mockSocialFeed).toHaveBeenLastCalledWith(
      expect.objectContaining({ realtime: false }),
    );
  });

  it('filters Live posts with the applied Live filters', () => {
    renderWithProvider(<SocialV1View />);
    const filterBeforeApply = mockSocialFeed.mock.lastCall?.[0].filterPost;

    fireEvent.press(screen.getByTestId(LiveViewSelectorsIDs.FILTER_BUTTON));
    fireEvent.press(screen.getByTestId(getFilterChipTestId('type', 'perps')));
    fireEvent.press(screen.getByTestId('social-filters-bottom-sheet-apply'));

    expect(filterBeforeApply).toEqual(expect.any(Function));
    expect(mockSocialFeed.mock.lastCall?.[0].filterPost).not.toBe(
      filterBeforeApply,
    );
  });

  it('opens the filters bottom sheet from the Live filter button', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(screen.getByTestId(LiveViewSelectorsIDs.FILTER_BUTTON));

    expect(screen.getByTestId('social-filters-bottom-sheet')).toBeOnTheScreen();
  });

  it('closes the filters bottom sheet when Apply is pressed', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(screen.getByTestId(LiveViewSelectorsIDs.FILTER_BUTTON));
    fireEvent.press(screen.getByTestId('social-filters-bottom-sheet-apply'));

    expect(screen.queryByTestId('social-filters-bottom-sheet')).toBeNull();
  });

  it('closes the filters bottom sheet when the backdrop is pressed', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(screen.getByTestId(LiveViewSelectorsIDs.FILTER_BUTTON));
    fireEvent.press(screen.getByTestId('social-filters-bottom-sheet-backdrop'));

    expect(screen.queryByTestId('social-filters-bottom-sheet')).toBeNull();
  });

  it('opens Trending Custom filters with Positions and without Verification', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(SocialV1ViewSelectorsIDs.TRENDING_FILTER_BUTTON),
    );

    expect(screen.getByTestId('social-filters-bottom-sheet')).toBeOnTheScreen();
    expect(
      screen.getByTestId(getFilterChipTestId('positions', 'open')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getFilterChipTestId('positions', 'closed')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getFilterChipTestId('verification', 'verified')),
    ).toBeNull();
    expect(
      screen.queryByTestId(getFilterChipTestId('type', 'predictions')),
    ).toBeNull();
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

  it('tracks Live tab selection', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-3`),
    );

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_INTERACTION,
      expect.objectContaining({
        interaction_type: 'tab_changed',
        tab: 'tab_live',
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

  it('marks Live filters active after applying a draft change', () => {
    renderWithProvider(<SocialV1View />);

    const filterButton = () =>
      screen.getByTestId(LiveViewSelectorsIDs.FILTER_BUTTON);
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
      within(
        screen.getByTestId(SocialV1ViewSelectorsIDs.FOLLOWING_PAGE),
      ).getByTestId(
        getSocialFeedPositionCardTestId(MOCK_SOCIAL_V1_FEED_ITEMS[0].id),
      ),
    ).toBeOnTheScreen();
  });

  it('insets the header avatar so it shares the 16px tab padding', () => {
    renderWithProvider(<SocialV1View />);

    expect(
      StyleSheet.flatten(
        screen.getByTestId(SocialV1ViewSelectorsIDs.AVATAR_BUTTON).props.style,
      ).marginLeft,
    ).toBe(8);
  });

  it('uses the profile image URL for the header avatar when available', () => {
    mockUseMyProfile.mockReturnValue({
      profile: {
        profileId: 'current-user',
        displayName: 'Test User',
        handle: 'test-user',
        imageUrl: 'https://example.com/avatar.png',
      },
      isLoading: false,
      error: null,
      refresh: mockRefreshMyProfile,
    });

    renderWithProvider(<SocialV1View />);

    expect(
      screen.getByTestId(SocialV1ViewSelectorsIDs.AVATAR_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialV1ViewSelectorsIDs.ACCOUNT_AVATAR),
    ).toBeNull();
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
