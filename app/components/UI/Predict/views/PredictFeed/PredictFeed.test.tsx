import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { PredictMarketListSelectorsIDs } from '../../../../../../tests/selectors/Predict/Predict.selectors';
import PredictFeed from './PredictFeed';

/**
 * Mock Strategy:
 * - Only mock child components with complex dependencies and external services
 * - Do NOT mock: Design system, theme utilities, SafeAreaView, Reanimated
 * - Child components are mocked because they have their own test coverage
 * and we're testing the parent's state management and component orchestration
 */

// Mock child components - have their own test coverage
jest.mock('../../components/PredictFeedHeader', () => {
  const { View, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(
      ({ isSearchVisible, onSearchToggle, onSearchCancel, onSearch }) => (
        <View testID="predict-feed-header-mock">
          <Pressable testID="mock-search-toggle" onPress={onSearchToggle} />
          <Pressable testID="mock-search-cancel" onPress={onSearchCancel} />
          <Pressable
            testID="mock-search-input"
            onPress={() => onSearch('test query')}
          />
          {isSearchVisible && <View testID="search-visible-indicator" />}
        </View>
      ),
    ),
  };
});

jest.mock('../../components/PredictBalance', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    PredictBalance: jest.fn(({ onLayout }) => (
      <View testID="predict-balance-mock" onLayout={() => onLayout?.(100)}>
        <Text>Balance Component</Text>
      </View>
    )),
  };
});

jest.mock('../../components/PredictMarketList', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ isSearchVisible, searchQuery }) => (
      <View testID="predict-market-list-mock">
        <Text>Market List</Text>
        {isSearchVisible && (
          <Text testID="market-list-search-mode">Searching</Text>
        )}
        {searchQuery && <Text testID="market-list-query">{searchQuery}</Text>}
      </View>
    )),
  };
});

// Mock navigation hooks
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: jest.fn(() => ({
    params: {
      entryPoint: 'homepage_new_prediction',
    },
  })),
  useFocusEffect: jest.fn((callback) => callback()),
}));

// Mock session manager - external analytics service
jest.mock('../../services/PredictFeedSessionManager', () => {
  const mockInstance = {
    startSession: jest.fn(),
    endSession: jest.fn(),
    trackPageView: jest.fn(),
    trackTabChange: jest.fn(),
    enableAppStateListener: jest.fn(),
    disableAppStateListener: jest.fn(),
  };

  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => mockInstance),
    },
  };
});

// Mock shared scroll coordinator - complex shared state management
jest.mock('../../hooks/useSharedScrollCoordinator', () => ({
  useSharedScrollCoordinator: jest.fn(() => ({
    balanceCardOffset: { value: 0 },
    balanceCardHeight: { value: 0 },
    setBalanceCardHeight: jest.fn(),
    setCurrentCategory: jest.fn(),
    getTabScrollPosition: jest.fn(() => 0),
    setTabScrollPosition: jest.fn(),
    getScrollHandler: jest.fn(),
    isBalanceCardHidden: jest.fn(() => false),
    updateBalanceCardHiddenState: jest.fn(),
  })),
}));

describe('PredictFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial render', () => {
    it('displays container with feed header, balance, and market list', () => {
      const { getByTestId } = render(<PredictFeed />);

      expect(
        getByTestId(PredictMarketListSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      expect(getByTestId('predict-feed-header-mock')).toBeOnTheScreen();
      expect(getByTestId('predict-balance-mock')).toBeOnTheScreen();
      expect(getByTestId('predict-market-list-mock')).toBeOnTheScreen();
    });

    it('starts with search hidden and empty query', () => {
      const { queryByTestId } = render(<PredictFeed />);

      expect(queryByTestId('search-visible-indicator')).toBeNull();
      expect(queryByTestId('market-list-query')).toBeNull();
    });
  });

  describe('search toggle functionality', () => {
    it('shows search and hides balance when toggle pressed', () => {
      const { getByTestId, queryByTestId } = render(<PredictFeed />);
      const toggleButton = getByTestId('mock-search-toggle');

      fireEvent.press(toggleButton);

      expect(getByTestId('search-visible-indicator')).toBeOnTheScreen();
      expect(queryByTestId('predict-balance-mock')).toBeNull();
      expect(getByTestId('market-list-search-mode')).toBeOnTheScreen();
    });
  });

  describe('search cancel functionality', () => {
    it('hides search, shows balance, and clears query when cancel pressed', () => {
      const { getByTestId, queryByTestId } = render(<PredictFeed />);
      const toggleButton = getByTestId('mock-search-toggle');
      const searchInput = getByTestId('mock-search-input');
      fireEvent.press(toggleButton);
      fireEvent.press(searchInput);
      expect(getByTestId('search-visible-indicator')).toBeOnTheScreen();
      expect(getByTestId('market-list-query')).toBeOnTheScreen();

      const cancelButton = getByTestId('mock-search-cancel');
      fireEvent.press(cancelButton);

      expect(queryByTestId('search-visible-indicator')).toBeNull();
      expect(getByTestId('predict-balance-mock')).toBeOnTheScreen();
      expect(queryByTestId('market-list-query')).toBeNull();
    });
  });

  describe('search functionality', () => {
    it('updates and displays search query in market list', () => {
      const { getByTestId, getByText } = render(<PredictFeed />);
      const searchInput = getByTestId('mock-search-input');

      fireEvent.press(searchInput);

      expect(getByText('test query')).toBeOnTheScreen();
      expect(getByTestId('market-list-query')).toBeOnTheScreen();
    });
  });

  describe('complete search workflow', () => {
    it('executes full search cycle from toggle to cancel with all state changes', () => {
      const { getByTestId, getByText, queryByTestId } = render(<PredictFeed />);
      const toggleButton = getByTestId('mock-search-toggle');
      const searchInput = getByTestId('mock-search-input');
      const cancelButton = getByTestId('mock-search-cancel');

      fireEvent.press(toggleButton);
      expect(getByTestId('search-visible-indicator')).toBeOnTheScreen();
      expect(queryByTestId('predict-balance-mock')).toBeNull();

      fireEvent.press(searchInput);
      expect(getByText('test query')).toBeOnTheScreen();

      fireEvent.press(cancelButton);
      expect(queryByTestId('search-visible-indicator')).toBeNull();
      expect(getByTestId('predict-balance-mock')).toBeOnTheScreen();
      expect(queryByTestId('market-list-query')).toBeNull();
    });

    it('keeps market list visible throughout entire search workflow', () => {
      const { getByTestId } = render(<PredictFeed />);
      const marketList = getByTestId('predict-market-list-mock');

      expect(marketList).toBeOnTheScreen();

      fireEvent.press(getByTestId('mock-search-toggle'));
      expect(marketList).toBeOnTheScreen();

      fireEvent.press(getByTestId('mock-search-input'));
      expect(marketList).toBeOnTheScreen();

      fireEvent.press(getByTestId('mock-search-cancel'));
      expect(marketList).toBeOnTheScreen();
    });

    it('toggles search visibility multiple times independently of query state', () => {
      const { getByTestId, queryByTestId } = render(<PredictFeed />);
      const toggleButton = getByTestId('mock-search-toggle');
      const cancelButton = getByTestId('mock-search-cancel');

      fireEvent.press(toggleButton);
      expect(getByTestId('search-visible-indicator')).toBeOnTheScreen();

      fireEvent.press(cancelButton);
      expect(queryByTestId('search-visible-indicator')).toBeNull();

      fireEvent.press(toggleButton);
      expect(getByTestId('search-visible-indicator')).toBeOnTheScreen();

      fireEvent.press(cancelButton);
      expect(queryByTestId('search-visible-indicator')).toBeNull();
    });
  });
});
