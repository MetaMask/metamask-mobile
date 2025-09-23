import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import PerpsMarketListView from './PerpsMarketListView';
import type { PerpsMarketData } from '../../controllers/types';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsMarketListViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
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

jest.mock('../../hooks/usePerpsOrderFees', () => ({
  usePerpsOrderFees: jest.fn(() => ({
    totalFee: 0,
    protocolFee: 0,
    metamaskFee: 0,
    protocolFeeRate: 0,
    metamaskFeeRate: 0,
    isLoadingMetamaskFee: false,
    error: null,
  })),
  formatFeeRate: jest.fn((rate) => `${((rate || 0) * 100).toFixed(3)}%`),
}));

jest.mock('../../../../../selectors/featureFlagController/rewards', () => ({
  selectRewardsEnabledFlag: jest.fn(() => true),
}));

// Mock PerpsMarketBalanceActions dependencies
jest.mock('../../hooks/stream', () => ({
  usePerpsLiveAccount: jest.fn(() => ({
    account: {
      totalBalance: '10.57',
      marginUsed: '0.00',
      totalUSDBalance: 10.57,
      positions: [],
      orders: [],
    },
    isLoading: false,
    error: null,
  })),
}));

jest.mock('../../hooks', () => ({
  useColorPulseAnimation: jest.fn(() => ({
    startPulseAnimation: jest.fn(),
    getAnimatedStyle: jest.fn(() => ({})),
    stopAnimation: jest.fn(),
  })),
  useBalanceComparison: jest.fn(() => ({
    compareAndUpdateBalance: jest.fn(() => 'increase'),
  })),
  usePerpsTrading: jest.fn(() => ({
    depositWithConfirmation: jest.fn().mockResolvedValue({}),
  })),
  usePerpsNetworkManagement: jest.fn(() => ({
    ensureArbitrumNetworkExists: jest.fn().mockResolvedValue({}),
  })),
  usePerpsPerformance: jest.fn(() => ({
    startMeasure: jest.fn(),
    endMeasure: jest.fn(),
    measure: jest.fn(),
    measureAsync: jest.fn(),
  })),
  usePerpsAccount: jest.fn(() => ({
    account: null,
    isLoading: false,
    error: null,
  })),
  usePerpsNetwork: jest.fn(() => ({
    network: null,
    isLoading: false,
    error: null,
  })),
  formatFeeRate: jest.fn((rate) => `${((rate || 0) * 100).toFixed(3)}%`),
}));

jest.mock('../../components/PerpsMarketBalanceActions', () => {
  const MockReact = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return function PerpsMarketBalanceActions() {
    return MockReact.createElement(
      View,
      { testID: 'perps-market-balance-actions' },
      MockReact.createElement(Text, null, 'Balance Actions Mock'),
    );
  };
});

jest.mock('../../../../Views/confirmations/hooks/useConfirmNavigation', () => ({
  useConfirmNavigation: jest.fn(() => ({
    navigateToConfirmation: jest.fn(),
  })),
}));

jest.mock('../../selectors/perpsController', () => ({
  selectPerpsEligibility: jest.fn(() => true),
}));

jest.mock('../../utils/formatUtils', () => ({
  formatPerpsFiat: jest.fn((amount) => `$${amount}`),
}));

jest.mock('../../../../../images/image-icons', () => ({
  HL: 'mock-hl-image',
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID: string;
      [key: string]: unknown;
    }) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    ),
    BoxFlexDirection: {
      Row: 'row',
    },
    BoxAlignItems: {
      Center: 'center',
    },
  };
});

jest.mock(
  '../../../../../component-library/components/Navigation/TabBarItem',
  () => {
    const { TouchableOpacity: MockTouchable, Text: MockText } =
      jest.requireActual('react-native');
    return jest.fn(({ label, onPress, testID }) => (
      <MockTouchable onPress={onPress} testID={testID}>
        <MockText>{label}</MockText>
      </MockTouchable>
    ));
  },
);

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
      renderWithProvider(<PerpsMarketListView />);

      expect(screen.getByText('Perps')).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText('Volume')).toBeOnTheScreen();
      expect(screen.getByText('Price / 24h change')).toBeOnTheScreen();
    });

    it('renders market list when data is available', () => {
      renderWithProvider(<PerpsMarketListView />);

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-SOL')).toBeOnTheScreen();
    });

    it('renders interactive elements', () => {
      renderWithProvider(<PerpsMarketListView />);

      // Should have search toggle button and market rows
      expect(
        screen.getByTestId(
          PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
        ),
      ).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-SOL')).toBeOnTheScreen();
    });
  });

  describe('Search Functionality', () => {
    it('shows search input when search button is pressed', () => {
      renderWithProvider(<PerpsMarketListView />);

      // Initially search should not be visible
      expect(
        screen.queryByPlaceholderText('Search by token symbol'),
      ).not.toBeOnTheScreen();

      // Click search toggle button
      const searchButton = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      // Now search input should be visible
      expect(
        screen.getByPlaceholderText('Search by token symbol'),
      ).toBeOnTheScreen();
    });

    it('filters markets based on symbol search', () => {
      renderWithProvider(<PerpsMarketListView />);

      // First toggle search visibility
      const searchButton = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search by token symbol');
      act(() => {
        fireEvent.changeText(searchInput, 'BTC');
      });

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-SOL')).not.toBeOnTheScreen();
    });

    it('filters markets based on name search', () => {
      renderWithProvider(<PerpsMarketListView />);

      // First toggle search visibility
      const searchButton = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search by token symbol');
      act(() => {
        fireEvent.changeText(searchInput, 'bitcoin');
      });

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-SOL')).not.toBeOnTheScreen();
    });

    it('shows clear button when search has text', () => {
      renderWithProvider(<PerpsMarketListView />);

      // First toggle search visibility
      const searchButton = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search by token symbol');
      act(() => {
        fireEvent.changeText(searchInput, 'BTC');
      });

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();

      // Should show clear button when there's search text
      expect(
        screen.getByTestId(PerpsMarketListViewSelectorsIDs.SEARCH_CLEAR_BUTTON),
      ).toBeOnTheScreen();

      // Should only show the filtered market (BTC), not others
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-SOL')).not.toBeOnTheScreen();
    });

    it('clears search when clear button is pressed', () => {
      renderWithProvider(<PerpsMarketListView />);

      // First toggle search visibility
      const searchButton = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search by token symbol');
      act(() => {
        fireEvent.changeText(searchInput, 'BTC');
      });

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();

      // Verify the search input has the typed value
      expect(searchInput.props.value).toBe('BTC');

      // Find and press clear button using testID
      const clearButton = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_CLEAR_BUTTON,
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
      renderWithProvider(<PerpsMarketListView />);

      // First toggle search visibility
      const searchButton = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search by token symbol');
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
      renderWithProvider(
        <PerpsMarketListView onMarketSelect={mockOnMarketSelect} />,
      );

      const btcRow = screen.getByTestId('market-row-BTC');
      fireEvent.press(btcRow);

      expect(mockOnMarketSelect).toHaveBeenCalledWith(mockMarketData[0]);
    });

    it('does not throw error when onMarketSelect is not provided', () => {
      renderWithProvider(<PerpsMarketListView />);

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

      renderWithProvider(<PerpsMarketListView />);

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

      renderWithProvider(<PerpsMarketListView />);

      expect(screen.getByText('Volume')).toBeOnTheScreen();
      expect(screen.getByText('Price / 24h change')).toBeOnTheScreen();
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

      renderWithProvider(<PerpsMarketListView />);

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

      renderWithProvider(<PerpsMarketListView />);

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

      renderWithProvider(<PerpsMarketListView />);

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

      renderWithProvider(<PerpsMarketListView />);

      const flashList = screen.getByTestId('flash-list');
      fireEvent(flashList, 'onRefresh');

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('navigates to tutorial when tutorial button is pressed', () => {
      renderWithProvider(<PerpsMarketListView />);

      // Find the tutorial button
      const tutorialButton = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.TUTORIAL_BUTTON,
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
      renderWithProvider(<PerpsMarketListView />);

      // Find close button (first TouchableOpacity after the market rows)
      const touchableElements = screen.root.findAllByType(TouchableOpacity);
      const closeButton = touchableElements[0]; // Close button is the first one
      fireEvent.press(closeButton);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('does not navigate back when canGoBack returns false', () => {
      mockNavigation.canGoBack.mockReturnValue(false);
      renderWithProvider(<PerpsMarketListView />);

      // Find close button (first TouchableOpacity after the market rows)
      const touchableElements = screen.root.findAllByType(TouchableOpacity);
      const closeButton = touchableElements[0]; // Close button is the first one
      fireEvent.press(closeButton);

      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });
  });

  describe('Market Data Display', () => {
    it('displays market data correctly', () => {
      renderWithProvider(<PerpsMarketListView />);

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
      renderWithProvider(<PerpsMarketListView />);

      mockMarketData.forEach((market) => {
        expect(
          screen.getByTestId(`market-row-${market.symbol}`),
        ).toBeOnTheScreen();
      });
    });
  });

  describe('TabBar Navigation', () => {
    it('renders all TabBar items', () => {
      renderWithProvider(<PerpsMarketListView />);

      expect(screen.getByTestId('tab-bar-item-wallet')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-browser')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-actions')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-activity')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-rewards')).toBeOnTheScreen();
    });

    it('navigates to wallet when home tab is pressed', () => {
      renderWithProvider(<PerpsMarketListView />);

      const walletTab = screen.getByTestId('tab-bar-item-wallet');
      fireEvent.press(walletTab);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });
    });

    it('navigates to browser when browser tab is pressed', () => {
      renderWithProvider(<PerpsMarketListView />);

      const browserTab = screen.getByTestId('tab-bar-item-browser');
      fireEvent.press(browserTab);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.BROWSER.HOME,
        {
          screen: Routes.BROWSER.VIEW,
        },
      );
    });

    it('navigates to wallet actions when actions tab is pressed', () => {
      renderWithProvider(<PerpsMarketListView />);

      const actionsTab = screen.getByTestId('tab-bar-item-actions');
      fireEvent.press(actionsTab);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.MODAL.WALLET_ACTIONS,
        },
      );
    });

    it('navigates to activity when activity tab is pressed', () => {
      renderWithProvider(<PerpsMarketListView />);

      const activityTab = screen.getByTestId('tab-bar-item-activity');
      fireEvent.press(activityTab);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.TRANSACTIONS_VIEW,
      );
    });

    it('navigates to rewards when rewards tab is pressed', () => {
      renderWithProvider(<PerpsMarketListView />);

      const rewardsTab = screen.getByTestId('tab-bar-item-rewards');
      fireEvent.press(rewardsTab);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });

    it('navigates to settings when rewards is disabled', () => {
      const { selectRewardsEnabledFlag } = jest.requireMock(
        '../../../../../selectors/featureFlagController/rewards',
      );
      selectRewardsEnabledFlag.mockReturnValue(false);

      renderWithProvider(<PerpsMarketListView />);

      const settingsTab = screen.getByTestId('tab-bar-item-settings');
      fireEvent.press(settingsTab);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.SETTINGS_VIEW,
        {
          screen: 'Settings',
        },
      );

      // Reset mock
      selectRewardsEnabledFlag.mockReturnValue(true);
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

      renderWithProvider(<PerpsMarketListView />);

      expect(screen.getByText('Volume')).toBeOnTheScreen();
      expect(screen.getByText('Price / 24h change')).toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-BTC')).not.toBeOnTheScreen();
    });

    it('handles search with no results', () => {
      renderWithProvider(<PerpsMarketListView />);

      // First toggle search visibility
      const searchButton = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search by token symbol');

      act(() => {
        fireEvent.changeText(searchInput, 'NONEXISTENT');
      });

      expect(screen.queryByTestId('market-row-BTC')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-SOL')).not.toBeOnTheScreen();
    });

    it('handles search with whitespace', () => {
      renderWithProvider(<PerpsMarketListView />);

      // First toggle search visibility
      const searchButton = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      const searchInput = screen.getByPlaceholderText('Search by token symbol');
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
