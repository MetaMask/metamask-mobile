import React from 'react';
import { Linking, Share } from 'react-native';
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
import Routes from '../../../../constants/navigation/Routes';
import {
  getLocalSocialProfileSnapshot,
  restoreDefaultLocalSocialProfile,
} from './hooks/localSocialProfileStore';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
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

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({ params: mockProfileRouteParams }),
}));

jest.mock('../hooks/useFollowWithNotificationSetup', () => ({
  useFollowWithNotificationSetup: () => ({
    followWithSetup: mockFollowWithSetup,
  }),
}));

jest.mock('./hooks', () => ({
  useMyProfile: () => mockUseMyProfile(),
  useMyProfileAddress: () => mockUseMyProfileAddress(),
  useMyProfilePosts: () => mockUseMyProfilePosts(),
  useMyOpenPerpsPositionCount: () => 3,
}));

jest.mock('../TraderProfileView/hooks', () => ({
  useTraderProfile: () => mockUseTraderProfile(),
  useTraderPositions: (
    addressOrId: string,
    options?: UseTraderPositionsOptions,
  ) => mockUseTraderPositions(addressOrId, options),
}));

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

jest.mock('../NotificationPreferences/hooks', () => ({
  useFollowedTraders: () => mockUseFollowedTraders(),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
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
  rankingTag: 'whale',
  xHandle: 'giga-whale',
  followerCount: 4,
  followingCount: 0,
  shareUrl: 'https://metamask.io/social/giga-whale',
  winRatePercent: 60,
  pnlUsd: 7100,
  timesCopied: 981,
};

describe('MyProfileView', () => {
  afterEach(() => {
    restoreDefaultLocalSocialProfile();
  });

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('renders the mocked owner identity and whale ranking', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.DISPLAY_NAME),
    ).toHaveTextContent('Giga Whale');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.RANKING_TAG),
    ).toHaveTextContent('🐋 Whale');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.HANDLE),
    ).toHaveTextContent('@giga-whale.metamask');
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

  it('renders mocked headline stats with a fake-data prefix', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.STATS_WIN_RATE),
    ).toHaveTextContent('*60%');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.STATS_PNL),
    ).toHaveTextContent('*+$7,100');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.STATS_TIMES_COPIED),
    ).toHaveTextContent('*981');
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.STATS_HOLD_TIME),
    ).not.toBeOnTheScreen();
  });

  it('renders live trader stats without a fake-data prefix', () => {
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
      screen.getByTestId(MyProfileViewSelectorsIDs.STATS_WIN_RATE),
    ).toHaveTextContent('42%');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.STATS_PNL),
    ).toHaveTextContent('+$1,200');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOWERS_COUNT),
    ).toHaveTextContent('88');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.RANKING_TAG),
    ).toHaveTextContent('🐬 Dolphin');
  });

  it('opens followers connections on the followers tab', () => {
    renderWithProvider(<MyProfileView />);

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOWERS_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.FOLLOW_CONNECTIONS,
      { initialTab: 'followers' },
    );
  });

  it('opens following connections on the following tab', () => {
    renderWithProvider(<MyProfileView />);

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOWING_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.FOLLOW_CONNECTIONS,
      { initialTab: 'following' },
    );
  });

  it('opens the owner X profile', () => {
    renderWithProvider(<MyProfileView />);

    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.X_LINK));

    expect(Linking.openURL).toHaveBeenCalledWith('https://x.com/giga-whale');
  });

  it('returns to SocialV1 from the MMDS back button', () => {
    renderWithProvider(<MyProfileView />);

    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('shares the placeholder owner profile URL', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction });
    renderWithProvider(<MyProfileView />);

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.SHARE_PROFILE_BUTTON),
    );

    await waitFor(() =>
      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(profile.shareUrl),
        }),
      ),
    );
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
    ).toBeOnTheScreen();
    expect(screen.getByTestId('my-profile-post-post-1')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.EMPTY_STATE),
    ).not.toBeOnTheScreen();
  });

  it('renders the Posts empty state and trade CTA', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.POSTS_TAB),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.SHARE_FIRST_TRADE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('opens the post composer from the empty Posts CTA', () => {
    renderWithProvider(<MyProfileView />);

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.SHARE_FIRST_TRADE_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POST_COMPOSER);
  });

  it('resets the local profile and opens onboarding from the debug button', () => {
    renderWithProvider(<MyProfileView />);

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.DEBUG_RESET_PROFILE_BUTTON),
    );

    expect(getLocalSocialProfileSnapshot().profile).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE_ONBOARDING);
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
      screen.queryByTestId(MyProfileViewSelectorsIDs.SHARE_FIRST_TRADE_BUTTON),
    ).toBeNull();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOW_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.OPEN_TAB),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.CLOSED_TAB),
    ).toBeOnTheScreen();
    expect(screen.getByText('No posts yet')).toBeOnTheScreen();
    expect(screen.queryByText('Your feed starts here')).toBeNull();

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
