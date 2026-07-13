import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { FlatList } from 'react-native';
import { DEFAULT_SOCIAL_AI_PREFERENCES } from '@metamask/notification-services-controller/notification-services';
import Logger from '../../../../util/Logger';
import Routes from '../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../util/test/renderWithProvider';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { UseTopTradersResult } from '../../Homepage/Sections/TopTraders/hooks/useTopTraders';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../Homepage/Sections/TopTraders/types';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { ImpactMoment } from '../../../../util/haptics';
import TopTradersView from './TopTradersView';
import { TopTradersViewSelectorsIDs } from './TopTradersView.testIds';

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockPlayErrorNotification = jest.fn(() => Promise.resolve());
const mockPlayImpact = jest.fn();
const mockPlaySelection = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../../util/haptics', () => ({
  ...jest.requireActual('../../../../util/haptics'),
  playErrorNotification: () => mockPlayErrorNotification(),
  playImpact: (...args: unknown[]) => mockPlayImpact(...args),
  playSelection: (...args: unknown[]) => mockPlaySelection(...args),
  fireSwitchHaptic: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockBottomSheet = ReactActual.forwardRef(
    (
      props: {
        children?: React.ReactNode;
        testID?: string;
        onClose?: () => void;
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
  return { ...actual, BottomSheet: MockBottomSheet };
});

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockToggleFollow = jest.fn();
const mockRefresh = jest.fn();
const mockHasNotificationPreferences = jest.fn(() => true);
const mockToggleTraderNotification = jest.fn();
const mockIsTraderNotificationEnabled = jest.fn((_traderId: string) => true);

let mockNotificationPreferences = {
  ...DEFAULT_SOCIAL_AI_PREFERENCES,
  mutedTraderProfileIds: [
    ...DEFAULT_SOCIAL_AI_PREFERENCES.mutedTraderProfileIds,
  ],
};

const channelsDisabledPreferences = {
  ...DEFAULT_SOCIAL_AI_PREFERENCES,
  pushNotificationsEnabled: false,
  inAppNotificationsEnabled: false,
  mutedTraderProfileIds: [
    ...DEFAULT_SOCIAL_AI_PREFERENCES.mutedTraderProfileIds,
  ],
};

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
interface UseTopTradersHookOptions {
  chains?: string[];
  enabled?: boolean;
}

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
  (options?: UseTopTradersHookOptions): UseTopTradersResult =>
    mockResultsByTab[resolveTabKey(options?.chains)],
);

const mockSelectSocialLeaderboardEnabled = jest.fn((): boolean => true);
const mockSelectSocialLeaderboardPerpsEnabled = jest.fn((): boolean => true);
jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: () => mockSelectSocialLeaderboardEnabled(),
    selectSocialLeaderboardPerpsEnabled: () =>
      mockSelectSocialLeaderboardPerpsEnabled(),
  }),
);

jest.mock('../../Homepage/Sections/TopTraders/hooks', () => ({
  useTopTraders: (options?: UseTopTradersHookOptions) =>
    mockUseTopTradersHook(options),
}));

const expectLatestQueryEnabledStates = (expected: Record<TabKey, boolean>) => {
  const latestCalls = mockUseTopTradersHook.mock.calls.slice(-3);

  expect(latestCalls).toEqual([
    [
      expect.objectContaining({
        chains: ['base', 'solana', 'ethereum', 'hyperliquid'],
        enabled: expected.all,
      }),
    ],
    [
      expect.objectContaining({
        chains: ['base', 'solana', 'ethereum'],
        enabled: expected.tokens,
      }),
    ],
    [
      expect.objectContaining({
        chains: ['hyperliquid'],
        enabled: expected.perps,
      }),
    ],
  ]);
};

jest.mock(
  '../../Settings/NotificationsSettings/hooks/useNotificationStoragePreferences',
  () => ({
    useNotificationStoragePreferences: () => ({
      hasNotificationPreferences: mockHasNotificationPreferences(),
      isLoading: false,
    }),
  }),
);

jest.mock('../NotificationPreferences/hooks', () => ({
  ...jest.requireActual('../NotificationPreferences/hooks'),
  useNotificationPreferences: () => ({
    preferences: mockNotificationPreferences,
    hasNotificationPreferences: mockHasNotificationPreferences(),
    isLoading: false,
    error: null,
    setPushNotificationsEnabled: jest.fn(),
    setInAppNotificationsEnabled: jest.fn(),
    setTxAmountLimit: jest.fn(),
    toggleTraderNotification: mockToggleTraderNotification,
    isTraderNotificationEnabled: mockIsTraderNotificationEnabled,
  }),
}));

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
      (options?: UseTopTradersHookOptions) =>
        mockResultsByTab[resolveTabKey(options?.chains)],
    );
    mockSelectSocialLeaderboardEnabled.mockReturnValue(true);
    mockSelectSocialLeaderboardPerpsEnabled.mockReturnValue(true);
    mockHasNotificationPreferences.mockReturnValue(true);
    mockNotificationPreferences = {
      ...DEFAULT_SOCIAL_AI_PREFERENCES,
      mutedTraderProfileIds: [
        ...DEFAULT_SOCIAL_AI_PREFERENCES.mutedTraderProfileIds,
      ],
    };
    mockIsTraderNotificationEnabled.mockReturnValue(true);
  });

  it('renders the container', () => {
    renderWithProvider(<TopTradersView />);
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the Top Traders title in the scrollable title section', () => {
    renderWithProvider(<TopTradersView />);

    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.TITLE),
    ).toHaveTextContent('Weekly Top Traders');
  });

  it('connects the scrollable title section to the compact header', () => {
    renderWithProvider(<TopTradersView />);

    act(() => {
      fireEvent(
        screen.getByTestId(TopTradersViewSelectorsIDs.TITLE_SECTION_WRAPPER),
        'layout',
        {
          nativeEvent: { layout: { height: 64 } },
        },
      );
    });

    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.HEADER_TITLE),
    ).toHaveTextContent('Weekly Top Traders');
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST).props.onScroll,
    ).toEqual(expect.any(Function));
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST).props
        .scrollEventThrottle,
    ).toBe(16);
  });

  it('renders a pinned filter bar without duplicate filter test IDs', () => {
    renderWithProvider(<TopTradersView />);

    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.PINNED_FILTER_BAR, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getAllByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_ALL),
    ).toHaveLength(1);
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
        categoryId: 'socialAI',
        ausKeys: ['socialAI'],
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

  it('refreshes only the All query before secondary tabs are visited', async () => {
    mockRefresh.mockResolvedValue(undefined);
    renderWithProvider(<TopTradersView />);
    const list = screen.getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST);

    await act(async () => {
      await list.props.refreshControl.props.onRefresh();
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes visited tab queries when the scroll view is pulled down', async () => {
    mockRefresh.mockResolvedValue(undefined);
    renderWithProvider(<TopTradersView />);
    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_TOKENS),
    );
    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_PERPS),
    );
    const list = screen.getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST);

    await act(async () => {
      await list.props.refreshControl.props.onRefresh();
    });

    expect(mockRefresh).toHaveBeenCalledTimes(3);
  });

  it('invalidates only the spot-backed all query when perps are disabled', async () => {
    mockSelectSocialLeaderboardPerpsEnabled.mockReturnValue(false);
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

  it('renders only the All filter pill when perps are disabled', () => {
    mockSelectSocialLeaderboardPerpsEnabled.mockReturnValue(false);
    renderWithProvider(<TopTradersView />);

    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_ALL),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_TOKENS),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_PERPS),
    ).not.toBeOnTheScreen();
  });

  it('enables only the All query on mount', () => {
    renderWithProvider(<TopTradersView />);

    expectLatestQueryEnabledStates({
      all: true,
      tokens: false,
      perps: false,
    });
  });

  it('enables the Tokens query after the Tokens pill is tapped', () => {
    renderWithProvider(<TopTradersView />);

    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_TOKENS),
    );

    expectLatestQueryEnabledStates({
      all: true,
      tokens: true,
      perps: false,
    });
  });

  it('enables the Perps query after the Perps pill is tapped', () => {
    renderWithProvider(<TopTradersView />);

    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_PERPS),
    );

    expectLatestQueryEnabledStates({
      all: true,
      tokens: false,
      perps: true,
    });
  });

  it('uses the spot-only chains for the All tab when perps are disabled', () => {
    mockSelectSocialLeaderboardPerpsEnabled.mockReturnValue(false);
    renderWithProvider(<TopTradersView />);

    expect(mockUseTopTradersHook).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        chains: ['base', 'solana', 'ethereum'],
        enabled: true,
      }),
    );
    expect(mockUseTopTradersHook).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        chains: ['base', 'solana', 'ethereum'],
        enabled: false,
      }),
    );
    expect(mockUseTopTradersHook).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        chains: ['hyperliquid'],
        enabled: false,
      }),
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
    it('limits the initial trader row render batch during screen mount', () => {
      const { UNSAFE_getByType } = renderWithProvider(<TopTradersView />);

      const listProps = UNSAFE_getByType(FlatList).props;

      expect(listProps.initialNumToRender).toBe(6);
      expect(listProps.maxToRenderPerBatch).toBe(6);
    });

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

  describe('trading signals setup intercept', () => {
    const followedTraders = fixtureTraders.map((trader) => ({
      ...trader,
      isFollowing: true,
    }));

    const runDeferredSetupAction = async () => {
      const setupCall = mockNavigate.mock.calls.find(
        ([route]) => route === Routes.SOCIAL_LEADERBOARD.TRADING_SIGNALS_SETUP,
      );
      const onSetupComplete = setupCall?.[1]?.onSetupComplete;
      await act(async () => {
        onSetupComplete?.();
      });
    };

    it('intercepts the follow without calling toggleFollow when both channels are off', async () => {
      mockNotificationPreferences = channelsDisabledPreferences;

      renderWithProvider(<TopTradersView />);

      await act(async () => {
        fireEvent.press(screen.getAllByText('Follow')[0]);
      });

      expect(mockToggleFollow).not.toHaveBeenCalled();
      expect(mockPlayErrorNotification).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_LEADERBOARD.TRADING_SIGNALS_SETUP,
        expect.objectContaining({ onSetupComplete: expect.any(Function) }),
      );
    });

    it('performs the follow when the deferred setup action runs', async () => {
      mockNotificationPreferences = channelsDisabledPreferences;

      renderWithProvider(<TopTradersView />);

      await act(async () => {
        fireEvent.press(screen.getAllByText('Follow')[0]);
      });

      await runDeferredSetupAction();

      expect(mockToggleFollow).toHaveBeenCalledTimes(1);
    });

    it('keeps the trader unmuted when the bell intercept fires for an already-unmuted trader', async () => {
      mockNotificationPreferences = channelsDisabledPreferences;
      setTabResult('all', { traders: followedTraders });
      mockIsTraderNotificationEnabled.mockImplementation(
        (traderId: string) => traderId === fixtureTraders[0].id,
      );

      renderWithProvider(<TopTradersView />);

      await act(async () => {
        fireEvent.press(screen.getByTestId('trader-row-mute-chip-trader-1'));
      });

      await runDeferredSetupAction();

      expect(mockToggleTraderNotification).not.toHaveBeenCalled();
    });

    it('unmutes the trader when the bell intercept fires for a muted trader', async () => {
      mockNotificationPreferences = {
        ...channelsDisabledPreferences,
        mutedTraderProfileIds: [fixtureTraders[0].id],
      };
      setTabResult('all', { traders: followedTraders });
      mockIsTraderNotificationEnabled.mockReturnValue(false);

      renderWithProvider(<TopTradersView />);

      await act(async () => {
        fireEvent.press(screen.getByTestId('trader-row-mute-chip-trader-1'));
      });

      await runDeferredSetupAction();

      expect(mockToggleTraderNotification).toHaveBeenCalledWith(
        fixtureTraders[0].id,
      );
    });

    it('toggles mute normally when notifications are already enabled', async () => {
      setTabResult('all', { traders: followedTraders });

      renderWithProvider(<TopTradersView />);

      await act(async () => {
        fireEvent.press(screen.getByTestId('trader-row-mute-chip-trader-1'));
      });

      expect(mockToggleTraderNotification).toHaveBeenCalledWith(
        fixtureTraders[0].id,
      );
      expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.FollowToggle);
      expect(mockPlayErrorNotification).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.SOCIAL_LEADERBOARD.TRADING_SIGNALS_SETUP,
        expect.anything(),
      );
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

    it('triggers a selection haptic when a different pill is tapped', () => {
      renderWithProvider(<TopTradersView />);

      fireEvent.press(
        screen.getByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_TOKENS),
      );
      fireEvent.press(
        screen.getByTestId(TopTradersViewSelectorsIDs.TAB_FILTER_TOKENS),
      );

      expect(mockPlaySelection).toHaveBeenCalledTimes(1);
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
