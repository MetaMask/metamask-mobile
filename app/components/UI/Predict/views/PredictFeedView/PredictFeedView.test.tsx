/**
 * Focused unit coverage for PredictFeedView.
 *
 * MMQA-2104: header/tabs/filters, market cards, empty, live hides bars, skeleton,
 * offline+retry, search open+track, feed viewed on focus, tab/filter change track,
 * and unknown-feed no shell live in PredictFeedView.view.test.tsx.
 *
 * KEEP here only hook wiring (route params, filterByVolume, live-first gates,
 * transactionActiveAbTests forwarding), pagination/loading edge cases, analytics
 * negatives and dynamic-filter settlement timing, and goBack on not-found via mocked nav.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PredictFeedView from './PredictFeedView';
import {
  PredictFeedViewSelectorsIDs,
  getPredictFeedViewSelector,
} from '../../Predict.testIds';
import type { PredictFeedConfigResult } from '../../hooks/usePredictFeedConfig';
import type { UsePredictMarketListResult } from '../../hooks/usePredictMarketList';
import type { UsePredictSearchResult } from '../../hooks/usePredictSearch';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
let mockRouteParams: Record<string, unknown> | undefined;

const mockSetActiveTabId = jest.fn();
const mockSetActiveFilterId = jest.fn();
const mockRefetch = jest.fn();
const mockFetchNextPage = jest.fn();
const mockShowSearch = jest.fn();
const mockClearSearchAndClose = jest.fn();

const mockUsePredictFeedConfig = jest.fn();
const mockUsePredictFeedMarketList = jest.fn();
const mockUsePredictSearch = jest.fn();
const mockPredictMarketProps = jest.fn();
const mockSearchOverlayProps = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
  useRoute: () => ({ params: mockRouteParams }),
  // Run the focus callback once on mount (mirrors gaining focus).
  useFocusEffect: (callback: () => void | (() => void)) => {
    const ReactActual = jest.requireActual('react');
    ReactActual.useEffect(() => callback(), [callback]);
  },
}));

const mockTrackFeedViewed = jest.fn();
const mockTrackFeedTabChanged = jest.fn();
const mockTrackFeedFilterChanged = jest.fn();
const mockTrackSearchInteracted = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PredictController: {
        trackFeedViewed: (...args: unknown[]) => mockTrackFeedViewed(...args),
        trackFeedTabChanged: (...args: unknown[]) =>
          mockTrackFeedTabChanged(...args),
        trackFeedFilterChanged: (...args: unknown[]) =>
          mockTrackFeedFilterChanged(...args),
        trackSearchInteracted: (...args: unknown[]) =>
          mockTrackSearchInteracted(...args),
      },
    },
  },
}));

jest.mock('../../hooks/usePredictFeedConfig', () => ({
  usePredictFeedConfig: (...args: unknown[]) =>
    mockUsePredictFeedConfig(...args),
}));

jest.mock('../../hooks/usePredictFeedMarketList', () => ({
  usePredictFeedMarketList: (...args: unknown[]) =>
    mockUsePredictFeedMarketList(...args),
}));

jest.mock('../../hooks/usePredictSearch', () => ({
  usePredictSearch: () => mockUsePredictSearch(),
}));

jest.mock('@shopify/flash-list', () => {
  const { View } = jest.requireActual('react-native');

  interface MockItem {
    id: string;
  }
  interface MockFlashListProps {
    data?: MockItem[];
    renderItem: (info: { item: MockItem; index: number }) => React.ReactNode;
    keyExtractor?: (item: MockItem, index: number) => string;
    ListFooterComponent?: React.ComponentType | React.ReactNode;
    testID?: string;
  }

  const FlashList = ({
    data = [],
    renderItem,
    keyExtractor,
    ListFooterComponent,
    testID,
  }: MockFlashListProps) => (
    <View testID={testID}>
      {data.map((item, index) => (
        <View key={keyExtractor ? keyExtractor(item, index) : item.id}>
          {renderItem({ item, index })}
        </View>
      ))}
      {typeof ListFooterComponent === 'function' ? (
        <ListFooterComponent />
      ) : (
        ListFooterComponent
      )}
    </View>
  );

  return { FlashList };
});

jest.mock('../../components/PredictMarket', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: { market: { title?: string }; testID: string }) => {
      mockPredictMarketProps(props);
      return (
        <Text testID={props.testID}>{props.market.title ?? 'market'}</Text>
      );
    },
  };
});

jest.mock('../../components/PredictOffline', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ onRetry }: { onRetry?: () => void }) => (
      <Pressable testID="predict-feed-view-offline-retry" onPress={onRetry}>
        <Text>Retry</Text>
      </Pressable>
    ),
  };
});

jest.mock('../../components/PredictSearchOverlay', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: { isVisible: boolean }) => {
      mockSearchOverlayProps(props);
      return props.isVisible ? (
        <View testID="predict-feed-view-search-overlay" />
      ) : null;
    },
  };
});

const createMarket = (id: string, title: string) =>
  ({ id, title }) as unknown as UsePredictMarketListResult['markets'][number];

const feedConfigResult = (
  overrides: Partial<PredictFeedConfigResult> = {},
): PredictFeedConfigResult => ({
  status: 'ready',
  feedId: 'sports',
  titleKey: 'predict.category.sports',
  header: { showBackButton: true, showSearchButton: true },
  tabs: [
    { id: 'all', titleKey: 'predict.feed.tabs.all' },
    { id: 'soccer', titleKey: 'predict.feed.tabs.soccer' },
  ],
  showTabBar: true,
  showFilterBar: true,
  activeTabId: 'all',
  setActiveTabId: mockSetActiveTabId,
  filters: [
    {
      id: 'games',
      titleKey: 'predict.feed.filters.games',
      params: {},
      showLiveFirst: true,
      isDynamic: false,
    },
    {
      id: 'props',
      titleKey: 'predict.feed.filters.props',
      params: {},
      showLiveFirst: false,
      isDynamic: false,
    },
  ],
  dynamicFilters: { status: 'idle' },
  activeFilterId: 'games',
  setActiveFilterId: mockSetActiveFilterId,
  activeFilter: {
    id: 'games',
    titleKey: 'predict.feed.filters.games',
    params: {},
    showLiveFirst: true,
    isDynamic: false,
  },
  ...overrides,
});

const marketListResult = (
  overrides: Partial<UsePredictMarketListResult> = {},
): UsePredictMarketListResult => ({
  markets: [],
  isLoading: false,
  isFetching: false,
  isFetchingNextPage: false,
  error: null,
  hasNextPage: false,
  refetch: mockRefetch,
  fetchNextPage: mockFetchNextPage,
  ...overrides,
});

const searchResult = (
  overrides: Partial<UsePredictSearchResult> = {},
): UsePredictSearchResult => ({
  isSearchVisible: false,
  searchQuery: '',
  setSearchQuery: jest.fn(),
  showSearch: mockShowSearch,
  hideSearch: jest.fn(),
  clearSearchAndClose: mockClearSearchAndClose,
  ...overrides,
});

describe('PredictFeedView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    mockRouteParams = { feedId: 'sports' };
    mockUsePredictFeedConfig.mockReturnValue(feedConfigResult());
    mockUsePredictFeedMarketList.mockReturnValue(marketListResult());
    mockUsePredictSearch.mockReturnValue(searchResult());
  });

  describe('hook wiring (KEEP — route params & prop forwarding)', () => {
    it('forwards the route feedId and active filter params to the data hooks', () => {
      mockRouteParams = {
        feedId: 'sports',
        initialTabId: 'soccer',
        initialFilterId: 'props',
      };

      render(<PredictFeedView />);

      expect(mockUsePredictFeedConfig).toHaveBeenCalledWith('sports', {
        initialTabId: 'soccer',
        initialFilterId: 'props',
      });
      expect(mockUsePredictFeedMarketList).toHaveBeenCalledWith(
        {},
        {
          enabled: true,
          showLiveFirst: true,
          autoAdvanceEmptyPages: true,
          filterStaleGameMarkets: true,
        },
      );
    });

    it('forwards filterByVolume from the active sports filter', () => {
      mockRouteParams = { feedId: 'sports' };
      mockUsePredictFeedConfig.mockReturnValue(
        feedConfigResult({
          activeFilter: {
            id: 'games',
            titleKey: 'predict.feed.filters.games',
            params: {},
            showLiveFirst: true,
            filterByVolume: 1000,
            isDynamic: false,
          },
        }),
      );

      render(<PredictFeedView />);

      expect(mockUsePredictFeedMarketList).toHaveBeenCalledWith(
        {},
        {
          enabled: true,
          showLiveFirst: true,
          autoAdvanceEmptyPages: true,
          filterStaleGameMarkets: true,
          filterByVolume: 1000,
        },
      );
    });

    it('disables live-first for non-sports feeds', () => {
      mockRouteParams = { feedId: 'politics' };
      mockUsePredictFeedConfig.mockReturnValue(
        feedConfigResult({
          feedId: 'politics',
          titleKey: 'predict.category.politics',
          activeFilter: {
            id: 'all',
            titleKey: 'predict.feed.filters.all',
            params: { tagSlugs: ['politics'] },
            showLiveFirst: true,
            isDynamic: false,
          },
        }),
      );

      render(<PredictFeedView />);

      expect(mockUsePredictFeedMarketList).toHaveBeenCalledWith(
        { tagSlugs: ['politics'] },
        {
          enabled: true,
          showLiveFirst: false,
          autoAdvanceEmptyPages: false,
          filterStaleGameMarkets: false,
        },
      );
    });

    it('forwards transactionActiveAbTests from the route to market cards and the search overlay', () => {
      const transactionActiveAbTests = [
        { name: 'predict_test', variant: 'treatment' },
      ];
      mockRouteParams = { feedId: 'sports', transactionActiveAbTests };
      mockUsePredictFeedMarketList.mockReturnValue(
        marketListResult({ markets: [createMarket('1', 'Lakers win')] }),
      );
      mockUsePredictSearch.mockReturnValue(
        searchResult({ isSearchVisible: true }),
      );

      render(<PredictFeedView />);

      expect(mockPredictMarketProps).toHaveBeenCalledWith(
        expect.objectContaining({ transactionActiveAbTests }),
      );
      expect(mockSearchOverlayProps).toHaveBeenCalledWith(
        expect.objectContaining({ transactionActiveAbTests }),
      );
    });
  });

  describe('market list states (KEEP — pagination/loading edges)', () => {
    it('does not render the empty state while empty results are still loading', () => {
      mockUsePredictFeedMarketList.mockReturnValue(
        marketListResult({ markets: [], isLoading: true }),
      );

      render(<PredictFeedView />);

      expect(
        screen.getByTestId(getPredictFeedViewSelector.skeleton(1)),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PredictFeedViewSelectorsIDs.EMPTY_STATE),
      ).toBeNull();
    });

    it('keeps the list (not the full-screen error) when a next-page fetch fails with markets already loaded', () => {
      mockUsePredictFeedMarketList.mockReturnValue(
        marketListResult({
          markets: [createMarket('1', 'Lakers win')],
          error: new Error('Next page failed'),
          hasNextPage: true,
        }),
      );

      render(<PredictFeedView />);

      expect(
        screen.getByTestId(getPredictFeedViewSelector.marketCard(1)),
      ).toHaveTextContent('Lakers win');
      expect(
        screen.queryByTestId(PredictFeedViewSelectorsIDs.ERROR_STATE),
      ).toBeNull();
    });

    it('renders the pagination footer skeleton while fetching the next page', () => {
      mockUsePredictFeedMarketList.mockReturnValue(
        marketListResult({
          markets: [createMarket('1', 'Lakers win')],
          hasNextPage: true,
          isFetchingNextPage: true,
        }),
      );

      render(<PredictFeedView />);

      expect(
        screen.getByTestId(getPredictFeedViewSelector.skeletonFooter(1)),
      ).toBeOnTheScreen();
    });
  });

  describe('analytics (KEEP — negatives & settlement)', () => {
    it('does not track feed viewed when the feed is not found', () => {
      mockUsePredictFeedConfig.mockReturnValue(
        feedConfigResult({ status: 'not-found', feedId: undefined }),
      );

      render(<PredictFeedView />);

      expect(mockTrackFeedViewed).not.toHaveBeenCalled();
    });

    it('does not track tab changed when re-pressing the already-active tab', () => {
      // Active tab is 'all'. Pressing 'All' again should be a no-op.
      mockRouteParams = { feedId: 'sports', entryPoint: 'home_section' };

      render(<PredictFeedView />);

      fireEvent.press(screen.getAllByText('All')[0]);

      expect(mockTrackFeedTabChanged).not.toHaveBeenCalled();
      expect(mockSetActiveTabId).not.toHaveBeenCalled();
    });

    it('tracks a dynamic filter change with is_dynamic_filter true', () => {
      mockRouteParams = { feedId: 'politics', entryPoint: 'home_section' };
      mockUsePredictFeedConfig.mockReturnValue(
        feedConfigResult({
          feedId: 'politics',
          tabs: [{ id: 'politics', titleKey: 'predict.category.politics' }],
          showTabBar: false,
          activeTabId: 'politics',
          filters: [
            {
              id: 'all',
              titleKey: 'predict.feed.filters.all',
              params: {},
              isDynamic: false,
            },
            {
              id: 'elections',
              label: 'Elections',
              params: { tagSlugs: ['elections'] },
              isDynamic: true,
            },
          ],
          activeFilterId: 'all',
        }),
      );

      render(<PredictFeedView />);

      fireEvent.press(screen.getByText('Elections'));

      expect(mockTrackFeedFilterChanged).toHaveBeenCalledWith({
        feedId: 'politics',
        tabId: 'politics',
        filterId: 'elections',
        isDynamicFilter: true,
        entryPoint: 'home_section',
      });
    });

    it('does not track filter changed when re-pressing the already-active chip', () => {
      // Active filter is 'games'. Pressing 'Games' again should be a no-op.
      mockRouteParams = { feedId: 'sports', entryPoint: 'home_section' };

      render(<PredictFeedView />);

      fireEvent.press(screen.getByText('Games'));

      expect(mockTrackFeedFilterChanged).not.toHaveBeenCalled();
      expect(mockSetActiveFilterId).not.toHaveBeenCalled();
    });

    it('does not track tab changed when feedId is missing from route', () => {
      mockRouteParams = {}; // no feedId

      render(<PredictFeedView />);

      // Feed config returns not-found when feedId is absent, causing a
      // navigation bounce. The tab bar is never shown; pressing tabs is
      // not possible, but we assert the tracking guard is in place.
      expect(mockTrackFeedTabChanged).not.toHaveBeenCalled();
      expect(mockTrackFeedFilterChanged).not.toHaveBeenCalled();
    });

    it('delays trackFeedViewed until a dynamic initialFilterId resolves', () => {
      // Simulate entry from a Popular Today home chip: initialFilterId targets a
      // dynamic filter that hasn't loaded yet.
      mockRouteParams = {
        feedId: 'trending',
        initialFilterId: 'soccer',
        entryPoint: 'home_chip',
      };

      // First render: dynamic filters are still loading; activeFilterId is the
      // default ('all') because the dynamic option hasn't resolved yet.
      mockUsePredictFeedConfig.mockReturnValue(
        feedConfigResult({
          feedId: 'trending',
          dynamicFilters: { status: 'loading' },
          activeFilterId: 'all',
        }),
      );

      const { rerender } = render(<PredictFeedView />);

      // trackFeedViewed must NOT fire yet — filter is still settling.
      expect(mockTrackFeedViewed).not.toHaveBeenCalled();

      // Dynamic filters resolve; the pending filter is now applied.
      mockUsePredictFeedConfig.mockReturnValue(
        feedConfigResult({
          feedId: 'trending',
          dynamicFilters: { status: 'ready' },
          activeFilterId: 'soccer',
          filters: [
            {
              id: 'all',
              titleKey: 'predict.feed.filters.all',
              params: {},
              isDynamic: false,
            },
            {
              id: 'soccer',
              label: 'Soccer',
              params: { tagSlugs: ['soccer'] },
              isDynamic: true,
            },
          ],
          activeFilter: {
            id: 'soccer',
            label: 'Soccer',
            params: { tagSlugs: ['soccer'] },
            isDynamic: true,
          },
        }),
      );

      rerender(<PredictFeedView />);

      expect(mockTrackFeedViewed).toHaveBeenCalledTimes(1);
      expect(mockTrackFeedViewed).toHaveBeenCalledWith({
        feedId: 'trending',
        tabId: 'all',
        filterId: 'soccer',
        trackingMode: 'focus',
        entryPoint: 'home_chip',
      });
    });

    it('fires trackFeedViewed with fallback filter when dynamic loading fails (unavailable)', () => {
      mockRouteParams = {
        feedId: 'trending',
        initialFilterId: 'soccer',
        entryPoint: 'home_chip',
      };

      // Initially loading.
      mockUsePredictFeedConfig.mockReturnValue(
        feedConfigResult({
          feedId: 'trending',
          dynamicFilters: { status: 'loading' },
          activeFilterId: 'all',
        }),
      );

      const { rerender } = render(<PredictFeedView />);
      expect(mockTrackFeedViewed).not.toHaveBeenCalled();

      // Dynamic filters fail — status becomes unavailable, filter stays 'all'.
      mockUsePredictFeedConfig.mockReturnValue(
        feedConfigResult({
          feedId: 'trending',
          dynamicFilters: { status: 'unavailable' },
          activeFilterId: 'all',
        }),
      );

      rerender(<PredictFeedView />);

      expect(mockTrackFeedViewed).toHaveBeenCalledTimes(1);
      expect(mockTrackFeedViewed).toHaveBeenCalledWith(
        expect.objectContaining({ filterId: 'all' }),
      );
    });

    it('fires trackFeedViewed with fallback when the requested chip is absent from a ready response', () => {
      // Regression: status becomes 'ready' but the chip was not in the API
      // response. The previous condition only fell back on 'unavailable', so
      // isFilterSettled stayed false permanently.
      mockRouteParams = {
        feedId: 'trending',
        initialFilterId: 'soccer',
        entryPoint: 'home_chip',
      };

      mockUsePredictFeedConfig.mockReturnValue(
        feedConfigResult({
          feedId: 'trending',
          dynamicFilters: { status: 'loading' },
          activeFilterId: 'all',
        }),
      );

      const { rerender } = render(<PredictFeedView />);
      expect(mockTrackFeedViewed).not.toHaveBeenCalled();

      // Dynamic filters loaded successfully but 'soccer' is not in the list.
      mockUsePredictFeedConfig.mockReturnValue(
        feedConfigResult({
          feedId: 'trending',
          dynamicFilters: { status: 'ready' },
          activeFilterId: 'all',
          // Only 'trending' is in the response — 'soccer' is absent.
          filters: [
            {
              id: 'all',
              titleKey: 'predict.feed.filters.all',
              params: {},
              isDynamic: false,
            },
            {
              id: 'trending',
              label: 'Trending',
              params: { tagSlugs: ['trending'] },
              isDynamic: true,
            },
          ],
        }),
      );

      rerender(<PredictFeedView />);

      // Must fire with the fallback ('all'), NOT block forever.
      expect(mockTrackFeedViewed).toHaveBeenCalledTimes(1);
      expect(mockTrackFeedViewed).toHaveBeenCalledWith(
        expect.objectContaining({ filterId: 'all' }),
      );
    });
  });

  describe('fallbacks (KEEP — goBack via mocked nav)', () => {
    it('navigates back when the feed is not found', () => {
      mockUsePredictFeedConfig.mockReturnValue(
        feedConfigResult({
          status: 'not-found',
          feedId: undefined,
          titleKey: undefined,
          header: undefined,
          tabs: [],
          showTabBar: false,
          activeTabId: undefined,
          filters: [],
          activeFilterId: undefined,
          activeFilter: undefined,
        }),
      );

      render(<PredictFeedView />);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByTestId(PredictFeedViewSelectorsIDs.CONTAINER),
      ).not.toBeOnTheScreen();
    });
  });
});
