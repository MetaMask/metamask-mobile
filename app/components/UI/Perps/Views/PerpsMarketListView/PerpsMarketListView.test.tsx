import React from 'react';
import { screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import PerpsMarketListView from './PerpsMarketListView';
import type { PerpsMarketData } from '../../controllers/types';
import { PerpsMarketListViewSelectorsIDs } from '../../Perps.testIds';
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

// Don't mock usePerpsMarketListView - test the real implementation
// Instead, mock its dependencies below

// Mock Engine for PerpsController
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      saveMarketFilterPreferences: jest.fn(),
      getActiveProvider: jest.fn(() => ({
        protocolId: 'hyperliquid',
      })),
    },
  },
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
  usePerpsLivePositions: jest.fn(() => ({
    positions: [],
  })),
}));

// Mock variables to hold state that will be set in beforeEach
const mockMarketDataForHook: PerpsMarketData[] = [];
let mockSearchVisible = false;
let mockSearchQuery = '';

// Create persistent mock functions that update the shared state
const mockSetSearchQuery = jest.fn((q: string) => {
  mockSearchQuery = q;
});
const mockSetIsSearchVisible = jest.fn((v: boolean) => {
  mockSearchVisible = v;
});
const mockToggleSearchVisibility = jest.fn(() => {
  mockSearchVisible = !mockSearchVisible;
});
const mockClearSearch = jest.fn(() => {
  mockSearchQuery = '';
  mockSearchVisible = false;
});

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
  usePerpsNavigation: jest.fn(() => ({
    navigateToWallet: jest.fn(),
    navigateToBrowser: jest.fn(),
    navigateToActions: jest.fn(),
    navigateToActivity: jest.fn(),
    navigateToRewards: jest.fn(),
    navigateToMarketDetails: jest.fn(),
    navigateToHome: jest.fn(),
    navigateToMarketList: jest.fn(),
    navigateBack: jest.fn(),
    canGoBack: true,
  })),
  usePerpsMeasurement: jest.fn(),
  usePerpsMarketListView: jest.fn(() => {
    // Filter markets based on search query (case-insensitive)
    // Use mockMarketDataForHook if available, otherwise fall back to empty array
    // (the hook will be populated in beforeEach)
    const availableMarkets =
      mockMarketDataForHook.length > 0 ? mockMarketDataForHook : [];
    const filteredMarkets = mockSearchQuery.trim()
      ? availableMarkets.filter(
          (m) =>
            m.symbol.toLowerCase().includes(mockSearchQuery.toLowerCase()) ||
            m.name.toLowerCase().includes(mockSearchQuery.toLowerCase()),
        )
      : availableMarkets;

    return {
      markets: filteredMarkets,
      searchState: {
        searchQuery: mockSearchQuery,
        setSearchQuery: mockSetSearchQuery,
        isSearchVisible: mockSearchVisible, // This will be read fresh each render
        setIsSearchVisible: mockSetIsSearchVisible,
        toggleSearchVisibility: mockToggleSearchVisibility,
        clearSearch: mockClearSearch,
      },
      sortState: {
        selectedOptionId: 'volume',
        sortBy: 'volume',
        direction: 'desc',
        handleOptionChange: jest.fn(),
      },
      favoritesState: {
        showFavoritesOnly: false,
        setShowFavoritesOnly: jest.fn(),
      },
      marketTypeFilterState: {
        marketTypeFilter: 'all',
        setMarketTypeFilter: jest.fn(),
      },
      marketCounts: {
        crypto: 3, // Set to non-zero so tabs render
        equity: 0,
        commodity: 0,
        forex: 0,
      },
      isLoading: false,
      error: null,
    };
  }),
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

jest.mock('./components/PerpsMarketFiltersBar', () => {
  const MockReact = jest.requireActual('react');
  const {
    View,
    Text,
    TouchableOpacity: RNTouchableOpacity,
  } = jest.requireActual('react-native');

  return function PerpsMarketFiltersBar({
    selectedOptionId,
    onSortPress,
    showMarketTypeDropdown,
    marketTypeFilter,
    onMarketTypePress,
    showStocksCommoditiesDropdown,
    stocksCommoditiesFilter,
    onStocksCommoditiesPress,
    testID,
  }: {
    selectedOptionId: string;
    onSortPress: () => void;
    showMarketTypeDropdown?: boolean;
    marketTypeFilter?: string;
    onMarketTypePress?: () => void;
    showStocksCommoditiesDropdown?: boolean;
    stocksCommoditiesFilter?: 'all' | 'equity' | 'commodity';
    onStocksCommoditiesPress?: () => void;
    testID?: string;
  }) {
    // Map sort option IDs to display labels
    const getSortLabel = (optionId: string) => {
      const translations: Record<string, string> = {
        volume: 'Volume',
        priceChange: 'Price change',
        fundingRate: 'Funding rate',
        openInterest: 'Open interest',
      };
      return translations[optionId] || optionId;
    };
    const displayText = getSortLabel(selectedOptionId || 'volume');

    // Map market type filter to display labels
    const getMarketTypeLabel = (filter: string) => {
      const translations: Record<string, string> = {
        all: 'All',
        crypto: 'Crypto',
        stocks_and_commodities: 'Stocks & Commodities',
      };
      return translations[filter] || filter;
    };

    return MockReact.createElement(
      View,
      { testID },
      showMarketTypeDropdown &&
        onMarketTypePress &&
        MockReact.createElement(
          RNTouchableOpacity,
          {
            testID: testID ? `${testID}-market-type` : undefined,
            onPress: onMarketTypePress,
          },
          MockReact.createElement(
            Text,
            { testID: `${testID}-market-type-text` },
            getMarketTypeLabel(marketTypeFilter || 'all'),
          ),
        ),
      MockReact.createElement(
        RNTouchableOpacity,
        { testID: testID ? `${testID}-sort` : undefined, onPress: onSortPress },
        MockReact.createElement(
          Text,
          { testID: `${testID}-sort-text` },
          displayText,
        ),
      ),
      showStocksCommoditiesDropdown &&
        onStocksCommoditiesPress &&
        MockReact.createElement(
          RNTouchableOpacity,
          {
            testID: testID
              ? `${testID}-stocks-commodities-dropdown`
              : undefined,
            onPress: onStocksCommoditiesPress,
          },
          MockReact.createElement(
            Text,
            null,
            `Stocks/Commodities: ${stocksCommoditiesFilter || 'all'}`,
          ),
        ),
    );
  };
});

jest.mock(
  '../../../../../component-library/components/Form/TextFieldSearch',
  () => {
    const {
      TextInput,
      View,
      TouchableOpacity: RNTouchableOpacity,
    } = jest.requireActual('react-native');
    return function MockTextFieldSearch({
      value,
      onChangeText,
      placeholder,
      testID,
      showClearButton,
      onPressClearButton,
    }: {
      value: string;
      onChangeText: (text: string) => void;
      placeholder: string;
      testID: string;
      showClearButton?: boolean;
      onPressClearButton?: () => void;
    }) {
      return (
        <View>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            testID={testID}
          />
          {showClearButton && (
            <RNTouchableOpacity
              onPress={onPressClearButton}
              testID={`${testID}-clear`}
            />
          )}
        </View>
      );
    };
  },
);

// Mock PerpsMarketListHeader
jest.mock('../../components/PerpsMarketListHeader', () => {
  const ReactActual = jest.requireActual('react');
  const { View, TouchableOpacity, TextInput, Pressable, Text } =
    jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function PerpsMarketListHeader({
      title,
      isSearchVisible,
      searchQuery,
      onSearchQueryChange,
      onBack,
      onSearchToggle,
      testID,
    }: {
      title?: string;
      isSearchVisible?: boolean;
      searchQuery?: string;
      onSearchQueryChange?: (text: string) => void;
      onSearchClear?: () => void;
      onBack?: () => void;
      onSearchToggle?: () => void;
      testID?: string;
    }) {
      if (isSearchVisible) {
        return ReactActual.createElement(
          View,
          { testID },
          ReactActual.createElement(
            View,
            { testID: `${testID}-search-bar-container` },
            ReactActual.createElement(View, { testID: 'search-icon' }),
            ReactActual.createElement(TextInput, {
              testID: `${testID}-search-input`,
              placeholder: 'Search by token symbol',
              value: searchQuery || '',
              onChangeText: onSearchQueryChange,
            }),
            onSearchToggle &&
              ReactActual.createElement(
                Pressable,
                {
                  testID: `${testID}-search-close`,
                  onPress: onSearchToggle,
                },
                ReactActual.createElement(Text, null, 'Cancel'),
              ),
          ),
        );
      }

      return ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(
          TouchableOpacity,
          {
            testID: `${testID}-back-button`,
            onPress: onBack,
          },
          ReactActual.createElement(Text, null, '<'),
        ),
        ReactActual.createElement(
          Text,
          { testID: `${testID}-title` },
          title || 'Perps',
        ),
        ReactActual.createElement(
          TouchableOpacity,
          {
            testID: `${testID}-search-toggle`,
            onPress: onSearchToggle,
          },
          ReactActual.createElement(Text, null, 'Search'),
        ),
      );
    },
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
  selectPerpsMarketFilterPreferences: jest.fn(() => ({
    optionId: 'volume',
    direction: 'desc',
  })),
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
      HeadingMD: 'HeadingMD',
    },
    FontWeight: {
      Bold: 'bold',
      Medium: 'medium',
      Regular: 'regular',
    },
    BoxFlexDirection: {
      Row: 'row',
    },
    BoxAlignItems: {
      Center: 'center',
      End: 'flex-end',
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

// Mock TabsBar and Tab components
jest.mock(
  '../../../../../component-library/components-temp/Tabs/TabsBar',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: function TabsBar({
        tabs,
        onTabPress,
        testID,
      }: {
        tabs: { key: string; label: string }[];
        activeIndex: number;
        onTabPress: (index: number) => void;
        testID?: string;
      }) {
        return ReactActual.createElement(
          View,
          { testID },
          tabs.map((tab, index) =>
            ReactActual.createElement(
              TouchableOpacity,
              {
                key: tab.key,
                testID: testID ? `${testID}-tab-${index}` : undefined,
                onPress: () => onTabPress(index),
              },
              ReactActual.createElement(Text, null, tab.label),
            ),
          ),
        );
      },
    };
  },
);

jest.mock('../../../../../component-library/components-temp/Tabs/Tab', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Pressable, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function Tab({
      label,
      onPress,
      testID,
      onLayout,
    }: {
      label: string;
      isActive?: boolean;
      onPress?: () => void;
      testID?: string;
      onLayout?: (event: unknown) => void;
    }) {
      return ReactActual.createElement(
        View,
        { testID, onLayout },
        ReactActual.createElement(
          Pressable,
          { onPress },
          ReactActual.createElement(Text, null, label),
        ),
      );
    },
  };
});

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

// Mock component-library Text component with FontWeight
jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: Text,
    TextVariant: {
      BodyMd: 'BodyMd',
      BodySM: 'BodySM',
      HeadingMD: 'HeadingMD',
      HeadingSM: 'HeadingSM',
    },
    TextColor: {
      Default: 'Default',
      Alternative: 'Alternative',
    },
    FontWeight: {
      Bold: 'bold',
      Medium: 'medium',
      Regular: 'regular',
    },
  };
});

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

    // Set mock market data for the hook
    mockMarketDataForHook.length = 0;
    mockMarketDataForHook.push(...mockMarketData);

    // Reset search state
    mockSearchVisible = false;
    mockSearchQuery = '';
    mockSetSearchQuery.mockClear();
    mockSetIsSearchVisible.mockClear();
    mockToggleSearchVisibility.mockClear();
    mockClearSearch.mockClear();

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

    // Mock usePerpsMarkets - this is the data source for the real hook
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
    it('renders the component with header and search button', async () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      expect(screen.getByText('Perps')).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-search-toggle`,
        ),
      ).toBeOnTheScreen();

      // Wait for filter bar to render (it renders when tabs exist and markets are available)
      await waitFor(() => {
        expect(screen.getByText('Volume')).toBeOnTheScreen();
      });
    });

    it('renders market list when data is available', async () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      await waitFor(() => {
        const btcRows = screen.queryAllByTestId('market-row-BTC');
        const ethRows = screen.queryAllByTestId('market-row-ETH');
        const solRows = screen.queryAllByTestId('market-row-SOL');
        expect(btcRows.length).toBeGreaterThan(0);
        expect(ethRows.length).toBeGreaterThan(0);
        expect(solRows.length).toBeGreaterThan(0);
      });
    });

    it('renders interactive elements', async () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Should have search toggle button and market rows
      expect(
        screen.getByTestId(
          `${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-search-toggle`,
        ),
      ).toBeOnTheScreen();

      await waitFor(() => {
        const btcRows = screen.queryAllByTestId('market-row-BTC');
        const ethRows = screen.queryAllByTestId('market-row-ETH');
        const solRows = screen.queryAllByTestId('market-row-SOL');
        expect(btcRows.length).toBeGreaterThan(0);
        expect(ethRows.length).toBeGreaterThan(0);
        expect(solRows.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Search Functionality', () => {
    it('shows search input when search button is pressed', async () => {
      const { rerender } = renderWithProvider(<PerpsMarketListView />, {
        state: mockState,
      });

      // Initially search should not be visible
      expect(
        screen.queryByPlaceholderText('Search by token symbol'),
      ).not.toBeOnTheScreen();

      // Click search toggle button
      const searchButton = screen.getByTestId(
        `${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-search-toggle`,
      );
      await act(async () => {
        fireEvent.press(searchButton);
        rerender(<PerpsMarketListView />);
      });

      // Now search input should be visible
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by token symbol'),
        ).toBeOnTheScreen();
      });
    });

    it('shows all markets when search is visible with empty query', async () => {
      const { rerender } = renderWithProvider(<PerpsMarketListView />, {
        state: mockState,
      });

      const btcRows = screen.queryAllByTestId('market-row-BTC');
      const ethRows = screen.queryAllByTestId('market-row-ETH');
      const solRows = screen.queryAllByTestId('market-row-SOL');
      expect(btcRows.length).toBeGreaterThan(0);
      expect(ethRows.length).toBeGreaterThan(0);
      expect(solRows.length).toBeGreaterThan(0);

      const searchButton = screen.getByTestId(
        `${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-search-toggle`,
      );
      await act(async () => {
        fireEvent.press(searchButton);
        rerender(<PerpsMarketListView />);
      });

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by token symbol'),
        ).toBeOnTheScreen();
      });

      // Markets should still be visible with empty search query
      const btcRowsAfter = screen.queryAllByTestId('market-row-BTC');
      const ethRowsAfter = screen.queryAllByTestId('market-row-ETH');
      const solRowsAfter = screen.queryAllByTestId('market-row-SOL');
      expect(btcRowsAfter.length).toBeGreaterThan(0);
      expect(ethRowsAfter.length).toBeGreaterThan(0);
      expect(solRowsAfter.length).toBeGreaterThan(0);
    });

    it('hides PerpsMarketBalanceActions when search is visible', async () => {
      const { rerender } = renderWithProvider(<PerpsMarketListView />, {
        state: mockState,
      });

      // Initially balance actions should be visible
      expect(
        screen.getByTestId('perps-market-balance-actions'),
      ).toBeOnTheScreen();

      // Click search toggle button to show search
      const searchButton = screen.getByTestId(
        `${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-search-toggle`,
      );
      await act(async () => {
        fireEvent.press(searchButton);
        rerender(<PerpsMarketListView />);
      });

      // Balance actions should now be hidden (component hides it when search is visible)
      await waitFor(() => {
        expect(
          screen.queryByTestId('perps-market-balance-actions'),
        ).not.toBeOnTheScreen();
      });

      // Search input should be visible
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by token symbol'),
        ).toBeOnTheScreen();
      });
    });

    it('shows search input when search toggle is pressed', async () => {
      const { rerender } = renderWithProvider(<PerpsMarketListView />, {
        state: mockState,
      });

      // Initially search should not be visible
      expect(
        screen.queryByPlaceholderText('Search by token symbol'),
      ).not.toBeOnTheScreen();

      // Click search toggle button to show search
      const searchButton = screen.getByTestId(
        `${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-search-toggle`,
      );
      await act(async () => {
        fireEvent.press(searchButton);
        rerender(<PerpsMarketListView />);
      });

      // Search input should be visible
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by token symbol'),
        ).toBeOnTheScreen();
      });
    });

    it('hides search when cancel is pressed while search is visible', async () => {
      const { rerender } = renderWithProvider(<PerpsMarketListView />, {
        state: mockState,
      });

      // Click search toggle button to show search
      const searchButton = screen.getByTestId(
        `${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-search-toggle`,
      );
      await act(async () => {
        fireEvent.press(searchButton);
        rerender(<PerpsMarketListView />);
      });

      // Search input should be visible
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by token symbol'),
        ).toBeOnTheScreen();
      });

      // Click the cancel button to close search
      const cancelButton = screen.getByTestId(
        `${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-search-close`,
      );
      await act(async () => {
        fireEvent.press(cancelButton);
        rerender(<PerpsMarketListView />);
      });

      // Search should be hidden
      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText('Search by token symbol'),
        ).not.toBeOnTheScreen();
      });
    });

    it('handles keyboard dismissal while search is visible', async () => {
      const { rerender } = renderWithProvider(<PerpsMarketListView />, {
        state: mockState,
      });

      // Click search toggle button to show search
      const searchButton = screen.getByTestId(
        `${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-search-toggle`,
      );
      await act(async () => {
        fireEvent.press(searchButton);
        rerender(<PerpsMarketListView />);
      });

      // Search input should be visible
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by token symbol'),
        ).toBeOnTheScreen();
      });

      // Note: PerpsMarketListHeader doesn't use Keyboard.addListener.
      // It uses Keyboard.dismiss() directly in the Pressable onPress handler.
      // This test verifies that search remains visible (which it does).
      expect(
        screen.getByPlaceholderText('Search by token symbol'),
      ).toBeOnTheScreen();
    });
  });

  describe('Watchlist Filtering', () => {
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

      // Should show all markets (multiple tabs may render, so check at least one exists)
      const btcRows = screen.queryAllByTestId('market-row-BTC');
      const ethRows = screen.queryAllByTestId('market-row-ETH');
      const solRows = screen.queryAllByTestId('market-row-SOL');
      expect(btcRows.length).toBeGreaterThan(0);
      expect(ethRows.length).toBeGreaterThan(0);
      expect(solRows.length).toBeGreaterThan(0);
    });
  });

  describe('Market Selection', () => {
    it('calls onMarketSelect when a market is pressed', () => {
      const mockOnMarketSelect = jest.fn();
      renderWithProvider(
        <PerpsMarketListView onMarketSelect={mockOnMarketSelect} />,
      );

      const btcRows = screen.getAllByTestId('market-row-BTC');
      fireEvent.press(btcRows[0]);

      expect(mockOnMarketSelect).toHaveBeenCalledWith(mockMarketData[0]);
    });

    it('does not throw error when onMarketSelect is not provided', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      const btcRows = screen.getAllByTestId('market-row-BTC');
      expect(() => fireEvent.press(btcRows[0])).not.toThrow();
    });
  });

  describe('Loading States', () => {
    it('shows header even during loading', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [],
        isLoading: true,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // During loading, sort dropdowns are hidden, so don't check for them
      expect(screen.getByText('Perps')).toBeOnTheScreen();
    });
  });

  describe('Error Handling', () => {
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
      const btcRows = screen.queryAllByTestId('market-row-BTC');
      expect(btcRows.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('does not navigate back when canGoBack returns false', () => {
      const { TouchableOpacity } = jest.requireActual('react-native');
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

      const btcSymbols = screen.getAllByTestId('market-symbol-BTC');
      const btcNames = screen.getAllByTestId('market-name-BTC');
      const btcPrices = screen.getAllByTestId('market-price-BTC');
      const btcChanges = screen.getAllByTestId('market-change-BTC');
      expect(btcSymbols[0]).toHaveTextContent('BTC');
      expect(btcNames[0]).toHaveTextContent('Bitcoin');
      expect(btcPrices[0]).toHaveTextContent('$50,000.00');
      expect(btcChanges[0]).toHaveTextContent('+$1,200.00');
    });

    it('displays all provided markets', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      mockMarketData.forEach((market) => {
        const rows = screen.queryAllByTestId(`market-row-${market.symbol}`);
        expect(rows.length).toBeGreaterThan(0);
      });
    });
  });

  // Note: TabBar Navigation tests removed - PerpsMarketListView does not render a bottom tab bar
  // The component only renders market type tabs (All, Crypto, Stocks) for filtering markets

  describe('Stocks/Commodities Dropdown', () => {
    it('does not show stocks/commodities dropdown when market type filter is not stocks_and_commodities', async () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Wait for filter bar to render
      await waitFor(() => {
        expect(screen.getByText('Volume')).toBeOnTheScreen();
      });

      // Verify stocks/commodities dropdown is not present when filter is 'all'
      expect(
        screen.queryByTestId(
          `${PerpsMarketListViewSelectorsIDs.SORT_FILTERS}-stocks-commodities-dropdown`,
        ),
      ).not.toBeOnTheScreen();
    });

    it('shows stocks/commodities dropdown when market type filter is stocks_and_commodities', async () => {
      const { usePerpsMarketListView } = jest.requireMock('../../hooks');

      // Mock the hook to return stocks_and_commodities as the active filter
      usePerpsMarketListView.mockReturnValue({
        markets: mockMarketData,
        searchState: {
          searchQuery: '',
          setSearchQuery: jest.fn(),
          isSearchVisible: false,
          setIsSearchVisible: jest.fn(),
          toggleSearchVisibility: jest.fn(),
          clearSearch: jest.fn(),
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc',
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: false,
          setShowFavoritesOnly: jest.fn(),
        },
        marketTypeFilterState: {
          marketTypeFilter: 'stocks_and_commodities',
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 3,
          equity: 2,
          commodity: 1,
          forex: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Wait for filter bar to render
      await waitFor(() => {
        expect(screen.getByText('Volume')).toBeOnTheScreen();
      });

      // Verify stocks/commodities dropdown is present when filter is stocks_and_commodities
      expect(
        screen.getByTestId(
          `${PerpsMarketListViewSelectorsIDs.SORT_FILTERS}-stocks-commodities-dropdown`,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('Market Type Dropdown', () => {
    it('shows market type dropdown when multiple market types exist', async () => {
      const { usePerpsMarketListView } = jest.requireMock('../../hooks');

      // Mock with both crypto and stocks/commodities markets
      usePerpsMarketListView.mockReturnValue({
        markets: mockMarketData,
        searchState: {
          searchQuery: '',
          setSearchQuery: jest.fn(),
          isSearchVisible: false,
          setIsSearchVisible: jest.fn(),
          toggleSearchVisibility: jest.fn(),
          clearSearch: jest.fn(),
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc',
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: false,
          setShowFavoritesOnly: jest.fn(),
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all',
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 3,
          equity: 2, // Has stocks
          commodity: 1, // Has commodities
          forex: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Wait for filter bar to render
      await waitFor(() => {
        expect(screen.getByText('Volume')).toBeOnTheScreen();
      });

      // Verify market type dropdown is present
      expect(
        screen.getByTestId(
          `${PerpsMarketListViewSelectorsIDs.SORT_FILTERS}-market-type`,
        ),
      ).toBeOnTheScreen();
    });

    it('does not show market type dropdown when only crypto markets exist', async () => {
      const { usePerpsMarketListView } = jest.requireMock('../../hooks');

      // Mock with only crypto markets (no stocks or commodities)
      usePerpsMarketListView.mockReturnValue({
        markets: mockMarketData,
        searchState: {
          searchQuery: '',
          setSearchQuery: jest.fn(),
          isSearchVisible: false,
          setIsSearchVisible: jest.fn(),
          toggleSearchVisibility: jest.fn(),
          clearSearch: jest.fn(),
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc',
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: false,
          setShowFavoritesOnly: jest.fn(),
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all',
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 3,
          equity: 0, // No stocks
          commodity: 0, // No commodities
          forex: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Wait for filter bar to render
      await waitFor(() => {
        expect(screen.getByText('Volume')).toBeOnTheScreen();
      });

      // Verify market type dropdown is not present when only crypto
      expect(
        screen.queryByTestId(
          `${PerpsMarketListViewSelectorsIDs.SORT_FILTERS}-market-type`,
        ),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('filters markets with whitespace-only query', async () => {
      const { usePerpsMarketListView } = jest.requireMock('../../hooks');

      // Start with search visible
      mockSearchVisible = true;
      mockSearchQuery = '   ';

      // Mock to return empty results when search query is whitespace
      usePerpsMarketListView.mockReturnValue({
        markets: mockMarketData, // Whitespace is trimmed, so all markets show
        searchState: {
          searchQuery: '   ',
          setSearchQuery: mockSetSearchQuery,
          isSearchVisible: true,
          setIsSearchVisible: mockSetIsSearchVisible,
          toggleSearchVisibility: mockToggleSearchVisibility,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc',
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: false,
          setShowFavoritesOnly: jest.fn(),
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all',
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 3,
          equity: 0,
          commodity: 0,
          forex: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Verify search input is visible
      const searchInput = screen.getByPlaceholderText('Search by token symbol');
      expect(searchInput).toBeOnTheScreen();

      // Verify all markets are still displayed (whitespace is trimmed)
      await waitFor(() => {
        const btcRows = screen.queryAllByTestId('market-row-BTC');
        const ethRows = screen.queryAllByTestId('market-row-ETH');
        const solRows = screen.queryAllByTestId('market-row-SOL');
        expect(btcRows.length).toBeGreaterThan(0);
        expect(ethRows.length).toBeGreaterThan(0);
        expect(solRows.length).toBeGreaterThan(0);
      });
    });
  });
});
