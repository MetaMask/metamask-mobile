import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import PerpsMarketListView from './PerpsMarketListView';
import type { PerpsMarketData } from '../../controllers/types';
import Routes from '../../../../../constants/navigation/Routes';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn((callback) => callback()),
}));

jest.mock('../../hooks/usePerpsMarkets', () => ({
  usePerpsMarkets: jest.fn(),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(() => ({
    track: jest.fn(),
  })),
}));

jest.mock('../../hooks', () => ({
  usePerpsPerformance: jest.fn(() => ({
    startMeasure: jest.fn(),
    endMeasure: jest.fn(),
    measure: jest.fn(),
    measureAsync: jest.fn(),
  })),
}));

// Mock Animated to prevent act() warnings
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const MockedAnimated = {
    ...RN.Animated,
    timing: jest.fn(() => ({
      start: jest.fn(), // Don't call any callbacks, just do nothing
    })),
    Value: jest.fn().mockImplementation((value) => ({
      setValue: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      __getValue: () => value,
      _value: value,
    })),
    View: RN.View,
  };

  return {
    ...RN,
    Animated: MockedAnimated,
  };
});

jest.mock('../../components/PerpsMarketRowItem', () => {
  const {
    TouchableOpacity: MockTouchableOpacity,
    View,
    Text,
  } = jest.requireActual('react-native');
  return function MockPerpsMarketRowItem({
    market,
    onPress,
  }: {
    market: PerpsMarketData;
    onPress?: (market: PerpsMarketData) => void;
  }) {
    return (
      <MockTouchableOpacity
        testID={`market-row-${market.symbol}`}
        onPress={() => onPress?.(market)}
      >
        <View>
          <Text testID={`market-symbol-${market.symbol}`}>{market.symbol}</Text>
          <Text testID={`market-name-${market.symbol}`}>{market.name}</Text>
          <Text testID={`market-price-${market.symbol}`}>{market.price}</Text>
          <Text testID={`market-change-${market.symbol}`}>
            {market.change24h}
          </Text>
        </View>
      </MockTouchableOpacity>
    );
  };
});

jest.mock('../../hooks/usePerpsAssetsMetadata', () => ({
  usePerpsAssetMetadata: jest.fn(() => ({
    assetUrl: 'https://example.com/asset.png',
  })),
}));

interface FlashListProps {
  data: PerpsMarketData[];
  renderItem: ({
    item,
    index,
  }: {
    item: PerpsMarketData;
    index: number;
  }) => React.ReactElement;
  keyExtractor: (item: PerpsMarketData, index: number) => string;
  refreshing: boolean;
  onRefresh: () => void;
}

// Mock FlashList
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({
    data,
    renderItem,
    keyExtractor,
    refreshing,
    onRefresh,
  }: FlashListProps) => {
    const {
      TouchableOpacity: MockTouchableOpacity,
      View,
      ScrollView,
      Text,
    } = jest.requireActual('react-native');
    return (
      <ScrollView
        testID="flash-list"
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <View testID="flash-list-content">
          {data.map((item: PerpsMarketData, index: number) => (
            <View key={keyExtractor ? keyExtractor(item, index) : index}>
              {renderItem({ item, index })}
            </View>
          ))}
        </View>
        {refreshing && (
          <MockTouchableOpacity testID="refresh-control" onPress={onRefresh}>
            <Text>Refreshing</Text>
          </MockTouchableOpacity>
        )}
      </ScrollView>
    );
  },
}));

// Mock SkeletonPlaceholder
jest.mock('react-native-skeleton-placeholder', () => {
  const { View } = jest.requireActual('react-native');
  return function MockSkeletonPlaceholder({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <View testID="skeleton-placeholder">{children}</View>;
  };
});

// Mock Animated
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      timing: () => ({ start: jest.fn() }),
      Value: jest.fn(() => ({
        addListener: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
      })),
      View: RN.View,
    },
  };
});

describe('PerpsMarketListView', () => {
  const mockNavigation = {
    canGoBack: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    navigate: jest.fn(),
    reset: jest.fn(),
    isFocused: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    getState: jest.fn(),
    getId: jest.fn(),
    getParent: jest.fn(),
    setOptions: jest.fn(),
    setParams: jest.fn(),
  };

  const { usePerpsMarkets } = jest.requireMock('../../hooks/usePerpsMarkets');
  const mockUsePerpsMarkets = usePerpsMarkets as jest.MockedFunction<
    typeof usePerpsMarkets
  >;
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;

  const mockMarketData: PerpsMarketData[] = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      maxLeverage: '40x',
      price: '$50,000.00',
      change24h: '+$1,200.00',
      change24hPercent: '+2.46%',
      volume: '$2.5B',
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      maxLeverage: '25x',
      price: '$3,000.00',
      change24h: '-$50.00',
      change24hPercent: '-1.64%',
      volume: '$1.2B',
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      maxLeverage: '20x',
      price: '$150.00',
      change24h: '+$5.00',
      change24hPercent: '+3.45%',
      volume: '$800M',
    },
  ];

  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress console warnings for Animated during tests
    originalConsoleError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('act(...)')) {
        return;
      }
      originalConsoleError.call(console, ...args);
    };

    mockUseNavigation.mockReturnValue(
      mockNavigation as unknown as NavigationProp<ParamListBase>,
    );
    mockNavigation.canGoBack.mockReturnValue(true);

    mockUsePerpsMarkets.mockReturnValue({
      markets: mockMarketData,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });
  });

  afterEach(() => {
    // Restore original console.error
    if (originalConsoleError) {
      console.error = originalConsoleError;
    }
  });

  describe('Component Rendering', () => {
    it('renders the component with header and search button', () => {
      render(<PerpsMarketListView />);

      expect(screen.getByText('Perps')).toBeOnTheScreen();
      expect(
        screen.getByTestId('perps-market-list-search-toggle-button'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Token Volume')).toBeOnTheScreen();
      expect(screen.getByText('Last Price / 24h Change')).toBeOnTheScreen();
    });

    it('renders market list when data is available', () => {
      render(<PerpsMarketListView />);

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-SOL')).toBeOnTheScreen();
    });

    it('renders interactive elements', () => {
      render(<PerpsMarketListView />);

      // Should have search toggle button and market rows
      expect(
        screen.getByTestId('perps-market-list-search-toggle-button'),
      ).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-SOL')).toBeOnTheScreen();
    });
  });

  describe('Search Functionality', () => {
    it('shows search input when search button is pressed', () => {
      render(<PerpsMarketListView />);

      // Initially search should not be visible
      expect(screen.queryByPlaceholderText('Search')).not.toBeOnTheScreen();

      // Click search toggle button
      const searchButton = screen.getByTestId(
        'perps-market-list-search-toggle-button',
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      // Now search input should be visible
      expect(screen.getByPlaceholderText('Search')).toBeOnTheScreen();
    });

    it('filters markets based on symbol search', () => {
      render(<PerpsMarketListView />);

      // First toggle search visibility
      const searchButton = screen.getByTestId(
        'perps-market-list-search-toggle-button',
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search');
      act(() => {
        fireEvent.changeText(searchInput, 'BTC');
      });

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-SOL')).not.toBeOnTheScreen();
    });

    it('filters markets based on name search', () => {
      render(<PerpsMarketListView />);

      // First toggle search visibility
      const searchButton = screen.getByTestId(
        'perps-market-list-search-toggle-button',
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search');
      act(() => {
        fireEvent.changeText(searchInput, 'bitcoin');
      });

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-SOL')).not.toBeOnTheScreen();
    });

    it('shows clear button when search has text', () => {
      render(<PerpsMarketListView />);

      // First toggle search visibility
      const searchButton = screen.getByTestId(
        'perps-market-list-search-toggle-button',
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search');
      act(() => {
        fireEvent.changeText(searchInput, 'BTC');
      });

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();

      // Should show clear button when there's search text
      expect(
        screen.getByTestId('perps-market-list-search-clear-button'),
      ).toBeOnTheScreen();

      // Should only show the filtered market (BTC), not others
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-SOL')).not.toBeOnTheScreen();
    });

    it('clears search when clear button is pressed', () => {
      render(<PerpsMarketListView />);

      // First toggle search visibility
      const searchButton = screen.getByTestId(
        'perps-market-list-search-toggle-button',
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search');
      act(() => {
        fireEvent.changeText(searchInput, 'BTC');
      });

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();

      // Verify the search input has the typed value
      expect(searchInput.props.value).toBe('BTC');

      // Find and press clear button using testID
      const clearButton = screen.getByTestId(
        'perps-market-list-search-clear-button',
      );
      act(() => {
        fireEvent.press(clearButton);
      });

      // After pressing clear button, the search input should be empty
      expect(searchInput.props.value).toBe('');

      // All markets should be visible again
      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-SOL')).toBeOnTheScreen();
    });

    it('handles case-insensitive search', () => {
      render(<PerpsMarketListView />);

      // First toggle search visibility
      const searchButton = screen.getByTestId(
        'perps-market-list-search-toggle-button',
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search');
      act(() => {
        fireEvent.changeText(searchInput, 'ethereum');
      });

      expect(screen.getByTestId('market-row-ETH')).toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-BTC')).not.toBeOnTheScreen();
    });
  });

  describe('Market Selection', () => {
    it('calls onMarketSelect when a market is pressed', () => {
      const mockOnMarketSelect = jest.fn();
      render(<PerpsMarketListView onMarketSelect={mockOnMarketSelect} />);

      const btcRow = screen.getByTestId('market-row-BTC');
      fireEvent.press(btcRow);

      expect(mockOnMarketSelect).toHaveBeenCalledWith(mockMarketData[0]);
    });

    it('does not throw error when onMarketSelect is not provided', () => {
      render(<PerpsMarketListView />);

      const btcRow = screen.getByTestId('market-row-BTC');
      expect(() => fireEvent.press(btcRow)).not.toThrow();
    });
  });

  describe('Loading States', () => {
    it('shows skeleton loading state when data is loading', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [],
        isLoading: true,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      render(<PerpsMarketListView />);

      expect(
        screen.getAllByTestId('perps-market-list-skeleton-row'),
      ).toHaveLength(8);
    });

    it('shows header even during loading', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [],
        isLoading: true,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      render(<PerpsMarketListView />);

      expect(screen.getByText('Token Volume')).toBeOnTheScreen();
      expect(screen.getByText('Last Price / 24h Change')).toBeOnTheScreen();
    });
  });

  describe('Error Handling', () => {
    it('shows error message when there is an error', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [],
        isLoading: false,
        error: 'Network error',
        refresh: jest.fn(),
        isRefreshing: false,
      });

      render(<PerpsMarketListView />);

      expect(screen.getByText('Failed to load market data')).toBeOnTheScreen();
      expect(screen.getByText('Tap to retry')).toBeOnTheScreen();
    });

    it('calls refresh when retry button is pressed', () => {
      const mockRefresh = jest.fn();
      mockUsePerpsMarkets.mockReturnValue({
        markets: [],
        isLoading: false,
        error: 'Network error',
        refresh: mockRefresh,
        isRefreshing: false,
      });

      render(<PerpsMarketListView />);

      const retryButton = screen.getByText('Tap to retry');
      fireEvent.press(retryButton);

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('shows error only when no markets are available', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: mockMarketData,
        isLoading: false,
        error: 'Some error',
        refresh: jest.fn(),
        isRefreshing: false,
      });

      render(<PerpsMarketListView />);

      expect(
        screen.queryByText('Failed to load market data'),
      ).not.toBeOnTheScreen();
      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
    });
  });

  describe('Pull to Refresh', () => {
    it('handles pull to refresh', () => {
      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      mockUsePerpsMarkets.mockReturnValue({
        markets: mockMarketData,
        isLoading: false,
        error: null,
        refresh: mockRefresh,
        isRefreshing: false,
      });

      render(<PerpsMarketListView />);

      const flashList = screen.getByTestId('flash-list');
      fireEvent(flashList, 'onRefresh');

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('navigates to tutorial when tutorial button is pressed', () => {
      render(<PerpsMarketListView />);

      // Find the tutorial button
      const tutorialButton = screen.getByTestId(
        'perps-market-list-tutorial-button',
      );
      act(() => {
        fireEvent.press(tutorialButton);
      });

      // Should navigate to tutorial screen
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.PERPS.TUTORIAL,
      );
    });

    it('navigates back when close button is pressed', () => {
      render(<PerpsMarketListView />);

      // Find close button (first TouchableOpacity after the market rows)
      const touchableElements = screen.root.findAllByType(TouchableOpacity);
      const closeButton = touchableElements[0]; // Close button is the first one
      fireEvent.press(closeButton);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('does not navigate back when canGoBack returns false', () => {
      mockNavigation.canGoBack.mockReturnValue(false);
      render(<PerpsMarketListView />);

      // Find close button (first TouchableOpacity after the market rows)
      const touchableElements = screen.root.findAllByType(TouchableOpacity);
      const closeButton = touchableElements[0]; // Close button is the first one
      fireEvent.press(closeButton);

      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });
  });

  describe('Market Data Display', () => {
    it('displays market data correctly', () => {
      render(<PerpsMarketListView />);

      expect(screen.getByTestId('market-symbol-BTC')).toHaveTextContent('BTC');
      expect(screen.getByTestId('market-name-BTC')).toHaveTextContent(
        'Bitcoin',
      );
      expect(screen.getByTestId('market-price-BTC')).toHaveTextContent(
        '$50,000.00',
      );
      expect(screen.getByTestId('market-change-BTC')).toHaveTextContent(
        '+$1,200.00',
      );
    });

    it('displays all provided markets', () => {
      render(<PerpsMarketListView />);

      mockMarketData.forEach((market) => {
        expect(
          screen.getByTestId(`market-row-${market.symbol}`),
        ).toBeOnTheScreen();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty market data gracefully', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      render(<PerpsMarketListView />);

      expect(screen.getByText('Token Volume')).toBeOnTheScreen();
      expect(screen.getByText('Last Price / 24h Change')).toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-BTC')).not.toBeOnTheScreen();
    });

    it('handles search with no results', () => {
      render(<PerpsMarketListView />);

      // First toggle search visibility
      const searchButton = screen.getByTestId(
        'perps-market-list-search-toggle-button',
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search');
      act(() => {
        fireEvent.changeText(searchInput, 'NONEXISTENT');
      });

      expect(screen.queryByTestId('market-row-BTC')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-SOL')).not.toBeOnTheScreen();
    });

    it('handles search with whitespace', () => {
      render(<PerpsMarketListView />);

      // First toggle search visibility
      const searchButton = screen.getByTestId(
        'perps-market-list-search-toggle-button',
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search');
      act(() => {
        fireEvent.changeText(searchInput, '   ');
      });

      // Should show all markets when search is only whitespace
      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-SOL')).toBeOnTheScreen();
    });
  });
});
