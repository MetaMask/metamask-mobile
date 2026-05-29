import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import {
  PredictMarketListSelectorsIDs,
  PredictSearchSelectorsIDs,
  PredictFeedSelectorsIDs,
  PredictFeedMockSelectorsIDs,
  getPredictMarketListSelector,
  getPredictSearchSelector,
  getPredictFeedSelector,
  getPredictFeedMockSelector,
} from '../../Predict.testIds';
import { DEFAULT_PREDICT_WORLD_CUP_FLAG } from '../../constants/flags';
import { buildPredictWorldCupAllQuery } from '../../utils/worldCup';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.default.createAnimatedComponent = (
    Component: React.ComponentType,
  ) => Component;
  return Reanimated;
});

import PredictFeed from './PredictFeed';

jest.mock('../../hooks/useFeaturedCarouselData', () => ({
  useFeaturedCarouselData: () => ({
    markets: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('react-native-pager-view', () => {
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  // Jest mock factory runs before module imports; require() needed for testIds
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const PredictTestIds = require('../../Predict.testIds');
  return {
    __esModule: true,
    default: jest.fn(({ children, onPageSelected }) => (
      <View testID={PredictTestIds.PredictFeedMockSelectorsIDs.PAGER_VIEW}>
        {MockReact.Children.map(
          children,
          (child: React.ReactElement, index: number) =>
            MockReact.cloneElement(child, {
              testID:
                PredictTestIds.getPredictFeedMockSelector.pagerPage(index),
              onTouchEnd: () =>
                onPageSelected?.({ nativeEvent: { position: index } }),
            }),
        )}
      </View>
    )),
  };
});

jest.mock('../../components/PredictBalance', () => {
  const { View, Text } = jest.requireActual('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const PredictTestIds = require('../../Predict.testIds');
  return {
    PredictBalance: jest.fn(() => (
      <View testID={PredictTestIds.PredictFeedMockSelectorsIDs.BALANCE_MOCK}>
        <Text>Balance Component</Text>
      </View>
    )),
  };
});

jest.mock('../../hooks/usePredictMarketData', () => ({
  usePredictMarketData: jest.fn(),
}));

jest.mock('../../hooks/usePredictSearchMarketData', () => ({
  usePredictSearchMarketData: jest.fn(),
}));

import { usePredictMarketData } from '../../hooks/usePredictMarketData';
import { usePredictSearchMarketData } from '../../hooks/usePredictSearchMarketData';

const mockUsePredictMarketData = usePredictMarketData as jest.Mock;
const mockUsePredictSearchMarketData = usePredictSearchMarketData as jest.Mock;

const mockUseSelector = jest.fn();
const mockHotTabFlag: { enabled: boolean; queryParams?: string } = {
  enabled: false,
  queryParams: undefined,
};
let mockIsWorldCupMainFeedTabEnabled = false;
let mockWorldCupConfig = DEFAULT_PREDICT_WORLD_CUP_FLAG;
let mockIsFeaturedCarouselEnabled = false;
let mockIsUpDownEnabled = false;

jest.mock('react-redux', () => {
  const actualReactRedux = jest.requireActual('react-redux');
  return {
    ...actualReactRedux,
    useSelector: (...args: unknown[]) => mockUseSelector(...args),
  };
});

jest.mock('../../selectors/featureFlags', () => ({
  selectPredictFeaturedCarouselEnabledFlag:
    'selectPredictFeaturedCarouselEnabledFlag',
  selectPredictHotTabFlag: 'selectPredictHotTabFlag',
  selectPredictUpDownEnabledFlag: 'selectPredictUpDownEnabledFlag',
  selectPredictWorldCupConfig: 'selectPredictWorldCupConfig',
  selectPredictWorldCupMainFeedTabEnabledFlag:
    'selectPredictWorldCupMainFeedTabEnabledFlag',
}));

jest.mock('../../../../hooks/useDebouncedValue', () => ({
  useDebouncedValue: jest.fn(),
}));

import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';

const mockUseDebouncedValue = useDebouncedValue as jest.Mock;

jest.mock('../../hooks/useFeedScrollManager', () => ({
  useFeedScrollManager: jest.fn(),
}));

import { useFeedScrollManager } from '../../hooks/useFeedScrollManager';

const mockUseFeedScrollManager = useFeedScrollManager as jest.Mock;

jest.mock('../../components/PredictMarket', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ testID }) => (
      <View testID={testID}>
        <Text>Market Card</Text>
      </View>
    )),
  };
});

jest.mock('../../components/PredictMarketSkeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ testID }) => <View testID={testID} />),
  };
});

jest.mock('../../components/PredictOffline', () => {
  const { View } = jest.requireActual('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const PredictTestIds = require('../../Predict.testIds');
  return {
    __esModule: true,
    default: jest.fn(() => (
      <View testID={PredictTestIds.PredictFeedMockSelectorsIDs.OFFLINE_MOCK} />
    )),
  };
});

jest.mock('@shopify/flash-list', () => {
  const MockReact = jest.requireActual('react');
  const { View, ScrollView } = jest.requireActual('react-native');
  const MockFlashList = MockReact.forwardRef(
    (
      {
        data,
        renderItem,
        keyExtractor,
        testID,
        ListFooterComponent,
      }: {
        data: { id: string }[];
        renderItem: (info: {
          item: { id: string };
          index: number;
        }) => React.ReactNode;
        keyExtractor: (item: { id: string }) => string;
        testID?: string;
        ListFooterComponent?: React.ComponentType | React.ReactElement | null;
      },
      ref: React.Ref<unknown>,
    ) => {
      MockReact.useImperativeHandle(ref, () => ({}));
      return (
        <ScrollView testID={testID}>
          {data?.map((item, index) => (
            <View key={keyExtractor?.(item) ?? item.id}>
              {renderItem({ item, index })}
            </View>
          ))}
          {ListFooterComponent &&
            (typeof ListFooterComponent === 'function' ? (
              <ListFooterComponent />
            ) : (
              ListFooterComponent
            ))}
        </ScrollView>
      );
    },
  );
  return {
    FlashList: MockFlashList,
    FlashListRef: {},
    FlashListProps: {},
  };
});

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
    useRoute: jest.fn(),
    useFocusEffect: jest.fn(),
  };
});

import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';

const mockUseNavigation = useNavigation as jest.Mock;
const mockUseRoute = useRoute as jest.Mock;
const mockUseFocusEffect = useFocusEffect as jest.Mock;

const mockNavigation = {
  canGoBack: jest.fn(() => true),
  goBack: jest.fn(),
  navigate: jest.fn(),
};

jest.mock('../../services/PredictFeedSessionManager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

import PredictFeedSessionManager from '../../services/PredictFeedSessionManager';

const mockGetInstance = PredictFeedSessionManager.getInstance as jest.Mock;

const mockSessionManager = {
  startSession: jest.fn(),
  endSession: jest.fn(),
  trackPageView: jest.fn(),
  trackTabChange: jest.fn(),
  enableAppStateListener: jest.fn(),
  disableAppStateListener: jest.fn(),
};

jest.mock('../../hooks/usePredictMeasurement', () => ({
  usePredictMeasurement: jest.fn(),
}));

jest.mock('../../../../../component-library/components-temp/Tabs', () => {
  const { View, Pressable, Text } = jest.requireActual('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const PredictTestIds = require('../../Predict.testIds');
  return {
    TabsBar: jest.fn(({ tabs, activeIndex, onTabPress, testID }) => (
      <View testID={testID}>
        {tabs.map((tab: { key: string; label: string }, index: number) => (
          <Pressable
            key={tab.key}
            testID={PredictTestIds.getPredictFeedMockSelector.tabKey(tab.key)}
            onPress={() => onTabPress(index)}
          >
            <Text>{tab.label}</Text>
          </Pressable>
        ))}
        <View
          testID={PredictTestIds.getPredictFeedMockSelector.activeTab(
            activeIndex,
          )}
        />
      </View>
    )),
    TabItem: {},
  };
});

describe('PredictFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue(mockNavigation);
    mockUseRoute.mockReturnValue({
      params: {
        entryPoint: 'homepage_new_prediction',
      },
    });
    mockUseFocusEffect.mockImplementation(() => undefined);
    mockGetInstance.mockReturnValue(mockSessionManager);
    mockHotTabFlag.enabled = false;
    mockHotTabFlag.queryParams = undefined;
    mockIsWorldCupMainFeedTabEnabled = false;
    mockWorldCupConfig = DEFAULT_PREDICT_WORLD_CUP_FLAG;
    mockIsFeaturedCarouselEnabled = false;
    mockIsUpDownEnabled = false;
    mockUseSelector.mockImplementation((selector: string) => {
      switch (selector) {
        case 'selectPredictFeaturedCarouselEnabledFlag':
          return mockIsFeaturedCarouselEnabled;
        case 'selectPredictHotTabFlag':
          return mockHotTabFlag;
        case 'selectPredictUpDownEnabledFlag':
          return mockIsUpDownEnabled;
        case 'selectPredictWorldCupConfig':
          return mockWorldCupConfig;
        case 'selectPredictWorldCupMainFeedTabEnabledFlag':
          return mockIsWorldCupMainFeedTabEnabled;
        default:
          return undefined;
      }
    });
    mockUseFeedScrollManager.mockReturnValue({
      headerTranslateY: { value: 0 },
      headerHidden: false,
      headerHeight: 100,
      tabBarHeight: 48,
      layoutReady: true,
      onTabSwitch: jest.fn(),
      scrollHandler: jest.fn(),
      onHeaderLayout: jest.fn(),
      onTabBarLayout: jest.fn(),
    });
    mockUsePredictMarketData.mockReturnValue({
      marketData: [
        { id: '1', title: 'Test Market 1' },
        { id: '2', title: 'Test Market 2' },
      ],
      isFetching: false,
      isFetchingMore: false,
      error: null,
      hasMore: false,
      refetch: jest.fn(),
      fetchMore: jest.fn(),
    });
    mockUsePredictSearchMarketData.mockReturnValue({
      marketData: [
        { id: '1', title: 'Test Market 1' },
        { id: '2', title: 'Test Market 2' },
      ],
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseDebouncedValue.mockImplementation((value: string) => value);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial render', () => {
    it('renders container with top nav, balance, tabs, and market list', () => {
      const { getByTestId } = render(<PredictFeed />);

      expect(
        getByTestId(PredictMarketListSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PredictMarketListSelectorsIDs.BACK_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PredictFeedMockSelectorsIDs.BALANCE_MOCK),
      ).toBeOnTheScreen();
      expect(getByTestId(PredictFeedSelectorsIDs.TABS)).toBeOnTheScreen();
      expect(
        getByTestId(PredictFeedMockSelectorsIDs.PAGER_VIEW),
      ).toBeOnTheScreen();
    });

    it('hides search overlay on initial render', () => {
      const { queryByPlaceholderText } = render(<PredictFeed />);

      expect(queryByPlaceholderText('Search prediction markets')).toBeNull();
    });
  });

  describe('search functionality', () => {
    it('opens search overlay when search button pressed', () => {
      const { getByTestId, getByPlaceholderText } = render(<PredictFeed />);

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));

      expect(
        getByPlaceholderText('Search prediction markets'),
      ).toBeOnTheScreen();
    });

    it('closes search overlay when cancel button pressed', () => {
      const { getByTestId, getByText, queryByPlaceholderText } = render(
        <PredictFeed />,
      );

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      fireEvent.press(getByText('Cancel'));

      expect(queryByPlaceholderText('Search prediction markets')).toBeNull();
    });
  });

  describe('tab navigation', () => {
    it('renders all six category tabs', () => {
      const { getByTestId } = render(<PredictFeed />);

      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('trending')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('ending-soon')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('new')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('sports')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('crypto')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('politics')),
      ).toBeOnTheScreen();
    });

    it('does not track analytics when tab pressed', () => {
      const { getByTestId } = render(<PredictFeed />);

      fireEvent.press(getByTestId(getPredictFeedMockSelector.tabKey('sports')));

      expect(mockSessionManager.trackTabChange).not.toHaveBeenCalled();
    });
  });

  describe('session management', () => {
    it('starts session and enables app state listener on mount', () => {
      render(<PredictFeed />);

      expect(mockSessionManager.enableAppStateListener).toHaveBeenCalled();
      expect(mockSessionManager.startSession).toHaveBeenCalledWith(
        'homepage_new_prediction',
        'trending',
      );
    });

    it('ends session and disables app state listener on unmount', () => {
      const { unmount } = render(<PredictFeed />);

      unmount();

      expect(mockSessionManager.endSession).toHaveBeenCalled();
      expect(mockSessionManager.disableAppStateListener).toHaveBeenCalled();
    });

    it('tracks page view on screen focus', () => {
      render(<PredictFeed />);

      const focusCallbacks = mockUseFocusEffect.mock.calls.map(
        (call) => call[0],
      );
      focusCallbacks.forEach((cb) => cb?.());

      expect(mockSessionManager.trackPageView).toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('calls goBack when back button pressed and navigation can go back', () => {
      const { getByTestId } = render(<PredictFeed />);

      fireEvent.press(getByTestId(PredictMarketListSelectorsIDs.BACK_BUTTON));

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('navigates to wallet home when back button pressed and navigation cannot go back', () => {
      mockNavigation.canGoBack.mockReturnValue(false);
      const { getByTestId } = render(<PredictFeed />);

      fireEvent.press(getByTestId(PredictMarketListSelectorsIDs.BACK_BUTTON));

      expect(mockNavigation.navigate).toHaveBeenCalled();
    });
  });

  describe('loading states', () => {
    it('renders skeleton loaders when fetching initial data', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isFetching: true,
        isFetchingMore: false,
        error: null,
        hasMore: false,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { getByTestId } = render(<PredictFeed />);

      expect(
        getByTestId(getPredictFeedSelector.skeletonLoading('trending', 1)),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedSelector.skeletonLoading('trending', 2)),
      ).toBeOnTheScreen();
    });
  });

  describe('error states', () => {
    it('renders offline component when fetch error occurs', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isFetching: false,
        isFetchingMore: false,
        error: new Error('Network error'),
        hasMore: false,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { getByTestId } = render(<PredictFeed />);

      expect(
        getByTestId(PredictFeedMockSelectorsIDs.OFFLINE_MOCK),
      ).toBeOnTheScreen();
    });
  });

  describe('empty states', () => {
    it('renders empty state message when no markets available', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isFetching: false,
        isFetchingMore: false,
        error: null,
        hasMore: false,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { getByTestId } = render(<PredictFeed />);

      expect(
        getByTestId(getPredictFeedSelector.emptyState('trending')),
      ).toBeOnTheScreen();
    });
  });

  describe('search overlay interactions', () => {
    it('displays search results when query is entered', () => {
      const { getByTestId, getByPlaceholderText } = render(<PredictFeed />);

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      const searchInput = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(searchInput, 'bitcoin');

      expect(
        getByTestId(getPredictSearchSelector.resultCard(0)),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictSearchSelector.resultCard(1)),
      ).toBeOnTheScreen();
    });

    it('displays skeleton loaders while search is fetching', () => {
      mockUsePredictSearchMarketData.mockReturnValue({
        marketData: [],
        isFetching: true,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByPlaceholderText } = render(<PredictFeed />);

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      const searchInput = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(searchInput, 'bitcoin');

      expect(
        getByTestId(getPredictFeedSelector.searchSkeleton(1)),
      ).toBeOnTheScreen();
    });

    it('clears search query when clear button is pressed', () => {
      const { getByTestId, getByPlaceholderText, queryByTestId } = render(
        <PredictFeed />,
      );

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      const searchInput = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(searchInput, 'test query');
      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.CLEAR_BUTTON));

      // After clearing search, the clear button should no longer be visible
      // (only shows when searchQuery.length > 0)
      expect(
        queryByTestId(PredictSearchSelectorsIDs.CLEAR_BUTTON),
      ).not.toBeOnTheScreen();
      // Trending results visible when no search query is empty
      expect(
        getByTestId(getPredictSearchSelector.resultCard(0)),
      ).toBeOnTheScreen();
    });
  });

  describe('pager view interactions', () => {
    it('updates active index and tracks analytics when page changes via swipe', () => {
      const mockOnTabSwitch = jest.fn();
      mockUseFeedScrollManager.mockReturnValue({
        headerTranslateY: { value: 0 },
        headerHidden: false,
        headerHeight: 100,
        tabBarHeight: 48,
        layoutReady: true,
        onTabSwitch: mockOnTabSwitch,
        scrollHandler: jest.fn(),
        onHeaderLayout: jest.fn(),
        onTabBarLayout: jest.fn(),
      });

      const { getByTestId } = render(<PredictFeed />);
      const page1 = getByTestId(getPredictFeedMockSelector.pagerPage(1));

      fireEvent(page1, 'onTouchEnd');

      expect(mockOnTabSwitch).toHaveBeenCalledWith(1);
      expect(mockSessionManager.trackTabChange).toHaveBeenCalledWith(
        'ending-soon',
      );
    });
  });

  describe('layout states', () => {
    it('hides pager view when layout is not ready', () => {
      mockUseFeedScrollManager.mockReturnValue({
        headerTranslateY: { value: 0 },
        headerHidden: false,
        headerHeight: 100,
        tabBarHeight: 48,
        layoutReady: false,
        onTabSwitch: jest.fn(),
        scrollHandler: jest.fn(),
        onHeaderLayout: jest.fn(),
        onTabBarLayout: jest.fn(),
      });

      const { queryByTestId } = render(<PredictFeed />);

      expect(queryByTestId(PredictFeedMockSelectorsIDs.PAGER_VIEW)).toBeNull();
    });
  });

  describe('market list rendering', () => {
    it('renders market cards with correct testIDs using 1-based indexing', () => {
      const { getByTestId } = render(<PredictFeed />);

      expect(
        getByTestId(
          getPredictMarketListSelector.marketCardByCategory('trending', 1),
        ),
      ).toBeOnTheScreen();
      expect(
        getByTestId(
          getPredictMarketListSelector.marketCardByCategory('trending', 2),
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('search empty states', () => {
    it('displays no results message when search returns empty', () => {
      mockUsePredictSearchMarketData.mockReturnValue({
        marketData: [],
        isFetching: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getByPlaceholderText, getByText } = render(
        <PredictFeed />,
      );

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      const searchInput = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(searchInput, 'nonexistent');

      expect(getByText(/No results found/i)).toBeOnTheScreen();
    });

    it('does not display no results message before the user enters a query', () => {
      mockUsePredictSearchMarketData.mockReturnValue({
        marketData: [],
        isFetching: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, queryByText } = render(<PredictFeed />);

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));

      expect(queryByText(/No results found/i)).toBeNull();
    });

    it('does not display search error state before the user enters a query', () => {
      mockUsePredictSearchMarketData.mockReturnValue({
        marketData: [],
        isFetching: false,
        error: 'Search error',
        refetch: jest.fn(),
      });

      const { getByTestId, queryByTestId } = render(<PredictFeed />);

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));

      expect(
        queryByTestId(PredictFeedMockSelectorsIDs.OFFLINE_MOCK),
      ).toBeNull();
    });

    it('displays error state in search when fetch fails', () => {
      mockUsePredictSearchMarketData.mockReturnValue({
        marketData: [],
        isFetching: false,
        error: 'Search error',
        refetch: jest.fn(),
      });

      const { getByTestId, getByPlaceholderText, getAllByTestId } = render(
        <PredictFeed />,
      );

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      const searchInput = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(searchInput, 'test');

      const offlineElements = getAllByTestId(
        PredictFeedMockSelectorsIDs.OFFLINE_MOCK,
      );
      expect(offlineElements.length).toBeGreaterThan(0);
    });
  });

  describe('pagination', () => {
    it('renders footer skeleton when fetching more data', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [
          { id: '1', title: 'Test Market 1' },
          { id: '2', title: 'Test Market 2' },
        ],
        isFetching: false,
        isFetchingMore: true,
        error: null,
        hasMore: true,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { getByTestId } = render(<PredictFeed />);

      expect(
        getByTestId(getPredictFeedSelector.skeletonFooter('trending', 1)),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedSelector.skeletonFooter('trending', 2)),
      ).toBeOnTheScreen();
    });
  });

  describe('route params', () => {
    it('starts session with entry point from route params', () => {
      mockUseRoute.mockReturnValue({
        params: {
          entryPoint: 'wallet_action_button',
        },
      });

      render(<PredictFeed />);

      expect(mockSessionManager.startSession).toHaveBeenCalledWith(
        'wallet_action_button',
        'trending',
      );
    });

    it('starts session with undefined entry point when not provided', () => {
      mockUseRoute.mockReturnValue({
        params: {},
      });

      render(<PredictFeed />);

      expect(mockSessionManager.startSession).toHaveBeenCalledWith(
        undefined,
        'trending',
      );
    });
  });

  describe('search debounce behavior', () => {
    it('passes debounced search query to usePredictSearchMarketData', () => {
      mockUseDebouncedValue.mockReturnValue('debounced-query');
      const { getByTestId, getByPlaceholderText } = render(<PredictFeed />);

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      const searchInput = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(searchInput, 'bitcoin');

      expect(mockUsePredictSearchMarketData).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'debounced-query' }),
      );
    });

    it('displays skeleton loaders when debouncing search input', () => {
      mockUseDebouncedValue.mockReturnValue('');
      mockUsePredictSearchMarketData.mockReturnValue({
        marketData: [],
        isFetching: false,
        error: null,
        refetch: jest.fn(),
      });
      const { getByTestId, getByPlaceholderText } = render(<PredictFeed />);

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      const searchInput = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(searchInput, 'bitcoin');

      expect(
        getByTestId(getPredictFeedSelector.searchSkeleton(1)),
      ).toBeOnTheScreen();
    });

    it('displays search results after debounce completes', () => {
      mockUseDebouncedValue.mockReturnValue('bitcoin');
      mockUsePredictSearchMarketData.mockReturnValue({
        marketData: [
          { id: '1', title: 'Bitcoin Market 1' },
          { id: '2', title: 'Bitcoin Market 2' },
        ],
        isFetching: false,
        error: null,
        refetch: jest.fn(),
      });
      const { getByTestId, getByPlaceholderText } = render(<PredictFeed />);

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      const searchInput = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(searchInput, 'bitcoin');

      expect(
        getByTestId(getPredictSearchSelector.resultCard(0)),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictSearchSelector.resultCard(1)),
      ).toBeOnTheScreen();
    });

    it('invokes useDebouncedValue with 200ms delay', () => {
      const { getByTestId, getByPlaceholderText } = render(<PredictFeed />);

      fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));
      const searchInput = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(searchInput, 'test');

      expect(mockUseDebouncedValue).toHaveBeenCalledWith('test', 200);
    });
  });

  describe('hot tab feature flag', () => {
    it('renders Hot tab first when flag is enabled', () => {
      mockHotTabFlag.enabled = true;
      mockHotTabFlag.queryParams = 'tag_id=149&order=volume24hr';

      const { getByTestId } = render(<PredictFeed />);

      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('hot')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('trending')),
      ).toBeOnTheScreen();
    });

    it('passes Hot tab custom query params to market data fetching', () => {
      mockHotTabFlag.enabled = true;
      mockHotTabFlag.queryParams = 'tag_id=149&order=volume24hr';

      render(<PredictFeed />);

      const hotTabCall = mockUsePredictMarketData.mock.calls.find(
        (call: [{ category?: string }]) => call[0].category === 'hot',
      );

      expect(hotTabCall?.[0]).toEqual(
        expect.objectContaining({
          category: 'hot',
          customQueryParams: 'tag_id=149&order=volume24hr',
        }),
      );
    });

    it('does not render Hot tab when flag is disabled', () => {
      mockHotTabFlag.enabled = false;
      mockHotTabFlag.queryParams = undefined;

      const { queryByTestId, getByTestId } = render(<PredictFeed />);

      expect(
        queryByTestId(getPredictFeedMockSelector.tabKey('hot')),
      ).toBeNull();
      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('trending')),
      ).toBeOnTheScreen();
    });

    it('renders seven category tabs when hot tab is enabled', () => {
      mockHotTabFlag.enabled = true;
      mockHotTabFlag.queryParams = 'tag_id=149';

      const { getByTestId } = render(<PredictFeed />);

      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('hot')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('trending')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('ending-soon')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('new')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('sports')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('crypto')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('politics')),
      ).toBeOnTheScreen();
    });

    it('renders seven pager pages when hot tab is enabled', () => {
      mockHotTabFlag.enabled = true;
      mockHotTabFlag.queryParams = 'tag_id=149&tag_id=100995&order=volume24hr';

      const { getByTestId } = render(<PredictFeed />);

      expect(
        getByTestId(getPredictFeedMockSelector.pagerPage(0)),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.pagerPage(1)),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.pagerPage(2)),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.pagerPage(3)),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.pagerPage(4)),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.pagerPage(5)),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.pagerPage(6)),
      ).toBeOnTheScreen();
    });

    it('tracks tab change for hot tab when swiped to', () => {
      mockHotTabFlag.enabled = true;
      mockHotTabFlag.queryParams = 'tag_id=149';

      const mockOnTabSwitch = jest.fn();
      mockUseFeedScrollManager.mockReturnValue({
        headerTranslateY: { value: 0 },
        headerHidden: false,
        headerHeight: 100,
        tabBarHeight: 48,
        layoutReady: true,
        onTabSwitch: mockOnTabSwitch,
        scrollHandler: jest.fn(),
        onHeaderLayout: jest.fn(),
        onTabBarLayout: jest.fn(),
      });

      const { getByTestId } = render(<PredictFeed />);
      const hotTabPage = getByTestId(getPredictFeedMockSelector.pagerPage(0));

      fireEvent(hotTabPage, 'onTouchEnd');

      expect(mockOnTabSwitch).toHaveBeenCalledWith(0);
      expect(mockSessionManager.trackTabChange).toHaveBeenCalledWith('hot');
    });

    it('starts session with hot as initial tab when requested via deeplink', () => {
      mockHotTabFlag.enabled = true;
      mockHotTabFlag.queryParams = 'tag_id=149';
      mockUseRoute.mockReturnValue({
        params: {
          entryPoint: 'homepage_new_prediction',
          tab: 'hot',
        },
      });

      render(<PredictFeed />);

      expect(mockSessionManager.startSession).toHaveBeenCalledWith(
        'homepage_new_prediction',
        'hot',
      );
    });
  });

  describe('World Cup tab feature flag', () => {
    it('does not render World Cup tab when flag is disabled', () => {
      const { queryByTestId } = render(<PredictFeed />);

      expect(
        queryByTestId(getPredictFeedMockSelector.tabKey('world-cup')),
      ).toBeNull();
    });

    it('renders World Cup tab and page first when flag is enabled', () => {
      mockIsWorldCupMainFeedTabEnabled = true;
      mockWorldCupConfig = {
        ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
        enabled: true,
        showMainFeedTab: true,
      };

      const { getByTestId } = render(<PredictFeed />);

      expect(
        getByTestId(getPredictFeedMockSelector.tabKey('world-cup')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedMockSelector.pagerPage(0)),
      ).toBeOnTheScreen();
      expect(mockSessionManager.startSession).toHaveBeenCalledWith(
        'homepage_new_prediction',
        'world-cup',
      );
    });

    it('places World Cup before Hot when both flags are enabled', () => {
      mockIsWorldCupMainFeedTabEnabled = true;
      mockWorldCupConfig = {
        ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
        enabled: true,
        showMainFeedTab: true,
      };
      mockHotTabFlag.enabled = true;
      mockHotTabFlag.queryParams = 'tag_id=149';

      const mockOnTabSwitch = jest.fn();
      mockUseFeedScrollManager.mockReturnValue({
        headerTranslateY: { value: 0 },
        headerHidden: false,
        headerHeight: 100,
        tabBarHeight: 48,
        layoutReady: true,
        onTabSwitch: mockOnTabSwitch,
        scrollHandler: jest.fn(),
        onHeaderLayout: jest.fn(),
        onTabBarLayout: jest.fn(),
      });

      const { getByTestId } = render(<PredictFeed />);

      fireEvent(
        getByTestId(getPredictFeedMockSelector.pagerPage(0)),
        'onTouchEnd',
      );
      fireEvent(
        getByTestId(getPredictFeedMockSelector.pagerPage(1)),
        'onTouchEnd',
      );

      expect(mockSessionManager.trackTabChange).toHaveBeenCalledWith(
        'world-cup',
      );
      expect(mockSessionManager.trackTabChange).toHaveBeenCalledWith('hot');
    });

    it('passes World Cup custom query params to market data fetching', () => {
      mockIsWorldCupMainFeedTabEnabled = true;
      mockWorldCupConfig = {
        ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
        enabled: true,
        showMainFeedTab: true,
        tagSlug: 'custom-world-cup',
      };

      render(<PredictFeed />);

      const worldCupTabCall = mockUsePredictMarketData.mock.calls.find(
        (call: [{ category?: string }]) => call[0].category === 'world-cup',
      );

      expect(worldCupTabCall?.[0]).toEqual(
        expect.objectContaining({
          category: 'world-cup',
          customQueryParams: buildPredictWorldCupAllQuery(mockWorldCupConfig),
        }),
      );
    });
  });

  describe('query deeplink parameter', () => {
    it.each([['bitcoin'], ['ethereum'], ['solana']])(
      'opens search overlay when query param "%s" is provided in route params',
      (query) => {
        mockUseRoute.mockReturnValue({
          params: {
            entryPoint: 'deeplink',
            query,
          },
        });

        const { getByPlaceholderText } = render(<PredictFeed />);

        expect(
          getByPlaceholderText('Search prediction markets'),
        ).toBeOnTheScreen();
      },
    );

    it.each([['bitcoin'], ['ethereum']])(
      'pre-fills search input with query "%s" from route params',
      (query) => {
        mockUseRoute.mockReturnValue({
          params: {
            entryPoint: 'deeplink',
            query,
          },
        });

        const { getByPlaceholderText } = render(<PredictFeed />);

        const searchInput = getByPlaceholderText('Search prediction markets');
        expect(searchInput.props.value).toBe(query);
      },
    );

    it('closes search overlay when cancel is pressed', () => {
      mockUseRoute.mockReturnValue({
        params: {
          entryPoint: 'deeplink',
          query: 'bitcoin',
        },
      });

      const { getByText, queryByPlaceholderText, getByPlaceholderText } =
        render(<PredictFeed />);

      expect(
        getByPlaceholderText('Search prediction markets'),
      ).toBeOnTheScreen();

      fireEvent.press(getByText('Cancel'));
      expect(queryByPlaceholderText('Search prediction markets')).toBeNull();
    });
  });

  describe('hideHeader prop', () => {
    it('renders header nav by default when hideHeader is not provided', () => {
      const { getByTestId } = render(<PredictFeed />);

      expect(
        getByTestId(PredictMarketListSelectorsIDs.BACK_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON),
      ).toBeOnTheScreen();
    });

    it('hides header nav when hideHeader is true', () => {
      const { queryByTestId } = render(<PredictFeed hideHeader />);

      expect(
        queryByTestId(PredictMarketListSelectorsIDs.BACK_BUTTON),
      ).toBeNull();
      expect(queryByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON)).toBeNull();
    });

    it('still renders container, tabs, and pager when hideHeader is true', () => {
      const { getByTestId } = render(<PredictFeed hideHeader />);

      expect(
        getByTestId(PredictMarketListSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      expect(getByTestId(PredictFeedSelectorsIDs.TABS)).toBeOnTheScreen();
      expect(
        getByTestId(PredictFeedMockSelectorsIDs.PAGER_VIEW),
      ).toBeOnTheScreen();
    });
  });

  describe('onHeaderHiddenChange prop', () => {
    it('passes onHeaderHiddenChange callback to useFeedScrollManager', () => {
      const onHeaderHiddenChange = jest.fn();

      render(<PredictFeed onHeaderHiddenChange={onHeaderHiddenChange} />);

      expect(mockUseFeedScrollManager).toHaveBeenCalledWith(
        expect.objectContaining({ onHeaderHiddenChange }),
      );
    });

    it('passes undefined to useFeedScrollManager when onHeaderHiddenChange is not provided', () => {
      render(<PredictFeed />);

      expect(mockUseFeedScrollManager).toHaveBeenCalledWith(
        expect.objectContaining({ onHeaderHiddenChange: undefined }),
      );
    });
  });
});
