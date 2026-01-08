import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { PredictMarketListSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
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
      expect(getByTestId('predict-back-button')).toBeOnTheScreen();
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

    it('tracks analytics when tab pressed', () => {
      const { getByTestId } = render(<PredictFeed />);

      fireEvent.press(getByTestId('tab-sports'));

      expect(mockSessionManager.trackTabChange).toHaveBeenCalledWith('sports');
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
    it('calls goBack when back button pressed', () => {
      const { getByTestId } = render(<PredictFeed />);

      fireEvent.press(getByTestId('predict-back-button'));

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });
});
