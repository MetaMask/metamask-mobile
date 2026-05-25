import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import Logger from '../../../../util/Logger';
import Routes from '../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { UseTopTradersResult } from '../../Homepage/Sections/TopTraders/hooks/useTopTraders';
import type { TopTrader } from '../../Homepage/Sections/TopTraders/types';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import TopTradersView from './TopTradersView';
import { TopTradersViewSelectorsIDs } from './TopTradersView.testIds';

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockToggleFollow = jest.fn();
const mockRefresh = jest.fn();
const mockHasNotificationPreferences = jest.fn(() => true);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
    useRoute: () => ({ params: {} }),
  };
});

const fixtureTraders: TopTrader[] = [
  {
    id: 'trader-1',
    address: '0x0000000000000000000000000000000000000001',
    rank: 1,
    overallRank: 1,
    username: 'sniperliquid.hl',
    avatarUri: 'https://example.com/avatar1.png',
    percentageChange: 43,
    pnlValue: 963146.8,
    pnlPerChain: { base: 500000, ethereum: 463146.8 },
    isFollowing: false,
  },
  {
    id: 'trader-2',
    address: '0x0000000000000000000000000000000000000002',
    rank: 2,
    overallRank: 2,
    username: 'nervousdegen',
    avatarUri: 'https://example.com/avatar2.png',
    percentageChange: 359,
    pnlValue: 474751.45,
    pnlPerChain: { base: 474751.45 },
    isFollowing: false,
  },
  {
    id: 'trader-3',
    address: '0x0000000000000000000000000000000000000003',
    rank: 3,
    overallRank: 3,
    username: 'baznocap',
    avatarUri: 'https://example.com/avatar3.png',
    percentageChange: 617,
    pnlValue: 374735.16,
    pnlPerChain: { solana: 374735.16 },
    isFollowing: false,
  },
];

const defaultUseTopTradersResult: UseTopTradersResult = {
  traders: fixtureTraders,
  isLoading: false,
  isFetching: false,
  error: null,
  refresh: mockRefresh as () => Promise<void>,
  toggleFollow: mockToggleFollow,
};

const mockUseTopTradersHook = jest.fn(() => defaultUseTopTradersResult);

const mockSelectSocialLeaderboardEnabled = jest.fn((): boolean => true);
jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: () => mockSelectSocialLeaderboardEnabled(),
  }),
);

jest.mock('../../Homepage/Sections/TopTraders/hooks', () => ({
  useTopTraders: () => mockUseTopTradersHook(),
}));

jest.mock(
  '../../Settings/NotificationsSettings/hooks/useNotificationStoragePreferences',
  () => ({
    useNotificationStoragePreferences: () => ({
      hasNotificationPreferences: mockHasNotificationPreferences(),
      isLoading: false,
    }),
  }),
);

const mockTrack = jest.fn();
jest.mock('../analytics', () => {
  const actual = jest.requireActual('../analytics');
  return {
    ...actual,
    useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
  };
});

describe('TopTradersView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTopTradersHook.mockImplementation(() => defaultUseTopTradersResult);
    mockSelectSocialLeaderboardEnabled.mockReturnValue(true);
    mockHasNotificationPreferences.mockReturnValue(true);
  });

  it('renders the container', () => {
    renderWithProvider(<TopTradersView />);
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the Top Traders title', () => {
    renderWithProvider(<TopTradersView />);
    expect(screen.getByText('Top Traders')).toBeOnTheScreen();
  });

  it('calls goBack when the back button is pressed', () => {
    renderWithProvider(<TopTradersView />);
    fireEvent.press(screen.getByTestId(TopTradersViewSelectorsIDs.BACK_BUTTON));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders the notification button', () => {
    renderWithProvider(<TopTradersView />);
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.NOTIFICATION_BUTTON),
    ).toBeOnTheScreen();
  });

  it('navigates to the socialAI notification settings section when notification button is pressed and preferences exist', () => {
    renderWithProvider(<TopTradersView />);
    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.NOTIFICATION_BUTTON),
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION,
      params: {
        type: 'socialAI',
        title: 'Trading Signals',
        description:
          'Updates from traders and assets you follow, plus currated market news',
      },
    });
  });

  it('navigates to notification settings when preferences do not exist yet', () => {
    mockHasNotificationPreferences.mockReturnValue(false);

    renderWithProvider(<TopTradersView />);
    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.NOTIFICATION_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATIONS,
    });
  });

  it('renders all traders', () => {
    renderWithProvider(<TopTradersView />);
    fixtureTraders.forEach((trader) => {
      expect(screen.getByText(trader.username)).toBeOnTheScreen();
    });
  });

  it('renders the rank for the top trader', () => {
    renderWithProvider(<TopTradersView />);
    expect(screen.getByText('1')).toBeOnTheScreen();
  });

  it('renders the ROI for the first trader', () => {
    renderWithProvider(<TopTradersView />);
    expect(screen.getByText('+43.0%')).toBeOnTheScreen();
  });

  it('calls toggleFollow with analytics context when Follow button is pressed', () => {
    renderWithProvider(<TopTradersView />);
    const followButtons = screen.getAllByText('Follow');
    fireEvent.press(followButtons[0]);
    expect(mockToggleFollow).toHaveBeenCalledWith(
      fixtureTraders[0].id,
      expect.objectContaining({
        source: 'leaderboard',
        traderAddress: fixtureTraders[0].address,
        traderUsername: fixtureTraders[0].username,
        traderRank: 1,
      }),
    );
  });

  it('renders a RefreshControl with the correct props on the trader list', () => {
    renderWithProvider(<TopTradersView />);

    const list = screen.getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST);
    const { refreshControl } = list.props;

    expect(typeof refreshControl.props.onRefresh).toBe('function');
    expect(typeof refreshControl.props.refreshing).toBe('boolean');
  });

  it('calls refresh when the scroll view is pulled down', async () => {
    mockRefresh.mockResolvedValue(undefined);
    renderWithProvider(<TopTradersView />);
    const list = screen.getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST);

    await act(async () => {
      await list.props.refreshControl.props.onRefresh();
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('logs an error when refresh fails', async () => {
    const refreshError = new Error('fetch failed');
    mockRefresh.mockRejectedValue(refreshError);
    renderWithProvider(<TopTradersView />);
    const list = screen.getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST);

    await act(async () => {
      await list.props.refreshControl.props.onRefresh();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      refreshError,
      expect.objectContaining({
        tags: expect.objectContaining({
          feature: 'social',
          surface: 'top_traders',
          operation: 'pull_to_refresh',
        }),
        extras: expect.objectContaining({
          message: 'Top traders pull-to-refresh failed at TopTradersView',
        }),
      }),
    );
  });

  it('navigates back when the feature flag is disabled', () => {
    mockSelectSocialLeaderboardEnabled.mockReturnValue(false);
    renderWithProvider(<TopTradersView />);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders all four chain filter pills', () => {
    renderWithProvider(<TopTradersView />);
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_ALL),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_BASE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_SOLANA),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_ETHEREUM),
    ).toBeOnTheScreen();
  });

  it('filters traders when a chain pill is tapped', () => {
    renderWithProvider(<TopTradersView />);
    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_BASE),
    );
    expect(screen.getByText('sniperliquid.hl')).toBeOnTheScreen();
    expect(screen.getByText('nervousdegen')).toBeOnTheScreen();
    expect(screen.queryByText('baznocap')).not.toBeOnTheScreen();
  });

  it('shows all traders when All filter is tapped after filtering', () => {
    renderWithProvider(<TopTradersView />);
    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_SOLANA),
    );
    expect(screen.queryByText('sniperliquid.hl')).not.toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_ALL),
    );
    expect(screen.getByText('sniperliquid.hl')).toBeOnTheScreen();
    expect(screen.getByText('baznocap')).toBeOnTheScreen();
  });

  it('re-ranks traders within filtered results', () => {
    renderWithProvider(<TopTradersView />);
    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_SOLANA),
    );
    expect(screen.getByText('1')).toBeOnTheScreen();
    expect(screen.queryByText('3')).not.toBeOnTheScreen();
  });

  it('preserves the upstream overallRank when navigating to a profile (does not re-derive it from the displayed rank)', () => {
    mockUseTopTradersHook.mockReturnValueOnce({
      ...defaultUseTopTradersResult,
      traders: [
        {
          ...fixtureTraders[0],
          rank: 1,
          overallRank: 50,
        },
      ],
    });
    renderWithProvider(<TopTradersView />);

    fireEvent.press(screen.getByText('sniperliquid.hl'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'TraderProfileView',
      expect.objectContaining({
        traderId: 'trader-1',
        traderRank: 50,
      }),
    );
  });

  it('renders skeletons during initial load', () => {
    mockUseTopTradersHook.mockReturnValueOnce({
      ...defaultUseTopTradersResult,
      isLoading: true,
      traders: [],
    });
    renderWithProvider(<TopTradersView />);
    expect(
      screen.queryByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_ALL),
    ).toBeOnTheScreen();
    expect(screen.queryByText('sniperliquid.hl')).not.toBeOnTheScreen();
  });

  describe('analytics', () => {
    it('fires Trader Leaderboard Screen Viewed once on mount with the active chain filter', () => {
      renderWithProvider(<TopTradersView />);
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_SCREEN_VIEWED,
        expect.objectContaining({
          source: 'nav_tab',
          chain_filter: 'all',
        }),
      );
    });

    it('fires Trader Leaderboard Chain Filter Changed when a pill is selected', () => {
      renderWithProvider(<TopTradersView />);
      fireEvent.press(
        screen.getByTestId(TopTradersViewSelectorsIDs.CHAIN_FILTER_BASE),
      );
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_CHAIN_FILTER_CHANGED,
        expect.objectContaining({
          chain_filter: 'base',
          previous_chain_filter: 'all',
        }),
      );
    });

    it('fires Trader Leaderboard Trader Clicked with rank and chain filter on row press', () => {
      renderWithProvider(<TopTradersView />);
      fireEvent.press(screen.getByText('sniperliquid.hl'));
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_TRADER_CLICKED,
        expect.objectContaining({
          trader_address: fixtureTraders[0].address,
          trader_username: fixtureTraders[0].username,
          trader_rank: 1,
          chain_filter: 'all',
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          source: 'leaderboard',
          traderAddress: fixtureTraders[0].address,
          traderRank: 1,
        }),
      );
    });
  });
});
