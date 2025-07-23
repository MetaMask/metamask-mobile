import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import PerpsMarketListView from './PerpsMarketListView';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import type { PerpsMarketData } from '../../controllers/types';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../hooks/usePerpsMarkets', () => ({
  usePerpsMarkets: jest.fn(),
}));

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

  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('Component Rendering', () => {
    it('renders the component with header and search bar', () => {
      render(<PerpsMarketListView />);

      expect(screen.getByText('Perpetual Markets')).toBeOnTheScreen();
      expect(screen.getByPlaceholderText('Search')).toBeOnTheScreen();
      expect(screen.getByText('Token Volume')).toBeOnTheScreen();
      expect(screen.getByText('Last Price / 24h Change')).toBeOnTheScreen();
    });

    it('renders market list when data is available', () => {
      render(<PerpsMarketListView />);

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-SOL')).toBeOnTheScreen();
    });

    it('renders close button', () => {
      render(<PerpsMarketListView />);

      // Find close button by looking for TouchableOpacity elements
      const touchableElements = screen.root.findAllByType(TouchableOpacity);
      expect(touchableElements.length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('filters markets based on symbol search', () => {
      render(<PerpsMarketListView />);

      const searchInput = screen.getByPlaceholderText('Search');
      fireEvent.changeText(searchInput, 'BTC');

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-SOL')).not.toBeOnTheScreen();
    });

    it('filters markets based on name search', () => {
      render(<PerpsMarketListView />);

      const searchInput = screen.getByPlaceholderText('Search');
      fireEvent.changeText(searchInput, 'bitcoin');

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-SOL')).not.toBeOnTheScreen();
    });

    it('shows clear button when search has text', () => {
      render(<PerpsMarketListView />);

      const searchInput = screen.getByPlaceholderText('Search');
      fireEvent.changeText(searchInput, 'BTC');

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();

      // After typing, should have close button + clear button + 1 filtered market row = 3 TouchableOpacity elements
      const touchableElements = screen.root.findAllByType(TouchableOpacity);
      expect(touchableElements.length).toBe(3); // Close button + clear button + filtered market row
    });

    it('clears search when clear button is pressed', () => {
      render(<PerpsMarketListView />);

      const searchInput = screen.getByPlaceholderText('Search');
      fireEvent.changeText(searchInput, 'BTC');

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();

      // Verify the search input has the typed value
      expect(searchInput.props.value).toBe('BTC');

      // Find and press clear button (second TouchableOpacity - after close button)
      const touchableElements = screen.root.findAllByType(TouchableOpacity);
      const clearButton = touchableElements[1]; // Clear button is second in the list
      fireEvent.press(clearButton);

      // After pressing clear button, the search input should be empty
      expect(searchInput.props.value).toBe('');

      // All markets should be visible again
      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-SOL')).toBeOnTheScreen();
    });

    it('handles case-insensitive search', () => {
      render(<PerpsMarketListView />);

      const searchInput = screen.getByPlaceholderText('Search');
      fireEvent.changeText(searchInput, 'ethereum');

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

      expect(screen.getAllByTestId('skeleton-placeholder')).toHaveLength(8);
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

    it('does not refresh when already refreshing', () => {
      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      mockUsePerpsMarkets.mockReturnValue({
        markets: mockMarketData,
        isLoading: false,
        error: null,
        refresh: mockRefresh,
        isRefreshing: true,
      });

      render(<PerpsMarketListView />);

      const flashList = screen.getByTestId('flash-list');
      fireEvent(flashList, 'onRefresh');

      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
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

      const searchInput = screen.getByPlaceholderText('Search');
      fireEvent.changeText(searchInput, 'NONEXISTENT');

      expect(screen.queryByTestId('market-row-BTC')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-SOL')).not.toBeOnTheScreen();
    });

    it('handles search with whitespace', () => {
      render(<PerpsMarketListView />);

      const searchInput = screen.getByPlaceholderText('Search');
      fireEvent.changeText(searchInput, '   ');

      // Should show all markets when search is only whitespace
      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-SOL')).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('has proper interactive elements', () => {
      render(<PerpsMarketListView />);

      // Check that there are TouchableOpacity elements (interactive elements)
      const touchableElements = screen.root.findAllByType(TouchableOpacity);
      expect(touchableElements.length).toBeGreaterThan(0);
    });

    it('has proper placeholder text for search input', () => {
      render(<PerpsMarketListView />);

      const searchInput = screen.getByPlaceholderText('Search');
      expect(searchInput).toBeOnTheScreen();
    });
  });
});
