import React from 'react';
import { Linking, Share } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { TraderProfileResponse } from '@metamask/social-controllers';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import MyProfileView from './MyProfileView';
import { MyProfileViewSelectorsIDs } from './MyProfileView.testIds';
import type { UseMyProfileResult } from './hooks/useMyProfile';
import type { UseFollowedTradersResult } from '../NotificationPreferences/hooks/useFollowedTraders';
import type { UseMyProfilePostsResult } from './hooks/useMyProfilePosts';
import { mockOpenPerpsFeedItem } from '../SocialV1View/feed/mocks/socialV1Feed.mock';
import type { SocialV1FeedPost } from '../SocialV1View/feed/types';
import type { UseTraderProfileResult } from '../TraderProfileView/hooks/useTraderProfile';
import Routes from '../../../../constants/navigation/Routes';
import {
  getLocalSocialProfileSnapshot,
  restoreDefaultLocalSocialProfile,
} from './hooks/localSocialProfileStore';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockUseMyProfileAddress = jest.fn<string | undefined, []>(
  () => '0xselected',
);
const mockUseTraderProfile = jest.fn<UseTraderProfileResult, []>();
const mockUseMyProfilePosts = jest.fn<UseMyProfilePostsResult, []>();
const mockUseMyProfile = jest.fn<UseMyProfileResult, []>();
const mockUseFollowedTraders = jest.fn<UseFollowedTradersResult, []>();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

jest.mock('./hooks', () => ({
  useMyProfile: () => mockUseMyProfile(),
  useMyProfileAddress: () => mockUseMyProfileAddress(),
  useMyProfilePosts: () => mockUseMyProfilePosts(),
  useMyOpenPerpsPositionCount: () => 3,
}));

jest.mock('../TraderProfileView/hooks', () => ({
  useTraderProfile: () => mockUseTraderProfile(),
}));

jest.mock('../SocialV1View/feed/components/SocialFeedPostShell', () => {
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
  holdTimeLabel: '4d',
  timesCopied: 981,
};

describe('MyProfileView', () => {
  afterEach(() => {
    restoreDefaultLocalSocialProfile();
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
});
