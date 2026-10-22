import React from 'react';
import { RefreshControl } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import type { TabProps } from '../hooks/useExploreRefresh';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
  NavigationProp: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockMarkets = [
  { symbol: 'BTC', marketType: 'crypto' },
  { symbol: 'ETH', marketType: 'crypto' },
];

const mockSetShowFavoritesOnly = jest.fn();
const mockFiltersBarProps: { current: Record<string, unknown> } = {
  current: {},
};

const mockUsePerpsMarketListView = jest.fn().mockReturnValue({
  markets: mockMarkets,
  marketTypeFilterState: {
    marketTypeFilter: 'all',
    setMarketTypeFilter: jest.fn(),
  },
  sortState: {
    selectedOptionId: 'volume',
    sortBy: 'volume',
    direction: 'desc',
    handleOptionChange: jest.fn(),
  },
  favoritesState: {
    showFavoritesOnly: false,
    setShowFavoritesOnly: mockSetShowFavoritesOnly,
    hasWatchlistMarkets: false,
    watchlistMarketObjects: [],
    suggestedMarkets: [],
  },
  marketCounts: {},
  isLoading: false,
  error: null,
});

jest.mock('../../../UI/Perps/hooks/usePerpsMarketListView', () => ({
  usePerpsMarketListView: (...args: unknown[]) =>
    mockUsePerpsMarketListView(...args),
}));

jest.mock('../../../UI/Perps/components/PerpsMarketList', () => {
  const MockReact = jest.requireActual('react');
  const { View, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      testID,
      markets: m,
      ListHeaderComponent,
      stickyHeader,
      onMarketPress,
      contentContainerStyle,
      refreshControl,
      filterKey,
      emptyComponent,
      showBadge,
    }: {
      testID?: string;
      markets: { symbol: string }[];
      ListHeaderComponent?: React.ReactElement;
      stickyHeader?: React.ReactElement;
      onMarketPress: (market: { symbol: string }) => void;
      contentContainerStyle?: unknown;
      refreshControl?: React.ReactElement;
      filterKey?: string;
      emptyComponent?: React.ReactElement;
      showBadge?: boolean;
    }) =>
      MockReact.createElement(
        View,
        {
          testID,
          accessibilityLabel: `market-count-${m.length}`,
          accessibilityHint: filterKey,
          accessibilityValue: { text: String(showBadge) },
          style: contentContainerStyle,
        },
        refreshControl,
        ListHeaderComponent,
        stickyHeader,
        emptyComponent,
        MockReact.createElement(Pressable, {
          testID: 'mock-market-row',
          onPress: () => onMarketPress(m[0]),
        }),
      ),
  };
});

const mockWatchlistProps: { current: Record<string, unknown> } = {
  current: {},
};
jest.mock(
  '../../../UI/Perps/components/PerpsWatchlistMarkets/PerpsWatchlistMarkets',
  () => ({
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockWatchlistProps.current = props;
      return jest
        .requireActual('react')
        .createElement(jest.requireActual('react-native').View, {
          testID: 'mock-watchlist-markets',
        });
    },
  }),
);

jest.mock('../../../UI/Perps/components/PerpsRowSkeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      jest.requireActual('react').createElement(View, {
        testID: 'perps-row-skeleton',
      }),
  };
});

jest.mock(
  '../../../../component-library/components/Navigation/TabBarFloating',
  () => ({
    useFloatingTabBarInset: () => 40,
  }),
);

const mockTrackExploreInteracted = jest.fn();
jest.mock('../search/analytics', () => ({
  trackExploreInteracted: (...args: unknown[]) =>
    mockTrackExploreInteracted(...args),
}));

jest.mock(
  '../../../UI/Perps/Views/PerpsMarketListView/components/PerpsMarketFiltersBar',
  () => {
    const { Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: (props: {
        testID?: string;
        onSortPress?: () => void;
        [key: string]: unknown;
      }) => {
        mockFiltersBarProps.current = props;
        return jest.requireActual('react').createElement(Pressable, {
          testID: props.testID,
          onPress: props.onSortPress,
        });
      },
    };
  },
);

jest.mock(
  '../../../UI/Perps/components/PerpsMarketSortFieldBottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ testID }: { testID?: string }) =>
        jest.requireActual('react').createElement(View, { testID }),
    };
  },
);

const mockTopTradersRefresh = jest.fn().mockResolvedValue(undefined);

jest.mock('../../Homepage/Sections/TopTraders/TopTradersSection', () => {
  const MockReact = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: MockReact.forwardRef(
      (_props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        MockReact.useImperativeHandle(ref, () => ({
          refresh: mockTopTradersRefresh,
        }));
        return MockReact.createElement(
          View,
          { testID: 'top-traders-section' },
          MockReact.createElement(Text, null, 'Top traders'),
        );
      },
    ),
  };
});

jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      icon: { default: 'icon-default' },
      primary: { default: 'primary-default' },
    },
  }),
}));

jest.mock('../feeds/perps/PerpsSectionProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectPerpsWatchlistEnabledFlag } from '../../../UI/Perps/selectors/featureFlags';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import PerpsTab from './PerpsTab';

const defaultTabProps: TabProps = {
  refresh: { trigger: 0, silentRefresh: false },
  refreshing: false,
  onRefresh: jest.fn(),
};

const renderPerpsTab = (props = defaultTabProps) =>
  render(
    <NavigationContainer>
      <PerpsTab {...props} />
    </NavigationContainer>,
  );

describe('PerpsTab', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectSocialLeaderboardEnabled) return true;
      if (selector === selectPerpsWatchlistEnabledFlag) return true;
      return undefined;
    });
  });

  describe('watchlist filter', () => {
    it('shows the watchlist pill and lets the hook restore a persisted filter when enabled', () => {
      renderPerpsTab();

      expect(mockFiltersBarProps.current.showWatchlistBadge).toBe(true);
      expect(mockUsePerpsMarketListView).toHaveBeenCalledWith({
        showWatchlistOnly: undefined,
      });
    });

    it('hides the watchlist pill and ignores a persisted filter when disabled', () => {
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectPerpsEnabledFlag) return true;
        if (selector === selectSocialLeaderboardEnabled) return true;
        if (selector === selectPerpsWatchlistEnabledFlag) return false;
        return undefined;
      });

      renderPerpsTab();

      expect(mockFiltersBarProps.current.showWatchlistBadge).toBe(false);
      expect(mockUsePerpsMarketListView).toHaveBeenCalledWith({
        showWatchlistOnly: false,
      });
    });

    it('toggles the watchlist filter on and off', () => {
      const defaultReturn = mockUsePerpsMarketListView();
      renderPerpsTab();
      (mockFiltersBarProps.current.onWatchlistToggle as () => void)();
      expect(mockSetShowFavoritesOnly).toHaveBeenLastCalledWith(true);

      mockUsePerpsMarketListView.mockReturnValue({
        ...mockUsePerpsMarketListView(),
        favoritesState: {
          ...mockUsePerpsMarketListView().favoritesState,
          showFavoritesOnly: true,
        },
      });
      renderPerpsTab();
      expect(mockFiltersBarProps.current.isWatchlistSelected).toBe(true);
      (mockFiltersBarProps.current.onWatchlistToggle as () => void)();
      expect(mockSetShowFavoritesOnly).toHaveBeenLastCalledWith(false);

      mockUsePerpsMarketListView.mockReturnValue(defaultReturn);
    });

    it('renders the reused watchlist block instead of rows when the watchlist filter is active', () => {
      const defaultReturn = mockUsePerpsMarketListView();
      const suggested = [{ symbol: 'SOL', marketType: 'crypto' }];
      mockUsePerpsMarketListView.mockReturnValue({
        ...defaultReturn,
        favoritesState: {
          ...defaultReturn.favoritesState,
          showFavoritesOnly: true,
          suggestedMarkets: suggested,
        },
      });

      const { getByTestId } = renderPerpsTab();

      expect(getByTestId('mock-watchlist-markets')).toBeOnTheScreen();
      expect(mockWatchlistProps.current.markets).toBe(mockMarkets);
      expect(mockWatchlistProps.current.suggestedMarkets).toBe(suggested);
      expect(
        getByTestId('perps-tab-market-list').props.accessibilityLabel,
      ).toBe('market-count-0');

      mockUsePerpsMarketListView.mockReturnValue(defaultReturn);
    });

    it('does not render the watchlist block when the watchlist filter is off', () => {
      const { queryByTestId, getByTestId } = renderPerpsTab();

      expect(queryByTestId('mock-watchlist-markets')).toBeNull();
      expect(
        getByTestId('perps-tab-market-list').props.accessibilityLabel,
      ).toBe('market-count-2');
    });
    it('hides the market type badge on rows, matching the Perps screen', () => {
      const { getByTestId } = renderPerpsTab();
      expect(
        getByTestId('perps-tab-market-list').props.accessibilityValue,
      ).toEqual({ text: 'false' });
    });

    it('includes the watchlist state in the list filter key', () => {
      const { getByTestId } = renderPerpsTab();
      expect(getByTestId('perps-tab-market-list').props.accessibilityHint).toBe(
        'all|false',
      );
    });
  });

  it('renders the market list when perps is enabled', () => {
    const { getByTestId } = renderPerpsTab();
    expect(getByTestId('perps-tab-market-list')).toBeOnTheScreen();
  });

  it('renders the filter bar as sticky header', () => {
    const { getByTestId } = renderPerpsTab();
    expect(getByTestId('perps-tab-filters')).toBeOnTheScreen();
  });

  it('mounts the sort bottom sheet only after the sort control is pressed', () => {
    const { getByTestId, queryByTestId } = renderPerpsTab();
    expect(queryByTestId('perps-tab-sort-sheet')).not.toBeOnTheScreen();

    fireEvent.press(getByTestId('perps-tab-filters'));

    expect(getByTestId('perps-tab-sort-sheet')).toBeOnTheScreen();
  });

  it('renders the top traders section when the feature flag is enabled', () => {
    const { getByTestId } = renderPerpsTab();
    expect(getByTestId('top-traders-section')).toBeOnTheScreen();
  });

  it('hides top traders when the social leaderboard flag is off', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectSocialLeaderboardEnabled) return false;
      return undefined;
    });

    const { queryByTestId } = renderPerpsTab();
    expect(queryByTestId('top-traders-section')).toBeNull();
  });

  it('returns null when perps is disabled and not loading', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsEnabledFlag) return false;
      if (selector === selectSocialLeaderboardEnabled) return true;
      return undefined;
    });

    const { queryByTestId } = renderPerpsTab();
    expect(queryByTestId('perps-tab-market-list')).toBeNull();
  });

  it('passes the correct number of markets to the list', () => {
    const { getByTestId } = renderPerpsTab();
    expect(getByTestId('perps-tab-market-list')).toHaveProp(
      'accessibilityLabel',
      'market-count-2',
    );
  });

  it('renders section header for trending lists', () => {
    const { getByTestId } = renderPerpsTab();
    expect(
      getByTestId('section-header-perps-trending-lists'),
    ).toBeOnTheScreen();
  });

  it('renders skeleton rows instead of the market list while loading', () => {
    mockUsePerpsMarketListView.mockReturnValueOnce({
      ...mockUsePerpsMarketListView(),
      markets: [],
      isLoading: true,
    });

    const { getByTestId, queryByTestId } = renderPerpsTab();

    expect(getByTestId('perps-tab-loading')).toBeOnTheScreen();
    expect(getByTestId('perps-row-skeleton')).toBeOnTheScreen();
    expect(queryByTestId('perps-tab-market-list')).toBeNull();
  });

  it('refreshes top traders and signals the shared refresh when pulled', () => {
    const onRefresh = jest.fn();
    const { UNSAFE_getByType } = renderPerpsTab({
      ...defaultTabProps,
      onRefresh,
    });

    UNSAFE_getByType(RefreshControl).props.onRefresh();

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(mockTopTradersRefresh).toHaveBeenCalledTimes(1);
  });

  it('adds the floating tab bar inset to the list bottom padding', () => {
    const { getByTestId } = renderPerpsTab();

    expect(getByTestId('perps-tab-market-list')).toHaveStyle({
      paddingBottom: 56,
    });
  });

  it('navigates to market details and tracks the tap when a market is pressed', () => {
    const { getByTestId } = renderPerpsTab();

    fireEvent.press(getByTestId('mock-market-row'));

    expect(mockTrackExploreInteracted).toHaveBeenCalledWith({
      interaction_type: 'section_item_tapped',
      tab_name: 'Perps',
      section_name: 'perps_markets',
      asset_type: 'perp',
      item_clicked: 'BTC',
    });
    expect(mockNavigate).toHaveBeenCalledWith(
      'Perps',
      expect.objectContaining({
        screen: 'PerpsMarketDetails',
        params: expect.objectContaining({ market: mockMarkets[0] }),
      }),
    );
  });
});
