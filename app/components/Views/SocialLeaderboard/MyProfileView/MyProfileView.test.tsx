import React from 'react';
import { Linking } from 'react-native';
import Share from 'react-native-share';
import { IconName } from '@metamask/design-system-react-native';
import { brandColor, lightTheme } from '@metamask/design-tokens';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import type {
  Position,
  TraderProfileResponse,
} from '@metamask/social-controllers';
import type { HardwareTier } from '../../../../util/deviceCapability';
import type { NetworkTier } from '../../../../hooks/useNetworkTier';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import MyProfileView from './MyProfileView';
import { MyProfileViewSelectorsIDs } from './MyProfileView.testIds';
import { ProfileOptionsSheetSelectorsIDs } from '../TraderProfileView/components/ProfileOptionsSheet.testIds';
import type { UseMyProfileResult } from './hooks/useMyProfile';
import type { UseFollowedTradersResult } from '../NotificationPreferences/hooks/useFollowedTraders';
import {
  mockOpenPerpsFeedItem,
  mockOpenSpotFeedItem,
} from '../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import type { SocialV1FeedPost } from '../../../UI/SocialFeed/types';
import type { SocialFeedState } from '../../../UI/SocialFeed/data/useSocialFeed';
import type {
  UseTraderPositionsOptions,
  UseTraderPositionsResult,
} from '../TraderProfileView/hooks/useTraderPositions';
import type { UseTraderBlockResult } from '../TraderProfileView/hooks/useTraderBlock';
import type { UseTraderProfileResult } from '../TraderProfileView/hooks/useTraderProfile';
import { expectHeaderIncludesTopInset } from '../shared/scrollableScreenSafeArea.testUtils';
import Routes from '../../../../constants/navigation/Routes';
import Logger from '../../../../util/Logger';
import { requestPostsTabFocus } from '../pendingPosts/pendingPostsStore';
import {
  SOCIAL_FEED_ERROR_TEST_ID,
  SOCIAL_FEED_NEXT_PAGE_TEST_ID,
} from '../../../UI/SocialFeed/components/SocialFeedStates.testIds';

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(() => Promise.resolve({ success: true, message: '' })),
  },
}));

jest.mock('../navigation/socialOgImageService', () => ({
  createSocialOgImage: jest
    .fn()
    .mockResolvedValue(
      'https://social.dev-api.cx.metamask.io/api/v1/og-images/card.png?v=1',
    ),
  getSocialOgDefaultImageUrl: () =>
    'https://social.dev-api.cx.metamask.io/api/v1/og-images/default.jpg',
}));

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
const mockUseTraderBlock = jest.fn<
  UseTraderBlockResult,
  [string | undefined]
>();
const mockBlock = jest.fn().mockResolvedValue(true);
const mockUnblock = jest.fn().mockResolvedValue(true);
const mockUseTraderPositions = jest.fn<
  UseTraderPositionsResult,
  [string, UseTraderPositionsOptions?]
>();
let mockSocialFeedState: Omit<SocialFeedState, 'dataUpdatedAt'>;
const setMockSocialFeedState = (
  state: Omit<SocialFeedState, 'dataUpdatedAt'>,
) => {
  mockSocialFeedState = state;
};
const mockUseMyProfile = jest.fn<UseMyProfileResult, []>();
const mockUseFollowedTraders = jest.fn<UseFollowedTradersResult, []>();
const mockSetTitleSectionHeight = jest.fn();
const mockSocialFeedProps = jest.fn();

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
    startAccessory,
    endAccessory,
  }: {
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    onBack?: () => void;
    testID?: string;
    backButtonProps?: { testID?: string };
    includesTopInset?: boolean;
    startAccessory?: React.ReactNode;
    endAccessory?: React.ReactNode;
  }) =>
    ReactActual.createElement(
      View,
      { testID, style: includesTopInset ? { marginTop: 1 } : undefined },
      startAccessory ??
        ReactActual.createElement(
          Pressable,
          { onPress: onBack, testID: backButtonProps?.testID },
          ReactActual.createElement(Text, null, 'back'),
        ),
      title,
      subtitle,
      endAccessory,
    );

  const MockBottomSheet = ReactActual.forwardRef(
    (
      props: {
        children?: React.ReactNode;
        testID?: string;
        onClose?: () => void;
      },
      ref: React.Ref<{ onCloseBottomSheet: () => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onOpenBottomSheet: () => undefined,
        onCloseBottomSheet: () => props.onClose?.(),
      }));
      return ReactActual.createElement(
        View,
        { testID: props.testID },
        props.children,
      );
    },
  );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
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
  useIsFocused: () => true,
}));

const mockSpotCopyTrade = jest.fn();
const mockUseSpotCopyTradeQuickBuy = jest.fn();
jest.mock('../hooks/useSpotCopyTradeQuickBuy', () => ({
  useSpotCopyTradeQuickBuy: (options: unknown) =>
    mockUseSpotCopyTradeQuickBuy(options),
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
}));

jest.mock('../TraderProfileView/hooks', () => ({
  useTraderProfile: () => mockUseTraderProfile(),
  useTraderBlock: (profileId?: string) => mockUseTraderBlock(profileId),
  useTraderPositions: (
    addressOrId: string,
    options?: UseTraderPositionsOptions,
  ) => mockUseTraderPositions(addressOrId, options),
}));

const mockSocialV1Enabled = { value: false };
jest.mock('../../../../selectors/featureFlagController/socialV1', () => ({
  selectIsSocialV1Enabled: () => mockSocialV1Enabled.value,
}));

const mockNetworkTier = { value: 'WIFI' as NetworkTier | null };
jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockNetworkTier.value,
}));

const mockHardwareTier = { value: 'HIGH' as HardwareTier | null };
jest.mock('../../../../util/deviceCapability', () => ({
  ...jest.requireActual('../../../../util/deviceCapability'),
  getHardwareTier: () => mockHardwareTier.value,
}));

jest.mock('../../../UI/SocialFeed/components/TraderAvatar', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return ({ testID }: { testID?: string }) =>
    ReactActual.createElement(View, { testID });
});

jest.mock('../../../UI/SocialFeed/components/SocialFeed', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');

  const MockSocialFeed = (props: {
    profileId?: string;
    analyticsEnabled?: boolean;
    emptyState?: React.ReactNode;
    filterPost?: (post: SocialV1FeedPost) => boolean;
    onCopyTrade?: (item: SocialV1FeedPost['item'], commentId?: string) => void;
    refreshRef?: React.Ref<{ refresh: () => Promise<void> }>;
    testID?: string;
  }) => {
    mockSocialFeedProps(props);
    const result = mockSocialFeedState;
    ReactActual.useImperativeHandle(props.refreshRef, () => ({
      refresh: result.refresh,
    }));
    const matchingPosts = result.posts.map((post) => ({
      ...post,
      commentId: post.commentId ?? 'comment-1',
      item: {
        ...post.item,
        author: {
          ...post.item.author,
          id: props.profileId ?? post.item.author.id,
        },
      },
    }));
    const posts = props.filterPost
      ? matchingPosts.filter(props.filterPost)
      : matchingPosts;

    return (
      <View testID={props.testID}>
        {result.error && posts.length === 0 ? (
          <View testID="social-v1-feed-error">
            <Text>{"The feed didn't load"}</Text>
          </View>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <View key={post.id} testID={`my-profile-post-${post.id}`}>
              <Text>{post.id}</Text>
              {!props.analyticsEnabled ? (
                <Pressable
                  testID={`my-profile-post-copy-trade-${post.id}`}
                  onPress={() => props.onCopyTrade?.(post.item, post.commentId)}
                >
                  <Text>Copy trade</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        ) : (
          props.emptyState
        )}
        {result.isFetchingNextPage ? (
          <View testID="social-feed-next-page" />
        ) : null}
      </View>
    );
  };

  return {
    __esModule: true,
    default: MockSocialFeed,
  };
});

jest.mock('../TraderProfileView/components/PositionRow', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      position,
      onPress,
      flaggedPresentation,
    }: {
      position: Position;
      onPress?: (next: Position) => void;
      flaggedPresentation?: 'excluded' | 'subline';
    }) => {
      const pressable = Boolean(onPress) && flaggedPresentation !== 'excluded';
      if (!pressable) {
        return (
          <View testID={`position-row-${position.tokenSymbol}`}>
            <Text>{position.tokenSymbol}</Text>
          </View>
        );
      }
      return (
        <Pressable
          accessibilityRole="button"
          testID={`position-row-${position.tokenSymbol}`}
          onPress={() => onPress?.(position)}
        >
          <Text>{position.tokenSymbol}</Text>
        </Pressable>
      );
    },
  };
});

jest.mock('../../../UI/SocialFeed/components/SocialFeedPostShell', () => {
  const { Pressable, View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      post,
      showCopyTrade = true,
      onCopyTrade,
    }: {
      post: SocialV1FeedPost;
      showCopyTrade?: boolean;
      onCopyTrade?: (
        item: SocialV1FeedPost['item'],
        commentId?: string,
      ) => void;
    }) => (
      <View testID={`my-profile-post-${post.id}`}>
        <Text>{post.id}</Text>
        {showCopyTrade ? (
          <Pressable
            testID={`my-profile-post-copy-trade-${post.id}`}
            onPress={() => onCopyTrade?.(post.item, post.commentId)}
          >
            <Text>Copy trade</Text>
          </Pressable>
        ) : null}
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

const foreignTraderProfile: TraderProfileResponse = {
  profile: {
    profileId: 'foreign-profile-id',
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
} as TraderProfileResponse;

const foreignTraderProfileResult = (
  isFollowing = false,
  toggleFollow = jest.fn().mockResolvedValue(undefined),
): UseTraderProfileResult => ({
  profile: foreignTraderProfile,
  isLoading: false,
  error: null,
  isFollowing,
  toggleFollow,
  refresh: jest.fn().mockResolvedValue(undefined),
});

describe('MyProfileView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasNotificationPreferences = true;
    mockIsTraderNotificationEnabled.mockReturnValue(true);
    mockProfileRouteParams = undefined;
    mockUseSpotCopyTradeQuickBuy.mockReturnValue({
      onCopyTrade: mockSpotCopyTrade,
      quickBuySheet: null,
    });
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
    mockUseTraderBlock.mockReturnValue({
      isBlocked: false,
      block: mockBlock,
      unblock: mockUnblock,
    });
    setMockSocialFeedState({
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
    ).toHaveTextContent('*+$7,100.00');
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
      screen.getByTestId(MyProfileViewSelectorsIDs.HEADER_COMPACT_PNL),
    ).toHaveTextContent('+$1,200.00');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_PNL),
    ).toHaveTextContent('+$1,200.00');
    expect(
      screen.queryByTestId(
        MyProfileViewSelectorsIDs.PERFORMANCE_UNREALIZED_PNL,
      ),
    ).toBeNull();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_HOLD_TIME),
    ).toHaveTextContent('3h');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_VOLUME),
    ).toHaveTextContent('$50,000.00');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOWERS_COUNT),
    ).toHaveTextContent('88');
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.RANKING_TAG),
    ).toBeNull();
  });

  it('fills unrealized P&L from priced open positions', () => {
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
    mockUseTraderPositions.mockReturnValue({
      openPositions: [
        {
          positionId: 'eth-spot',
          tokenSymbol: 'ETH',
          tokenName: 'Ethereum',
          tokenAddress: '0xeth',
          chain: 'ethereum',
          positionAmount: 1,
          boughtUsd: 100,
          soldUsd: 0,
          realizedPnl: 50,
          costBasis: 100,
          trades: [],
          lastTradeAt: 1,
          pnlValueUsd: 150,
        },
      ],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
      openError: null,
      closedError: null,
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_UNREALIZED_PNL),
    ).toHaveTextContent('+$100.00');
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

  it('opens the post composer from the profile actions', () => {
    renderWithProvider(<MyProfileView />);

    const createPostButton = screen.getByTestId(
      MyProfileViewSelectorsIDs.CREATE_POST_BUTTON,
    );

    fireEvent.press(createPostButton);

    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
    expect(mockOpenComposer).toHaveBeenCalledTimes(1);
    expect(createPostButton).toHaveProp('accessibilityLabel', 'Create post');
  });

  it('shares the owner profile deeplink from the share profile button', async () => {
    renderWithProvider(<MyProfileView />);

    const shareProfileButton = screen.getByTestId(
      MyProfileViewSelectorsIDs.SHARE_PROFILE_BUTTON,
    );

    expect(
      within(shareProfileButton).UNSAFE_getByProps({ name: IconName.Share }),
    ).toBeTruthy();
    expect(shareProfileButton).toHaveProp('hitSlop', {
      top: 12,
      bottom: 12,
      left: 12,
      right: 12,
    });

    fireEvent.press(shareProfileButton);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.SHARE_SPINNER),
    ).toBeOnTheScreen();
    await waitFor(() => {
      expect(Share.open).toHaveBeenCalledWith({
        message:
          'https://link.metamask.io/social/profile?traderId=current-user&share=1',
        url: 'https://link.metamask.io/social/profile?traderId=current-user&share=1',
        failOnCancel: false,
      });
    });
    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByTestId(MyProfileViewSelectorsIDs.SHARE_PROFILE_BUTTON),
    ).toBeOnTheScreen();
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

  it('shows a footer spinner while the next posts page loads', () => {
    setMockSocialFeedState({
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
    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.POSTS_TAB));

    expect(screen.getByTestId(SOCIAL_FEED_NEXT_PAGE_TEST_ID)).toBeOnTheScreen();
  });

  it('renders owner posts under the Posts tab', () => {
    setMockSocialFeedState({
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
    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.POSTS_TAB));

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.POSTS_LIST),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('my-profile-post-post-1')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('my-profile-post-copy-trade-post-1'),
    ).toBeNull();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.EMPTY_STATE),
    ).not.toBeOnTheScreen();
  });

  it('keeps copy trade on another trader posts', () => {
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
      traderAddress: '0xabc',
    };
    mockUseTraderProfile.mockReturnValue(foreignTraderProfileResult());
    setMockSocialFeedState({
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
    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.POSTS_TAB));

    expect(
      screen.getByTestId('my-profile-post-copy-trade-post-1'),
    ).toBeOnTheScreen();
  });

  describe('spot copy trade', () => {
    const spotPost = () =>
      mockMyProfilePost({
        commentId: 'comment-1',
        item: mockOpenSpotFeedItem({ id: 'post-1' }),
      });

    const showForeignTraderPosts = (posts: SocialV1FeedPost[]) => {
      mockProfileRouteParams = {
        traderId: 'trader-1',
        traderName: 'alpha.eth',
        traderAddress: '0xabc',
      };
      mockUseTraderProfile.mockReturnValue(foreignTraderProfileResult());
      setMockSocialFeedState({
        posts,
        rows: [],
        isLoading: false,
        isFetchingNextPage: false,
        hasNextPage: false,
        loadMore: jest.fn(),
        error: null,
        refresh: jest.fn().mockResolvedValue(undefined),
      });
    };

    it('opens Quick Buy for a spot post on another trader profile', () => {
      const post = spotPost();
      showForeignTraderPosts([post]);

      renderWithProvider(<MyProfileView />);
      fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.POSTS_TAB));
      fireEvent.press(screen.getByTestId('my-profile-post-copy-trade-post-1'));

      expect(mockSpotCopyTrade).toHaveBeenCalledWith(
        {
          ...post.item,
          author: { ...post.item.author, id: 'foreign-profile-id' },
        },
        'comment-1',
      );
    });

    it('attributes profile Quick Buy to trader_feed with the profile owner', () => {
      showForeignTraderPosts([spotPost()]);

      renderWithProvider(<MyProfileView />);

      expect(mockUseSpotCopyTradeQuickBuy).toHaveBeenLastCalledWith({
        source: 'trader_feed',
        postTradeShareOwner: 'social-v1-profile',
        isActive: true,
      });
    });

    it('keeps Quick Buy reopen inactive on the owner profile', () => {
      renderWithProvider(<MyProfileView />);

      expect(mockUseSpotCopyTradeQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('renders the Quick Buy sheet on the profile screen', () => {
      const { View } = jest.requireActual('react-native');
      mockUseSpotCopyTradeQuickBuy.mockReturnValue({
        onCopyTrade: mockSpotCopyTrade,
        quickBuySheet: <View testID="my-profile-quick-buy-sheet" />,
      });
      showForeignTraderPosts([spotPost()]);

      renderWithProvider(<MyProfileView />);

      expect(
        screen.getByTestId('my-profile-quick-buy-sheet'),
      ).toBeOnTheScreen();
    });
  });

  it('renders a centered Posts empty line without a create action', () => {
    renderWithProvider(<MyProfileView />);
    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.POSTS_TAB));

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

  it('opens the avatar picker from the owner avatar without an edit badge', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.EDIT_AVATAR_BUTTON, {
        includeHiddenElements: true,
      }),
    ).toBeNull();

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
    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
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
    setMockSocialFeedState({
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

  it('shares the profile deeplink from another profile header', async () => {
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
      traderAddress: '0xabc',
    };
    renderWithProvider(<MyProfileView />);

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.SHARE_TRADER_BUTTON),
    );

    await waitFor(() => {
      expect(Share.open).toHaveBeenCalledWith({
        message:
          'https://link.metamask.io/social/profile?traderId=trader-1&share=1',
        url: 'https://link.metamask.io/social/profile?traderId=trader-1&share=1',
        failOnCancel: false,
      });
    });
    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
  });

  it('hides the trader deeplink share button on the owner profile', () => {
    renderWithProvider(<MyProfileView />);

    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.SHARE_TRADER_BUTTON),
    ).toBeNull();
  });

  it('spaces the other trader header actions like the home capsule', () => {
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
      traderAddress: '0xabc',
    };

    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.HEADER_ACTIONS_CAPSULE),
    ).toHaveStyle({
      gap: 8,
      paddingLeft: 8,
      paddingRight: 8,
    });
  });

  it('shows the profile options button only for another trader', () => {
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
      traderAddress: '0xabc',
    };

    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.MORE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('keeps profile options disabled until the live profile UUID is loaded', () => {
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
      traderAddress: '0xabc',
    };

    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.MORE_BUTTON),
    ).toBeDisabled();
  });

  it('shows the blocked state and Unblock CTA for a blocked trader', () => {
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
      traderAddress: '0xabc',
    };
    mockUseTraderProfile.mockReturnValue(foreignTraderProfileResult());
    mockUseTraderBlock.mockReturnValue({
      isBlocked: true,
      block: mockBlock,
      unblock: mockUnblock,
    });

    renderWithProvider(<MyProfileView />);

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.BLOCKED_STATE),
    ).toBeOnTheScreen();
    expect(screen.getByText('You blocked @alpha.eth')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_SECTION),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.OPEN_TAB),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.UNBLOCK_BUTTON),
    ).toHaveTextContent('Unblock');
  });

  it('unblocks a trader without following them again', async () => {
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
      traderAddress: '0xabc',
    };
    mockUseTraderProfile.mockReturnValue(foreignTraderProfileResult());
    mockUseTraderBlock.mockReturnValue({
      isBlocked: true,
      block: mockBlock,
      unblock: mockUnblock,
    });

    renderWithProvider(<MyProfileView />);

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(MyProfileViewSelectorsIDs.UNBLOCK_BUTTON),
      );
    });

    expect(mockUnblock).toHaveBeenCalledTimes(1);
  });

  describe('trader with a display name', () => {
    beforeEach(() => {
      mockProfileRouteParams = {
        traderId: 'trader-1',
        traderName: 'alpha.eth',
        traderAddress: '0xabc',
      };
      mockUseTraderProfile.mockReturnValue({
        ...foreignTraderProfileResult(),
        profile: {
          ...foreignTraderProfile,
          profile: { ...foreignTraderProfile.profile, displayName: 'Alpha' },
        },
      });
    });

    it('addresses the blocked trader by handle', () => {
      mockUseTraderBlock.mockReturnValue({
        isBlocked: true,
        block: mockBlock,
        unblock: mockUnblock,
      });

      renderWithProvider(<MyProfileView />);

      expect(screen.getByText('You blocked @alpha.eth')).toBeOnTheScreen();
    });

    it('offers to block the trader by handle', () => {
      renderWithProvider(<MyProfileView />);
      fireEvent.press(
        screen.getByTestId(MyProfileViewSelectorsIDs.MORE_BUTTON),
      );

      expect(screen.getByText('Block @alpha.eth')).toBeOnTheScreen();
    });
  });

  describe('private profile', () => {
    const privateTraderProfileResult = (
      isFollowing = false,
    ): UseTraderProfileResult => ({
      ...foreignTraderProfileResult(isFollowing),
      profile: {
        ...foreignTraderProfile,
        profile: { ...foreignTraderProfile.profile, tradingPrivacy: 'private' },
      },
    });

    beforeEach(() => {
      mockProfileRouteParams = {
        traderId: 'trader-1',
        traderName: 'alpha.eth',
        traderAddress: '0xabc',
      };
    });

    it('holds positions and follow until the trader privacy loads', () => {
      mockUseTraderProfile.mockReturnValue({
        ...foreignTraderProfileResult(),
        profile: null,
        isLoading: true,
      });

      renderWithProvider(<MyProfileView />);
      fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.OPEN_TAB));

      expect(mockUseTraderPositions).toHaveBeenLastCalledWith(
        'trader-1',
        expect.objectContaining({ enabled: false }),
      );
      expect(
        screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOW_BUTTON),
      ).toBeDisabled();
      expect(
        screen.queryByTestId(MyProfileViewSelectorsIDs.POSITIONS_EMPTY),
      ).not.toBeOnTheScreen();
    });

    it('hides cached positions while the trader privacy loads', () => {
      mockUseTraderProfile.mockReturnValue({
        ...foreignTraderProfileResult(),
        profile: null,
        isLoading: true,
      });
      mockUseTraderPositions.mockReturnValue({
        openPositions: [
          {
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
          },
        ],
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

      expect(screen.queryByTestId('position-row-ETH')).not.toBeOnTheScreen();
    });

    it('does not page through posts for a filter while the trader privacy loads', () => {
      const loadMore = jest.fn();
      mockUseTraderProfile.mockReturnValue({
        ...foreignTraderProfileResult(),
        profile: null,
        isLoading: true,
      });
      setMockSocialFeedState({
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
      fireEvent.press(
        screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_BUTTON),
      );
      fireEvent.press(
        screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_TOKENS),
      );

      expect(loadMore).not.toHaveBeenCalled();
    });

    it('refreshes a private trader without refetching their positions or posts', async () => {
      jest.useFakeTimers();
      const refreshLiveProfile = jest.fn().mockResolvedValue(undefined);
      const refreshPosts = jest.fn().mockResolvedValue(undefined);
      const refetchPositions = jest.fn().mockResolvedValue(undefined);
      mockUseTraderProfile.mockReturnValue({
        ...privateTraderProfileResult(),
        refresh: refreshLiveProfile,
      });
      setMockSocialFeedState({
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
        expect(refreshPosts).not.toHaveBeenCalled();
        expect(refetchPositions).not.toHaveBeenCalled();
      } finally {
        jest.clearAllTimers();
        jest.useRealTimers();
      }
    });

    it('retries the trader profile when it fails to load', () => {
      const refresh = jest.fn().mockResolvedValue(undefined);
      mockUseTraderProfile.mockReturnValue({
        ...foreignTraderProfileResult(),
        profile: null,
        error: 'Something went wrong',
        refresh,
      });

      renderWithProvider(<MyProfileView />);
      fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.OPEN_TAB));
      fireEvent.press(
        screen.getByTestId(MyProfileViewSelectorsIDs.POSITIONS_RETRY_BUTTON),
      );

      expect(
        screen.getByTestId(MyProfileViewSelectorsIDs.POSITIONS_ERROR),
      ).toBeOnTheScreen();
      expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('hides performance, positions, posts and follow on a private trader', () => {
      mockUseTraderProfile.mockReturnValue(privateTraderProfileResult());

      renderWithProvider(<MyProfileView />);

      expect(
        screen.getByTestId(MyProfileViewSelectorsIDs.PRIVATE_STATE),
      ).toBeOnTheScreen();
      expect(screen.getByText('This profile is private')).toBeOnTheScreen();
      expect(
        screen.getByText(
          '@alpha.eth keeps their performance, positions and posts hidden.',
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_SECTION),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(MyProfileViewSelectorsIDs.OPEN_TAB),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(MyProfileViewSelectorsIDs.COMPACT_STATS),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(MyProfileViewSelectorsIDs.FOLLOW_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(MyProfileViewSelectorsIDs.MUTE_CHIP),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(MyProfileViewSelectorsIDs.PRIVACY_SETTINGS_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('keeps Following on a private trader the visitor follows, without the bell', () => {
      mockUseTraderProfile.mockReturnValue(privateTraderProfileResult(true));

      renderWithProvider(<MyProfileView />);

      expect(
        screen.getByTestId(MyProfileViewSelectorsIDs.FOLLOW_BUTTON),
      ).toHaveTextContent('Following');
      expect(
        screen.queryByTestId(MyProfileViewSelectorsIDs.MUTE_CHIP),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(MyProfileViewSelectorsIDs.PRIVATE_STATE),
      ).toBeOnTheScreen();
    });

    it('shows a trader that sent no trading privacy as public', () => {
      mockUseTraderProfile.mockReturnValue(foreignTraderProfileResult());

      renderWithProvider(<MyProfileView />);

      expect(
        screen.queryByTestId(MyProfileViewSelectorsIDs.PRIVATE_STATE),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(MyProfileViewSelectorsIDs.OPEN_TAB),
      ).toBeOnTheScreen();
    });

    it('shows the owner their private state with Privacy settings and no Create post', () => {
      mockProfileRouteParams = undefined;
      mockUseMyProfile.mockReturnValue({
        profile: { ...profile, shareTradingActivity: false },
        isLoading: false,
        error: null,
        refresh: mockRefresh,
      });

      renderWithProvider(<MyProfileView />);
      fireEvent.press(
        screen.getByTestId(MyProfileViewSelectorsIDs.PRIVACY_SETTINGS_BUTTON),
      );

      expect(screen.getByText('Your profile is private')).toBeOnTheScreen();
      expect(
        screen.getByText(
          'Your performance, positions and posts are hidden from everyone.',
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(MyProfileViewSelectorsIDs.CREATE_POST_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(MyProfileViewSelectorsIDs.EDIT_PROFILE_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(MyProfileViewSelectorsIDs.OPEN_TAB),
      ).not.toBeOnTheScreen();
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL.MANAGE_PROFILE_TRADING_ACTIVITY,
      );
    });
  });

  it('blocks and unfollows a followed trader from profile options', async () => {
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
      traderAddress: '0xabc',
    };
    const toggleFollow = jest.fn().mockResolvedValue(undefined);
    mockUseTraderProfile.mockReturnValue(
      foreignTraderProfileResult(true, toggleFollow),
    );

    renderWithProvider(<MyProfileView />);
    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.MORE_BUTTON));

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ProfileOptionsSheetSelectorsIDs.BLOCK_BUTTON),
      );
    });

    expect(mockBlock).toHaveBeenCalledTimes(1);
    expect(toggleFollow).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'trader_profile',
        traderAddress: '0xabc',
      }),
    );
  });

  it('hides owner actions and shows follow for another trader', () => {
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
      traderAddress: '0xabc',
    };
    const toggleFollow = jest.fn().mockResolvedValue(undefined);
    mockUseTraderProfile.mockReturnValue(
      foreignTraderProfileResult(false, toggleFollow),
    );

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
      screen.queryByTestId(MyProfileViewSelectorsIDs.SHARE_PROFILE_BUTTON),
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
    expect(mockSocialFeedProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scope: 'all',
        profileId: 'foreign-profile-id',
        commentedOnly: true,
        realtime: true,
      }),
    );
    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.OPEN_TAB));
    expect(screen.getByText('No open positions')).toBeOnTheScreen();
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
      screen.getByTestId(MyProfileViewSelectorsIDs.OPEN_TAB),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.CLOSED_TAB),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.POSTS_TAB),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(screen.getByText('No posts yet')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.POSITIONS_LIST),
    ).not.toBeOnTheScreen();
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

    expect(mockUseTraderPositions).toHaveBeenCalledWith('0xselected', {
      enabled: true,
      paginated: false,
      refetchInterval: 30_000,
    });
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
    expect(screen.queryByText('Tokens')).toBeNull();
    expect(screen.queryByText('Perpetuals')).toBeNull();
    expect(screen.getByTestId('position-row-ETH')).toBeOnTheScreen();
    expect(screen.getByTestId('position-row-BTC')).toBeOnTheScreen();
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
    const closedPerp: Position = {
      ...closedSpot,
      positionId: 'btc-closed',
      tokenSymbol: 'BTC',
      chain: 'hyperliquid',
      perpPositionType: 'short',
    };
    mockUseTraderPositions.mockReturnValue({
      openPositions: [],
      closedPositions: [closedPerp, closedSpot],
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
      screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_BUTTON),
    );

    const allOption = screen.getByTestId(
      MyProfileViewSelectorsIDs.ASSET_FILTER_ALL,
    );
    expect(screen.getByText('Asset type')).toBeOnTheScreen();
    expect(screen.getByText('All')).toBeOnTheScreen();
    expect(screen.getByText('Tokens')).toBeOnTheScreen();
    expect(screen.getByText('Perps')).toBeOnTheScreen();
    expect(allOption.props.accessibilityState.selected).toBe(true);
    expect(
      within(allOption).UNSAFE_getAllByProps({ name: IconName.Check }).length,
    ).toBeGreaterThan(0);

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_TOKENS),
    );
    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.CLOSED_TAB));

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_BUTTON),
    ).toHaveStyle({ backgroundColor: lightTheme.colors.background.pressed });
    expect(screen.getByTestId('position-row-DOGE')).toBeOnTheScreen();
    expect(screen.queryByTestId('position-row-BTC')).toBeNull();
  });

  it('applies the same Tokens filter on Posts', () => {
    const spotPosition: Position = {
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
    setMockSocialFeedState({
      posts: [
        mockMyProfilePost({ id: 'spot-post', position: spotPosition }),
        mockMyProfilePost({
          id: 'perp-post',
          position: {
            ...spotPosition,
            positionId: 'btc-perp',
            tokenSymbol: 'BTC',
            chain: 'hyperliquid',
            perpPositionType: 'long',
          },
        }),
      ],
      rows: [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      loadMore: jest.fn(),
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);
    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_BUTTON),
    );
    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_TOKENS),
    );
    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.POSTS_TAB));

    expect(screen.getByTestId('my-profile-post-spot-post')).toBeOnTheScreen();
    expect(screen.queryByTestId('my-profile-post-perp-post')).toBeNull();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_BUTTON),
    ).toBeOnTheScreen();
  });

  it('shows the posts error when a filter hides every loaded post', () => {
    setMockSocialFeedState({
      posts: [mockMyProfilePost()],
      rows: [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      loadMore: jest.fn(),
      error: 'failed',
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);
    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_BUTTON),
    );
    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_TOKENS),
    );
    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.POSTS_TAB));

    expect(screen.getByTestId(SOCIAL_FEED_ERROR_TEST_ID)).toBeOnTheScreen();
    expect(screen.getByText("The feed didn't load")).toBeOnTheScreen();
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

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POSITION_SHEET, {
      positionId: 'eth-spot',
      position: openSpot,
      author: {
        id: 'current-user',
        username: 'Giga Whale',
        address: undefined,
        avatarUri: null,
        winRatePercent: 60,
        pnl30d: 7100,
        followerCount: 4,
        xHandle: 'giga-whale',
      },
      isClosed: false,
    });
  });

  it('opens the position sheet from a Closed row', () => {
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
    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.CLOSED_TAB));
    fireEvent.press(screen.getByTestId('position-row-DOGE'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POSITION_SHEET, {
      positionId: 'doge-closed',
      position: closedSpot,
      author: {
        id: 'current-user',
        username: 'Giga Whale',
        address: undefined,
        avatarUri: null,
        winRatePercent: 60,
        pnl30d: 7100,
        followerCount: 4,
        xHandle: 'giga-whale',
      },
      isClosed: true,
    });
  });

  it('opens and closes the uncounted-positions sheet over the profile', () => {
    const flagged: Position = {
      positionId: 'nigel',
      tokenSymbol: 'Nigel',
      tokenName: 'Nigel',
      tokenAddress: '0xnigel',
      chain: 'solana',
      positionAmount: 1,
      boughtUsd: 10,
      soldUsd: 0,
      realizedPnl: 0,
      costBasis: 10,
      trades: [],
      lastTradeAt: 1,
      flags: ['insider'],
    };
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'alpha.eth',
    };
    mockUseTraderProfile.mockReturnValue(foreignTraderProfileResult());
    mockUseTraderPositions.mockReturnValue({
      openPositions: [flagged],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
      openError: null,
      closedError: null,
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProvider(<MyProfileView />);

    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SHEET),
    ).toBeNull();

    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.OPEN_TAB));
    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SECTION_HEADER),
    );

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Why some positions aren't counted"),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'This trader got the token from an allocation before it was public.',
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SHEET_DISMISS),
    );

    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SHEET),
    ).toBeNull();
  });

  it('pins the owner flagged positions and opens history from that row', () => {
    const flagged: Position = {
      positionId: 'nigel',
      tokenSymbol: 'Nigel',
      tokenName: 'Nigel',
      tokenAddress: '0xnigel',
      chain: 'solana',
      positionAmount: 1,
      boughtUsd: 10,
      soldUsd: 0,
      realizedPnl: 0,
      costBasis: 10,
      trades: [],
      lastTradeAt: 1,
      flags: ['insider'],
    };
    mockUseTraderPositions.mockReturnValue({
      openPositions: [flagged],
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
      screen.getByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SECTION),
    ).toBeOnTheScreen();
    expect(screen.getByText('Not counted in P&L')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.TOKENS_SECTION),
    ).toBeNull();

    fireEvent.press(screen.getByTestId('position-row-Nigel'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POSITION_SHEET, {
      positionId: 'nigel',
      position: flagged,
      author: {
        id: 'current-user',
        username: 'Giga Whale',
        address: undefined,
        avatarUri: null,
        winRatePercent: 60,
        pnl30d: 7100,
        followerCount: 4,
        xHandle: 'giga-whale',
      },
      isClosed: false,
    });

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SECTION_HEADER),
    );

    expect(
      screen.getByText(
        'You got the token from an allocation before it was public.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("You deployed the token's contract."),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        'This trader got the token from an allocation before it was public.',
      ),
    ).toBeNull();
  });

  it('opens position history from a flagged row on another trader profile', () => {
    const nigel: Position = {
      positionId: 'd11488e1-89d8-4010-b772-a8ec23fe2589',
      tokenSymbol: 'Nigel',
      tokenName: 'Nigel',
      tokenAddress: '8EnmgofrT5zp6uUiNfECkUMBnYA42pMqPj35vVXUpump',
      chain: 'solana',
      positionAmount: 24198367.115879,
      boughtUsd: 1620.37,
      soldUsd: 0,
      realizedPnl: 0,
      costBasis: 1620.37,
      trades: [],
      lastTradeAt: 1,
      flags: ['insider'],
    };
    mockProfileRouteParams = {
      traderId: 'trader-1',
      traderName: 'shittymike.sol',
      traderAddress: '0xabc',
    };
    mockUseTraderProfile.mockReturnValue({
      ...foreignTraderProfileResult(),
      profile: {
        ...foreignTraderProfile,
        profile: {
          ...foreignTraderProfile.profile,
          profileId: 'trader-1',
          name: 'shittymike.sol',
        },
      },
    });
    mockUseTraderPositions.mockReturnValue({
      openPositions: [nigel],
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

    expect(screen.getByTestId('position-row-Nigel')).toHaveProp(
      'accessibilityRole',
      'button',
    );

    fireEvent.press(screen.getByTestId('position-row-Nigel'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POSITION_SHEET, {
      positionId: 'd11488e1-89d8-4010-b772-a8ec23fe2589',
      position: nigel,
      author: {
        id: 'trader-1',
        username: 'shittymike.sol',
        address: '0xabc',
        avatarUri: undefined,
        winRatePercent: 0,
        pnl30d: 0,
        followerCount: 0,
        xHandle: null,
      },
      isClosed: false,
    });
  });

  describe('SocialV1 paginated positions', () => {
    const pagedPositions = (
      overrides: Partial<UseTraderPositionsResult> = {},
    ): UseTraderPositionsResult => ({
      openPositions: [],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
      openError: null,
      closedError: null,
      refetch: jest.fn().mockResolvedValue(undefined),
      hasMoreOpen: false,
      hasMoreClosed: false,
      isFetchingMoreOpen: false,
      isFetchingMoreClosed: false,
      loadMoreOpen: jest.fn(),
      loadMoreClosed: jest.fn(),
      ...overrides,
    });

    const tokenPosition: Position = {
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
    const perpPosition: Position = {
      ...tokenPosition,
      positionId: 'btc-perp',
      tokenSymbol: 'BTC',
      chain: 'hyperliquid',
      perpPositionType: 'short',
    };

    const renderOnOpenTab = (): void => {
      renderWithProvider(<MyProfileView />);
      fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.OPEN_TAB));
    };

    const scrollTo = (distanceFromEnd: 'near' | 'far'): void => {
      const contentHeight = distanceFromEnd === 'near' ? 500 : 3000;
      fireEvent(
        screen.getByTestId(MyProfileViewSelectorsIDs.SCROLL),
        'momentumScrollEnd',
        {
          nativeEvent: {
            contentOffset: { y: 0, x: 0 },
            contentSize: { height: contentHeight, width: 400 },
            layoutMeasurement: { height: 400, width: 400 },
          },
        },
      );
    };

    beforeEach(() => {
      mockSocialV1Enabled.value = true;
      mockNetworkTier.value = 'WIFI';
      mockHardwareTier.value = 'HIGH';
    });

    afterEach(() => {
      mockSocialV1Enabled.value = false;
    });

    it('pages positions and polls page 1 on the SocialV1 profile', () => {
      renderOnOpenTab();

      expect(mockUseTraderPositions).toHaveBeenLastCalledWith('0xselected', {
        enabled: true,
        paginated: true,
        refetchInterval: 30_000,
      });
    });

    it('backs the poll off to 60 seconds on slow cellular', () => {
      mockNetworkTier.value = 'SLOW_CELLULAR';

      renderOnOpenTab();

      expect(mockUseTraderPositions).toHaveBeenLastCalledWith('0xselected', {
        enabled: true,
        paginated: true,
        refetchInterval: 60_000,
      });
    });

    it('stops the poll while offline', () => {
      mockNetworkTier.value = 'NONE';

      renderOnOpenTab();

      const options = mockUseTraderPositions.mock.calls.at(-1)?.[1];
      expect(options?.paginated).toBe(true);
      expect(options?.refetchInterval).toBeUndefined();
    });

    it('loads the next open page when the list nears its end', () => {
      const loadMoreOpen = jest.fn();
      mockUseTraderPositions.mockReturnValue(
        pagedPositions({
          openPositions: [tokenPosition],
          hasMoreOpen: true,
          loadMoreOpen,
        }),
      );

      renderOnOpenTab();
      scrollTo('near');

      expect(loadMoreOpen).toHaveBeenCalledTimes(1);
    });

    it('does not load more while the list is far from its end', () => {
      const loadMoreOpen = jest.fn();
      mockUseTraderPositions.mockReturnValue(
        pagedPositions({
          openPositions: [tokenPosition],
          hasMoreOpen: true,
          loadMoreOpen,
        }),
      );

      renderOnOpenTab();
      scrollTo('far');

      expect(loadMoreOpen).not.toHaveBeenCalled();
    });

    it('loads the next closed page on the Closed tab only', () => {
      const loadMoreOpen = jest.fn();
      const loadMoreClosed = jest.fn();
      mockUseTraderPositions.mockReturnValue(
        pagedPositions({
          closedPositions: [tokenPosition],
          hasMoreOpen: true,
          hasMoreClosed: true,
          loadMoreOpen,
          loadMoreClosed,
        }),
      );

      renderWithProvider(<MyProfileView />);
      fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.CLOSED_TAB));
      scrollTo('near');

      expect(loadMoreClosed).toHaveBeenCalledTimes(1);
      expect(loadMoreOpen).not.toHaveBeenCalled();
    });

    it('shows a footer spinner while the next positions page loads', () => {
      mockUseTraderPositions.mockReturnValue(
        pagedPositions({
          openPositions: [tokenPosition],
          hasMoreOpen: true,
          isFetchingMoreOpen: true,
        }),
      );

      renderOnOpenTab();

      expect(
        screen.getByTestId(MyProfileViewSelectorsIDs.POSITIONS_FOOTER_LOADING),
      ).toBeOnTheScreen();
    });

    it('hides the footer spinner when no positions page is loading', () => {
      mockUseTraderPositions.mockReturnValue(
        pagedPositions({ openPositions: [tokenPosition], hasMoreOpen: true }),
      );

      renderOnOpenTab();

      expect(
        screen.queryByTestId(
          MyProfileViewSelectorsIDs.POSITIONS_FOOTER_LOADING,
        ),
      ).toBeNull();
    });

    it('keeps paging while a Tokens filter matches none of the loaded rows', () => {
      const loadMoreOpen = jest.fn();
      mockUseTraderPositions.mockReturnValue(
        pagedPositions({
          openPositions: [perpPosition],
          hasMoreOpen: true,
          loadMoreOpen,
        }),
      );

      renderOnOpenTab();
      fireEvent.press(
        screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_BUTTON),
      );
      fireEvent.press(
        screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_TOKENS),
      );

      expect(loadMoreOpen).toHaveBeenCalledTimes(1);
    });

    it('does not page for a filter that already matches loaded rows', () => {
      const loadMoreOpen = jest.fn();
      mockUseTraderPositions.mockReturnValue(
        pagedPositions({
          openPositions: [perpPosition, tokenPosition],
          hasMoreOpen: true,
          loadMoreOpen,
        }),
      );

      renderOnOpenTab();
      fireEvent.press(
        screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_BUTTON),
      );
      fireEvent.press(
        screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_TOKENS),
      );

      expect(loadMoreOpen).not.toHaveBeenCalled();
    });

    it('does not page once the list has no more pages', () => {
      const loadMoreOpen = jest.fn();
      mockUseTraderPositions.mockReturnValue(
        pagedPositions({
          openPositions: [perpPosition],
          hasMoreOpen: false,
          loadMoreOpen,
        }),
      );

      renderOnOpenTab();
      fireEvent.press(
        screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_BUTTON),
      );
      fireEvent.press(
        screen.getByTestId(MyProfileViewSelectorsIDs.ASSET_FILTER_TOKENS),
      );

      expect(loadMoreOpen).not.toHaveBeenCalled();
    });
  });
});
