import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { FlatList } from 'react-native';
import Logger from '../../../../util/Logger';
import Routes from '../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../util/test/renderWithProvider';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { UseTopTradersResult } from '../../Homepage/Sections/TopTraders/hooks/useTopTraders';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
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
  // Real React Navigation returns a stable `navigation` reference across
  // renders. Mirror that here (lazily, to respect const TDZ at mock-init time)
  // so hooks depending on `navigation` stay referentially stable.
  let navigation: { goBack: jest.Mock; navigate: jest.Mock } | undefined;
  return {
    ...actual,
    useNavigation: () => {
      if (!navigation) {
        navigation = { goBack: mockGoBack, navigate: mockNavigate };
      }
      return navigation;
    },
    useRoute: () => ({ params: {} }),
  };
});

const fixtureTraders: TopTrader[] = [
  {
    id: 'trader-1',
    address: '0x0000000000000000000000000000000000000001',
    rank: 1,
    overallRank: 1,
    username: 'alpha.eth',
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
    username: 'beta.eth',
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
    username: 'gamma.eth',
    avatarUri: 'https://example.com/avatar3.png',
    percentageChange: 617,
    pnlValue: 374735.16,
    pnlPerChain: { solana: 374735.16 },
    isFollowing: false,
  },
];

type TabKey = 'all' | 'tokens' | 'perps';

const buildResult = (
  overrides: Partial<UseTopTradersResult> = {},
): UseTopTradersResult => ({
  traders: fixtureTraders,
  isLoading: false,
  isFetching: false,
  error: null,
  refresh: mockRefresh as () => Promise<void>,
  toggleFollow: mockToggleFollow,
  ...overrides,
});

const mockResultsByTab: Record<TabKey, UseTopTradersResult> = {
  all: buildResult(),
  tokens: buildResult(),
  perps: buildResult(),
};

const setTabResult = (tab: TabKey, overrides: Partial<UseTopTradersResult>) => {
  mockResultsByTab[tab] = buildResult(overrides);
};

const resetTabResults = () => {
  (Object.keys(mockResultsByTab) as TabKey[]).forEach((key) => {
    mockResultsByTab[key] = buildResult();
  });
};

const resolveTabKey = (chains?: string[]): TabKey => {
  if (!chains) return 'all';
  if (chains.length === 1 && chains[0] === 'hyperliquid') return 'perps';
  return chains.includes('hyperliquid') ? 'all' : 'tokens';
};

const mockUseTopTradersHook = jest.fn(
  (options?: { chains?: string[] }): UseTopTradersResult =>
    mockResultsByTab[resolveTabKey(options?.chains)],
);

const mockSelectSocialLeaderboardEnabled = jest.fn((): boolean => true);
jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: () => mockSelectSocialLeaderboardEnabled(),
  }),
);

jest.mock('../../Homepage/Sections/TopTraders/hooks', () => ({
  useTopTraders: (options?: { chains?: string[] }) =>
    mockUseTopTradersHook(options),
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
    resetTabResults();
    mockUseTopTradersHook.mockImplementation(
      (options?: { chains?: string[] }) =>
        mockResultsByTab[resolveTabKey(options?.chains)],
    );
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
    expect(screen.getByText('Weekly Top Traders')).toBeOnTheScreen();
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

  it('renders a podium medal for the top trader', () => {
    renderWithProvider(<TopTradersView />);
    expect(screen.getByTestId('rank-medal-1')).toBeOnTheScreen();
  });

  it('renders the full PnL for the first trader', () => {
    renderWithProvider(<TopTradersView />);
    expect(screen.getByText('+$963,146.80')).toBeOnTheScreen();
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

  it('invalidates every tab query when the scroll view is pulled down', async () => {
    mockRefresh.mockResolvedValue(undefined);
    renderWithProvider(<TopTradersView />);
    const list = screen.getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST);

    await act(async () => {
      await list.props.refreshControl.props.onRefresh();
    });

    expect(mockRefresh).toHaveBeenCalledTimes(3);
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

  it('renders the three asset-class filter pills', () => {
    renderWithProvider(<TopTradersView />);
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_ALL),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_TOKENS),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_PERPS),
    ).toBeOnTheScreen();
  });

  it('fires a separate query per tab on mount (parallel prefetch)', () => {
    renderWithProvider(<TopTradersView />);

    const chainsArgs = mockUseTopTradersHook.mock.calls.map(
      ([opts]) => opts?.chains,
    );
    expect(chainsArgs).toEqual(
      expect.arrayContaining([
        ['base', 'solana', 'ethereum', 'hyperliquid'],
        ['base', 'solana', 'ethereum'],
        ['hyperliquid'],
      ]),
    );
  });

  it('renders the Tokens tab’s traders when the Tokens pill is tapped', () => {
    setTabResult('tokens', {
      traders: [
        { ...fixtureTraders[0], rank: 1 },
        { ...fixtureTraders[2], rank: 2 },
      ],
    });
    renderWithProvider(<TopTradersView />);

    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_TOKENS),
    );

    expect(screen.getByText('alpha.eth')).toBeOnTheScreen();
    expect(screen.getByText('gamma.eth')).toBeOnTheScreen();
    expect(screen.queryByText('beta.eth')).not.toBeOnTheScreen();
  });

  it('shows the Perps tab’s (hyperliquid) traders when selected', () => {
    setTabResult('perps', {
      traders: [{ ...fixtureTraders[2], rank: 1 }],
    });
    renderWithProvider(<TopTradersView />);

    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_PERPS),
    );

    expect(screen.getByText('gamma.eth')).toBeOnTheScreen();
    expect(screen.queryByText('beta.eth')).not.toBeOnTheScreen();
  });

  it('uses the per-tab rank when navigating to a profile', () => {
    setTabResult('tokens', {
      traders: [{ ...fixtureTraders[0], rank: 2 }],
    });
    renderWithProvider(<TopTradersView />);

    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_TOKENS),
    );
    fireEvent.press(screen.getByText('alpha.eth'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'TraderProfileView',
      expect.objectContaining({
        traderId: 'trader-1',
        traderRank: 2,
      }),
    );
  });

  it('renders skeletons during initial load when no traders are cached', () => {
    setTabResult('all', { isLoading: true, traders: [] });
    renderWithProvider(<TopTradersView />);
    expect(
      screen.queryByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_ALL),
    ).toBeOnTheScreen();
    expect(screen.queryByText('alpha.eth')).not.toBeOnTheScreen();
  });

  describe('performance', () => {
    it('keeps a stable renderItem reference across a parent re-render with unchanged trader props', async () => {
      // An inline `renderItem` closure would be re-created on every render,
      // defeating the `React.memo` on `TraderRow`. The memoized `renderTraderRow`
      // must keep a stable identity when nothing it depends on changes.
      //
      // Pull-to-refresh sets `refreshing` to true, forcing a parent re-render
      // while the trader data (and every renderItem dependency) stays unchanged.
      // Fake timers hold the view in that refreshing state so the re-render's
      // renderItem can be compared against the initial one.
      jest.useFakeTimers();
      mockRefresh.mockResolvedValue(undefined);
      const { UNSAFE_getByType } = renderWithProvider(<TopTradersView />);

      const renderItemBefore = UNSAFE_getByType(FlatList).props.renderItem;

      let refreshPromise: Promise<void> | undefined;
      act(() => {
        refreshPromise = screen
          .getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST)
          .props.refreshControl.props.onRefresh();
      });

      const renderItemDuringRefresh =
        UNSAFE_getByType(FlatList).props.renderItem;

      expect(typeof renderItemBefore).toBe('function');
      expect(renderItemDuringRefresh).toBe(renderItemBefore);

      // Drain the artificial min-duration timer and let refresh settle so no
      // state update leaks outside `act`.
      await act(async () => {
        jest.runOnlyPendingTimers();
        await refreshPromise;
      });
      jest.useRealTimers();
    });
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
        screen.getByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_TOKENS),
      );
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_CHAIN_FILTER_CHANGED,
        expect.objectContaining({
          chain_filter: 'tokens',
          previous_chain_filter: 'all',
        }),
      );
    });

    it('fires Trader Leaderboard Trader Clicked with rank and chain filter on row press', () => {
      renderWithProvider(<TopTradersView />);
      fireEvent.press(screen.getByText('alpha.eth'));
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
