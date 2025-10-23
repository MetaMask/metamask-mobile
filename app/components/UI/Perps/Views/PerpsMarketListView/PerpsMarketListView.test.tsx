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

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
  useFocusEffect: jest.fn((callback) => callback()),
}));

jest.mock('../../hooks/usePerpsMarkets', () => ({
  ...jest.requireActual('../../hooks/usePerpsMarkets'),
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
  usePerpsMeasurement: jest.fn(),
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
  selectPerpsWatchlistMarkets: jest.fn(() => []),
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
  const { View, Text: RNText } = jest.requireActual('react-native');
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
    Text: RNText,
    TextVariant: {
      BodySm: 'sBodySM',
      BodyMD: 'sBodyMD',
      BodyMDMedium: 'sBodyMDMedium',
      HeadingSM: 'sHeadingSM',
      HeadingLG: 'sHeadingLG',
    },
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
  const { useRoute } = jest.requireMock('@react-navigation/native');
  const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;

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

  // Mock Redux state with perpsController
  const mockState = {
    engine: {
      backgroundState: {
        PerpsController: {
          watchlistMarkets: {
            testnet: [],
            mainnet: [],
          },
        },
      },
    },
  };

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

    // Mock useRoute to return a basic route object
    mockUseRoute.mockReturnValue({
      key: 'PerpsMarketListView-123',
      name: 'PerpsMarketListView',
      params: {},
    });

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
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      expect(screen.getByText('Perps')).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
        ),
      ).toBeOnTheScreen();
      expect(screen.getAllByText('Volume')[0]).toBeOnTheScreen();
      expect(screen.getByText('Price / 24h change')).toBeOnTheScreen();
    });

    it('renders market list when data is available', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-SOL')).toBeOnTheScreen();
    });

    it('renders interactive elements', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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

    it('shows all markets when search is visible with empty query', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-SOL')).toBeOnTheScreen();

      const searchButton = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      expect(
        screen.getByPlaceholderText('Search by token symbol'),
      ).toBeOnTheScreen();

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-SOL')).toBeOnTheScreen();
    });

    it('hides PerpsMarketBalanceActions when search is visible', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Initially balance actions should be visible
      expect(
        screen.getByTestId('perps-market-balance-actions'),
      ).toBeOnTheScreen();

      // Click search toggle button to show search
      const searchButton = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      // Balance actions should now be hidden
      expect(
        screen.queryByTestId('perps-market-balance-actions'),
      ).not.toBeOnTheScreen();

      // Search input should be visible
      expect(
        screen.getByPlaceholderText('Search by token symbol'),
      ).toBeOnTheScreen();
    });

    it('filters markets based on symbol search', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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

      expect(searchInput.props.value).toBe('');

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-SOL')).toBeOnTheScreen();
    });

    it('handles case-insensitive search', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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

    it('hides tab bar when search is visible', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Initially tab bar should be visible
      expect(screen.getByTestId('tab-bar-item-wallet')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-browser')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-actions')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-activity')).toBeOnTheScreen();

      // Click search toggle button to show search
      const searchButton = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      // Tab bar should now be hidden
      expect(screen.queryByTestId('tab-bar-item-wallet')).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('tab-bar-item-browser'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('tab-bar-item-actions'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('tab-bar-item-activity'),
      ).not.toBeOnTheScreen();

      // Search input should be visible
      expect(
        screen.getByPlaceholderText('Search by token symbol'),
      ).toBeOnTheScreen();
    });

    it('shows navbar when close icon is pressed while search is visible', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Initially tab bar should be visible
      expect(screen.getByTestId('tab-bar-item-wallet')).toBeOnTheScreen();

      // Click search toggle button to show search
      const searchButton = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      // Tab bar should be hidden
      expect(screen.queryByTestId('tab-bar-item-wallet')).not.toBeOnTheScreen();

      // Search input should be visible
      expect(
        screen.getByPlaceholderText('Search by token symbol'),
      ).toBeOnTheScreen();

      // Click the close icon (same button, but now shows close icon)
      act(() => {
        fireEvent.press(searchButton);
      });

      // Search should be hidden
      expect(
        screen.queryByPlaceholderText('Search by token symbol'),
      ).not.toBeOnTheScreen();

      // Tab bar should be visible again
      expect(screen.getByTestId('tab-bar-item-wallet')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-browser')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-actions')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-activity')).toBeOnTheScreen();
    });

    it('dismisses keyboard when header is pressed while search is visible', () => {
      // Mock Keyboard.dismiss to verify it's called
      const { Keyboard } = jest.requireActual('react-native');
      const mockDismiss = jest.fn();
      jest.spyOn(Keyboard, 'dismiss').mockImplementation(mockDismiss);

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Click search toggle button to show search
      const searchButton = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      // Search input should be visible
      expect(
        screen.getByPlaceholderText('Search by token symbol'),
      ).toBeOnTheScreen();

      // Press the header (which is a Pressable)
      const perpsText = screen.getByText('Perps');
      const header = perpsText.parent?.parent;
      expect(header).toBeTruthy();
      if (header) {
        act(() => {
          fireEvent.press(header);
        });
      }

      // Keyboard.dismiss should have been called
      expect(mockDismiss).toHaveBeenCalled();

      // Search should still be visible (header press only dismisses keyboard)
      expect(
        screen.getByPlaceholderText('Search by token symbol'),
      ).toBeOnTheScreen();
    });

    it('shows navbar when keyboard is dismissed while search is visible', () => {
      // Mock Keyboard.addListener to capture the callback
      let keyboardHideCallback: (() => void) | null = null;
      const mockAddListener = jest.fn((event, callback) => {
        if (event === 'keyboardDidHide') {
          keyboardHideCallback = callback;
        }
        return { remove: jest.fn() };
      });
      const { Keyboard } = jest.requireActual('react-native');
      jest.spyOn(Keyboard, 'addListener').mockImplementation(mockAddListener);

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Initially tab bar should be visible
      expect(screen.getByTestId('tab-bar-item-wallet')).toBeOnTheScreen();

      // Click search toggle button to show search
      const searchButton = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
      );
      act(() => {
        fireEvent.press(searchButton);
      });

      // Tab bar should be hidden
      expect(screen.queryByTestId('tab-bar-item-wallet')).not.toBeOnTheScreen();

      // Search input should be visible
      expect(
        screen.getByPlaceholderText('Search by token symbol'),
      ).toBeOnTheScreen();

      // Verify that the keyboard listener was registered
      expect(mockAddListener).toHaveBeenCalledWith(
        'keyboardDidHide',
        expect.any(Function),
      );

      // Simulate keyboard dismissal by calling the registered callback
      act(() => {
        if (keyboardHideCallback) {
          keyboardHideCallback();
        }
      });

      // Search should still be visible (keyboard dismiss doesn't hide search)
      expect(
        screen.getByPlaceholderText('Search by token symbol'),
      ).toBeOnTheScreen();

      // Tab bar should be visible again (navbar shows after keyboard dismiss)
      expect(screen.getByTestId('tab-bar-item-wallet')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-browser')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-actions')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-activity')).toBeOnTheScreen();
    });
  });

  describe('Watchlist Filtering', () => {
    it('filters markets by watchlist when showWatchlistOnly is true via route params', () => {
      // Mock watchlistMarkets to only include BTC
      const { selectPerpsWatchlistMarkets } = jest.requireMock(
        '../../selectors/perpsController',
      );
      selectPerpsWatchlistMarkets.mockReturnValue(['BTC']);

      // Mock route params to set showWatchlistOnly
      mockUseRoute.mockReturnValue({
        name: 'PerpsMarketListView',
        params: { showWatchlistOnly: true },
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Should only show BTC from watchlist
      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-SOL')).not.toBeOnTheScreen();
    });

    it('shows all markets when showWatchlistOnly is false', () => {
      // Mock watchlistMarkets to only include BTC
      const { selectPerpsWatchlistMarkets } = jest.requireMock(
        '../../selectors/perpsController',
      );
      selectPerpsWatchlistMarkets.mockReturnValue(['BTC']);

      // Mock route params without showWatchlistOnly
      mockUseRoute.mockReturnValue({
        name: 'PerpsMarketListView',
        params: {},
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Should show all markets
      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-SOL')).toBeOnTheScreen();
    });

    it('shows empty state when watchlist filter is active but no matches found', () => {
      // Mock empty watchlistMarkets
      const { selectPerpsWatchlistMarkets } = jest.requireMock(
        '../../selectors/perpsController',
      );
      selectPerpsWatchlistMarkets.mockReturnValue([]);

      // Mock route params to set showWatchlistOnly
      mockUseRoute.mockReturnValue({
        name: 'PerpsMarketListView',
        params: { showWatchlistOnly: true },
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Should show favorites empty state
      expect(screen.getByText('No markets in watchlist')).toBeOnTheScreen();
      expect(
        screen.getByText(
          'Tap the star icon on any market to add it to your watchlist',
        ),
      ).toBeOnTheScreen();
    });

    it('filters markets by watchlist with multiple symbols', () => {
      // Mock watchlistMarkets with multiple symbols
      const { selectPerpsWatchlistMarkets } = jest.requireMock(
        '../../selectors/perpsController',
      );
      selectPerpsWatchlistMarkets.mockReturnValue(['BTC', 'SOL']);

      // Mock route params to set showWatchlistOnly
      mockUseRoute.mockReturnValue({
        name: 'PerpsMarketListView',
        params: { showWatchlistOnly: true },
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Should show BTC and SOL, but not ETH
      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-SOL')).toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();
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
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      expect(screen.getByText('Failed to load market data')).toBeOnTheScreen();
      expect(
        screen.getByText('Data updates automatically every few seconds'),
      ).toBeOnTheScreen();
    });

    it('shows error only when no markets are available', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: mockMarketData,
        isLoading: false,
        error: 'Some error',
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      expect(
        screen.queryByText('Failed to load market data'),
      ).not.toBeOnTheScreen();
      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
    });
  });

  describe('Navigation', () => {
    it('navigates back when close button is pressed', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Find close button (first TouchableOpacity after the market rows)
      const touchableElements = screen.root.findAllByType(TouchableOpacity);
      const closeButton = touchableElements[0]; // Close button is the first one
      fireEvent.press(closeButton);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('does not navigate back when canGoBack returns false', () => {
      mockNavigation.canGoBack.mockReturnValue(false);
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Find close button (first TouchableOpacity after the market rows)
      const touchableElements = screen.root.findAllByType(TouchableOpacity);
      const closeButton = touchableElements[0]; // Close button is the first one
      fireEvent.press(closeButton);

      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });
  });

  describe('Market Data Display', () => {
    it('displays market data correctly', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      mockMarketData.forEach((market) => {
        expect(
          screen.getByTestId(`market-row-${market.symbol}`),
        ).toBeOnTheScreen();
      });
    });
  });

  describe('TabBar Navigation', () => {
    it('renders all TabBar items', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      expect(screen.getByTestId('tab-bar-item-wallet')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-browser')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-actions')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-activity')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar-item-rewards')).toBeOnTheScreen();
    });

    it('navigates to wallet when home tab is pressed', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      const activityTab = screen.getByTestId('tab-bar-item-activity');
      fireEvent.press(activityTab);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.TRANSACTIONS_VIEW,
      );
    });

    it('navigates to rewards when rewards tab is pressed', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      const rewardsTab = screen.getByTestId('tab-bar-item-rewards');
      fireEvent.press(rewardsTab);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });

    it('navigates to settings when rewards is disabled', () => {
      const { selectRewardsEnabledFlag } = jest.requireMock(
        '../../../../../selectors/featureFlagController/rewards',
      );
      selectRewardsEnabledFlag.mockReturnValue(false);

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      expect(screen.getByText('Volume')).toBeOnTheScreen();
      expect(screen.getByText('Price / 24h change')).toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-BTC')).not.toBeOnTheScreen();
    });

    it('handles search with no results', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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

    it('shows empty state when search returns no results', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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

      // Should show empty state message
      expect(screen.getByText('No tokens found')).toBeOnTheScreen();
      expect(
        screen.getByText(
          'We couldn\'t find any tokens with the name "NONEXISTENT". Try a different search.',
        ),
      ).toBeOnTheScreen();

      // Should not show any market rows
      expect(screen.queryByTestId('market-row-BTC')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-ETH')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('market-row-SOL')).not.toBeOnTheScreen();

      // Should not show list header when empty state is shown
      expect(screen.queryByText('Volume')).not.toBeOnTheScreen();
      expect(screen.queryByText('Price / 24h change')).not.toBeOnTheScreen();
    });

    it('handles search with whitespace', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

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

      expect(screen.getByTestId('market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('market-row-SOL')).toBeOnTheScreen();
    });
  });
});
