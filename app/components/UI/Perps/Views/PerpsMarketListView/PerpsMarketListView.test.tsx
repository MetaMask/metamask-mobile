import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import PerpsMarketListView from './PerpsMarketListView';
import {
  type PerpsMarketData,
  type MarketTypeFilter,
} from '@metamask/perps-controller';
import { PerpsMarketListViewSelectorsIDs } from '../../Perps.testIds';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { createActiveABTestAssignment } from '../../../../../util/analytics/activeABTestAssignments';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

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

const mockTrack = jest.fn();
jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(() => ({
    track: mockTrack,
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
let mockSearchQuery = '';

// Create persistent mock functions that update the shared state
const mockSetSearchQuery = jest.fn((q: string) => {
  mockSearchQuery = q;
});
const mockClearSearch = jest.fn(() => {
  mockSearchQuery = '';
});
const mockNavigateToMarketDetails = jest.fn();

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
  usePerpsNetworkManagement: jest.fn(() => ({})),
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
    navigateToMarketDetails: mockNavigateToMarketDetails,
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
        hasWatchlistMarkets: false,
        watchlistMarketObjects: [],
        suggestedMarkets: [],
      },
      marketTypeFilterState: {
        marketTypeFilter: 'all',
        setMarketTypeFilter: jest.fn(),
      },
      marketCounts: {
        crypto: 3, // Set to non-zero so tabs render
        stocks: 0,
        'pre-ipo': 0,
        indices: 0,
        etfs: 0,
        commodities: 0,
        forex: 0,
        new: 0,
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

jest.mock(
  '../../components/PerpsWatchlistMarkets/PerpsWatchlistMarkets',
  () => {
    const MockReact = jest.requireActual('react');
    const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
    return function MockPerpsWatchlistMarkets({
      markets,
      suggestedMarkets,
      enableShowMore,
      onMarketPress,
    }: {
      markets: { symbol: string }[];
      suggestedMarkets?: { symbol: string }[];
      enableShowMore?: boolean;
      onMarketPress?: (market: { symbol: string }) => void;
    }) {
      return MockReact.createElement(
        View,
        { testID: 'perps-watchlist-markets' },
        markets.map((m) =>
          MockReact.createElement(
            TouchableOpacity,
            {
              key: m.symbol,
              testID: `watchlist-row-${m.symbol}`,
              onPress: () => onMarketPress?.(m),
            },
            MockReact.createElement(Text, null, m.symbol),
          ),
        ),
        (suggestedMarkets ?? []).map((m) =>
          MockReact.createElement(
            TouchableOpacity,
            {
              key: m.symbol,
              testID: `suggested-row-${m.symbol}`,
              onPress: () => onMarketPress?.(m),
            },
            MockReact.createElement(Text, null, m.symbol),
          ),
        ),
        enableShowMore === false
          ? MockReact.createElement(
              Text,
              { testID: 'show-more-disabled' },
              'no-show-more',
            )
          : null,
      );
    };
  },
);

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
    showWatchlistBadge,
    onWatchlistToggle,
    onCategorySelect,
    testID,
  }: {
    selectedOptionId: string;
    onSortPress: () => void;
    showMarketTypeDropdown?: boolean;
    marketTypeFilter?: string;
    onMarketTypePress?: () => void;
    showStocksCommoditiesDropdown?: boolean;
    stocksCommoditiesFilter?: 'all' | 'stock' | 'commodity';
    onStocksCommoditiesPress?: () => void;
    showWatchlistBadge?: boolean;
    isWatchlistSelected?: boolean;
    onWatchlistToggle?: () => void;
    onCategorySelect?: (category: string) => void;
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
        stocks: 'Stocks',
        commodities: 'Commodities',
        forex: 'Forex',
        new: 'New',
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
      showWatchlistBadge &&
        MockReact.createElement(
          RNTouchableOpacity,
          {
            testID: testID ? `${testID}-categories-watchlist` : undefined,
            onPress: onWatchlistToggle,
          },
          MockReact.createElement(Text, null, 'Watchlist'),
        ),
      onCategorySelect &&
        ['all', 'crypto', 'stock', 'commodity', 'forex'].map((cat) =>
          MockReact.createElement(
            RNTouchableOpacity,
            {
              key: cat,
              testID: testID ? `${testID}-category-${cat}` : undefined,
              onPress: () => onCategorySelect(cat),
            },
            MockReact.createElement(Text, null, cat),
          ),
        ),
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
  selectPerpsMarketFilterPreferences: jest.fn(() => ({
    optionId: 'volume',
    direction: 'desc',
  })),
}));

let mockWatchlistFlagEnabled = false;
jest.mock('../../selectors/featureFlags', () => ({
  selectPerpsWatchlistEnabledFlag: jest.fn(() => mockWatchlistFlagEnabled),
}));

jest.mock('../../utils/formatUtils', () => ({
  formatPerpsFiat: jest.fn((amount) => `$${amount}`),
}));

jest.mock('../../../../../images/image-icons', () => ({
  HL: 'mock-hl-image',
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const twFn = () => ({});
  twFn.style = () => ({});
  twFn.color = () => 'black';
  return {
    useTailwind: () => twFn,
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
  const { usePerpsMarketListView } = jest.requireMock('../../hooks');
  const mockUsePerpsMarketListView =
    usePerpsMarketListView as jest.MockedFunction<
      typeof usePerpsMarketListView
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

    // Reset watchlist flag so each test starts with it off
    mockWatchlistFlagEnabled = false;

    // Set mock market data for the hook
    mockMarketDataForHook.length = 0;
    mockMarketDataForHook.push(...mockMarketData);

    // Reset search state
    mockSearchQuery = '';
    mockSetSearchQuery.mockClear();
    mockClearSearch.mockClear();
    mockNavigateToMarketDetails.mockClear();

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
    it('renders the component with header and search bar', async () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      expect(screen.getByText('Markets')).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsMarketListViewSelectorsIDs.SEARCH_BAR),
      ).toBeOnTheScreen();

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

    it('passes default sort params from route to market list hook', () => {
      mockUseRoute.mockReturnValue({
        key: 'PerpsMarketListView-123',
        name: 'PerpsMarketListView',
        params: {
          defaultSortOptionId: 'priceChange',
          defaultSortDirection: 'asc',
        },
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      expect(mockUsePerpsMarketListView).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultSortOptionId: 'priceChange',
          defaultSortDirection: 'asc',
        }),
      );
    });

    it('renders interactive elements', async () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      expect(
        screen.getByTestId(PerpsMarketListViewSelectorsIDs.SEARCH_BAR),
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
    it('shows search bar always visible', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      expect(
        screen.getByTestId(PerpsMarketListViewSelectorsIDs.SEARCH_BAR),
      ).toBeOnTheScreen();
      expect(
        screen.getByPlaceholderText('Search by token symbol'),
      ).toBeOnTheScreen();
    });

    it('disables autocorrect and autocapitalize on the search input', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      const searchInput = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_BAR,
      );

      expect(searchInput.props.autoCorrect).toBe(false);
      expect(searchInput.props.autoCapitalize).toBe('none');
      expect(searchInput.props.autoComplete).toBe('off');
    });

    it('shows all markets when search query is empty', async () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      expect(
        screen.getByTestId(PerpsMarketListViewSelectorsIDs.SEARCH_BAR),
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

    it('renders PerpsWatchlistMarkets with suggestions when watchlist filter is active and populated', () => {
      mockWatchlistFlagEnabled = true;

      const watchlistMarket = mockMarketData[0]; // BTC
      const suggested = [mockMarketData[1], mockMarketData[2]]; // ETH, SOL

      mockUsePerpsMarketListView.mockReturnValueOnce({
        markets: [watchlistMarket],
        searchState: {
          searchQuery: '',
          setSearchQuery: mockSetSearchQuery,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc',
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: true,
          setShowFavoritesOnly: jest.fn(),
          hasWatchlistMarkets: true,
          watchlistMarketObjects: [watchlistMarket],
          suggestedMarkets: suggested,
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all',
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 3,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // PerpsWatchlistMarkets renders the watchlist row and suggested rows
      expect(screen.getByTestId('perps-watchlist-markets')).toBeOnTheScreen();
      expect(screen.getByTestId('watchlist-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('suggested-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('suggested-row-SOL')).toBeOnTheScreen();
      // enableShowMore={false} indicator is present
      expect(screen.getByTestId('show-more-disabled')).toBeOnTheScreen();
    });

    it('renders PerpsWatchlistMarkets with suggestions when watchlist filter is active and empty', () => {
      mockWatchlistFlagEnabled = true;

      const suggested = [mockMarketData[0], mockMarketData[1]]; // BTC, ETH

      mockUsePerpsMarketListView.mockReturnValueOnce({
        markets: [],
        searchState: {
          searchQuery: '',
          setSearchQuery: mockSetSearchQuery,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc',
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: true,
          setShowFavoritesOnly: jest.fn(),
          hasWatchlistMarkets: false,
          watchlistMarketObjects: [],
          suggestedMarkets: suggested,
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all',
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 3,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      expect(screen.getByTestId('perps-watchlist-markets')).toBeOnTheScreen();
      expect(screen.getByTestId('suggested-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('suggested-row-ETH')).toBeOnTheScreen();
    });

    it('navigates to market details via push when watchlist row is pressed', () => {
      mockWatchlistFlagEnabled = true;

      const watchlistMarket = mockMarketData[0]; // BTC

      mockUsePerpsMarketListView.mockReturnValueOnce({
        markets: [watchlistMarket],
        searchState: {
          searchQuery: '',
          setSearchQuery: mockSetSearchQuery,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc',
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: true,
          setShowFavoritesOnly: jest.fn(),
          hasWatchlistMarkets: true,
          watchlistMarketObjects: [watchlistMarket],
          suggestedMarkets: [],
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all',
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 3,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      fireEvent.press(screen.getByTestId('watchlist-row-BTC'));

      // handleMarketPress uses StackActions.push via navigation.dispatch so that
      // MARKET_LIST is always preserved in the stack below MARKET_DETAILS.
      expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
      expect(mockNavigation.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            params: expect.objectContaining({
              market: watchlistMarket,
              source: 'perp_markets',
            }),
          }),
        }),
      );
    });

    it('routes watchlist row press through onMarketSelect when provided and watchlist filter is active', () => {
      mockWatchlistFlagEnabled = true;

      const mockOnMarketSelect = jest.fn();
      const watchlistMarket = mockMarketData[0]; // BTC

      mockUsePerpsMarketListView.mockReturnValueOnce({
        markets: [watchlistMarket],
        searchState: {
          searchQuery: '',
          setSearchQuery: mockSetSearchQuery,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc',
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: true,
          setShowFavoritesOnly: jest.fn(),
          hasWatchlistMarkets: true,
          watchlistMarketObjects: [watchlistMarket],
          suggestedMarkets: [],
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all',
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 3,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(
        <PerpsMarketListView onMarketSelect={mockOnMarketSelect} />,
        { state: mockState },
      );

      fireEvent.press(screen.getByTestId('watchlist-row-BTC'));

      expect(mockOnMarketSelect).toHaveBeenCalledWith(watchlistMarket);
      expect(mockNavigation.dispatch).not.toHaveBeenCalled();
    });

    it('carries transactionActiveAbTests through dispatch when watchlist row is pressed', () => {
      mockWatchlistFlagEnabled = true;

      const transactionActiveAbTests = [
        createActiveABTestAssignment(
          'homeTMCU725AbtestHomepagePerpsPillsEmptyState',
          'treatment',
        ),
      ];

      const watchlistMarket = mockMarketData[0]; // BTC

      mockUseRoute.mockReturnValue({
        key: 'PerpsMarketListView-123',
        name: 'PerpsMarketListView',
        params: { transactionActiveAbTests },
      });

      mockUsePerpsMarketListView.mockReturnValueOnce({
        markets: [watchlistMarket],
        searchState: {
          searchQuery: '',
          setSearchQuery: mockSetSearchQuery,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc',
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: true,
          setShowFavoritesOnly: jest.fn(),
          hasWatchlistMarkets: true,
          watchlistMarketObjects: [watchlistMarket],
          suggestedMarkets: [],
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all',
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 3,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      fireEvent.press(screen.getByTestId('watchlist-row-BTC'));

      expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
      expect(mockNavigation.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            params: expect.objectContaining({
              market: watchlistMarket,
              source: 'perp_markets',
              transactionActiveAbTests,
            }),
          }),
        }),
      );
    });

    it('filters watchlist rows by query and also filters suggestions, showing matching suggestions', () => {
      mockWatchlistFlagEnabled = true;

      const btcMarket = mockMarketData[0]; // BTC — watchlisted
      const ethMarket = mockMarketData[1]; // ETH — watchlisted
      const suggested = [mockMarketData[2]]; // SOL — suggested (not watchlisted)

      mockUsePerpsMarketListView.mockReturnValueOnce({
        markets: [btcMarket, ethMarket],
        searchState: {
          searchQuery: 'BTC',
          setSearchQuery: mockSetSearchQuery,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc',
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: true,
          setShowFavoritesOnly: jest.fn(),
          hasWatchlistMarkets: true,
          watchlistMarketObjects: [btcMarket, ethMarket],
          suggestedMarkets: suggested,
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all',
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 3,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // BTC matches the watchlist query; ETH does not
      expect(screen.getByTestId('watchlist-row-BTC')).toBeOnTheScreen();
      expect(screen.queryByTestId('watchlist-row-ETH')).not.toBeOnTheScreen();
      // SOL is in suggestions but doesn't match "BTC", so it is filtered out too
      expect(screen.queryByTestId('suggested-row-SOL')).not.toBeOnTheScreen();
    });

    it('shows a matching suggestion when it is in suggestions but not in the watchlist', () => {
      mockWatchlistFlagEnabled = true;

      const btcMarket = mockMarketData[0]; // BTC — watchlisted
      const ethMarket = mockMarketData[1]; // ETH — suggested (not watchlisted)

      mockUsePerpsMarketListView.mockReturnValueOnce({
        markets: [btcMarket],
        searchState: {
          searchQuery: 'ETH',
          setSearchQuery: mockSetSearchQuery,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc',
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: true,
          setShowFavoritesOnly: jest.fn(),
          hasWatchlistMarkets: true,
          watchlistMarketObjects: [btcMarket],
          suggestedMarkets: [ethMarket],
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all',
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 3,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // BTC is watchlisted but doesn't match "ETH"
      expect(screen.queryByTestId('watchlist-row-BTC')).not.toBeOnTheScreen();
      // ETH is in suggestions and matches — rendered under suggested section
      expect(screen.getByTestId('suggested-row-ETH')).toBeOnTheScreen();
      // No-results state must NOT appear since a suggestion matched
      expect(
        screen.queryByTestId(PerpsMarketListViewSelectorsIDs.NO_RESULTS),
      ).not.toBeOnTheScreen();
    });

    it('shows the no-results empty state when a search query matches nothing in watchlist or suggestions', () => {
      mockWatchlistFlagEnabled = true;

      const btcMarket = mockMarketData[0]; // BTC — watchlisted
      const ethMarket = mockMarketData[1]; // ETH — suggested

      mockUsePerpsMarketListView.mockReturnValueOnce({
        markets: [btcMarket],
        searchState: {
          searchQuery: 'XYZ',
          setSearchQuery: mockSetSearchQuery,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc',
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: true,
          setShowFavoritesOnly: jest.fn(),
          hasWatchlistMarkets: true,
          watchlistMarketObjects: [btcMarket],
          suggestedMarkets: [ethMarket],
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all',
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 3,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Neither watchlist (BTC) nor suggestion (ETH) matches "XYZ"
      expect(
        screen.getByTestId(PerpsMarketListViewSelectorsIDs.NO_RESULTS),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId('perps-watchlist-markets'),
      ).not.toBeOnTheScreen();
    });

    it('restores full watchlist and suggestions when search query is cleared', () => {
      mockWatchlistFlagEnabled = true;

      const btcMarket = mockMarketData[0];
      const ethMarket = mockMarketData[1];
      const suggested = [mockMarketData[2]]; // SOL

      mockUsePerpsMarketListView.mockReturnValueOnce({
        markets: [btcMarket, ethMarket],
        searchState: {
          searchQuery: '',
          setSearchQuery: mockSetSearchQuery,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc',
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: true,
          setShowFavoritesOnly: jest.fn(),
          hasWatchlistMarkets: true,
          watchlistMarketObjects: [btcMarket, ethMarket],
          suggestedMarkets: suggested,
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all',
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 3,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // All watchlist rows visible, suggestion restored
      expect(screen.getByTestId('watchlist-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('watchlist-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('suggested-row-SOL')).toBeOnTheScreen();
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

    it('navigates to SPCX details via push with market-list source when SPCX is pressed', () => {
      const spcxMarket: PerpsMarketData = {
        symbol: 'xyz:SPCX',
        name: 'SPCX',
        maxLeverage: '5x',
        price: '$0.00',
        change24h: '+$0.00',
        change24hPercent: '+0.00%',
        volume: '$0',
        marketSource: 'xyz',
      };
      mockMarketDataForHook.length = 0;
      mockMarketDataForHook.push(spcxMarket);

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      fireEvent.press(screen.getByTestId('market-row-xyz:SPCX'));

      expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
      expect(mockNavigation.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            params: expect.objectContaining({
              market: spcxMarket,
              source: 'perp_markets',
            }),
          }),
        }),
      );
    });

    it('carries route transactionActiveAbTests when a market row is pressed', () => {
      const transactionActiveAbTests = [
        createActiveABTestAssignment(
          'homeTMCU725AbtestHomepagePerpsPillsEmptyState',
          'treatment',
        ),
      ];
      mockUseRoute.mockReturnValue({
        key: 'PerpsMarketListView-123',
        name: 'PerpsMarketListView',
        params: { transactionActiveAbTests },
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      fireEvent.press(screen.getAllByTestId('market-row-BTC')[0]);

      expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
      expect(mockNavigation.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            params: expect.objectContaining({
              market: mockMarketData[0],
              source: 'perp_markets',
              transactionActiveAbTests,
            }),
          }),
        }),
      );
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
      expect(screen.getByText('Markets')).toBeOnTheScreen();
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
      mockNavigation.canGoBack.mockReturnValue(false);
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      const backButton = screen.getByTestId(
        `${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-back-button`,
      );
      fireEvent.press(backButton);

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

  // ─────────────────────────────────────────────────────────────────────────
  // Empty States (TAT-3355)
  // ─────────────────────────────────────────────────────────────────────────
  describe('Empty States', () => {
    /**
     * Factory that returns a minimal usePerpsMarketListView mock value with
     * no markets (triggering an empty state). Override individual fields as
     * needed per test.
     */
    const buildHookReturn = ({
      searchQuery = '',
      marketTypeFilter = 'all' as MarketTypeFilter,
      setSearchQueryFn = mockSetSearchQuery,
      setMarketTypeFilterFn = jest.fn(),
    } = {}) => ({
      markets: [] as PerpsMarketData[],
      searchState: {
        searchQuery,
        setSearchQuery: setSearchQueryFn,
        clearSearch: mockClearSearch,
      },
      sortState: {
        selectedOptionId: 'volume' as const,
        sortBy: 'volume' as const,
        direction: 'desc' as const,
        handleOptionChange: jest.fn(),
      },
      favoritesState: {
        showFavoritesOnly: false,
        setShowFavoritesOnly: jest.fn(),
        hasWatchlistMarkets: false,
        watchlistMarketObjects: [],
        suggestedMarkets: [],
      },
      marketTypeFilterState: {
        marketTypeFilter,
        setMarketTypeFilter: setMarketTypeFilterFn,
      },
      marketCounts: {
        crypto: 0,
        stocks: 0,
        'pre-ipo': 0,
        indices: 0,
        etfs: 0,
        commodities: 0,
        forex: 0,
        new: 0,
      },
      isLoading: false,
      error: null,
    });

    describe('Search-only (no category filter active)', () => {
      it('shows the NO_RESULTS container with "No tokens found" title', () => {
        mockUsePerpsMarketListView.mockReturnValueOnce(
          buildHookReturn({ searchQuery: 'XYZ' }),
        );
        renderWithProvider(<PerpsMarketListView />, { state: mockState });

        expect(
          screen.getByTestId(PerpsMarketListViewSelectorsIDs.NO_RESULTS),
        ).toBeOnTheScreen();
        expect(screen.getByText('No tokens found')).toBeOnTheScreen();
      });

      it('shows the EMPTY_STATE_CTA with "Clear search" label', () => {
        mockUsePerpsMarketListView.mockReturnValueOnce(
          buildHookReturn({ searchQuery: 'XYZ' }),
        );
        renderWithProvider(<PerpsMarketListView />, { state: mockState });

        expect(
          screen.getByTestId(PerpsMarketListViewSelectorsIDs.EMPTY_STATE_CTA),
        ).toBeOnTheScreen();
        expect(screen.getByText('Clear search')).toBeOnTheScreen();
      });

      it('calls setSearchQuery("") when "Clear search" CTA is pressed', () => {
        mockUsePerpsMarketListView.mockReturnValueOnce(
          buildHookReturn({
            searchQuery: 'XYZ',
            setSearchQueryFn: mockSetSearchQuery,
          }),
        );
        renderWithProvider(<PerpsMarketListView />, { state: mockState });

        fireEvent.press(
          screen.getByTestId(PerpsMarketListViewSelectorsIDs.EMPTY_STATE_CTA),
        );

        expect(mockSetSearchQuery).toHaveBeenCalledWith('');
      });

      it('does not show the NO_RESULTS_FILTER container', () => {
        mockUsePerpsMarketListView.mockReturnValueOnce(
          buildHookReturn({ searchQuery: 'XYZ' }),
        );
        renderWithProvider(<PerpsMarketListView />, { state: mockState });

        expect(
          screen.queryByTestId(
            PerpsMarketListViewSelectorsIDs.NO_RESULTS_FILTER,
          ),
        ).not.toBeOnTheScreen();
      });
    });

    describe('Filter + search (filter-priority branch)', () => {
      it('shows the NO_RESULTS container with "No markets found" title', () => {
        mockUsePerpsMarketListView.mockReturnValueOnce(
          buildHookReturn({ searchQuery: 'XYZ', marketTypeFilter: 'crypto' }),
        );
        renderWithProvider(<PerpsMarketListView />, { state: mockState });

        expect(
          screen.getByTestId(PerpsMarketListViewSelectorsIDs.NO_RESULTS),
        ).toBeOnTheScreen();
        expect(screen.getByText('No markets found')).toBeOnTheScreen();
      });

      it('shows the EMPTY_STATE_CTA with "Clear filter" label', () => {
        mockUsePerpsMarketListView.mockReturnValueOnce(
          buildHookReturn({ searchQuery: 'XYZ', marketTypeFilter: 'crypto' }),
        );
        renderWithProvider(<PerpsMarketListView />, { state: mockState });

        expect(screen.getByText('Clear filter')).toBeOnTheScreen();
      });

      it('calls setMarketTypeFilter("all") when "Clear filter" CTA is pressed', () => {
        const mockSetMarketTypeFilter = jest.fn();
        mockUsePerpsMarketListView.mockReturnValueOnce(
          buildHookReturn({
            searchQuery: 'XYZ',
            marketTypeFilter: 'crypto',
            setMarketTypeFilterFn: mockSetMarketTypeFilter,
          }),
        );
        renderWithProvider(<PerpsMarketListView />, { state: mockState });

        fireEvent.press(
          screen.getByTestId(PerpsMarketListViewSelectorsIDs.EMPTY_STATE_CTA),
        );

        expect(mockSetMarketTypeFilter).toHaveBeenCalledWith('all');
      });

      it('does not show the NO_RESULTS_FILTER container', () => {
        mockUsePerpsMarketListView.mockReturnValueOnce(
          buildHookReturn({ searchQuery: 'XYZ', marketTypeFilter: 'crypto' }),
        );
        renderWithProvider(<PerpsMarketListView />, { state: mockState });

        expect(
          screen.queryByTestId(
            PerpsMarketListViewSelectorsIDs.NO_RESULTS_FILTER,
          ),
        ).not.toBeOnTheScreen();
      });
    });

    describe('Filter-only (no search query)', () => {
      it('shows the NO_RESULTS_FILTER container with "No markets found" title', () => {
        mockUsePerpsMarketListView.mockReturnValueOnce(
          buildHookReturn({ marketTypeFilter: 'stock' }),
        );
        renderWithProvider(<PerpsMarketListView />, { state: mockState });

        expect(
          screen.getByTestId(PerpsMarketListViewSelectorsIDs.NO_RESULTS_FILTER),
        ).toBeOnTheScreen();
        expect(screen.getByText('No markets found')).toBeOnTheScreen();
      });

      it('shows the EMPTY_STATE_CTA with "Clear filter" label', () => {
        mockUsePerpsMarketListView.mockReturnValueOnce(
          buildHookReturn({ marketTypeFilter: 'stock' }),
        );
        renderWithProvider(<PerpsMarketListView />, { state: mockState });

        expect(
          screen.getByTestId(PerpsMarketListViewSelectorsIDs.EMPTY_STATE_CTA),
        ).toBeOnTheScreen();
        expect(screen.getByText('Clear filter')).toBeOnTheScreen();
      });

      it('calls setMarketTypeFilter("all") when "Clear filter" CTA is pressed', () => {
        const mockSetMarketTypeFilter = jest.fn();
        mockUsePerpsMarketListView.mockReturnValueOnce(
          buildHookReturn({
            marketTypeFilter: 'stock',
            setMarketTypeFilterFn: mockSetMarketTypeFilter,
          }),
        );
        renderWithProvider(<PerpsMarketListView />, { state: mockState });

        fireEvent.press(
          screen.getByTestId(PerpsMarketListViewSelectorsIDs.EMPTY_STATE_CTA),
        );

        expect(mockSetMarketTypeFilter).toHaveBeenCalledWith('all');
      });

      it('does not show the NO_RESULTS container', () => {
        mockUsePerpsMarketListView.mockReturnValueOnce(
          buildHookReturn({ marketTypeFilter: 'stock' }),
        );
        renderWithProvider(<PerpsMarketListView />, { state: mockState });

        expect(
          screen.queryByTestId(PerpsMarketListViewSelectorsIDs.NO_RESULTS),
        ).not.toBeOnTheScreen();
      });
    });
  });

  // Note: TabBar Navigation tests removed - PerpsMarketListView does not render a bottom tab bar
  // The component only renders market type tabs (All, Crypto, Stocks) for filtering markets

  // Note: Stocks/Commodities Dropdown and Market Type Dropdown tests removed - replaced with category badges

  describe('Watchlist feature flag gating', () => {
    beforeEach(() => {
      mockWatchlistFlagEnabled = false;
    });

    afterEach(() => {
      mockWatchlistFlagEnabled = false;
    });

    it('does not render the watchlist pill when perps-watchlist-v2-enabled is OFF', () => {
      mockWatchlistFlagEnabled = false;
      renderWithProvider(<PerpsMarketListView />, { state: mockState });
      expect(
        screen.queryByTestId(
          `${PerpsMarketListViewSelectorsIDs.SORT_FILTERS}-categories-watchlist`,
        ),
      ).not.toBeOnTheScreen();
    });

    it('renders the watchlist pill when perps-watchlist-v2-enabled is ON', () => {
      mockWatchlistFlagEnabled = true;
      renderWithProvider(<PerpsMarketListView />, { state: mockState });
      expect(
        screen.getByTestId(
          `${PerpsMarketListViewSelectorsIDs.SORT_FILTERS}-categories-watchlist`,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('Discovery Analytics', () => {
    const FILTERS_TEST_ID = PerpsMarketListViewSelectorsIDs.SORT_FILTERS;

    const { PERPS_EVENT_VALUE: PEV, PERPS_EVENT_PROPERTY: PEP } =
      jest.requireActual('@metamask/perps-controller');

    it('fires market_list_filter tracking with the selected category when a category badge is pressed', () => {
      mockWatchlistFlagEnabled = true;
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      fireEvent.press(screen.getByTestId(`${FILTERS_TEST_ID}-category-crypto`));

      expect(mockTrack).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          [PEP.INTERACTION_TYPE]: PEV.INTERACTION_TYPE.MARKET_LIST_FILTER,
          [PEP.BUTTON_CLICKED]: 'crypto',
          [PEP.BUTTON_LOCATION]: PEV.BUTTON_LOCATION.MARKET_LIST,
        }),
      );
    });

    it('fires market_list_filter tracking for the "all" category too', () => {
      mockWatchlistFlagEnabled = true;
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      fireEvent.press(screen.getByTestId(`${FILTERS_TEST_ID}-category-all`));

      expect(mockTrack).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          [PEP.INTERACTION_TYPE]: PEV.INTERACTION_TYPE.MARKET_LIST_FILTER,
          [PEP.BUTTON_CLICKED]: 'all',
        }),
      );
    });

    it('fires market_list_filter tracking with button_clicked=watchlist when watchlist toggle is pressed', () => {
      mockWatchlistFlagEnabled = true;
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      fireEvent.press(
        screen.getByTestId(`${FILTERS_TEST_ID}-categories-watchlist`),
      );

      expect(mockTrack).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          [PEP.INTERACTION_TYPE]: PEV.INTERACTION_TYPE.MARKET_LIST_FILTER,
          [PEP.BUTTON_CLICKED]: PEV.BUTTON_CLICKED.WATCHLIST,
          [PEP.BUTTON_LOCATION]: PEV.BUTTON_LOCATION.MARKET_LIST,
        }),
      );
    });

    it('fires filter_applied with filter_category=watchlist when the watchlist toggle is pressed', () => {
      mockWatchlistFlagEnabled = true;
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      fireEvent.press(
        screen.getByTestId(`${FILTERS_TEST_ID}-categories-watchlist`),
      );

      expect(mockTrack).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          [PEP.INTERACTION_TYPE]: PEV.INTERACTION_TYPE.FILTER_APPLIED,
          [PEP.FILTER_CATEGORY]: PEV.BUTTON_CLICKED.WATCHLIST,
        }),
      );
    });

    it('includes source_section=all_markets when pressing a market with no active filter or search', () => {
      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      fireEvent.press(screen.getByTestId('market-row-BTC'));

      expect(mockNavigation.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            params: expect.objectContaining({
              source_section: 'all_markets',
            }),
          }),
        }),
      );
    });

    it('fires search result_count after search query stabilises (debounced)', async () => {
      jest.useFakeTimers();

      // Set hook to return a non-empty searchQuery + 1 result so the debounce effect fires
      mockUsePerpsMarketListView.mockReturnValue({
        markets: [mockMarketData[0]], // BTC only
        searchState: {
          searchQuery: 'BT',
          setSearchQuery: mockSetSearchQuery,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc' as const,
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: false,
          setShowFavoritesOnly: jest.fn(),
          hasWatchlistMarkets: false,
          watchlistMarketObjects: [],
          suggestedMarkets: [],
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all' as const,
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 1,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Advance past the 500ms debounce window
      jest.advanceTimersByTime(600);

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith(
          MetaMetricsEvents.PERPS_SEARCH_QUERY,
          expect.objectContaining({
            [PEP.SEARCH_QUERY]: 'bt',
            query_text: 'bt',
            query_length: 2,
            [PEP.RESULTS_COUNT]: 1,
            [PEP.RESULT_COUNT]: 1,
            has_results: true,
            [PEP.MODE]: 'intent',
            [PEP.SOURCE]: PEV.SOURCE.PERP_MARKET_SEARCH,
          }),
        );
      });

      // a results-shown screen view accompanies the search query event.
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_SCREEN_VIEWED,
        expect.objectContaining({
          [PEP.SCREEN_TYPE]: PEV.SCREEN_TYPE.SEARCH_RESULTS_SHOWN,
          [PEP.SEARCH_QUERY]: 'bt',
          [PEP.RESULT_COUNT]: 1,
        }),
      );

      jest.useRealTimers();
    });

    it('fires a search_no_results screen view when the query returns nothing', async () => {
      jest.useFakeTimers();

      mockUsePerpsMarketListView.mockReturnValue({
        markets: [],
        searchState: {
          searchQuery: 'ZZZZ',
          setSearchQuery: mockSetSearchQuery,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc' as const,
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: false,
          setShowFavoritesOnly: jest.fn(),
          hasWatchlistMarkets: false,
          watchlistMarketObjects: [],
          suggestedMarkets: [],
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all' as const,
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 0,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      jest.advanceTimersByTime(600);

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith(
          MetaMetricsEvents.PERPS_SEARCH_QUERY,
          expect.objectContaining({
            [PEP.SEARCH_QUERY]: 'zzzz',
            [PEP.RESULT_COUNT]: 0,
            has_results: false,
          }),
        );
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_SCREEN_VIEWED,
        expect.objectContaining({
          [PEP.SCREEN_TYPE]: PEV.SCREEN_TYPE.SEARCH_NO_RESULTS,
          [PEP.SEARCH_QUERY]: 'zzzz',
          [PEP.RESULT_COUNT]: 0,
        }),
      );

      jest.useRealTimers();
    });

    it('emits SEARCH_ABANDONED on blur for an emitted, un-tapped query', () => {
      jest.useFakeTimers();

      mockUsePerpsMarketListView.mockReturnValue({
        markets: [mockMarketData[0]],
        searchState: {
          searchQuery: 'BT',
          setSearchQuery: mockSetSearchQuery,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc' as const,
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: false,
          setShowFavoritesOnly: jest.fn(),
          hasWatchlistMarkets: false,
          watchlistMarketObjects: [],
          suggestedMarkets: [],
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all' as const,
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 1,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Let the debounce emit the query.
      act(() => {
        jest.advanceTimersByTime(600);
      });

      // Simulate the screen blurring by invoking every captured focus cleanup
      // (the abandon cleanup is among them; sibling cleanups are no-ops here).
      const rnav = jest.requireMock('@react-navigation/native');
      const focusCleanups = (
        rnav.useFocusEffect.mock.results as { value: unknown }[]
      )
        .map((r) => r.value)
        .filter((v): v is () => void => typeof v === 'function');
      act(() => {
        focusCleanups.forEach((cleanup) => cleanup());
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_SEARCH_ABANDONED,
        expect.objectContaining({
          [PEP.SEARCH_QUERY]: 'bt',
          query_count: 1,
        }),
      );

      jest.useRealTimers();
    });

    it('flushes a pending search query on blur while loading with the count props omitted', () => {
      jest.useFakeTimers();

      mockUsePerpsMarketListView.mockReturnValue({
        markets: [],
        searchState: {
          searchQuery: 'BT',
          setSearchQuery: mockSetSearchQuery,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc' as const,
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: false,
          setShowFavoritesOnly: jest.fn(),
          hasWatchlistMarkets: false,
          watchlistMarketObjects: [],
          suggestedMarkets: [],
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all' as const,
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 0,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
        },
        // Results still loading — the flush must emit the query without a
        // count, never drop it and never report a stale count.
        isLoading: true,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // The debounce is gated while loading, so nothing is scheduled.
      act(() => {
        jest.advanceTimersByTime(600);
      });

      const rnav = jest.requireMock('@react-navigation/native');
      const focusCleanups = (
        rnav.useFocusEffect.mock.results as { value: unknown }[]
      )
        .map((r) => r.value)
        .filter((v): v is () => void => typeof v === 'function');
      act(() => {
        focusCleanups.forEach((cleanup) => cleanup());
      });

      // The pending query is still emitted (never a silent drop) but with the
      // count-dependent props omitted, since the count is unknown mid-load.
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_SEARCH_QUERY,
        expect.objectContaining({
          [PEP.SEARCH_QUERY]: 'bt',
          query_text: 'bt',
          query_length: 2,
        }),
      );
      const searchQueryProps =
        mockTrack.mock.calls.find(
          ([name]) => name === MetaMetricsEvents.PERPS_SEARCH_QUERY,
        )?.[1] ?? {};
      expect(searchQueryProps).not.toHaveProperty(PEP.RESULTS_COUNT);
      expect(searchQueryProps).not.toHaveProperty(PEP.RESULT_COUNT);
      expect(searchQueryProps).not.toHaveProperty('has_results');
      // No results/no-results screen view is recorded while loading — the
      // counts that determine which screen type was shown are unknown.
      expect(mockTrack).not.toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_SCREEN_VIEWED,
        expect.objectContaining({
          [PEP.SCREEN_TYPE]: expect.stringMatching(/search/i),
        }),
      );

      jest.useRealTimers();
    });

    it('emits the pending SEARCH_QUERY before RESULT_TAPPED when a result is tapped mid-debounce', () => {
      jest.useFakeTimers();

      mockUsePerpsMarketListView.mockReturnValue({
        markets: [mockMarketData[0]],
        searchState: {
          searchQuery: 'BT',
          setSearchQuery: mockSetSearchQuery,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc' as const,
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: false,
          setShowFavoritesOnly: jest.fn(),
          hasWatchlistMarkets: false,
          watchlistMarketObjects: [],
          suggestedMarkets: [],
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all' as const,
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 1,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      // Tap a result BEFORE the 500ms debounce fires — the query is still
      // pending. The tap must flush it first so the funnel is query → tap.
      act(() => {
        fireEvent.press(screen.getByTestId('market-row-BTC'));
      });

      const emitted = mockTrack.mock.calls.map(([name]) => name);
      const queryIdx = emitted.indexOf(MetaMetricsEvents.PERPS_SEARCH_QUERY);
      const tapIdx = emitted.indexOf(
        MetaMetricsEvents.PERPS_SEARCH_RESULT_TAPPED,
      );
      expect(queryIdx).toBeGreaterThanOrEqual(0);
      expect(tapIdx).toBeGreaterThanOrEqual(0);
      expect(queryIdx).toBeLessThan(tapIdx);

      jest.useRealTimers();
    });

    it('resets the full session on abandonment so query_count does not inflate across sessions', () => {
      jest.useFakeTimers();

      const sessionMock = (searchQuery: string) => ({
        markets: [mockMarketData[0]],
        searchState: {
          searchQuery,
          setSearchQuery: mockSetSearchQuery,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc' as const,
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: false,
          setShowFavoritesOnly: jest.fn(),
          hasWatchlistMarkets: false,
          watchlistMarketObjects: [],
          suggestedMarkets: [],
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all' as const,
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 1,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
        },
        isLoading: false,
        error: null,
      });

      const rnav = jest.requireMock('@react-navigation/native');
      const blur = () =>
        act(() => {
          (rnav.useFocusEffect.mock.results as { value: unknown }[])
            .map((r) => r.value)
            .filter((v): v is () => void => typeof v === 'function')
            .forEach((cleanup) => cleanup());
        });

      // Session 1: emit then abandon on blur (resets the session).
      mockUsePerpsMarketListView.mockReturnValue(sessionMock('BT'));
      const { rerender } = renderWithProvider(<PerpsMarketListView />, {
        state: mockState,
      });
      act(() => jest.advanceTimersByTime(600));
      blur();

      // Session 2: a fresh query — its abandonment must report query_count 1,
      // not an inflated count carried over from session 1.
      mockTrack.mockClear();
      mockUsePerpsMarketListView.mockReturnValue(sessionMock('ETH'));
      act(() => rerender(<PerpsMarketListView />));
      act(() => jest.advanceTimersByTime(600));
      blur();

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_SEARCH_ABANDONED,
        expect.objectContaining({ query_count: 1 }),
      );

      jest.useRealTimers();
    });

    it('does NOT fire filter_applied when the watchlist toggle is turned OFF', () => {
      mockWatchlistFlagEnabled = true;
      // Watchlist already active → pressing it clears the filter.
      mockUsePerpsMarketListView.mockReturnValue({
        markets: [mockMarketData[0]],
        searchState: {
          searchQuery: '',
          setSearchQuery: mockSetSearchQuery,
          clearSearch: mockClearSearch,
        },
        sortState: {
          selectedOptionId: 'volume',
          sortBy: 'volume',
          direction: 'desc' as const,
          handleOptionChange: jest.fn(),
        },
        favoritesState: {
          showFavoritesOnly: true,
          setShowFavoritesOnly: jest.fn(),
          hasWatchlistMarkets: true,
          watchlistMarketObjects: [mockMarketData[0]],
          suggestedMarkets: [],
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all' as const,
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 1,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
        },
        isLoading: false,
        error: null,
      });

      renderWithProvider(<PerpsMarketListView />, { state: mockState });

      fireEvent.press(
        screen.getByTestId(`${FILTERS_TEST_ID}-categories-watchlist`),
      );

      expect(mockTrack).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          [PEP.INTERACTION_TYPE]: PEV.INTERACTION_TYPE.FILTER_APPLIED,
        }),
      );
    });
  });

  describe('Edge Cases', () => {
    it('filters markets with whitespace-only query', async () => {
      mockSearchQuery = '   ';

      // Mock to return empty results when search query is whitespace
      mockUsePerpsMarketListView.mockReturnValue({
        markets: mockMarketData, // Whitespace is trimmed, so all markets show
        searchState: {
          searchQuery: '   ',
          setSearchQuery: mockSetSearchQuery,
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
          hasWatchlistMarkets: false,
          watchlistMarketObjects: [],
          suggestedMarkets: [],
        },
        marketTypeFilterState: {
          marketTypeFilter: 'all',
          setMarketTypeFilter: jest.fn(),
        },
        marketCounts: {
          crypto: 3,
          stocks: 0,
          'pre-ipo': 0,
          indices: 0,
          etfs: 0,
          commodities: 0,
          forex: 0,
          new: 0,
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
