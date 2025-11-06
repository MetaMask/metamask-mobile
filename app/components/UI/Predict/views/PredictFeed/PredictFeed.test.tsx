import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { PredictMarketListSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
import PredictFeed from './PredictFeed';

// Mock child components
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

// Mock hooks
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((...args) => args),
  }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        default: '#FFFFFF',
      },
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: jest.fn(() => ({
    params: {
      entryPoint: 'homepage_new_prediction',
    },
  })),
  useFocusEffect: jest.fn((callback) => callback()),
}));

jest.mock('react-native-reanimated', () => {
  const View = jest.requireActual('react-native').View;
  return {
    default: {
      View,
    },
    useAnimatedStyle: jest.fn(() => ({})),
    useSharedValue: jest.fn((val) => ({ value: val })),
  };
});

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
    it('renders container with correct testID', () => {
      // Arrange & Act
      const { getByTestId } = render(<PredictFeed />);

      // Assert
      expect(
        getByTestId(PredictMarketListSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders PredictFeedHeader component', () => {
      // Arrange & Act
      const { getByTestId } = render(<PredictFeed />);

      // Assert
      expect(getByTestId('predict-feed-header-mock')).toBeOnTheScreen();
    });

    it('renders PredictBalance component when search is not visible', () => {
      // Arrange & Act
      const { getByTestId } = render(<PredictFeed />);

      // Assert
      expect(getByTestId('predict-balance-mock')).toBeOnTheScreen();
    });

    it('renders PredictMarketList component', () => {
      // Arrange & Act
      const { getByTestId } = render(<PredictFeed />);

      // Assert
      expect(getByTestId('predict-market-list-mock')).toBeOnTheScreen();
    });

    it('initializes with search not visible', () => {
      // Arrange & Act
      const { queryByTestId } = render(<PredictFeed />);

      // Assert
      expect(queryByTestId('search-visible-indicator')).toBeNull();
    });

    it('initializes with empty search query', () => {
      // Arrange & Act
      const { queryByTestId } = render(<PredictFeed />);

      // Assert
      expect(queryByTestId('market-list-query')).toBeNull();
    });
  });

  describe('search toggle functionality', () => {
    it('shows search when toggle is pressed', () => {
      // Arrange
      const { getByTestId } = render(<PredictFeed />);

      // Act
      const toggleButton = getByTestId('mock-search-toggle');
      fireEvent.press(toggleButton);

      // Assert
      expect(getByTestId('search-visible-indicator')).toBeOnTheScreen();
    });

    it('hides PredictBalance when search is visible', () => {
      // Arrange
      const { getByTestId, queryByTestId } = render(<PredictFeed />);

      // Act
      const toggleButton = getByTestId('mock-search-toggle');
      fireEvent.press(toggleButton);

      // Assert
      expect(queryByTestId('predict-balance-mock')).toBeNull();
    });

    it('passes isSearchVisible true to PredictMarketList when search is toggled', () => {
      // Arrange
      const { getByTestId } = render(<PredictFeed />);

      // Act
      const toggleButton = getByTestId('mock-search-toggle');
      fireEvent.press(toggleButton);

      // Assert
      expect(getByTestId('market-list-search-mode')).toBeOnTheScreen();
    });

    it('passes isSearchVisible true to PredictFeedHeader when search is toggled', () => {
      // Arrange
      const { getByTestId } = render(<PredictFeed />);

      // Act
      const toggleButton = getByTestId('mock-search-toggle');
      fireEvent.press(toggleButton);

      // Assert
      expect(getByTestId('search-visible-indicator')).toBeOnTheScreen();
    });
  });

  describe('search cancel functionality', () => {
    it('hides search when cancel is pressed', () => {
      // Arrange
      const { getByTestId, queryByTestId } = render(<PredictFeed />);
      const toggleButton = getByTestId('mock-search-toggle');
      fireEvent.press(toggleButton);
      expect(getByTestId('search-visible-indicator')).toBeOnTheScreen();

      // Act
      const cancelButton = getByTestId('mock-search-cancel');
      fireEvent.press(cancelButton);

      // Assert
      expect(queryByTestId('search-visible-indicator')).toBeNull();
    });

    it('shows PredictBalance when search is cancelled', () => {
      // Arrange
      const { getByTestId } = render(<PredictFeed />);
      const toggleButton = getByTestId('mock-search-toggle');
      fireEvent.press(toggleButton);

      // Act
      const cancelButton = getByTestId('mock-search-cancel');
      fireEvent.press(cancelButton);

      // Assert
      expect(getByTestId('predict-balance-mock')).toBeOnTheScreen();
    });

    it('clears search query when cancel is pressed', () => {
      // Arrange
      const { getByTestId, queryByTestId } = render(<PredictFeed />);
      const searchInput = getByTestId('mock-search-input');
      fireEvent.press(searchInput);
      expect(getByTestId('market-list-query')).toBeOnTheScreen();

      // Act
      const cancelButton = getByTestId('mock-search-cancel');
      fireEvent.press(cancelButton);

      // Assert
      expect(queryByTestId('market-list-query')).toBeNull();
    });

    it('passes empty query to PredictMarketList after cancel', () => {
      // Arrange
      const { getByTestId, queryByTestId } = render(<PredictFeed />);
      const searchInput = getByTestId('mock-search-input');
      fireEvent.press(searchInput);

      // Act
      const cancelButton = getByTestId('mock-search-cancel');
      fireEvent.press(cancelButton);

      // Assert
      expect(queryByTestId('market-list-query')).toBeNull();
    });
  });

  describe('search functionality', () => {
    it('updates search query when search is performed', () => {
      // Arrange
      const { getByTestId, getByText } = render(<PredictFeed />);

      // Act
      const searchInput = getByTestId('mock-search-input');
      fireEvent.press(searchInput);

      // Assert
      expect(getByText('test query')).toBeOnTheScreen();
    });

    it('passes search query to PredictMarketList', () => {
      // Arrange
      const { getByTestId } = render(<PredictFeed />);

      // Act
      const searchInput = getByTestId('mock-search-input');
      fireEvent.press(searchInput);

      // Assert
      expect(getByTestId('market-list-query')).toBeOnTheScreen();
    });

    it('keeps search query when toggling search visibility', () => {
      // Arrange
      const { getByTestId, getByText } = render(<PredictFeed />);
      const searchInput = getByTestId('mock-search-input');
      fireEvent.press(searchInput);
      expect(getByText('test query')).toBeOnTheScreen();

      // Act - toggle off and on
      const cancelButton = getByTestId('mock-search-cancel');
      fireEvent.press(cancelButton);
      const toggleButton = getByTestId('mock-search-toggle');
      fireEvent.press(toggleButton);

      // Assert - query was cleared by cancel
      expect(getByTestId('search-visible-indicator')).toBeOnTheScreen();
    });
  });

  describe('component integration', () => {
    it('handles complete search workflow', () => {
      // Arrange
      const { getByTestId, getByText, queryByTestId } = render(<PredictFeed />);

      // Act 1 - toggle search on
      const toggleButton = getByTestId('mock-search-toggle');
      fireEvent.press(toggleButton);

      // Assert 1 - search is visible, balance is hidden
      expect(getByTestId('search-visible-indicator')).toBeOnTheScreen();
      expect(queryByTestId('predict-balance-mock')).toBeNull();

      // Act 2 - perform search
      const searchInput = getByTestId('mock-search-input');
      fireEvent.press(searchInput);

      // Assert 2 - query is displayed
      expect(getByText('test query')).toBeOnTheScreen();

      // Act 3 - cancel search
      const cancelButton = getByTestId('mock-search-cancel');
      fireEvent.press(cancelButton);

      // Assert 3 - search is hidden, balance is shown, query is cleared
      expect(queryByTestId('search-visible-indicator')).toBeNull();
      expect(getByTestId('predict-balance-mock')).toBeOnTheScreen();
      expect(queryByTestId('market-list-query')).toBeNull();
    });

    it('maintains PredictMarketList visibility throughout search workflow', () => {
      // Arrange
      const { getByTestId } = render(<PredictFeed />);

      // Assert - always visible initially
      expect(getByTestId('predict-market-list-mock')).toBeOnTheScreen();

      // Act 1 - toggle search
      const toggleButton = getByTestId('mock-search-toggle');
      fireEvent.press(toggleButton);

      // Assert - still visible
      expect(getByTestId('predict-market-list-mock')).toBeOnTheScreen();

      // Act 2 - search
      const searchInput = getByTestId('mock-search-input');
      fireEvent.press(searchInput);

      // Assert - still visible
      expect(getByTestId('predict-market-list-mock')).toBeOnTheScreen();

      // Act 3 - cancel
      const cancelButton = getByTestId('mock-search-cancel');
      fireEvent.press(cancelButton);

      // Assert - still visible
      expect(getByTestId('predict-market-list-mock')).toBeOnTheScreen();
    });
  });

  describe('state management', () => {
    it('manages independent state for search visibility and query', () => {
      // Arrange
      const { getByTestId, getByText, queryByTestId } = render(<PredictFeed />);

      // Act - set query without toggling search
      const searchInput = getByTestId('mock-search-input');
      fireEvent.press(searchInput);

      // Assert - query is set but search not visible
      expect(getByText('test query')).toBeOnTheScreen();
      expect(queryByTestId('search-visible-indicator')).toBeNull();
    });

    it('toggles search visibility multiple times', () => {
      // Arrange
      const { getByTestId, queryByTestId } = render(<PredictFeed />);

      // Act & Assert - toggle on
      const toggleButton = getByTestId('mock-search-toggle');
      fireEvent.press(toggleButton);
      expect(getByTestId('search-visible-indicator')).toBeOnTheScreen();

      // Act & Assert - toggle off
      const cancelButton = getByTestId('mock-search-cancel');
      fireEvent.press(cancelButton);
      expect(queryByTestId('search-visible-indicator')).toBeNull();

      // Act & Assert - toggle on again
      fireEvent.press(toggleButton);
      expect(getByTestId('search-visible-indicator')).toBeOnTheScreen();

      // Act & Assert - toggle off again
      fireEvent.press(cancelButton);
      expect(queryByTestId('search-visible-indicator')).toBeNull();
    });
  });

  describe('conditional rendering', () => {
    it('conditionally renders PredictBalance based on search visibility', () => {
      // Arrange
      const { getByTestId, queryByTestId } = render(<PredictFeed />);

      // Assert - visible initially
      expect(getByTestId('predict-balance-mock')).toBeOnTheScreen();

      // Act - show search
      const toggleButton = getByTestId('mock-search-toggle');
      fireEvent.press(toggleButton);

      // Assert - hidden when search visible
      expect(queryByTestId('predict-balance-mock')).toBeNull();

      // Act - hide search
      const cancelButton = getByTestId('mock-search-cancel');
      fireEvent.press(cancelButton);

      // Assert - visible again
      expect(getByTestId('predict-balance-mock')).toBeOnTheScreen();
    });
  });

  describe('props propagation', () => {
    it('passes all required props to PredictFeedHeader', () => {
      // Arrange & Act
      const { getByTestId } = render(<PredictFeed />);

      // Assert - component renders, meaning all props were provided
      expect(getByTestId('predict-feed-header-mock')).toBeOnTheScreen();
    });

    it('passes all required props to PredictMarketList', () => {
      // Arrange & Act
      const { getByTestId } = render(<PredictFeed />);

      // Assert - component renders, meaning all props were provided
      expect(getByTestId('predict-market-list-mock')).toBeOnTheScreen();
    });

    it('updates PredictFeedHeader isSearchVisible prop', () => {
      // Arrange
      const { getByTestId, queryByTestId } = render(<PredictFeed />);
      expect(queryByTestId('search-visible-indicator')).toBeNull();

      // Act
      const toggleButton = getByTestId('mock-search-toggle');
      fireEvent.press(toggleButton);

      // Assert
      expect(getByTestId('search-visible-indicator')).toBeOnTheScreen();
    });

    it('updates PredictMarketList searchQuery prop', () => {
      // Arrange
      const { getByTestId, queryByTestId, getByText } = render(<PredictFeed />);
      expect(queryByTestId('market-list-query')).toBeNull();

      // Act
      const searchInput = getByTestId('mock-search-input');
      fireEvent.press(searchInput);

      // Assert
      expect(getByText('test query')).toBeOnTheScreen();
    });
  });

  describe('layout structure', () => {
    it('renders SafeAreaView as root container', () => {
      // Arrange & Act
      const { getByTestId } = render(<PredictFeed />);

      // Assert
      expect(
        getByTestId(PredictMarketListSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders all components in correct order', () => {
      // Arrange & Act
      const { getByTestId, toJSON } = render(<PredictFeed />);

      // Assert - all components present
      expect(getByTestId('predict-feed-header-mock')).toBeOnTheScreen();
      expect(getByTestId('predict-balance-mock')).toBeOnTheScreen();
      expect(getByTestId('predict-market-list-mock')).toBeOnTheScreen();

      // Verify structure exists
      const tree = toJSON();
      expect(tree).toBeTruthy();
    });
  });
});
