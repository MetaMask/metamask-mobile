import React from 'react';
import { Modal, RefreshControl } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
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
  { symbol: 'BTC', marketType: 'crypto', volumeNumber: 2 },
  { symbol: 'ETH', marketType: 'crypto', volumeNumber: 1 },
];

const mockFiltersBarProps: { current: Record<string, unknown> } = {
  current: {},
};

const mockUsePerpsMarkets = jest.fn();
jest.mock('../../../UI/Perps/hooks/usePerpsMarkets', () => ({
  usePerpsMarkets: (...args: unknown[]) => mockUsePerpsMarkets(...args),
}));

jest.mock('../../../UI/Perps/hooks/useNowOnScreenFocus', () => ({
  useNowOnScreenFocus: () => 0,
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
      emptyComponent,
    }: {
      testID?: string;
      markets: { symbol: string }[];
      ListHeaderComponent?: React.ReactElement;
      stickyHeader?: React.ReactElement;
      onMarketPress: (market: { symbol: string }) => void;
      contentContainerStyle?: unknown;
      refreshControl?: React.ReactElement;
      emptyComponent?: React.ReactElement;
    }) =>
      MockReact.createElement(
        View,
        {
          testID,
          accessibilityLabel: `market-count-${m.length}`,
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

const mockTrack = jest.fn();
jest.mock('../../../UI/Perps/hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));

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

const mockSortSheetProps: { current: Record<string, unknown> } = {
  current: {},
};
jest.mock(
  '../../../UI/Perps/components/PerpsMarketSortFieldBottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: (props: { testID?: string; [key: string]: unknown }) => {
        mockSortSheetProps.current = props;
        return jest
          .requireActual('react')
          .createElement(View, { testID: props.testID });
      },
    };
  },
);

const mockTopTradersMounted = jest.fn();
jest.mock('../../Homepage/Sections/TopTraders/TopTradersSection', () => {
  const MockReact = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ source }: { source?: string }) => {
      MockReact.useEffect(() => {
        mockTopTradersMounted();
      }, []);
      return MockReact.createElement(
        View,
        { testID: 'top-traders-section', accessibilityHint: source },
        MockReact.createElement(Text, null, 'Top traders'),
      );
    },
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
import { selectPerpsWatchlistMarkets } from '../../../UI/Perps/selectors/perpsController';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { MetaMetricsEvents } from '../../../../core/Analytics';
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
      if (selector === selectPerpsWatchlistMarkets) return ['ETH'];
      return undefined;
    });
    mockUsePerpsMarkets.mockReturnValue({
      markets: mockMarkets,
      isLoading: false,
    });
  });

  describe('watchlist filter', () => {
    const toggleWatchlist = () =>
      act(() => {
        (mockFiltersBarProps.current.onWatchlistToggle as () => void)();
      });

    it('toggles the watchlist filter on and off', () => {
      renderPerpsTab();
      expect(mockFiltersBarProps.current.isWatchlistSelected).toBe(false);

      toggleWatchlist();
      expect(mockFiltersBarProps.current.isWatchlistSelected).toBe(true);

      toggleWatchlist();
      expect(mockFiltersBarProps.current.isWatchlistSelected).toBe(false);
    });

    it('renders the reused watchlist block instead of rows when the watchlist filter is active', () => {
      const { getByTestId } = renderPerpsTab();

      toggleWatchlist();

      expect(getByTestId('mock-watchlist-markets')).toBeOnTheScreen();
      expect(
        (mockWatchlistProps.current.markets as { symbol: string }[]).map(
          (m) => m.symbol,
        ),
      ).toEqual(['ETH']);
      expect(
        (
          mockWatchlistProps.current.suggestedMarkets as { symbol: string }[]
        ).map((m) => m.symbol),
      ).toEqual(['BTC']);
      expect(
        getByTestId('perps-tab-market-list').props.accessibilityLabel,
      ).toBe('market-count-0');
    });

    it('does not render the watchlist block when the watchlist filter is off', () => {
      const { queryByTestId, getByTestId } = renderPerpsTab();

      expect(queryByTestId('mock-watchlist-markets')).toBeNull();
      expect(
        getByTestId('perps-tab-market-list').props.accessibilityLabel,
      ).toBe('market-count-2');
    });
  });

  it('sorts by price change, high to low, by default', () => {
    renderPerpsTab();

    expect(mockFiltersBarProps.current.selectedOptionId).toBe('priceChange');
    expect(mockFiltersBarProps.current.sortDirection).toBe('desc');
  });

  it('renders the top traders section when the feature flag is enabled', () => {
    const { getByTestId } = renderPerpsTab();
    expect(getByTestId('top-traders-section')).toBeOnTheScreen();
  });

  it('hides top traders when the social leaderboard flag is off', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectSocialLeaderboardEnabled) return false;
      if (selector === selectPerpsWatchlistMarkets) return [];
      return undefined;
    });

    const { queryByTestId } = renderPerpsTab();
    expect(queryByTestId('top-traders-section')).toBeNull();
  });

  it.each([false, true])(
    'returns null when perps is disabled (isLoading: %s)',
    (isLoading) => {
      mockUsePerpsMarkets.mockReturnValue({ markets: [], isLoading });
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectPerpsEnabledFlag) return false;
        if (selector === selectSocialLeaderboardEnabled) return true;
        if (selector === selectPerpsWatchlistMarkets) return [];
        return undefined;
      });

      const { queryByTestId } = renderPerpsTab();
      expect(queryByTestId('perps-tab-market-list')).toBeNull();
      expect(queryByTestId('top-traders-section')).toBeNull();
    },
  );

  it('closes the sort sheet on Android back press', () => {
    const { UNSAFE_getByType, queryByTestId } = renderPerpsTab();
    act(() => {
      (mockFiltersBarProps.current.onSortPress as () => void)();
    });
    expect(queryByTestId('perps-tab-sort-sheet')).toBeOnTheScreen();

    act(() => {
      UNSAFE_getByType(Modal).props.onRequestClose();
    });

    expect(queryByTestId('perps-tab-sort-sheet')).toBeNull();
  });

  it('renders skeleton rows without market rows or the filter bar while loading', () => {
    mockUsePerpsMarkets.mockReturnValue({
      markets: [],
      isLoading: true,
    });

    const { getByTestId, queryByTestId } = renderPerpsTab();

    expect(getByTestId('perps-tab-loading')).toBeOnTheScreen();
    expect(getByTestId('perps-row-skeleton')).toBeOnTheScreen();
    expect(getByTestId('perps-tab-market-list').props.accessibilityLabel).toBe(
      'market-count-0',
    );
    expect(queryByTestId('perps-tab-filters')).toBeNull();
  });

  it('keeps top traders mounted when markets finish loading', () => {
    mockUsePerpsMarkets.mockReturnValue({ markets: [], isLoading: true });
    const { rerender, queryByTestId, getByTestId } = renderPerpsTab();

    mockUsePerpsMarkets.mockReturnValue({
      markets: mockMarkets,
      isLoading: false,
    });
    rerender(
      <NavigationContainer>
        <PerpsTab {...defaultTabProps} />
      </NavigationContainer>,
    );

    expect(mockTopTradersMounted).toHaveBeenCalledTimes(1);
    expect(getByTestId('top-traders-section')).toBeOnTheScreen();
    expect(queryByTestId('perps-tab-loading')).toBeNull();
    expect(getByTestId('perps-tab-filters')).toBeOnTheScreen();
  });

  it('signals the shared refresh when pulled', () => {
    const onRefresh = jest.fn();
    const { UNSAFE_getByType } = renderPerpsTab({
      ...defaultTabProps,
      onRefresh,
    });

    UNSAFE_getByType(RefreshControl).props.onRefresh();

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('adds the floating tab bar inset to the list bottom padding', () => {
    const { getByTestId } = renderPerpsTab();

    expect(getByTestId('perps-tab-market-list')).toHaveStyle({
      paddingTop: 12,
      paddingBottom: 56,
    });
  });

  it('navigates to market details and tracks the tap when a market is pressed', () => {
    const { getByTestId } = renderPerpsTab();

    fireEvent.press(getByTestId('mock-market-row'));

    expect(mockTrackExploreInteracted).toHaveBeenCalledWith({
      interaction_type: 'section_item_tapped',
      tab_name: 'Perps',
      section_name: 'perps_tab_markets',
      position: 0,
      asset_type: 'perp',
      item_clicked: 'BTC',
    });
    expect(mockNavigate).toHaveBeenCalledWith(
      'Perps',
      expect.objectContaining({
        screen: 'PerpsMarketDetails',
        params: expect.objectContaining({
          market: mockMarkets[0],
          source: 'explore',
          source_section: 'perps_tab_markets',
        }),
      }),
    );
  });

  describe('analytics', () => {
    const sourceExplore = { source: 'explore' };

    it('passes the Explore sources to top traders and watchlist adds', () => {
      const { getByTestId } = renderPerpsTab();
      expect(getByTestId('top-traders-section').props.accessibilityHint).toBe(
        'explore_perps',
      );

      act(() => {
        (mockFiltersBarProps.current.onWatchlistToggle as () => void)();
      });
      expect(mockWatchlistProps.current.addSource).toBe('explore');
    });

    it('omits position for markets outside the main list', () => {
      renderPerpsTab();
      act(() => {
        (mockFiltersBarProps.current.onWatchlistToggle as () => void)();
      });
      const { onMarketPress } = mockWatchlistProps.current as {
        onMarketPress: (market: { symbol: string }) => void;
      };

      act(() => onMarketPress({ symbol: 'SOL' }));

      expect(mockTrackExploreInteracted).toHaveBeenCalledWith(
        expect.not.objectContaining({ position: expect.anything() }),
      );
    });

    it('tracks a category selection as market_list_filter and filter_applied', () => {
      renderPerpsTab();

      act(() => {
        (mockFiltersBarProps.current.onCategorySelect as (c: string) => void)(
          'crypto',
        );
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        {
          interaction_type: 'market_list_filter',
          button_clicked: 'crypto',
          button_location: 'market_list',
          ...sourceExplore,
        },
      );
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        {
          interaction_type: 'filter_applied',
          filter_category: 'crypto',
          ...sourceExplore,
        },
      );
    });

    it('tracks filter_applied only when the watchlist is turned on', () => {
      renderPerpsTab();
      const toggle = () =>
        act(() => {
          (mockFiltersBarProps.current.onWatchlistToggle as () => void)();
        });
      const filterApplied = () =>
        mockTrack.mock.calls.filter(
          ([, props]) => props.interaction_type === 'filter_applied',
        );

      toggle();
      expect(filterApplied()).toHaveLength(1);
      expect(filterApplied()[0][1]).toEqual({
        interaction_type: 'filter_applied',
        filter_category: 'watchlist',
        ...sourceExplore,
      });

      toggle();
      expect(filterApplied()).toHaveLength(1);
      expect(mockTrack).toHaveBeenCalledTimes(3);
    });

    it('tracks sort changes with field and direction', () => {
      const { getByTestId } = renderPerpsTab();
      fireEvent.press(getByTestId('perps-tab-filters'));

      act(() => {
        (
          mockSortSheetProps.current.onOptionSelect as (
            id: string,
            field: string,
            direction: string,
          ) => void
        )('priceChange-desc', 'priceChange', 'desc');
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        {
          interaction_type: 'sort_applied',
          sort_field: 'priceChange',
          sort_direction: 'desc',
          ...sourceExplore,
        },
      );
    });
  });
});
