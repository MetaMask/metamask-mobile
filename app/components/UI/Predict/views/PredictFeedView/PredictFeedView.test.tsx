import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PredictFeedView from './PredictFeedView';
import {
  PredictFeedViewSelectorsIDs,
  getPredictFeedViewSelector,
  PredictMarketListSelectorsIDs,
  PredictSearchSelectorsIDs,
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
const mockUsePredictMarketList = jest.fn();
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
}));

jest.mock('../../hooks/usePredictFeedConfig', () => ({
  usePredictFeedConfig: (...args: unknown[]) =>
    mockUsePredictFeedConfig(...args),
}));

jest.mock('../../hooks/usePredictMarketList', () => ({
  usePredictMarketList: (...args: unknown[]) =>
    mockUsePredictMarketList(...args),
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
    { id: 'basketball', titleKey: 'predict.feed.tabs.basketball' },
    { id: 'tennis', titleKey: 'predict.feed.tabs.tennis' },
  ],
  showTabBar: true,
  activeTabId: 'basketball',
  setActiveTabId: mockSetActiveTabId,
  filters: [
    {
      id: 'all',
      titleKey: 'predict.feed.filters.all',
      params: {},
      isDynamic: false,
    },
    {
      id: 'live',
      titleKey: 'predict.feed.filters.live',
      params: { live: true },
      isDynamic: false,
    },
  ],
  dynamicFilters: { status: 'idle' },
  activeFilterId: 'all',
  setActiveFilterId: mockSetActiveFilterId,
  activeFilter: {
    id: 'all',
    titleKey: 'predict.feed.filters.all',
    params: {},
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
    mockUsePredictMarketList.mockReturnValue(marketListResult());
    mockUsePredictSearch.mockReturnValue(searchResult());
  });

  it('renders the header title from config', () => {
    render(<PredictFeedView />);

    expect(
      screen.getByTestId(PredictFeedViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(screen.getByText('Sports')).toBeOnTheScreen();
  });

  it('forwards the route feedId and active filter params to the data hooks', () => {
    mockRouteParams = {
      feedId: 'sports',
      initialTabId: 'tennis',
      initialFilterId: 'live',
    };

    render(<PredictFeedView />);

    expect(mockUsePredictFeedConfig).toHaveBeenCalledWith('sports', {
      initialTabId: 'tennis',
      initialFilterId: 'live',
    });
    expect(mockUsePredictMarketList).toHaveBeenCalledWith(
      {},
      { enabled: true },
    );
  });

  it('forwards transactionActiveAbTests from the route to market cards and the search overlay', () => {
    const transactionActiveAbTests = [
      { name: 'predict_test', variant: 'treatment' },
    ];
    mockRouteParams = { feedId: 'sports', transactionActiveAbTests };
    mockUsePredictMarketList.mockReturnValue(
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

  describe('tab bar visibility', () => {
    it('shows the tab bar and tab labels for a multi-tab feed', () => {
      render(<PredictFeedView />);

      expect(
        screen.getByTestId(PredictFeedViewSelectorsIDs.TABS),
      ).toBeOnTheScreen();
      expect(screen.getAllByText('Basketball').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Tennis').length).toBeGreaterThan(0);
    });

    it('hides the tab bar for a single-tab feed but still renders filters', () => {
      mockUsePredictFeedConfig.mockReturnValue(
        feedConfigResult({
          feedId: 'live',
          titleKey: 'predict.feed.live',
          tabs: [{ id: 'live', titleKey: 'predict.feed.live' }],
          showTabBar: false,
          activeTabId: 'live',
          filters: [
            {
              id: 'live',
              titleKey: 'predict.feed.filters.live',
              params: { live: true },
              isDynamic: false,
            },
          ],
          activeFilterId: 'live',
        }),
      );

      render(<PredictFeedView />);

      expect(
        screen.queryByTestId(PredictFeedViewSelectorsIDs.TABS),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(PredictFeedViewSelectorsIDs.FILTERS),
      ).toBeOnTheScreen();
    });
  });

  describe('selection', () => {
    it('renders filter chips for the active tab', () => {
      render(<PredictFeedView />);

      expect(
        screen.getByTestId(PredictFeedViewSelectorsIDs.FILTERS),
      ).toBeOnTheScreen();
      expect(screen.getByText('All')).toBeOnTheScreen();
      expect(screen.getByText('Live')).toBeOnTheScreen();
    });

    it('calls setActiveFilterId when a filter chip is pressed', () => {
      render(<PredictFeedView />);

      fireEvent.press(screen.getByText('Live'));

      expect(mockSetActiveFilterId).toHaveBeenCalledWith('live');
    });
  });

  describe('market list states', () => {
    it('renders skeleton loaders while initially loading', () => {
      mockUsePredictMarketList.mockReturnValue(
        marketListResult({ isLoading: true }),
      );

      render(<PredictFeedView />);

      expect(
        screen.getByTestId(getPredictFeedViewSelector.skeleton(1)),
      ).toBeOnTheScreen();
    });

    it('renders market cards when data is present', () => {
      mockUsePredictMarketList.mockReturnValue(
        marketListResult({
          markets: [
            createMarket('1', 'Lakers win'),
            createMarket('2', 'Heat win'),
          ],
        }),
      );

      render(<PredictFeedView />);

      expect(
        screen.getByTestId(getPredictFeedViewSelector.marketCard(1)),
      ).toHaveTextContent('Lakers win');
      expect(
        screen.getByTestId(getPredictFeedViewSelector.marketCard(2)),
      ).toHaveTextContent('Heat win');
    });

    it('renders the empty state when there are no markets', () => {
      render(<PredictFeedView />);

      expect(
        screen.getByTestId(PredictFeedViewSelectorsIDs.EMPTY_STATE),
      ).toBeOnTheScreen();
    });

    it('renders the offline state and retries on press', () => {
      mockUsePredictMarketList.mockReturnValue(
        marketListResult({ error: new Error('Network error') }),
      );

      render(<PredictFeedView />);

      expect(
        screen.getByTestId(PredictFeedViewSelectorsIDs.ERROR_STATE),
      ).toBeOnTheScreen();

      fireEvent.press(screen.getByTestId('predict-feed-view-offline-retry'));
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('keeps the list (not the full-screen error) when a next-page fetch fails with markets already loaded', () => {
      mockUsePredictMarketList.mockReturnValue(
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
      mockUsePredictMarketList.mockReturnValue(
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

  describe('search', () => {
    it('opens search from the header search icon', () => {
      render(<PredictFeedView />);

      fireEvent.press(
        screen.getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON),
      );

      expect(mockShowSearch).toHaveBeenCalledTimes(1);
    });

    it('mounts the search overlay when search is visible', () => {
      mockUsePredictSearch.mockReturnValue(
        searchResult({ isSearchVisible: true }),
      );

      render(<PredictFeedView />);

      expect(
        screen.getByTestId('predict-feed-view-search-overlay'),
      ).toBeOnTheScreen();
    });
  });

  describe('fallbacks', () => {
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
