import { DEFAULT_SOCIAL_AI_PREFERENCES } from '@metamask/notification-services-controller/notification-services';
import type {
  Position,
  TraderProfileResponse,
} from '@metamask/social-controllers';
import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import Routes from '../../../../constants/navigation/Routes';
import { ImpactMoment } from '../../../../util/haptics';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { SocialAIPreference } from '../NotificationPreferences/hooks';
import type { UseTraderPositionsResult } from './hooks/useTraderPositions';
import type { UseTraderProfileResult } from './hooks/useTraderProfile';
import TraderProfileView from './TraderProfileView';
import { TraderProfileViewSelectorsIDs } from './TraderProfileView.testIds';

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
}));

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
    isLoading: false,
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

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
    useRoute: () => ({
      params: { traderId: 'trader-1', traderName: 'dutchiono' },
    }),
  };
});

const fixtureProfile: TraderProfileResponse = {
  profile: {
    profileId: 'trader-1',
    address: '0xabc',
    allAddresses: ['0xabc'],
    name: 'dutchiono',
    imageUrl: 'https://example.com/avatar.png',
  },
  stats: {
    pnl30d: 20610,
    winRate30d: 0.92,
    roiPercent30d: 1.5,
    tradeCount30d: 48,
  },
  perChainBreakdown: {
    perChainPnl: {},
    perChainRoi: {},
    perChainVolume: {},
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
    mockIsTraderNotificationEnabled.mockReturnValue(true);
  });

  it('renders the container', () => {
    renderWithProvider(<TraderProfileView />);
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('displays the trader name', () => {
    renderWithProvider(<TraderProfileView />);
    expect(screen.getAllByText('dutchiono')[0]).toBeOnTheScreen();
  });

  it('calls goBack when the back button is pressed', () => {
    renderWithProvider(<TraderProfileView />);
    fireEvent.press(
      screen.getByTestId(TraderProfileViewSelectorsIDs.BACK_BUTTON),
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders follower count', () => {
    renderWithProvider(<TraderProfileView />);
    expect(screen.getByText('45 followers')).toBeOnTheScreen();
  });

  it('renders the win rate stat', () => {
    renderWithProvider(<TraderProfileView />);
    expect(screen.getByText('92%')).toBeOnTheScreen();
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
        traderName: 'dutchiono',
        traderImageUrl: 'https://example.com/avatar.png',
        tokenSymbol: fixtureOpenPositions[0].tokenSymbol,
        position: fixtureOpenPositions[0],
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
    expect(screen.queryByText('45 followers')).not.toBeOnTheScreen();
  });

  it('renders position skeletons when positions are loading', () => {
    mockPositionsResult.isLoadingOpen = true;
    renderWithProvider(<TraderProfileView />);
    expect(screen.queryByText('STARKBOT')).not.toBeOnTheScreen();
  });

  it('renders closed position skeletons when closed tab is loading', () => {
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

  it('renders skeleton when profile is null even if not loading', () => {
    mockProfileResult.profile = null;
    renderWithProvider(<TraderProfileView />);
    expect(screen.queryByText('45 followers')).not.toBeOnTheScreen();
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
      expect(screen.queryByText('45 followers')).not.toBeOnTheScreen();
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
      expect(screen.getByText('45 followers')).toBeOnTheScreen();
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

    it('hides the sort button while positions are loading', () => {
      mockPositionsResult.isLoadingOpen = true;
      renderWithProvider(<TraderProfileView />);

      expect(
        screen.queryByTestId(TraderProfileViewSelectorsIDs.SORT_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });
});
