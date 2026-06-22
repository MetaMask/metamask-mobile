import { DEFAULT_SOCIAL_AI_PREFERENCES } from '@metamask/notification-services-controller/notification-services';
import type {
  Position,
  TraderProfileResponse,
} from '@metamask/social-controllers';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import React from 'react';
import Routes from '../../../../constants/navigation/Routes';
import { ImpactMoment } from '../../../../util/haptics';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { SocialAIPreference } from '../NotificationPreferences/hooks';
import type { UseTraderPositionsResult } from './hooks/useTraderPositions';
import type { UseTraderProfileResult } from './hooks/useTraderProfile';
import TraderProfileView from './TraderProfileView';
import { TraderProfileViewSelectorsIDs } from './TraderProfileView.testIds';
import { MetaMetricsEvents } from '../../../../core/Analytics';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockToggleFollow = jest.fn();
const mockRefresh = jest.fn();
const mockRefetchPositions = jest.fn();
const mockPlayImpact = jest.fn().mockResolvedValue(undefined);
const mockPlaySelection = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../../util/haptics', () => ({
  ...jest.requireActual('../../../../util/haptics'),
  playImpact: (...args: unknown[]) => mockPlayImpact(...args),
  playSelection: (...args: unknown[]) => mockPlaySelection(...args),
}));

jest.mock('../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  getAssetImageUrl: () => 'https://example.com/token.png',
  toAssetId: (address: string, chainId: string) =>
    `${chainId}/erc20:${address}`,
}));

const mockTrack = jest.fn();
jest.mock('../analytics', () => {
  const actual = jest.requireActual('../analytics');
  return {
    ...actual,
    useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
  };
});

jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: () => true,
  }),
);

let mockNotificationPreferences: SocialAIPreference = {
  ...DEFAULT_SOCIAL_AI_PREFERENCES,
  mutedTraderProfileIds: [
    ...DEFAULT_SOCIAL_AI_PREFERENCES.mutedTraderProfileIds,
  ],
};
let mockIsLoadingPreferences = false;
const mockSetPushNotificationsEnabled = jest.fn();
const mockSetTxAmountLimit = jest.fn();
const mockToggleTraderNotification = jest.fn();
const mockIsTraderNotificationEnabled = jest.fn().mockReturnValue(true);
const mockHasNotificationPreferences = jest.fn(() => true);

jest.mock('../NotificationPreferences/hooks', () => ({
  ...jest.requireActual('../NotificationPreferences/hooks'),
  useNotificationPreferences: () => ({
    preferences: mockNotificationPreferences,
    hasNotificationPreferences: mockHasNotificationPreferences(),
    isLoading: mockIsLoadingPreferences,
    error: null,
    setPushNotificationsEnabled: mockSetPushNotificationsEnabled,
    setTxAmountLimit: mockSetTxAmountLimit,
    toggleTraderNotification: mockToggleTraderNotification,
    isTraderNotificationEnabled: mockIsTraderNotificationEnabled,
  }),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: () => 'USD',
}));

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.forwardRef(
      (
        props: {
          children?: React.ReactNode;
          onClose?: () => void;
          testID?: string;
        },
        ref: React.Ref<{
          onCloseBottomSheet: (callback?: () => void) => void;
          onOpenBottomSheet: (callback?: () => void) => void;
        }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (cb?: () => void) => {
            props.onClose?.();
            cb?.();
          },
          onOpenBottomSheet: (cb?: () => void) => {
            cb?.();
          },
        }));
        return ReactActual.createElement(
          View,
          { testID: props.testID ?? 'bottom-sheet' },
          props.children,
        );
      },
    );
  },
);

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.forwardRef(
      (
        props: {
          children?: React.ReactNode;
          onClose?: () => void;
          testID?: string;
        },
        ref: React.Ref<{
          onCloseBottomSheet: (callback?: () => void) => void;
          onOpenBottomSheet: (callback?: () => void) => void;
        }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (cb?: () => void) => {
            props.onClose?.();
            cb?.();
          },
          onOpenBottomSheet: (cb?: () => void) => {
            cb?.();
          },
        }));
        return ReactActual.createElement(
          View,
          { testID: props.testID ?? 'bottom-sheet' },
          props.children,
        );
      },
    );
  },
);

let mockRouteParams: {
  traderId: string;
  traderName?: string;
  traderAddress?: string;
  source?: string;
  traderRank?: number;
} = {
  traderId: 'trader-1',
  traderName: 'trader1',
  traderAddress: '0xabc',
  source: 'leaderboard',
  traderRank: 1,
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
    useRoute: () => ({ params: mockRouteParams }),
  };
});

const fixtureProfile: TraderProfileResponse = {
  profile: {
    profileId: 'trader-1',
    address: '0xabc',
    allAddresses: ['0xabc'],
    name: 'trader1',
    imageUrl: 'https://example.com/avatar.png',
  },
  stats: {
    pnl30d: 20610,
    winRate30d: 0.92,
    roiPercent30d: 1.5,
    tradeCount30d: 48,
    pnl7d: 20610,
    winRate7d: 0.92,
    roiPercent7d: 1.5,
    tradeCount7d: 48,
  },
  perChainBreakdown: {
    perChainPnl: {},
    perChainRoi: {},
    perChainVolume: {},
    perChainPnl7d: {},
    perChainRoi7d: {},
    perChainVolume7d: {},
  },
  socialHandles: {},
  followerCount: 45,
  followingCount: 12,
};

const fixtureOpenPositions: Position[] = [
  {
    positionId: 'starkbot-base',
    tokenSymbol: 'STARKBOT',
    tokenName: 'Starkbot',
    tokenAddress: '0x123',
    chain: 'base',
    positionAmount: 1500000000,
    boughtUsd: 1200,
    soldUsd: 0,
    realizedPnl: 0,
    costBasis: 1200,
    trades: [],
    lastTradeAt: Date.now(),
    currentValueUSD: 2259.96,
    pnlValueUsd: 1059.96,
    pnlPercent: 182,
  },
];

const fixtureClosedPositions: Position[] = [
  {
    positionId: 'cult-eth',
    tokenSymbol: 'CULT',
    tokenName: 'Cult',
    tokenAddress: '0xc01t',
    chain: 'ethereum',
    positionAmount: 0,
    boughtUsd: 100,
    soldUsd: 300,
    realizedPnl: 200,
    costBasis: 100,
    trades: [],
    lastTradeAt: 1000,
    currentValueUSD: 0,
    pnlValueUsd: 200,
    pnlPercent: null,
  },
  {
    positionId: 'moonkin-sol',
    tokenSymbol: 'MOONKIN',
    tokenName: 'Moonkin',
    tokenAddress: '0xm00n',
    chain: 'solana',
    positionAmount: 0,
    boughtUsd: 100,
    soldUsd: 1000,
    realizedPnl: 900,
    costBasis: 100,
    trades: [],
    lastTradeAt: 3000,
    currentValueUSD: 0,
    pnlValueUsd: 900,
    pnlPercent: null,
  },
  {
    positionId: 'dope-base',
    tokenSymbol: 'DOPE',
    tokenName: 'Dope',
    tokenAddress: '0xd0pe',
    chain: 'base',
    positionAmount: 0,
    boughtUsd: 500,
    soldUsd: 500,
    realizedPnl: 0,
    costBasis: 500,
    trades: [],
    lastTradeAt: 2000,
    currentValueUSD: 0,
    pnlValueUsd: 0,
    pnlPercent: null,
  },
];

let mockProfileResult: UseTraderProfileResult = {
  profile: fixtureProfile,
  isLoading: false,
  error: null,
  isFollowing: false,
  toggleFollow: mockToggleFollow,
  refresh: mockRefresh,
};

let mockPositionsResult: UseTraderPositionsResult = {
  openPositions: fixtureOpenPositions,
  closedPositions: [],
  isLoadingOpen: false,
  isLoadingClosed: false,
  error: null,
  refetch: mockRefetchPositions,
};

jest.mock('./hooks', () => ({
  useTraderProfile: () => mockProfileResult,
  useTraderPositions: () => mockPositionsResult,
}));

describe('TraderProfileView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileResult = {
      profile: fixtureProfile,
      isLoading: false,
      error: null,
      isFollowing: false,
      toggleFollow: mockToggleFollow,
      refresh: mockRefresh,
    };
    mockPositionsResult = {
      openPositions: fixtureOpenPositions,
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
      refetch: mockRefetchPositions,
    };
    mockRefresh.mockResolvedValue(undefined);
    mockRefetchPositions.mockResolvedValue(undefined);
    mockNotificationPreferences = {
      ...DEFAULT_SOCIAL_AI_PREFERENCES,
      mutedTraderProfileIds: [
        ...DEFAULT_SOCIAL_AI_PREFERENCES.mutedTraderProfileIds,
      ],
    };
    mockHasNotificationPreferences.mockReturnValue(true);
    mockIsLoadingPreferences = false;
    mockIsTraderNotificationEnabled.mockReturnValue(true);
    mockRouteParams = {
      traderId: 'trader-1',
      traderName: 'trader1',
      traderAddress: '0xabc',
      source: 'leaderboard',
      traderRank: 1,
    };
  });

  it('renders the container', () => {
    renderWithProvider(<TraderProfileView />);
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('displays the trader name in the profile header and compact nav header', () => {
    renderWithProvider(<TraderProfileView />);
    expect(
      within(
        screen.getByTestId(TraderProfileViewSelectorsIDs.PROFILE_HEADER),
      ).getByText('trader1'),
    ).toBeOnTheScreen();
    expect(
      within(
        screen.getByTestId(
          TraderProfileViewSelectorsIDs.HEADER_COMPACT_IDENTITY,
        ),
      ).getByText('trader1'),
    ).toBeOnTheScreen();
  });

  it('displays compact win rate and 7D PnL in the nav header', () => {
    renderWithProvider(<TraderProfileView />);

    const header = screen.getByTestId(TraderProfileViewSelectorsIDs.HEADER);

    expect(
      within(header).getByTestId(
        TraderProfileViewSelectorsIDs.HEADER_COMPACT_WIN_RATE,
      ),
    ).toHaveTextContent('92%');
    expect(
      within(header).getByTestId(
        TraderProfileViewSelectorsIDs.HEADER_COMPACT_PNL,
      ),
    ).toHaveTextContent('+$20,610');
  });

  it('calls goBack when the back button is pressed', () => {
    renderWithProvider(<TraderProfileView />);
    fireEvent.press(
      screen.getByTestId(TraderProfileViewSelectorsIDs.BACK_BUTTON),
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not render a follower count', () => {
    renderWithProvider(<TraderProfileView />);
    expect(screen.queryByText(/follower/i)).toBeNull();
  });

  it('renders the win rate stat', () => {
    renderWithProvider(<TraderProfileView />);
    expect(
      within(
        screen.getByTestId(TraderProfileViewSelectorsIDs.STATS_ROW),
      ).getByText('92%'),
    ).toBeOnTheScreen();
  });

  it('renders the Follow button when not following', () => {
    renderWithProvider(<TraderProfileView />);
    expect(screen.getByText('Follow')).toBeOnTheScreen();
  });

  it('renders the Following button when following', () => {
    mockProfileResult.isFollowing = true;
    renderWithProvider(<TraderProfileView />);
    expect(screen.getByText('Following')).toBeOnTheScreen();
  });

  it('calls toggleFollow when the follow button is pressed', () => {
    renderWithProvider(<TraderProfileView />);
    fireEvent.press(screen.getByTestId('trader-profile-follow-button'));
    expect(mockToggleFollow).toHaveBeenCalledTimes(1);
  });

  it('renders open positions', () => {
    renderWithProvider(<TraderProfileView />);
    expect(screen.getByText('STARKBOT')).toBeOnTheScreen();
    expect(screen.getByText('$2,259.96')).toBeOnTheScreen();
  });

  it('navigates to the trader position view when a position is pressed', () => {
    renderWithProvider(<TraderProfileView />);

    fireEvent.press(screen.getByTestId('position-row-STARKBOT'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.POSITION,
      {
        traderId: 'trader-1',
        traderName: 'trader1',
        traderImageUrl: 'https://example.com/avatar.png',
        traderAddress: '0xabc',
        tokenSymbol: fixtureOpenPositions[0].tokenSymbol,
        position: fixtureOpenPositions[0],
        source: 'profile_position',
        isClosed: false,
      },
    );
  });

  it('shows empty state when no positions', () => {
    mockPositionsResult.openPositions = [];
    renderWithProvider(<TraderProfileView />);
    expect(screen.getByText('No positions yet')).toBeOnTheScreen();
  });

  it('switches to closed tab', () => {
    renderWithProvider(<TraderProfileView />);
    fireEvent.press(screen.getByTestId('trader-profile-tab-closed'));
    expect(screen.getByText('No positions yet')).toBeOnTheScreen();
  });

  it('renders skeleton placeholders when profile is loading', () => {
    mockProfileResult.isLoading = true;
    mockProfileResult.profile = null;
    renderWithProvider(<TraderProfileView />);
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.HEADER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(TraderProfileViewSelectorsIDs.PROFILE_HEADER),
    ).not.toBeOnTheScreen();
  });

  it('renders position skeletons when positions are loading', () => {
    mockPositionsResult.openPositions = [];
    mockPositionsResult.isLoadingOpen = true;
    renderWithProvider(<TraderProfileView />);
    expect(screen.queryByText('STARKBOT')).not.toBeOnTheScreen();
  });

  it('keeps cached positions visible during background refetch', () => {
    mockPositionsResult.isLoadingOpen = true;
    renderWithProvider(<TraderProfileView />);
    expect(screen.getByText('STARKBOT')).toBeOnTheScreen();
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.SORT_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders closed position skeletons when closed tab is loading', () => {
    mockPositionsResult.closedPositions = [];
    mockPositionsResult.isLoadingClosed = true;
    renderWithProvider(<TraderProfileView />);
    fireEvent.press(
      screen.getByTestId(TraderProfileViewSelectorsIDs.TAB_CLOSED),
    );
    expect(screen.queryByText('No positions yet')).not.toBeOnTheScreen();
  });

  describe('pull-to-refresh', () => {
    it('calls both profile refresh and positions refetch when pulled', async () => {
      renderWithProvider(<TraderProfileView />);

      const refreshControl = screen.UNSAFE_getByProps({
        testID: TraderProfileViewSelectorsIDs.REFRESH_CONTROL,
      });

      await act(async () => {
        await refreshControl.props.onRefresh();
      });

      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(mockRefetchPositions).toHaveBeenCalledTimes(1);
      expect(mockPlayImpact).toHaveBeenCalledTimes(1);
      expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.PullToRefresh);
    });
  });

  describe('notification bell routing', () => {
    it('does nothing while notification preferences are still loading', () => {
      mockIsLoadingPreferences = true;
      renderWithProvider(<TraderProfileView />);

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.NOTIFICATION_BUTTON),
      );

      expect(
        screen.queryByTestId(
          'top-traders-notifications-setup-bottom-sheet-container',
        ),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('trader-notifications-bottom-sheet-container'),
      ).not.toBeOnTheScreen();
    });

    it('navigates to notification settings when preferences do not exist yet', () => {
      mockHasNotificationPreferences.mockReturnValue(false);

      renderWithProvider(<TraderProfileView />);

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.NOTIFICATION_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
        screen: Routes.SETTINGS.NOTIFICATIONS,
      });
    });

    it('opens the setup sheet when push notifications are off', () => {
      mockNotificationPreferences = {
        ...DEFAULT_SOCIAL_AI_PREFERENCES,
        pushNotificationsEnabled: false,
        mutedTraderProfileIds: [
          ...DEFAULT_SOCIAL_AI_PREFERENCES.mutedTraderProfileIds,
        ],
      };

      renderWithProvider(<TraderProfileView />);

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.NOTIFICATION_BUTTON),
      );

      expect(
        screen.getByTestId(
          'top-traders-notifications-setup-bottom-sheet-container',
        ),
      ).toBeOnTheScreen();
    });

    it('opens the per-trader sheet when push notifications are on', () => {
      mockNotificationPreferences = {
        ...DEFAULT_SOCIAL_AI_PREFERENCES,
        pushNotificationsEnabled: true,
        mutedTraderProfileIds: [
          ...DEFAULT_SOCIAL_AI_PREFERENCES.mutedTraderProfileIds,
        ],
      };

      renderWithProvider(<TraderProfileView />);

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.NOTIFICATION_BUTTON),
      );

      expect(
        screen.getByTestId('trader-notifications-bottom-sheet-container'),
      ).toBeOnTheScreen();
    });
  });

  it('keeps cached profile visible during background refetch', () => {
    mockProfileResult.isLoading = true;
    renderWithProvider(<TraderProfileView />);
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.HEADER),
    ).toBeOnTheScreen();
    expect(screen.getByText('Follow')).toBeOnTheScreen();
  });

  it('title section onLayout sets header height for scroll animation', () => {
    renderWithProvider(<TraderProfileView />);

    const titleSectionWrapper = screen.getByTestId(
      TraderProfileViewSelectorsIDs.TITLE_SECTION_WRAPPER,
    );
    fireEvent(titleSectionWrapper, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 80 } },
    });

    expect(titleSectionWrapper).toBeOnTheScreen();
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.HEADER),
    ).toBeOnTheScreen();
  });

  it('does not render profile header when profile is null and not loading', () => {
    mockProfileResult.profile = null;
    renderWithProvider(<TraderProfileView />);
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.HEADER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(TraderProfileViewSelectorsIDs.PROFILE_HEADER),
    ).not.toBeOnTheScreen();
  });

  describe('error state', () => {
    beforeEach(() => {
      mockProfileResult.profile = null;
      mockProfileResult.isLoading = false;
      mockProfileResult.error = 'Network request failed';
    });

    it('shows the error banner instead of skeleton when profile fetch fails', () => {
      renderWithProvider(<TraderProfileView />);
      expect(
        screen.getByTestId(TraderProfileViewSelectorsIDs.ERROR_BANNER),
      ).toBeOnTheScreen();
    });

    it('displays the error message text', () => {
      renderWithProvider(<TraderProfileView />);
      expect(screen.getByText("Couldn't load profile")).toBeOnTheScreen();
    });

    it('displays the retry button', () => {
      renderWithProvider(<TraderProfileView />);
      expect(screen.getByText('Retry')).toBeOnTheScreen();
    });

    it('calls refresh when the retry button is pressed', () => {
      renderWithProvider(<TraderProfileView />);
      fireEvent.press(screen.getByText('Retry'));
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('does not show skeleton when error is present', () => {
      renderWithProvider(<TraderProfileView />);
      expect(
        screen.getByTestId(TraderProfileViewSelectorsIDs.HEADER),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(TraderProfileViewSelectorsIDs.PROFILE_HEADER),
      ).not.toBeOnTheScreen();
      expect(screen.queryByText('Follow')).not.toBeOnTheScreen();
    });

    it('does not show error banner while still loading', () => {
      mockProfileResult.isLoading = true;
      renderWithProvider(<TraderProfileView />);
      expect(
        screen.queryByTestId(TraderProfileViewSelectorsIDs.ERROR_BANNER),
      ).not.toBeOnTheScreen();
    });

    it('does not show error banner when profile loaded successfully', () => {
      mockProfileResult.profile = fixtureProfile;
      mockProfileResult.error = 'stale error';
      renderWithProvider(<TraderProfileView />);
      expect(
        screen.queryByTestId(TraderProfileViewSelectorsIDs.ERROR_BANNER),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(TraderProfileViewSelectorsIDs.PROFILE_HEADER),
      ).toBeOnTheScreen();
    });
  });

  describe('source param fallback', () => {
    it('defaults source to deep_link when source param is absent', () => {
      mockRouteParams = {
        traderId: 'trader-1',
        traderName: 'trader1',
        traderAddress: '0xabc',
        traderRank: 1,
      };
      renderWithProvider(<TraderProfileView />);
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_TRADER_PROFILE_SCREEN_VIEWED,
        expect.objectContaining({ source: 'deep_link' }),
      );
    });
  });

  describe('traderAddress fallback', () => {
    it('falls back to profile address when traderAddress route param is absent', () => {
      mockRouteParams = {
        traderId: 'trader-1',
        traderName: 'trader1',
        source: 'leaderboard',
        traderRank: 1,
      };
      renderWithProvider(<TraderProfileView />);
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_TRADER_PROFILE_SCREEN_VIEWED,
        expect.objectContaining({ trader_address: '0xabc' }),
      );
    });

    it('does not track tab change when traderAddress is absent and profile has no address', () => {
      mockRouteParams = { traderId: 'trader-1', traderName: 'trader1' };
      mockProfileResult = {
        ...mockProfileResult,
        profile: {
          ...fixtureProfile,
          profile: { ...fixtureProfile.profile, address: '' },
        },
      };
      renderWithProvider(<TraderProfileView />);

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.TAB_CLOSED),
      );

      expect(mockTrack).not.toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_TRADER_PROFILE_TAB_CHANGED,
        expect.anything(),
      );
    });
  });

  describe('analytics', () => {
    it('fires Trader Profile Screen Viewed once profile resolves with route source/rank', () => {
      renderWithProvider(<TraderProfileView />);
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_TRADER_PROFILE_SCREEN_VIEWED,
        expect.objectContaining({
          trader_address: '0xabc',
          trader_username: 'trader1',
          source: 'leaderboard',
          is_following: false,
          trader_rank: 1,
        }),
      );
    });

    it('forwards an analyticsContext when the follow button is pressed', () => {
      renderWithProvider(<TraderProfileView />);
      fireEvent.press(screen.getByTestId('trader-profile-follow-button'));
      expect(mockToggleFollow).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'trader_profile',
          traderAddress: '0xabc',
          traderUsername: 'trader1',
        }),
      );
    });
  });

  describe('sort button', () => {
    it('renders with default Value label on the Open tab', () => {
      renderWithProvider(<TraderProfileView />);

      expect(
        screen.getByTestId(TraderProfileViewSelectorsIDs.SORT_BUTTON),
      ).toBeOnTheScreen();
      expect(screen.getByText('Value')).toBeOnTheScreen();
    });

    it('cycles Open tab sort Value -> P&L % -> Value on consecutive taps', () => {
      renderWithProvider(<TraderProfileView />);

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.SORT_BUTTON),
      );
      expect(screen.getByText('P&L %')).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.SORT_BUTTON),
      );
      expect(screen.getByText('Value')).toBeOnTheScreen();
    });

    it('defaults Closed tab sort to Recent and cycles Recent -> Value -> P&L % -> Recent', () => {
      mockPositionsResult.closedPositions = fixtureClosedPositions;
      renderWithProvider(<TraderProfileView />);
      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.TAB_CLOSED),
      );

      expect(screen.getByText('Recent')).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.SORT_BUTTON),
      );
      expect(screen.getByText('Value')).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.SORT_BUTTON),
      );
      expect(screen.getByText('P&L %')).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.SORT_BUTTON),
      );
      expect(screen.getByText('Recent')).toBeOnTheScreen();
    });

    it('preserves independent sort state when switching between tabs', () => {
      mockPositionsResult.closedPositions = fixtureClosedPositions;
      renderWithProvider(<TraderProfileView />);

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.SORT_BUTTON),
      );
      expect(screen.getByText('P&L %')).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.TAB_CLOSED),
      );
      expect(screen.getByText('Recent')).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.SORT_BUTTON),
      );
      expect(screen.getByText('Value')).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.TAB_OPEN),
      );
      expect(screen.getByText('P&L %')).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.TAB_CLOSED),
      );
      expect(screen.getByText('Value')).toBeOnTheScreen();
    });

    it('triggers a haptic on each sort tap', () => {
      renderWithProvider(<TraderProfileView />);

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.SORT_BUTTON),
      );
      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.SORT_BUTTON),
      );

      expect(mockPlaySelection).toHaveBeenCalledTimes(2);
    });

    it('hides the sort button when positions list is empty', () => {
      mockPositionsResult.openPositions = [];
      renderWithProvider(<TraderProfileView />);

      expect(
        screen.queryByTestId(TraderProfileViewSelectorsIDs.SORT_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('hides the sort button when positions are loading with no cached data', () => {
      mockPositionsResult.openPositions = [];
      mockPositionsResult.isLoadingOpen = true;
      renderWithProvider(<TraderProfileView />);

      expect(
        screen.queryByTestId(TraderProfileViewSelectorsIDs.SORT_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  describe('headline PnL (7d sum across all chains incl. hyperliquid)', () => {
    it('sums perChainPnl7d across every chain, including hyperliquid', () => {
      mockProfileResult.profile = {
        ...fixtureProfile,
        stats: { ...fixtureProfile.stats, pnl7d: 999999 },
        perChainBreakdown: {
          perChainPnl: {},
          perChainRoi: {},
          perChainVolume: {},
          perChainPnl7d: {
            base: 50_000,
            solana: 30_000,
            ethereum: 20_000,
            hyperliquid: 900_000,
          },
        },
      };

      renderWithProvider(<TraderProfileView />);

      // Sum is 1,000,000 — hyperliquid is included; rendered with the full
      // no-decimals formatter: 1,000,000 → +$1,000,000
      expect(
        within(
          screen.getByTestId(TraderProfileViewSelectorsIDs.STATS_ROW),
        ).getByText('+$1,000,000'),
      ).toBeOnTheScreen();
      // And the trader's global pnl7d (999,999) is NOT what we display
      expect(screen.queryByText('+$999,999')).not.toBeOnTheScreen();
    });

    it('shows the Hyperliquid PnL for a perps-only trader (regression: was 0)', () => {
      mockProfileResult.profile = {
        ...fixtureProfile,
        // Global pnl7d is 0 for a perps-only trader; the real PnL lives in the
        // per-chain hyperliquid breakdown.
        stats: { ...fixtureProfile.stats, pnl7d: 0 },
        perChainBreakdown: {
          perChainPnl: {},
          perChainRoi: {},
          perChainVolume: {},
          perChainPnl7d: { hyperliquid: 1_474_000 },
        },
      };

      renderWithProvider(<TraderProfileView />);

      // 1,474,000 rendered with the full no-decimals formatter → +$1,474,000
      expect(
        within(
          screen.getByTestId(TraderProfileViewSelectorsIDs.STATS_ROW),
        ).getByText('+$1,474,000'),
      ).toBeOnTheScreen();
      expect(screen.queryByText('$0')).not.toBeOnTheScreen();
    });

    it('sums negative per-chain values (incl. hyperliquid) into a negative total', () => {
      mockProfileResult.profile = {
        ...fixtureProfile,
        stats: { ...fixtureProfile.stats, pnl7d: 12_345 },
        perChainBreakdown: {
          perChainPnl: {},
          perChainRoi: {},
          perChainVolume: {},
          perChainPnl7d: {
            base: -1_000,
            solana: -2_500,
            ethereum: 500,
            hyperliquid: -50_000,
          },
        },
      };

      renderWithProvider(<TraderProfileView />);

      // -1000 + -2500 + 500 + -50000 = -53000 (hyperliquid included);
      // rendered with the full no-decimals formatter: -53,000 → -$53,000
      expect(
        within(
          screen.getByTestId(TraderProfileViewSelectorsIDs.STATS_ROW),
        ).getByText('-$53,000'),
      ).toBeOnTheScreen();
    });

    it('treats a missing chain entry as 0', () => {
      mockProfileResult.profile = {
        ...fixtureProfile,
        stats: { ...fixtureProfile.stats, pnl7d: 999 },
        perChainBreakdown: {
          perChainPnl: {},
          perChainRoi: {},
          perChainVolume: {},
          perChainPnl7d: { base: 7_500 }, // solana, ethereum, hyperliquid absent
        },
      };

      renderWithProvider(<TraderProfileView />);

      expect(
        within(
          screen.getByTestId(TraderProfileViewSelectorsIDs.STATS_ROW),
        ).getByText('+$7,500'),
      ).toBeOnTheScreen();
    });

    it('falls back to the global stats.pnl7d when perChainPnl7d is empty', () => {
      mockProfileResult.profile = {
        ...fixtureProfile,
        stats: { ...fixtureProfile.stats, pnl7d: 20_610 },
        perChainBreakdown: {
          perChainPnl: {},
          perChainRoi: {},
          perChainVolume: {},
          perChainPnl7d: {},
        },
      };

      renderWithProvider(<TraderProfileView />);

      expect(
        within(
          screen.getByTestId(TraderProfileViewSelectorsIDs.STATS_ROW),
        ).getByText('+$20,610'),
      ).toBeOnTheScreen();
    });
  });
});
