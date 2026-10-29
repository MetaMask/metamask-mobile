import React from 'react';
import { Linking, Share } from 'react-native';
import { brandColor } from '@metamask/design-tokens';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type {
  Position,
  TraderProfileResponse,
} from '@metamask/social-controllers';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import MyProfileView from './MyProfileView';
import { MyProfileViewSelectorsIDs } from './MyProfileView.testIds';
import type { UseMyProfileResult } from './hooks/useMyProfile';
import type { UseFollowedTradersResult } from '../NotificationPreferences/hooks/useFollowedTraders';
import type { UseMyProfilePostsResult } from './hooks/useMyProfilePosts';
import { mockOpenPerpsFeedItem } from '../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import type { SocialV1FeedPost } from '../../../UI/SocialFeed/types';
import type {
  UseTraderPositionsOptions,
  UseTraderPositionsResult,
} from '../TraderProfileView/hooks/useTraderPositions';
import type { UseTraderProfileResult } from '../TraderProfileView/hooks/useTraderProfile';
import { expectHeaderIncludesTopInset } from '../shared/scrollableScreenSafeArea.testUtils';
import Routes from '../../../../constants/navigation/Routes';
import Logger from '../../../../util/Logger';
import { requestPostsTabFocus } from '../pendingPosts/pendingPostsStore';

const mockGoBack = jest.fn();
const mockFocusEffect: { current: (() => void) | null } = { current: null };
const mockScrollTo = jest.fn();

// The RN test ScrollView exposes no instance, so stand in one with `scrollTo`.
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  const { forwardRef, createElement, useImperativeHandle } =
    jest.requireActual('react');
  const { ScrollView } = jest.requireActual('react-native');
  const MockAnimatedScrollView = forwardRef(
    (props: Record<string, unknown>, ref: unknown) => {
      useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
      return createElement(ScrollView, props);
    },
  );
  return {
    ...actual,
    __esModule: true,
    default: { ...actual.default, ScrollView: MockAnimatedScrollView },
  };
});
const mockNavigate = jest.fn();
const mockPush = jest.fn();
const mockOpenComposer = jest.fn();
const mockPlaySelection = jest.fn().mockResolvedValue(undefined);
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockFollowWithSetup = jest.fn(
  async (_isFollowing: boolean, performFollow: () => Promise<void>) => {
    await performFollow();
  },
);
let mockProfileRouteParams:
  | {
      traderId?: string;
      traderName?: string;
      traderAddress?: string;
      traderAvatarUri?: string;
    }
  | undefined;
const mockUseMyProfileAddress = jest.fn<string | undefined, []>(
  () => '0xselected',
);
const mockUseTraderProfile = jest.fn<UseTraderProfileResult, []>();
const mockUseTraderPositions = jest.fn<
  UseTraderPositionsResult,
  [string, UseTraderPositionsOptions?]
>();
const mockUseMyProfilePosts = jest.fn<UseMyProfilePostsResult, []>();
const mockUseMyProfile = jest.fn<UseMyProfileResult, []>();
const mockUseFollowedTraders = jest.fn<UseFollowedTradersResult, []>();
const mockSetTitleSectionHeight = jest.fn();

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');

  const MockHeaderStandardAnimated = ({
    title,
    subtitle,
    onBack,
    testID,
    backButtonProps,
    includesTopInset,
    endAccessory,
  }: {
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    onBack?: () => void;
    testID?: string;
    backButtonProps?: { testID?: string };
    includesTopInset?: boolean;
    endAccessory?: React.ReactNode;
  }) =>
    ReactActual.createElement(
      View,
      { testID, style: includesTopInset ? { marginTop: 1 } : undefined },
      ReactActual.createElement(
        Pressable,
        { onPress: onBack, testID: backButtonProps?.testID },
        ReactActual.createElement(Text, null, 'back'),
      ),
      title,
      subtitle,
      endAccessory,
    );

  return {
    ...actual,
    HeaderStandardAnimated: MockHeaderStandardAnimated,
    useHeaderStandardAnimated: () => ({
      scrollY: { value: 0 },
      onScroll: jest.fn(),
      setTitleSectionHeight: mockSetTitleSectionHeight,
      titleSectionHeightSv: { value: 0 },
    }),
  };
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    push: mockPush,
  }),
  useRoute: () => ({ params: mockProfileRouteParams }),
  useFocusEffect: (effect: () => void) => {
    mockFocusEffect.current = effect;
  },
}));

jest.mock('../../../../util/haptics', () => ({
  ...jest.requireActual('../../../../util/haptics'),
  playSelection: () => mockPlaySelection(),
  playImpact: jest.fn().mockResolvedValue(undefined),
  playErrorNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../hooks/useFollowWithNotificationSetup', () => ({
  useFollowWithNotificationSetup: () => ({
    followWithSetup: mockFollowWithSetup,
  }),
}));

jest.mock('../hooks/useOpenTradingSignalsSetup', () => ({
  useOpenTradingSignalsSetup: () => ({
    openSetupIfNeeded: () => false,
  }),
}));

jest.mock('../hooks/useOpenSocialPostComposer', () => ({
  useOpenSocialPostComposer: () => ({ openComposer: mockOpenComposer }),
}));

jest.mock('./hooks', () => ({
  useMyProfile: () => mockUseMyProfile(),
  useMyProfileAddress: () => mockUseMyProfileAddress(),
  useMyProfilePosts: () => mockUseMyProfilePosts(),
}));

jest.mock('../TraderProfileView/hooks', () => ({
  useTraderProfile: () => mockUseTraderProfile(),
  useTraderPositions: (
    addressOrId: string,
    options?: UseTraderPositionsOptions,
  ) => mockUseTraderPositions(addressOrId, options),
}));

jest.mock('../../../UI/SocialFeed/components/TraderAvatar', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return ({ testID }: { testID?: string }) =>
    ReactActual.createElement(View, { testID });
});

jest.mock('../TraderProfileView/components/PositionRow', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      position,
      onPress,
    }: {
      position: Position;
      onPress?: (next: Position) => void;
    }) => (
      <Pressable
        testID={`position-row-${position.tokenSymbol}`}
        onPress={() => onPress?.(position)}
      >
        <Text>{position.tokenSymbol}</Text>
      </Pressable>
    ),
  };
});

jest.mock('../../../UI/SocialFeed/components/SocialFeedPostShell', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ post }: { post: { id: string } }) => (
      <View testID={`my-profile-post-${post.id}`}>
        <Text>{post.id}</Text>
      </View>
    ),
  };
});

const mockToggleTraderNotification = jest.fn();
const mockIsTraderNotificationEnabled = jest.fn(() => true);
let mockHasNotificationPreferences = true;

jest.mock('../NotificationPreferences/hooks', () => ({
  useFollowedTraders: () => mockUseFollowedTraders(),
  useNotificationPreferences: () => ({
    preferences: {
      pushNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
      mutedTraderProfileIds: [],
    },
    hasNotificationPreferences: mockHasNotificationPreferences,
    isLoading: false,
    error: null,
    toggleTraderNotification: mockToggleTraderNotification,
    isTraderNotificationEnabled: mockIsTraderNotificationEnabled,
  }),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
}));

const mockMyProfilePost = (
  overrides: Partial<SocialV1FeedPost> = {},
): SocialV1FeedPost => ({
  id: 'post-1',
  authorHandle: 'giga-whale',
  timestampMs: 1,
  reactions: [],
  item: mockOpenPerpsFeedItem({ id: 'post-1' }),
  ...overrides,
});

const followingTraders: UseFollowedTradersResult['traders'] = [
  {
    id: 'trader-1',
    username: 'Signal Scout',
    address: '0x1111111111111111111111111111111111111111',
  },
  {
    id: 'trader-2',
    username: 'Quiet Conviction',
    address: '0x2222222222222222222222222222222222222222',
  },
];

const profile: UseMyProfileResult['profile'] = {
  profileId: 'current-user',
  displayName: 'Giga Whale',
  handle: 'giga-whale.metamask',
  bio: 'Trading in the open. Copy my moves or fade them — either way we learn.',
  imageUrl: null,
  avatarPresetId: 'zombie',
  avatarBackgroundId: 'lime',
  rankingTag: 'whale',
  xHandle: 'giga-whale',
  followerCount: 4,
  followingCount: 0,
  winRatePercent: 60,
  pnlUsd: 7100,
};

describe('MyProfileView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasNotificationPreferences = true;
    mockIsTraderNotificationEnabled.mockReturnValue(true);
    mockProfileRouteParams = undefined;
    mockUseMyProfile.mockReturnValue({
      profile,
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    mockUseFollowedTraders.mockReturnValue({
      traders: followingTraders,
      isLoading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseTraderProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error: null,
      isFollowing: false,
      toggleFollow: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseMyProfilePosts.mockReturnValue({
      posts: [],
      rows: [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      loadMore: jest.fn(),
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseTraderPositions.mockReturnValue({
      openPositions: [],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
      openError: null,
      closedError: null,
      refetch: jest.fn().mockResolvedValue(undefined),
    });
  });

  it('renders the mocked owner identity', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.DISPLAY_NAME),
    ).toHaveTextContent('Giga Whale');
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.RANKING_TAG),
    ).toBeNull();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.HANDLE),
    ).toHaveTextContent('@giga-whale.metamask');
  });

  it('renders the owner identity and stats in the compact header', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.HEADER_COMPACT_IDENTITY),
    ).toHaveTextContent(/Giga Whale/);
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.HEADER_COMPACT_WIN_RATE),
    ).toHaveTextContent('*60%');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.HEADER_COMPACT_PNL),
    ).toHaveTextContent('*+$7,100');
  });

  it('renders the owner avatar preset in the compact header', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.HEADER_COMPACT_AVATAR),
    ).toHaveStyle({ backgroundColor: brandColor.lime100 });
  });

  it('keeps the top inset on the animated header', () => {
    renderWithProvider(<MyProfileView />);

    expectHeaderIncludesTopInset(
      screen.getByTestId(MyProfileViewSelectorsIDs.HEADER),
    );
  });

  it('measures the profile title section for header animation', () => {
    renderWithProvider(<MyProfileView />);

    const titleSectionWrapper = screen.getByTestId(
      MyProfileViewSelectorsIDs.TITLE_SECTION_WRAPPER,
    );
    fireEvent(titleSectionWrapper, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 320 } },
    });

    expect(mockSetTitleSectionHeight).toHaveBeenCalledWith(320);
    expect(titleSectionWrapper).toBeOnTheScreen();
  });

  it('renders zero for missing follower counts', () => {
    mockUseMyProfile.mockReturnValue({
      profile: {
        ...profile,
        followerCount: undefined,
        followingCount: null,
      },
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    mockUseFollowedTraders.mockReturnValue({
      traders: [],
      isLoading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOWERS_COUNT),
    ).toHaveTextContent('0');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOWING_COUNT),
    ).toHaveTextContent('0');
  });

  it('renders the live following count from followed traders', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOWING_COUNT),
    ).toHaveTextContent('2');
  });

  it('hides the performance section when no live stats are available', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_SECTION),
    ).not.toBeOnTheScreen();
  });

  it('renders live trader stats in the performance section', () => {
    mockUseTraderProfile.mockReturnValue({
      profile: {
        profile: {
          profileId: 'live-id',
          address: '0xabc',
          allAddresses: ['0xabc'],
          name: 'Onchain Name',
          imageUrl: null,
        },
        stats: {
          pnl30d: 1200,
          winRate30d: 0.42,
          medianHoldMinutes: 180,
          tradeCount30d: 12,
          volumeUsd30d: 50000,
        },
        perChainBreakdown: {
          perChainPnl: {},
          perChainRoi: {},
          perChainVolume: {},
        },
        socialHandles: {},
        followerCount: 88,
        followingCount: 3,
        copytradedAllTime: {
          count: 44,
          volumeUSD: 1000,
          distinctActors: 2,
        },
        rankingTag: 'dolphin',
      } as TraderProfileResponse,
      isLoading: false,
      error: null,
      isFollowing: false,
      toggleFollow: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_WIN_RATE),
    ).toHaveTextContent('42%');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_PNL),
    ).toHaveTextContent('+$1,200');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_HOLD_TIME),
    ).toHaveTextContent('3h');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_VOLUME),
    ).toHaveTextContent('$50,000');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOWERS_COUNT),
    ).toHaveTextContent('88');
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.RANKING_TAG),
    ).toBeNull();
  });

  it('opens followers connections on the followers tab', () => {
    renderWithProvider(<MyProfileView />);

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOWERS_BUTTON),
    );

    expect(mockPush).toHaveBeenCalledWith(Routes.SOCIAL.FOLLOW_CONNECTIONS, {
      initialTab: 'followers',
    });
  });

  it('opens following connections on the following tab', () => {
    renderWithProvider(<MyProfileView />);

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOWING_BUTTON),
    );

    expect(mockPush).toHaveBeenCalledWith(Routes.SOCIAL.FOLLOW_CONNECTIONS, {
      initialTab: 'following',
    });
  });

  it('opens the owner X profile', () => {
    renderWithProvider(<MyProfileView />);

    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.X_LINK));

    expect(Linking.openURL).toHaveBeenCalledWith('https://x.com/giga-whale');
  });

  it('logs when the owner X profile cannot be opened', async () => {
    const error = new Error('Cannot open URL');
    jest.mocked(Linking.openURL).mockRejectedValueOnce(error);
    renderWithProvider(<MyProfileView />);

    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.X_LINK));

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'MyProfileHeader: failed to open the X profile',
      );
    });
  });

  it('returns to SocialV1 from the MMDS back button', () => {
    renderWithProvider(<MyProfileView />);

    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('opens the post composer from the owner profile header', () => {
    renderWithProvider(<MyProfileView />);

    const createPostButton = screen.getByTestId(
      MyProfileViewSelectorsIDs.CREATE_POST_BUTTON,
    );

    fireEvent.press(createPostButton);

    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
    expect(mockOpenComposer).toHaveBeenCalledTimes(1);
    expect(createPostButton).toHaveProp('accessibilityLabel', 'Create post');
  });

  it('shares the owner profile deeplink from the share profile button', () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction });
    renderWithProvider(<MyProfileView />);

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.SHARE_PROFILE_BUTTON),
    );

    expect(shareSpy).toHaveBeenCalledWith({
      url: 'https://link.metamask.io/social/profile?traderId=current-user',
    });
  });

  it('does not render a reset profile button on the owner profile header', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.queryByLabelText('debug: reset profile'),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.CREATE_POST_BUTTON),
    ).toBeOnTheScreen();
  });

  it('requests the next posts page when a scroll settles near the end', () => {
    const loadMore = jest.fn();
    mockUseMyProfilePosts.mockReturnValue({
      posts: [mockMyProfilePost()],
      rows: [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: true,
      loadMore,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);
    fireEvent(
      screen.getByTestId(MyProfileViewSelectorsIDs.SCROLL),
      'momentumScrollEnd',
      {
        nativeEvent: {
          contentOffset: { y: 400, x: 0 },
          contentSize: { height: 500, width: 400 },
          layoutMeasurement: { height: 400, width: 400 },
        },
      },
    );

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('shows a footer spinner while the next posts page loads', () => {
    mockUseMyProfilePosts.mockReturnValue({
      posts: [mockMyProfilePost()],
      rows: [],
      isLoading: false,
      isFetchingNextPage: true,
      hasNextPage: true,
      loadMore: jest.fn(),
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.POSTS_FOOTER_LOADING),
    ).toBeOnTheScreen();
  });

  it('renders owner posts under the Posts tab', () => {
    mockUseMyProfilePosts.mockReturnValue({
      posts: [mockMyProfilePost()],
      rows: [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      loadMore: jest.fn(),
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.POSTS_LIST),
    ).toHaveStyle({ paddingTop: 16 });
    expect(screen.getByTestId('my-profile-post-post-1')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.EMPTY_STATE),
    ).not.toBeOnTheScreen();
  });

  it('renders a centered Posts empty line without a create action', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.POSTS_TAB),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(screen.getByText('No posts yet')).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.EMPTY_STATE),
    ).toHaveStyle({ paddingTop: 16 });
    expect(screen.queryByText('Make your first post')).toBeNull();
    expect(
      screen.queryByText(
        "You'll get 15% of the fees if someone copies your moves.",
      ),
    ).toBeNull();
  });

  it('opens onboarding when the owner has no profile', () => {
    mockUseMyProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });

    renderWithProvider(<MyProfileView />);

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.CREATE_PROFILE_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE_ONBOARDING);
  });

  it('omits the Insights header action', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.INSIGHTS_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('opens the avatar picker from the owner avatar and pencil', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.EDIT_AVATAR_BUTTON, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.AVATAR));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.EDIT_AVATAR);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('opens Manage profile from Edit profile', () => {
    renderWithProvider(<MyProfileView />);

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.EDIT_PROFILE_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.MANAGE_PROFILE);
  });

  it('still refreshes posts when live profile refresh rejects', async () => {
    jest.useFakeTimers();
    const refreshLiveProfile = jest
      .fn()
      .mockRejectedValue(new Error('offline'));
    const refreshPosts = jest.fn().mockResolvedValue(undefined);
    const refetchPositions = jest.fn().mockResolvedValue(undefined);
    mockUseTraderProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error: null,
      isFollowing: false,
      toggleFollow: jest.fn().mockResolvedValue(undefined),
      refresh: refreshLiveProfile,
    });
    mockUseMyProfilePosts.mockReturnValue({
      posts: [],
      rows: [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      loadMore: jest.fn(),
      error: null,
      refresh: refreshPosts,
    });
    mockUseTraderPositions.mockReturnValue({
      openPositions: [],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
      openError: null,
      closedError: null,
      refetch: refetchPositions,
    });

    try {
      renderWithProvider(<MyProfileView />);
      const scroll = screen.getByTestId(MyProfileViewSelectorsIDs.SCROLL);

      await act(async () => {
        const refreshPromise = scroll.props.refreshControl.props.onRefresh();
        jest.advanceTimersByTime(1000);
        await refreshPromise;
      });

      expect(refreshLiveProfile).toHaveBeenCalledTimes(1);
      expect(refreshPosts).toHaveBeenCalledTimes(1);
      expect(refetchPositions).toHaveBeenCalledTimes(1);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  it('retries after profile loading fails', () => {
    mockUseMyProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error: 'Profile unavailable',
      refresh: mockRefresh,
    });
    renderWithProvider(<MyProfileView />);

    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.RETRY_BUTTON));

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('opens another trader followers with addressOrId', () => {
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
      traderAddress: '0xabc',
    };
    mockUseTraderProfile.mockReturnValue({
      profile: {
        profile: {
          profileId: 'trader-1',
          address: '0xabc',
          allAddresses: ['0xabc'],
          name: 'alpha.eth',
          imageUrl: null,
        },
        stats: {
          pnl30d: 0,
          winRate30d: 0,
          medianHoldMinutes: 0,
          tradeCount30d: 0,
          volumeUsd30d: 0,
        },
        perChainBreakdown: {
          perChainPnl: {},
          perChainRoi: {},
          perChainVolume: {},
        },
        socialHandles: {},
        followerCount: 88,
        followingCount: 7,
        copytradedAllTime: {
          count: 0,
          volumeUSD: 0,
          distinctActors: 0,
        },
      } as TraderProfileResponse,
      isLoading: false,
      error: null,
      isFollowing: false,
      toggleFollow: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOWING_COUNT),
    ).toHaveTextContent('7');

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOWERS_BUTTON),
    );

    expect(mockPush).toHaveBeenCalledWith(Routes.SOCIAL.FOLLOW_CONNECTIONS, {
      initialTab: 'followers',
      addressOrId: 'trader-1',
    });
  });

  it('opens another trader following with addressOrId', () => {
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderAddress: '0xabc',
    };

    renderWithProvider(<MyProfileView />);

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOWING_BUTTON),
    );

    expect(mockPush).toHaveBeenCalledWith(Routes.SOCIAL.FOLLOW_CONNECTIONS, {
      initialTab: 'following',
      addressOrId: 'trader-1',
    });
  });

  it('shares the profile deeplink from another profile header', () => {
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
      traderAddress: '0xabc',
    };
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction });

    renderWithProvider(<MyProfileView />);

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.SHARE_TRADER_BUTTON),
    );

    expect(shareSpy).toHaveBeenCalledWith({
      url: 'https://link.metamask.io/social/profile?traderId=trader-1',
    });
  });

  it('hides the trader deeplink share button on the owner profile', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.SHARE_TRADER_BUTTON),
    ).toBeNull();
  });

  it('hides owner actions and shows follow for another trader', () => {
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
      traderAddress: '0xabc',
    };
    const toggleFollow = jest.fn().mockResolvedValue(undefined);
    mockUseTraderProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error: null,
      isFollowing: false,
      toggleFollow,
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);

    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.EDIT_PROFILE_BUTTON),
    ).toBeNull();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.EDIT_AVATAR_BUTTON, {
        includeHiddenElements: true,
      }),
    ).toBeNull();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.CREATE_POST_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOW_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.HEADER_COMPACT_IDENTITY),
    ).toHaveTextContent('alpha.eth');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.OPEN_TAB),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.CLOSED_TAB),
    ).toBeOnTheScreen();
    expect(screen.getByText('No posts yet')).toBeOnTheScreen();
    expect(screen.queryByText('Your feed starts here')).toBeNull();
    expect(
      screen.queryByText('When they share a trade, it will show up here.'),
    ).toBeNull();

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOW_BUTTON),
    );

    expect(mockFollowWithSetup).toHaveBeenCalledTimes(1);
    expect(toggleFollow).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'trader_profile',
        traderAddress: '0xabc',
        traderUsername: 'alpha.eth',
      }),
    );
  });

  it('hides the mute bell on the owner profile', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.MUTE_CHIP),
    ).toBeNull();
  });

  it('keeps the mute bell inactive until the visitor is followed', () => {
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
      traderAddress: '0xabc',
    };

    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.MUTE_CHIP),
    ).toBeDisabled();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOW_BUTTON),
    ).toBeOnTheScreen();
  });

  it('toggles trading-signal mute for the live profile id', () => {
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
      traderAddress: '0xabc',
    };
    mockUseTraderProfile.mockReturnValue({
      profile: {
        profile: {
          profileId: 'live-profile',
          address: '0xabc',
          allAddresses: ['0xabc'],
          name: 'alpha.eth',
          imageUrl: null,
        },
        stats: {
          pnl30d: 0,
          winRate30d: 0,
          medianHoldMinutes: 0,
          tradeCount30d: 0,
          volumeUsd30d: 0,
        },
        perChainBreakdown: {
          perChainPnl: {},
          perChainRoi: {},
          perChainVolume: {},
        },
        socialHandles: {},
        followerCount: 0,
        followingCount: 0,
        copytradedAllTime: {
          count: 0,
          volumeUSD: 0,
          distinctActors: 0,
        },
      } as TraderProfileResponse,
      isLoading: false,
      error: null,
      isFollowing: true,
      toggleFollow: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);

    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.MUTE_CHIP));

    expect(mockToggleTraderNotification).toHaveBeenCalledWith('live-profile');
  });

  it('hides the mute bell when notification preferences are missing', () => {
    mockHasNotificationPreferences = false;
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
      traderAddress: '0xabc',
    };
    mockUseTraderProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error: null,
      isFollowing: true,
      toggleFollow: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);

    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.MUTE_CHIP),
    ).toBeNull();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOW_BUTTON),
    ).toBeOnTheScreen();
  });

  it('defaults to Posts and shows Open and Closed tabs for the owner', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.POSTS_TAB),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.OPEN_TAB),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.CLOSED_TAB),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.POSITIONS_LIST),
    ).toBeNull();
  });

  it('returns to Posts when focused right after the viewer posts', () => {
    renderWithProvider(<MyProfileView />);
    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.CLOSED_TAB));
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.POSITIONS_LIST),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.EMPTY_STATE),
    ).toBeNull();

    requestPostsTabFocus();
    act(() => {
      mockFocusEffect.current?.();
    });

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.POSITIONS_LIST),
    ).toBeNull();
  });

  it('scrolls back to the top when focused right after the viewer posts', () => {
    renderWithProvider(<MyProfileView />);

    requestPostsTabFocus();
    act(() => {
      mockFocusEffect.current?.();
    });

    expect(mockScrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it('prefetches positions with the viewed profile address', () => {
    renderWithProvider(<MyProfileView />);

    expect(mockUseTraderPositions).toHaveBeenCalledWith(
      '0xselected',
      undefined,
    );
  });

  it('shows open positions after tapping Open', () => {
    const openSpot: Position = {
      positionId: 'eth-spot',
      tokenSymbol: 'ETH',
      tokenName: 'Ethereum',
      tokenAddress: '0xeth',
      chain: 'ethereum',
      positionAmount: 1,
      boughtUsd: 100,
      soldUsd: 0,
      realizedPnl: 0,
      costBasis: 100,
      trades: [],
      lastTradeAt: 1,
    };
    const openPerp: Position = {
      ...openSpot,
      positionId: 'btc-perp',
      tokenSymbol: 'BTC',
      chain: 'hyperliquid',
      perpPositionType: 'long',
    };
    mockUseTraderPositions.mockReturnValue({
      openPositions: [openSpot, openPerp],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
      openError: null,
      closedError: null,
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);
    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.OPEN_TAB));

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.POSITIONS_LIST),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.TOKENS_SECTION),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERPS_SECTION),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.EMPTY_STATE),
    ).toBeNull();
  });

  it('keeps the Tokens filter when switching Open to Closed', () => {
    const closedSpot: Position = {
      positionId: 'doge-closed',
      tokenSymbol: 'DOGE',
      tokenName: 'Doge',
      tokenAddress: '0xdoge',
      chain: 'base',
      positionAmount: 0,
      boughtUsd: 100,
      soldUsd: 150,
      realizedPnl: 50,
      costBasis: 100,
      trades: [],
      lastTradeAt: 1,
    };
    mockUseTraderPositions.mockReturnValue({
      openPositions: [],
      closedPositions: [closedSpot],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
      openError: null,
      closedError: null,
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);
    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.OPEN_TAB));
    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_TOKENS),
    );
    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.CLOSED_TAB));

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_TOKENS),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('position-row-DOGE')).toBeOnTheScreen();
  });

  it('shows closed empty copy when only the open fetch failed', () => {
    mockUseTraderPositions.mockReturnValue({
      openPositions: [],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: 'open failed',
      openError: 'open failed',
      closedError: null,
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);
    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.CLOSED_TAB));

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.POSITIONS_EMPTY),
    ).toBeOnTheScreen();
    expect(screen.getByText('No closed positions')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.POSITIONS_ERROR),
    ).toBeNull();
  });

  it('opens position detail from an Open row', () => {
    const openSpot: Position = {
      positionId: 'eth-spot',
      tokenSymbol: 'ETH',
      tokenName: 'Ethereum',
      tokenAddress: '0xeth',
      chain: 'ethereum',
      positionAmount: 1,
      boughtUsd: 100,
      soldUsd: 0,
      realizedPnl: 0,
      costBasis: 100,
      trades: [],
      lastTradeAt: 1,
    };
    mockUseTraderPositions.mockReturnValue({
      openPositions: [openSpot],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
      openError: null,
      closedError: null,
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);
    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.OPEN_TAB));
    fireEvent.press(screen.getByTestId('position-row-ETH'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POSITION, {
      traderId: 'current-user',
      traderName: 'Giga Whale',
      traderImageUrl: undefined,
      traderAddress: undefined,
      tokenSymbol: 'ETH',
      position: openSpot,
      source: 'profile_position',
      isClosed: false,
    });
  });
});
