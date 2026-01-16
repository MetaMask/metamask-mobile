import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { PredictMarketListSelectorsIDs } from '../../Predict.testIds';
import PredictFeed from './PredictFeed';

jest.mock('react-native-pager-view', () => {
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ children, onPageSelected }) => (
      <View testID="pager-view-mock">
        {MockReact.Children.map(
          children,
          (child: React.ReactElement, index: number) =>
            MockReact.cloneElement(child, {
              testID: `pager-page-${index}`,
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
  return {
    PredictBalance: jest.fn(() => (
      <View testID="predict-balance-mock">
        <Text>Balance Component</Text>
      </View>
    )),
  };
});

jest.mock('../../hooks/usePredictMarketData', () => ({
  usePredictMarketData: jest.fn(),
}));

import { usePredictMarketData } from '../../hooks/usePredictMarketData';

const mockUsePredictMarketData = usePredictMarketData as jest.Mock;

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
  return {
    __esModule: true,
    default: jest.fn(() => <View testID="predict-offline-mock" />),
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
  return {
    TabsBar: jest.fn(({ tabs, activeIndex, onTabPress, testID }) => (
      <View testID={testID}>
        {tabs.map((tab: { key: string; label: string }, index: number) => (
          <Pressable
            key={tab.key}
            testID={`tab-${tab.key}`}
            onPress={() => onTabPress(index)}
          >
            <Text>{tab.label}</Text>
          </Pressable>
        ))}
        <View testID={`active-tab-${activeIndex}`} />
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
    mockUseFocusEffect.mockImplementation((callback: () => void) => callback());
    mockGetInstance.mockReturnValue(mockSessionManager);
    mockUseFeedScrollManager.mockReturnValue({
      headerTranslateY: { value: 0 },
      headerHidden: false,
      headerHeight: 100,
      tabBarHeight: 48,
      layoutReady: true,
      activeIndex: 0,
      setActiveIndex: jest.fn(),
      scrollHandler: jest.fn(),
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
      expect(getByTestId('predict-search-button')).toBeOnTheScreen();
      expect(getByTestId('predict-balance-mock')).toBeOnTheScreen();
      expect(getByTestId('predict-feed-tabs')).toBeOnTheScreen();
      expect(getByTestId('pager-view-mock')).toBeOnTheScreen();
    });

    it('hides search overlay on initial render', () => {
      const { queryByTestId } = render(<PredictFeed />);

      expect(queryByTestId('search-icon')).toBeNull();
    });
  });

  describe('search functionality', () => {
    it('opens search overlay when search button pressed', () => {
      const { getByTestId } = render(<PredictFeed />);

      fireEvent.press(getByTestId('predict-search-button'));

      expect(getByTestId('search-icon')).toBeOnTheScreen();
    });

    it('closes search overlay when cancel button pressed', () => {
      const { getByTestId, getByText, queryByTestId } = render(<PredictFeed />);

      fireEvent.press(getByTestId('predict-search-button'));
      fireEvent.press(getByText('Cancel'));

      expect(queryByTestId('search-icon')).toBeNull();
    });
  });

  describe('tab navigation', () => {
    it('renders all five category tabs', () => {
      const { getByTestId } = render(<PredictFeed />);

      expect(getByTestId('tab-trending')).toBeOnTheScreen();
      expect(getByTestId('tab-new')).toBeOnTheScreen();
      expect(getByTestId('tab-sports')).toBeOnTheScreen();
      expect(getByTestId('tab-crypto')).toBeOnTheScreen();
      expect(getByTestId('tab-politics')).toBeOnTheScreen();
    });

    it('does not track analytics when tab pressed', () => {
      const { getByTestId } = render(<PredictFeed />);

      fireEvent.press(getByTestId('tab-sports'));

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

      expect(getByTestId('skeleton-loading-trending-1')).toBeOnTheScreen();
      expect(getByTestId('skeleton-loading-trending-2')).toBeOnTheScreen();
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

      expect(getByTestId('predict-offline-mock')).toBeOnTheScreen();
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

      expect(getByTestId('predict-empty-state-trending')).toBeOnTheScreen();
    });
  });

  describe('search overlay interactions', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('displays search results when query is entered', async () => {
      const { getByTestId, getByPlaceholderText } = render(<PredictFeed />);

      fireEvent.press(getByTestId('predict-search-button'));
      const searchInput = getByPlaceholderText('Search prediction markets');

      // Type the query
      await act(async () => {
        fireEvent.changeText(searchInput, 'bitcoin');
      });

      // Advance timer and let state updates flush
      await act(async () => {
        await jest.advanceTimersByTimeAsync(200);
      });

      expect(getByTestId('predict-search-result-0')).toBeOnTheScreen();
      expect(getByTestId('predict-search-result-1')).toBeOnTheScreen();
    });

    it('displays skeleton loaders while search is fetching', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isFetching: true,
        isFetchingMore: false,
        error: null,
        hasMore: false,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { getByTestId, getByPlaceholderText } = render(<PredictFeed />);

      fireEvent.press(getByTestId('predict-search-button'));
      const searchInput = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(searchInput, 'bitcoin');

      expect(getByTestId('search-skeleton-1')).toBeOnTheScreen();
    });

    it('clears search query when clear button is pressed', async () => {
      const { getByTestId, getByPlaceholderText, queryByTestId } = render(
        <PredictFeed />,
      );

      fireEvent.press(getByTestId('predict-search-button'));
      const searchInput = getByPlaceholderText('Search prediction markets');

      await act(async () => {
        fireEvent.changeText(searchInput, 'test query');
        await jest.advanceTimersByTimeAsync(200);
      });
      fireEvent.press(getByTestId('clear-button'));

      expect(queryByTestId('predict-search-result-0')).toBeNull();
    });
  });

  describe('search debouncing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('debounces search query by 200ms', async () => {
      const { getByTestId, getByPlaceholderText } = render(<PredictFeed />);

      fireEvent.press(getByTestId('predict-search-button'));
      const searchInput = getByPlaceholderText('Search prediction markets');

      // Clear previous mock calls
      mockUsePredictMarketData.mockClear();

      // Type the search query
      fireEvent.changeText(searchInput, 'bitcoin');

      // Verify skeleton is shown immediately (while debouncing)
      expect(getByTestId('search-skeleton-1')).toBeOnTheScreen();

      // Advance timers by less than debounce delay
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      // The last call should still have empty query (debounced query hasn't updated yet)
      const callsBeforeDebounce = mockUsePredictMarketData.mock.calls;
      const lastCallBeforeDebounce =
        callsBeforeDebounce[callsBeforeDebounce.length - 1];
      expect(lastCallBeforeDebounce[0].q).toBe('');

      // Advance timers to complete debounce
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      // After debounce, the query should be passed to the hook
      const callsAfterDebounce = mockUsePredictMarketData.mock.calls;
      const lastCallAfterDebounce =
        callsAfterDebounce[callsAfterDebounce.length - 1];
      expect(lastCallAfterDebounce[0].q).toBe('bitcoin');
    });

    it('shows skeleton loaders while debouncing', async () => {
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

      const { getByTestId, getByPlaceholderText } = render(<PredictFeed />);

      fireEvent.press(getByTestId('predict-search-button'));
      const searchInput = getByPlaceholderText('Search prediction markets');

      fireEvent.changeText(searchInput, 'test');

      // Even though API is not fetching, skeleton should show while debouncing
      expect(getByTestId('search-skeleton-1')).toBeOnTheScreen();

      // After debounce completes, results should show
      await act(async () => {
        await jest.advanceTimersByTimeAsync(200);
      });

      expect(getByTestId('predict-search-result-0')).toBeOnTheScreen();
    });

    it('cancels previous debounce timer on new input', async () => {
      const { getByTestId, getByPlaceholderText } = render(<PredictFeed />);

      fireEvent.press(getByTestId('predict-search-button'));
      const searchInput = getByPlaceholderText('Search prediction markets');

      mockUsePredictMarketData.mockClear();

      // Type first query
      fireEvent.changeText(searchInput, 'bit');
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      // Type second query before debounce completes
      fireEvent.changeText(searchInput, 'bitcoin');
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      // The debounced query should still be empty (timer was reset)
      const callsMidway = mockUsePredictMarketData.mock.calls;
      const lastCallMidway = callsMidway[callsMidway.length - 1];
      expect(lastCallMidway[0].q).toBe('');

      // Complete the debounce for second query
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      // Now it should have the full query
      const callsAfter = mockUsePredictMarketData.mock.calls;
      const lastCallAfter = callsAfter[callsAfter.length - 1];
      expect(lastCallAfter[0].q).toBe('bitcoin');
    });

    it('clears debounced query when cancel is pressed', async () => {
      const { getByTestId, getByPlaceholderText, getByText, queryByTestId } =
        render(<PredictFeed />);

      fireEvent.press(getByTestId('predict-search-button'));
      const searchInput = getByPlaceholderText('Search prediction markets');

      await act(async () => {
        fireEvent.changeText(searchInput, 'bitcoin');
        await jest.advanceTimersByTimeAsync(200);
      });

      // Press cancel
      fireEvent.press(getByText('Cancel'));

      // Search overlay should be closed
      expect(queryByTestId('search-icon')).toBeNull();

      // Re-open search - the component should have been unmounted and remounted,
      // so the debounced query should be cleared
      fireEvent.press(getByTestId('predict-search-button'));

      // Verify the search input is empty
      const newSearchInput = getByPlaceholderText('Search prediction markets');
      expect(newSearchInput.props.value).toBe('');
    });
  });

  describe('pager view interactions', () => {
    it('updates active index and tracks analytics when page changes via swipe', () => {
      const mockSetActiveIndex = jest.fn();
      mockUseFeedScrollManager.mockReturnValue({
        headerTranslateY: { value: 0 },
        headerHidden: false,
        headerHeight: 100,
        tabBarHeight: 48,
        layoutReady: true,
        activeIndex: 0,
        setActiveIndex: mockSetActiveIndex,
        scrollHandler: jest.fn(),
      });

      const { getByTestId } = render(<PredictFeed />);
      const page1 = getByTestId('pager-page-1');

      fireEvent(page1, 'onTouchEnd');

      expect(mockSetActiveIndex).toHaveBeenCalledWith(1);
      expect(mockSessionManager.trackTabChange).toHaveBeenCalledWith('new');
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
        activeIndex: 0,
        setActiveIndex: jest.fn(),
        scrollHandler: jest.fn(),
      });

      const { queryByTestId } = render(<PredictFeed />);

      expect(queryByTestId('pager-view-mock')).toBeNull();
    });
  });

  describe('market list rendering', () => {
    it('renders market cards with correct testIDs using 1-based indexing', () => {
      const { getByTestId } = render(<PredictFeed />);

      expect(
        getByTestId('predict-market-list-trending-card-1'),
      ).toBeOnTheScreen();
      expect(
        getByTestId('predict-market-list-trending-card-2'),
      ).toBeOnTheScreen();
    });
  });

  describe('search empty states', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('displays no results message when search returns empty', async () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isFetching: false,
        isFetchingMore: false,
        error: null,
        hasMore: false,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { getByTestId, getByPlaceholderText, getByText } = render(
        <PredictFeed />,
      );

      fireEvent.press(getByTestId('predict-search-button'));
      const searchInput = getByPlaceholderText('Search prediction markets');

      // Type the query and wait for debounce
      await act(async () => {
        fireEvent.changeText(searchInput, 'nonexistent');
      });

      // Advance timer and let state updates flush
      await act(async () => {
        await jest.advanceTimersByTimeAsync(200);
      });

      expect(getByText(/No results found/i)).toBeOnTheScreen();
    });

    it('displays error state in search when fetch fails', async () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isFetching: false,
        isFetchingMore: false,
        error: new Error('Search error'),
        hasMore: false,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { getByTestId, getByPlaceholderText, getAllByTestId } = render(
        <PredictFeed />,
      );

      fireEvent.press(getByTestId('predict-search-button'));
      const searchInput = getByPlaceholderText('Search prediction markets');

      // Type the query and wait for debounce
      await act(async () => {
        fireEvent.changeText(searchInput, 'test');
      });

      // Advance timer and let state updates flush
      await act(async () => {
        await jest.advanceTimersByTimeAsync(200);
      });

      const offlineElements = getAllByTestId('predict-offline-mock');
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

      expect(getByTestId('skeleton-footer-trending-1')).toBeOnTheScreen();
      expect(getByTestId('skeleton-footer-trending-2')).toBeOnTheScreen();
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
});
