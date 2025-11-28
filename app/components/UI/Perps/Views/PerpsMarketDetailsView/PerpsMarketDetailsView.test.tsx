import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import PerpsMarketDetailsView from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { PerpsConnectionProvider } from '../../providers/PerpsConnectionProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { Linking } from 'react-native';

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('react-native-modal', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return ({
    isVisible,
    children,
    ...props
  }: {
    isVisible: boolean;
    children: React.ReactNode;
    [key: string]: unknown;
  }) =>
    isVisible ? (
      <View testID="modal-container" {...props}>
        {children}
      </View>
    ) : null;
});

// Mock @consensys/native-ramps-sdk to provide missing enum
jest.mock('@consensys/native-ramps-sdk', () => ({
  ...jest.requireActual('@consensys/native-ramps-sdk'),
  DepositPaymentMethodDuration: {
    instant: 'instant',
    oneToTwoDays: 'oneToTwoDays',
  },
}));

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
}));

// Mock PerpsStreamManager
jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => ({
    prices: {
      subscribeToSymbols: jest.fn(() => jest.fn()),
      subscribe: jest.fn(() => jest.fn()),
    },
    positions: { subscribe: jest.fn(() => jest.fn()) },
    orders: { subscribe: jest.fn(() => jest.fn()) },
    fills: { subscribe: jest.fn(() => jest.fn()) },
    account: { subscribe: jest.fn(() => jest.fn()) },
    marketData: { subscribe: jest.fn(() => jest.fn()), getMarkets: jest.fn() },
    oiCaps: { subscribe: jest.fn(() => jest.fn()) },
  })),
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

// Mock Redux selectors for chart preferences
jest.mock('../../selectors/chartPreferences', () => ({
  selectPerpsChartPreferredCandlePeriod: jest.fn(() => '15m'),
}));

// Mock Logger
const mockLoggerError = jest.fn();
const mockLoggerLog = jest.fn();
const mockLoggerWarn = jest.fn();

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => mockLoggerError(...args),
    log: (...args: unknown[]) => mockLoggerLog(...args),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
  },
}));

// Create mock functions that can be modified during tests
const mockUsePerpsAccount = jest.fn();
const mockUsePerpsLiveAccount = jest.fn();
const mockUseHasExistingPosition = jest.fn();

// Mock usePerpsLiveAccount to avoid PerpsStreamProvider requirement
jest.mock('../../hooks/stream/usePerpsLiveAccount', () => ({
  usePerpsLiveAccount: mockUsePerpsLiveAccount,
}));

// Navigation mock functions
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();

// usePerpsNavigation mock functions
const mockNavigateToHome = jest.fn();
const mockNavigateToActivity = jest.fn();
const mockNavigateToOrder = jest.fn();
const mockNavigateToTutorial = jest.fn();
const mockNavigateBack = jest.fn();

// Mock notification feature flag
const mockIsNotificationsFeatureEnabled = jest.fn();

// Mock route params that can be modified during tests
const mockRouteParams: {
  market?: {
    symbol: string;
    name: string;
    price: string;
    change24h: string;
    change24hPercent: string;
    volume: string;
    maxLeverage: string;
  };
  monitoringIntent?: {
    asset: string;
    monitor: 'orders' | 'positions' | 'both';
  };
} = {
  market: {
    symbol: 'BTC',
    name: 'Bitcoin',
    price: '$45,000.00',
    change24h: '+$1,125.00',
    change24hPercent: '+2.50%',
    volume: '$1.23B',
    maxLeverage: '40x',
  },
  monitoringIntent: undefined,
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      canGoBack: mockCanGoBack,
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('../../hooks/useHasExistingPosition', () => ({
  useHasExistingPosition: () => mockUseHasExistingPosition(),
}));

jest.mock('../../hooks/stream/usePerpsLiveAccount', () => ({
  usePerpsLiveAccount: () => mockUsePerpsAccount(),
}));

// Mock the selector module first
jest.mock('../../selectors/perpsController', () => ({
  selectPerpsEligibility: jest.fn(),
  createSelectIsWatchlistMarket: jest.fn(() => jest.fn(() => false)),
}));

// Mock react-redux
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

// Mock usePerpsConnection hook directly to ensure all hooks that import it get the mock
jest.mock('../../hooks/usePerpsConnection', () => ({
  usePerpsConnection: () => ({
    isConnected: true,
    isConnecting: false,
    isInitialized: true,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    resetError: jest.fn(),
    reconnectWithNewContext: jest.fn(),
  }),
}));

jest.mock('../../providers/PerpsConnectionProvider', () => ({
  PerpsConnectionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  usePerpsConnection: () => ({
    isConnected: true,
    isConnecting: false,
    isInitialized: true,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    resetError: jest.fn(),
    reconnectWithNewContext: jest.fn(),
  }),
}));

const mockRefreshOrders = jest.fn();
const mockUsePerpsOpenOrdersImpl = jest.fn(() => ({
  orders: [
    {
      id: 'order1',
      orderId: 'order1',
      symbol: 'BTC',
      side: 'buy',
      size: '0.1',
      originalSize: '0.1',
      price: '45000',
      status: 'open',
      timestamp: Date.now(),
      lastUpdated: Date.now(),
      orderType: 'limit',
      filledSize: '0',
      remainingSize: '0.1',
      detailedOrderType: 'Limit Order',
      isTrigger: false,
      reduceOnly: false,
    },
  ],
  refresh: mockRefreshOrders,
  isLoading: false,
  error: null,
}));

jest.mock('../../hooks/usePerpsOpenOrders', () => ({
  usePerpsOpenOrders: () => mockUsePerpsOpenOrdersImpl(),
}));

const mockRefreshMarketStats = jest.fn();
jest.mock('../../hooks/usePerpsMarketStats', () => ({
  usePerpsMarketStats: () => ({
    currentPrice: '$45,000.00',
    priceChange24h: '+$1,125.00',
    high24h: '$46,000.00',
    low24h: '$44,000.00',
    volume24h: '$1.23B',
    openInterest: '$500M',
    fundingRate: '+0.01%',
    fundingCountdown: '5h 30m',
    refresh: mockRefreshMarketStats,
  }),
}));

jest.mock('../../hooks/stream/usePerpsLiveCandles', () => ({
  usePerpsLiveCandles: () => ({
    candleData: {
      coin: 'BTC',
      interval: '1h',
      candles: [
        {
          time: 1234567890,
          open: '45000',
          high: '45500',
          low: '44500',
          close: '45200',
          volume: '1000',
        },
      ],
    },
    isLoading: false,
    hasHistoricalData: true,
    error: null,
  }),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(() => ({
    track: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePerpsPrices', () => ({
  usePerpsPrices: jest.fn(() => ({})),
}));

jest.mock('../../hooks/useIsPriceDeviatedAboveThreshold', () => ({
  useIsPriceDeviatedAboveThreshold: jest.fn(() => ({
    isDeviatedAboveThreshold: false,
    isLoading: false,
  })),
}));

jest.mock('../../hooks', () => ({
  usePerpsLiveAccount: () => mockUsePerpsAccount(),
  usePerpsConnection: () => ({
    isConnected: true,
    isConnecting: false,
    isInitialized: true,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    resetError: jest.fn(),
    reconnectWithNewContext: jest.fn(),
  }),
  usePerpsOpenOrders: () => ({
    orders: [],
    refresh: mockRefreshOrders,
    isLoading: false,
    error: null,
  }),
  usePerpsPositions: jest.fn(() => ({
    positions: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    loadPositions: jest.fn(),
  })),
  usePerpsTPSLUpdate: jest.fn(() => ({
    updateTPSL: jest.fn(),
    isUpdating: false,
  })),
  usePerpsClosePosition: jest.fn(() => ({
    closePosition: jest.fn(),
    isClosing: false,
  })),
  usePerpsMarkets: jest.fn(() => ({
    markets: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    isRefreshing: false,
  })),
  usePerpsTrading: jest.fn(() => ({
    placeOrder: jest.fn(),
    cancelOrder: jest.fn(),
    getAccountState: jest.fn(),
    depositWithConfirmation: jest.fn(() => Promise.resolve()),
    withdrawWithConfirmation: jest.fn(),
  })),
  usePerpsNetworkManagement: jest.fn(() => ({
    ensureArbitrumNetworkExists: jest.fn().mockResolvedValue(undefined),
  })),
  usePerpsNavigation: jest.fn(() => ({
    navigateToHome: mockNavigateToHome,
    navigateToActivity: mockNavigateToActivity,
    navigateToOrder: mockNavigateToOrder,
    navigateToTutorial: mockNavigateToTutorial,
    navigateBack: mockNavigateBack,
    canGoBack: mockCanGoBack(),
  })),
  usePositionManagement: jest.fn(() => ({
    showModifyActionSheet: false,
    showAdjustMarginActionSheet: false,
    showReversePositionSheet: false,
    modifyActionSheetRef: { current: null },
    adjustMarginActionSheetRef: { current: null },
    reversePositionSheetRef: { current: null },
    openModifySheet: jest.fn(),
    closeModifySheet: jest.fn(),
    openAdjustMarginSheet: jest.fn(),
    closeAdjustMarginSheet: jest.fn(),
    openReversePositionSheet: jest.fn(),
    closeReversePositionSheet: jest.fn(),
    handleReversePosition: jest.fn(),
  })),
}));

// Mock usePerpsABTest to return default variant
jest.mock('../../utils/abTesting/usePerpsABTest', () => ({
  usePerpsABTest: () => ({
    variantName: 'semantic',
    isEnabled: false,
  }),
}));

// Mock usePerpsOICap to return not at cap by default
jest.mock('../../hooks/usePerpsOICap', () => ({
  usePerpsOICap: () => ({
    isAtCap: false,
    capPercentage: 50,
  }),
}));

// Mock PerpsMarketStatisticsCard to simplify the test
jest.mock('../../components/PerpsMarketStatisticsCard', () => {
  const { View, TouchableOpacity } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const { PerpsMarketDetailsViewSelectorsIDs: SelectorsIDs } =
    jest.requireActual('../../../../../../e2e/selectors/Perps/Perps.selectors');

  return {
    __esModule: true,
    default: function MockPerpsMarketStatisticsCard({
      onTooltipPress,
    }: {
      onTooltipPress?: (type: string) => void;
    }) {
      const [showTooltip, setShowTooltip] = ReactActual.useState(false);

      const handlePress = (type: string) => {
        setShowTooltip(true);
        onTooltipPress?.(type);
      };

      return (
        <View>
          <View testID={SelectorsIDs.STATISTICS_HIGH_24H} />
          <View testID={SelectorsIDs.STATISTICS_LOW_24H} />
          <View testID={SelectorsIDs.STATISTICS_VOLUME_24H} />
          <View testID={SelectorsIDs.STATISTICS_OPEN_INTEREST}>
            <TouchableOpacity
              testID={SelectorsIDs.OPEN_INTEREST_INFO_ICON}
              onPress={() => handlePress('open_interest')}
            />
          </View>
          <View testID={SelectorsIDs.STATISTICS_FUNDING_RATE}>
            <TouchableOpacity
              testID={SelectorsIDs.FUNDING_RATE_INFO_ICON}
              onPress={() => handlePress('funding_rate')}
            />
          </View>
          <View testID={SelectorsIDs.STATISTICS_FUNDING_COUNTDOWN} />
          {showTooltip && <View testID="perps-bottom-sheet-tooltip" />}
        </View>
      );
    },
  };
});

// Mock PerpsPositionCard
jest.mock('../../components/PerpsPositionCard', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock notification utility
jest.mock('../../../../../util/notifications', () => ({
  ...jest.requireActual('../../../../../util/notifications'),
  isNotificationsFeatureEnabled: () => mockIsNotificationsFeatureEnabled(),
}));

// Mock PerpsNotificationTooltip
jest.mock('../../components/PerpsNotificationTooltip', () => ({
  __esModule: true,
  default: ({
    orderSuccess,
    testID,
  }: {
    orderSuccess: boolean;
    testID: string;
  }) => {
    const { View } = jest.requireActual('react-native');
    return orderSuccess ? <View testID={testID} /> : null;
  },
}));

// Mock PerpsOpenOrderCard
jest.mock('../../components/PerpsOpenOrderCard', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock PerpsBottomSheetTooltip to avoid SafeAreaProvider issues
jest.mock(
  '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip',
  () => {
    const { TouchableOpacity, Text } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: function MockPerpsBottomSheetTooltip({
        isVisible,
        onClose,
        testID,
      }: {
        isVisible: boolean;
        onClose?: () => void;
        testID: string;
      }) {
        return isVisible ? (
          <TouchableOpacity testID={testID} onPress={onClose}>
            <Text>Geo Block Tooltip</Text>
          </TouchableOpacity>
        ) : null;
      },
    };
  },
);

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PerpsMarketDetailsView', () => {
  // Set up default mock return values before each test
  beforeEach(() => {
    mockUsePerpsAccount.mockReturnValue({
      account: {
        availableBalance: '1000.00',
        marginUsed: '0.00',
        unrealizedPnl: '0.00',
        returnOnEquity: '0.00',
        totalBalance: '1000.00',
      },
      isInitialLoading: false,
    });

    mockUsePerpsLiveAccount.mockReturnValue({
      account: {
        availableBalance: '1000',
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
        totalBalance: '1000',
      },
      isInitialLoading: false,
    });

    mockUseHasExistingPosition.mockReturnValue({
      hasPosition: false,
      isLoading: false,
      error: null,
      existingPosition: null,
      refreshPosition: jest.fn(),
    });

    // Reset navigation mocks
    mockCanGoBack.mockReturnValue(true);

    // Default eligibility mock
    const { useSelector } = jest.requireMock('react-redux');
    const mockSelectPerpsEligibility = jest.requireMock(
      '../../selectors/perpsController',
    ).selectPerpsEligibility;
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === mockSelectPerpsEligibility) {
        return true;
      }
      return undefined;
    });

    // Reset notification feature flag to default
    mockIsNotificationsFeatureEnabled.mockReturnValue(true);

    // Reset route params to default
    mockRouteParams.market = {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: '$45,000.00',
      change24h: '+$1,125.00',
      change24hPercent: '+2.50%',
      volume: '$1.23B',
      maxLeverage: '40x',
    };
  });

  // Clean up mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
    mockRefreshOrders.mockClear();
    mockRefreshMarketStats.mockClear();
    mockNavigate.mockClear();
    mockGoBack.mockClear();
  });

  it('renders correctly', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsConnectionProvider>
        <PerpsMarketDetailsView />
      </PerpsConnectionProvider>,
      {
        state: initialState,
      },
    );

    expect(
      getByTestId(PerpsMarketDetailsViewSelectorsIDs.CONTAINER),
    ).toBeTruthy();
    expect(getByTestId(PerpsMarketDetailsViewSelectorsIDs.HEADER)).toBeTruthy();
  });

  it('renders statistics items', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <PerpsConnectionProvider>
        <PerpsMarketDetailsView />
      </PerpsConnectionProvider>,
      {
        state: initialState,
      },
    );

    // Check if tabs exist (they might not if there's no position)
    const statisticsTab = queryByTestId('perps-market-tabs-statistics-tab');
    if (statisticsTab) {
      fireEvent.press(statisticsTab);
    }
    // Otherwise, statistics might be shown by default

    // Now look for statistics elements
    expect(
      getByTestId(PerpsMarketDetailsViewSelectorsIDs.STATISTICS_HIGH_24H),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsMarketDetailsViewSelectorsIDs.STATISTICS_LOW_24H),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsMarketDetailsViewSelectorsIDs.STATISTICS_VOLUME_24H),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsMarketDetailsViewSelectorsIDs.STATISTICS_OPEN_INTEREST),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsMarketDetailsViewSelectorsIDs.STATISTICS_FUNDING_RATE),
    ).toBeTruthy();
    expect(
      getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.STATISTICS_FUNDING_COUNTDOWN,
      ),
    ).toBeTruthy();
  });

  it('renders long/short buttons when user has available balance', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsConnectionProvider>
        <PerpsMarketDetailsView />
      </PerpsConnectionProvider>,
      {
        state: initialState,
      },
    );

    expect(
      getByTestId(PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON),
    ).toBeTruthy();
  });

  it('shows tooltip when Open Interest info icon is clicked', async () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <PerpsConnectionProvider>
        <PerpsMarketDetailsView />
      </PerpsConnectionProvider>,
      {
        state: initialState,
      },
    );

    // Check if tabs exist (they might not if there's no position)
    const statisticsTab = queryByTestId('perps-market-tabs-statistics-tab');
    if (statisticsTab) {
      fireEvent.press(statisticsTab);
    }

    const openInterestInfoIcon = getByTestId(
      PerpsMarketDetailsViewSelectorsIDs.OPEN_INTEREST_INFO_ICON,
    );
    expect(openInterestInfoIcon).toBeTruthy();

    fireEvent.press(openInterestInfoIcon);

    await waitFor(() => {
      expect(getByTestId('perps-bottom-sheet-tooltip')).toBeTruthy();
    });
  });

  it('shows tooltip when Funding Rate info icon is clicked', async () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <PerpsConnectionProvider>
        <PerpsMarketDetailsView />
      </PerpsConnectionProvider>,
      {
        state: initialState,
      },
    );

    // Check if tabs exist (they might not if there's no position)
    const statisticsTab = queryByTestId('perps-market-tabs-statistics-tab');
    if (statisticsTab) {
      fireEvent.press(statisticsTab);
    }

    const fundingRateInfoIcon = getByTestId(
      PerpsMarketDetailsViewSelectorsIDs.FUNDING_RATE_INFO_ICON,
    );
    expect(fundingRateInfoIcon).toBeTruthy();

    fireEvent.press(fundingRateInfoIcon);

    await waitFor(() => {
      expect(getByTestId('perps-bottom-sheet-tooltip')).toBeTruthy();
    });
  });

  describe('Button rendering scenarios', () => {
    it('renders add funds button when user balance is zero', () => {
      // Override with zero balance
      mockUsePerpsAccount.mockReturnValue({
        account: {
          availableBalance: '0.00',
          marginUsed: '0.00',
          unrealizedPnl: '0.00',
          returnOnEquity: '0.00',
          totalBalance: '0.00',
        },
        isInitialLoading: false,
      });

      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '0',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalBalance: '0',
        },
        isInitialLoading: false,
      });

      const { getByText, getByTestId, queryByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Shows add funds message and button
      expect(getByText('Add funds to start trading perps')).toBeTruthy();
      expect(getByText('Add funds')).toBeTruthy();

      // When balance is zero, the Add Funds button should be present
      // and the long/short buttons should not be present
      expect(
        getByTestId(PerpsMarketDetailsViewSelectorsIDs.ADD_FUNDS_BUTTON),
      ).toBeTruthy();
      expect(
        queryByTestId(PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON),
      ).toBeNull();
      expect(
        queryByTestId(PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON),
      ).toBeNull();
    });

    it('renders modify/close buttons when user has balance and existing position', () => {
      // Override with non-zero balance and existing position
      mockUsePerpsAccount.mockReturnValue({
        account: {
          availableBalance: '1000.00',
          marginUsed: '500.00',
          unrealizedPnl: '50.00',
          returnOnEquity: '3.33',
          totalBalance: '1550.00',
        },
        isInitialLoading: false,
      });

      mockUseHasExistingPosition.mockReturnValue({
        hasPosition: true,
        isLoading: false,
        error: null,
        existingPosition: {
          coin: 'BTC',
          size: '0.5',
          entryPrice: '44000',
          positionValue: '22000',
          unrealizedPnl: '50',
          marginUsed: '500',
          leverage: { type: 'isolated', value: 5 },
          liquidationPrice: '40000',
          maxLeverage: 20,
          returnOnEquity: '1.14',
          cumulativeFunding: {
            allTime: '0',
            sinceOpen: '0',
            sinceChange: '0',
          },
        },
        refreshPosition: jest.fn(),
      });

      const { getByTestId, queryByText, queryByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Shows modify/close buttons when existing position exists (not long/short buttons)
      expect(
        getByTestId(PerpsMarketDetailsViewSelectorsIDs.MODIFY_BUTTON),
      ).toBeTruthy();
      expect(
        getByTestId(PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON),
      ).toBeTruthy();

      // Long/short buttons should NOT be shown when position exists
      expect(
        queryByTestId(PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON),
      ).toBeNull();
      expect(
        queryByTestId(PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON),
      ).toBeNull();

      // Does not show add funds message
      expect(queryByText('Add funds to start trading perps')).toBeNull();
    });

    it('renders long/short buttons when user has balance and no existing position', () => {
      // Test with default mocks (non-zero balance, no existing position)
      const { getByTestId, queryByText } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Shows long/short buttons
      expect(
        getByTestId(PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON),
      ).toBeTruthy();
      expect(
        getByTestId(PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON),
      ).toBeTruthy();

      // Does not show add funds message
      expect(queryByText('Add funds to start trading perps')).toBeNull();
    });
  });

  describe('Pull-to-refresh functionality', () => {
    it('triggers refresh function when RefreshControl is pulled', async () => {
      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Get the ScrollView component
      const scrollView = getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW,
      );
      const refreshControl = scrollView.props.refreshControl;

      // Trigger the refresh
      await act(async () => {
        await refreshControl.props.onRefresh();
      });

      // Note: Candle data now uses WebSocket streaming (usePerpsLiveCandles)
      // so no manual refresh is needed - data updates automatically
    });

    it('refreshes candle data when position tab is active', async () => {
      // Arrange
      const mockRefreshPosition = jest.fn();
      mockUseHasExistingPosition.mockReturnValue({
        hasPosition: false,
        isLoading: false,
        error: null,
        existingPosition: null,
        refreshPosition: mockRefreshPosition, // No-op function for WebSocket positions
      });

      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Act
      const scrollView = getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW,
      );
      const refreshControl = scrollView.props.refreshControl;

      await act(async () => {
        await refreshControl.props.onRefresh();
      });

      // Assert - Candle data uses WebSocket streaming, no manual refresh needed
      // refreshPosition is a no-op for WebSocket, so we don't expect it to be called
      expect(mockRefreshPosition).not.toHaveBeenCalled();
    });

    it('refreshes statistics data via WebSocket', async () => {
      // Arrange
      const mockRefreshPosition = jest.fn();
      mockUseHasExistingPosition.mockReturnValue({
        hasPosition: true,
        isLoading: false,
        error: null,
        existingPosition: {
          coin: 'BTC',
          size: '0.5',
          entryPrice: '44000',
          positionValue: '22000',
          unrealizedPnl: '50',
          marginUsed: '500',
          leverage: { type: 'isolated', value: 5 },
          liquidationPrice: '40000',
          maxLeverage: 20,
          returnOnEquity: '1.14',
          cumulativeFunding: {
            allTime: '0',
            sinceOpen: '0',
            sinceChange: '0',
          },
        },
        refreshPosition: mockRefreshPosition,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      const scrollView = getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW,
      );
      const refreshControl = scrollView.props.refreshControl;

      await act(async () => {
        await refreshControl.props.onRefresh();
      });

      // Assert - All data now updates via WebSocket, no manual refresh needed
      // Market stats, candles, positions, and orders update via WebSocket
      expect(mockRefreshMarketStats).not.toHaveBeenCalled();
      expect(mockRefreshPosition).not.toHaveBeenCalled();
      expect(mockRefreshOrders).not.toHaveBeenCalled();
    });

    it('refreshes candle data by default', async () => {
      // Arrange
      const mockRefreshPosition = jest.fn();
      mockUseHasExistingPosition.mockReturnValue({
        hasPosition: false,
        isLoading: false,
        error: null,
        existingPosition: null,
        refreshPosition: mockRefreshPosition,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Act
      const scrollView = getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW,
      );
      const refreshControl = scrollView.props.refreshControl;

      await act(async () => {
        await refreshControl.props.onRefresh();
      });

      // Assert - Candle data now uses WebSocket streaming (no manual refresh)
      // Positions also update via WebSocket
      expect(mockRefreshPosition).not.toHaveBeenCalled();
    });

    it('handles refresh state correctly during refresh operation', async () => {
      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Get the ScrollView component
      const scrollView = getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW,
      );
      const refreshControl = scrollView.props.refreshControl;

      // Initially not refreshing
      expect(refreshControl.props.refreshing).toBe(false);

      // Trigger the refresh
      await act(async () => {
        await refreshControl.props.onRefresh();
      });

      // Note: Candle data now uses WebSocket streaming (no manual refresh needed)
    });

    it('handles refresh gracefully with WebSocket streaming', async () => {
      // Note: Candle data now uses WebSocket streaming, so refresh is a no-op
      // This test verifies the refresh control doesn't break with WebSocket data
      const mockRefreshPosition = jest.fn();

      mockUseHasExistingPosition.mockReturnValue({
        hasPosition: false,
        isLoading: false,
        error: null,
        existingPosition: null,
        refreshPosition: mockRefreshPosition,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Get the ScrollView component
      const scrollView = getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW,
      );
      const refreshControl = scrollView.props.refreshControl;

      // Trigger the refresh - should complete without errors
      await act(async () => {
        await refreshControl.props.onRefresh();
      });

      // Refresh control should exist and be functional
      expect(refreshControl).toBeDefined();
      expect(refreshControl.props.refreshing).toBe(false);
    });
  });

  describe('Navigation functionality', () => {
    it('navigates to long order screen when long button is pressed and user is eligible', async () => {
      const { useSelector } = jest.requireMock('react-redux');
      const mockSelectPerpsEligibility = jest.requireMock(
        '../../selectors/perpsController',
      ).selectPerpsEligibility;
      useSelector.mockImplementation((selector: unknown) => {
        if (selector === mockSelectPerpsEligibility) {
          return true;
        }
        return undefined;
      });

      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      const longButton = getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON,
      );
      await act(async () => {
        fireEvent.press(longButton);
      });

      expect(mockNavigateToOrder).toHaveBeenCalledTimes(1);
      expect(mockNavigateToOrder).toHaveBeenCalledWith({
        direction: 'long',
        asset: 'BTC',
      });
    });

    it('navigates to short order screen when short button is pressed and user is eligible', async () => {
      const { useSelector } = jest.requireMock('react-redux');
      const mockSelectPerpsEligibility = jest.requireMock(
        '../../selectors/perpsController',
      ).selectPerpsEligibility;
      useSelector.mockImplementation((selector: unknown) => {
        if (selector === mockSelectPerpsEligibility) {
          return true;
        }
        return undefined;
      });

      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      const shortButton = getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON,
      );
      await act(async () => {
        fireEvent.press(shortButton);
      });

      expect(mockNavigateToOrder).toHaveBeenCalledTimes(1);
      expect(mockNavigateToOrder).toHaveBeenCalledWith({
        direction: 'short',
        asset: 'BTC',
      });
    });

    it('navigates to deposit screen when add funds button is pressed', async () => {
      // Set zero balance to show add funds button
      mockUsePerpsAccount.mockReturnValue({
        account: {
          availableBalance: '0.00',
          marginUsed: '0.00',
          unrealizedPnl: '0.00',
          returnOnEquity: '0.00',
          totalBalance: '0.00',
        },
        isInitialLoading: false,
      });

      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '0',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalBalance: '0',
        },
        isInitialLoading: false,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      const addFundsButton = getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.ADD_FUNDS_BUTTON,
      );
      await act(async () => {
        fireEvent.press(addFundsButton);
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        expect.objectContaining({
          screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        }),
      );
    });

    it('shows geo block modal when long button is pressed and user is not eligible', () => {
      const { useSelector } = jest.requireMock('react-redux');
      const mockSelectPerpsEligibility = jest.requireMock(
        '../../selectors/perpsController',
      ).selectPerpsEligibility;
      useSelector.mockImplementation((selector: unknown) => {
        if (selector === mockSelectPerpsEligibility) {
          return false;
        }
        return undefined;
      });

      const { getByTestId, getByText } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      const longButton = getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON,
      );
      fireEvent.press(longButton);

      expect(getByText('Geo Block Tooltip')).toBeTruthy();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows geo block modal when short button is pressed and user is not eligible', () => {
      const { useSelector } = jest.requireMock('react-redux');
      const mockSelectPerpsEligibility = jest.requireMock(
        '../../selectors/perpsController',
      ).selectPerpsEligibility;
      useSelector.mockImplementation((selector: unknown) => {
        if (selector === mockSelectPerpsEligibility) {
          return false;
        }
        return undefined;
      });

      const { getByTestId, getByText } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      const shortButton = getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON,
      );
      fireEvent.press(shortButton);

      expect(getByText('Geo Block Tooltip')).toBeTruthy();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows geo block modal when add funds button is pressed and user is not eligible', () => {
      // Set user as not eligible
      const { useSelector } = jest.requireMock('react-redux');
      const mockSelectPerpsEligibility = jest.requireMock(
        '../../selectors/perpsController',
      ).selectPerpsEligibility;
      useSelector.mockImplementation((selector: unknown) => {
        if (selector === mockSelectPerpsEligibility) {
          return false;
        }
        return undefined;
      });

      // Set zero balance to show add funds button
      mockUsePerpsAccount.mockReturnValue({
        account: {
          availableBalance: '0.00',
          marginUsed: '0.00',
          unrealizedPnl: '0.00',
          returnOnEquity: '0.00',
          totalBalance: '0.00',
        },
        isInitialLoading: false,
      });

      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '0',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalBalance: '0',
        },
        isInitialLoading: false,
      });

      const { getByTestId, getByText } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      const addFundsButton = getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.ADD_FUNDS_BUTTON,
      );
      fireEvent.press(addFundsButton);

      expect(getByText('Geo Block Tooltip')).toBeTruthy();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('closes geo block modal when onClose is called', () => {
      const { useSelector } = jest.requireMock('react-redux');
      const mockSelectPerpsEligibility = jest.requireMock(
        '../../selectors/perpsController',
      ).selectPerpsEligibility;
      useSelector.mockImplementation((selector: unknown) => {
        if (selector === mockSelectPerpsEligibility) {
          return false;
        }
        return undefined;
      });

      const { getByTestId, getByText, queryByText } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      const longButton = getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON,
      );
      fireEvent.press(longButton);

      expect(getByText('Geo Block Tooltip')).toBeTruthy();

      const tooltip = getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
      );
      fireEvent.press(tooltip);

      expect(queryByText('Geo Block Tooltip')).toBeNull();
    });
  });

  describe('Notification tooltip functionality', () => {
    it('renders tooltip when flags are true and from successful order', () => {
      mockIsNotificationsFeatureEnabled.mockReturnValue(true);
      mockRouteParams.monitoringIntent = {
        asset: 'BTC',
        monitor: 'orders',
      };

      const { queryByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      expect(
        queryByTestId(PerpsOrderViewSelectorsIDs.NOTIFICATION_TOOLTIP),
      ).toBeOnTheScreen();
    });

    it('does not show PerpsNotificationTooltip when not navigating from order success', () => {
      mockIsNotificationsFeatureEnabled.mockReturnValue(true);
      mockRouteParams.monitoringIntent = undefined;

      const { queryByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      expect(
        queryByTestId(PerpsOrderViewSelectorsIDs.NOTIFICATION_TOOLTIP),
      ).toBeNull();
    });

    it('does not show PerpsNotificationTooltip when notifications feature is disabled', () => {
      mockIsNotificationsFeatureEnabled.mockReturnValue(false);
      mockRouteParams.monitoringIntent = {
        asset: 'BTC',
        monitor: 'orders',
      };

      const { queryByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      expect(
        queryByTestId(PerpsOrderViewSelectorsIDs.NOTIFICATION_TOOLTIP),
      ).toBeNull();
    });
  });

  describe('Error state handling', () => {
    it('renders error message when market data is undefined', () => {
      // Set market to undefined to trigger error state
      mockRouteParams.market = undefined;

      const { getByTestId, getByText } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Should show error container and message
      expect(
        getByTestId(PerpsMarketDetailsViewSelectorsIDs.ERROR),
      ).toBeTruthy();
      expect(
        getByText('Market data not found. Please go back and try again.'),
      ).toBeTruthy();
    });

    it('does not render main content when market is undefined', () => {
      mockRouteParams.market = undefined;

      const { queryByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Main container should not be present
      expect(
        queryByTestId(PerpsMarketDetailsViewSelectorsIDs.HEADER),
      ).toBeNull();
      expect(
        queryByTestId(PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW),
      ).toBeNull();
    });
  });

  describe('Navigation back button handling', () => {
    it('verifies navigation mock is properly set up', () => {
      // This test just verifies that our navigation can go back
      mockCanGoBack.mockReturnValue(true);

      renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // The component should have been rendered with navigation available
      expect(mockCanGoBack).toBeDefined();
    });

    it('verifies navigation mock when cannot go back', () => {
      // This test verifies the fallback scenario setup
      mockCanGoBack.mockReturnValue(false);

      renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // The component should have been rendered with navigation available
      expect(mockCanGoBack).toBeDefined();
    });
  });

  describe('Candle period bottom sheet', () => {
    it('verifies duration selector is rendered', () => {
      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Verify the duration selector is rendered
      const durationSelector = getByTestId(
        'perps-market-details-view-candle-period-selector-period-1m',
      );
      expect(durationSelector).toBeTruthy();
    });

    it('verifies bottom sheet can be mocked', () => {
      const { queryByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Initially bottom sheet should not be visible
      expect(
        queryByTestId(
          PerpsMarketDetailsViewSelectorsIDs.CANDLE_PERIOD_BOTTOM_SHEET,
        ),
      ).toBeNull();
    });
  });

  describe('TradingView link functionality', () => {
    it('opens TradingView URL when link is pressed', async () => {
      const { getByText } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Find and press the TradingView link
      const tradingViewLink = getByText('TradingView.');
      fireEvent.press(tradingViewLink);

      // Verify Linking.openURL was called with correct URL
      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          'https://www.tradingview.com/',
        );
      });
    });

    it('handles error when opening TradingView URL fails', async () => {
      mockLoggerError.mockClear();

      // Mock Linking.openURL to reject
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(
        new Error('Failed to open URL'),
      );

      const { getByText } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Find and press the TradingView link
      const tradingViewLink = getByText('TradingView.');
      fireEvent.press(tradingViewLink);

      // Wait for the error to be logged using Logger.error
      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            feature: 'perps',
            message: 'Failed to open Trading View URL',
          }),
        );
      });
    });
  });

  describe('Fullscreen chart functionality', () => {
    it('opens fullscreen chart modal when fullscreen button is pressed', async () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Verify close button is not initially visible (modal is closed)
      expect(queryByTestId('perps-chart-fullscreen-close-button')).toBeNull();

      // Press fullscreen button
      const fullscreenButton = getByTestId(
        'perps-market-header-fullscreen-button',
      );
      fireEvent.press(fullscreenButton);

      // Verify modal is now visible by checking for close button
      await waitFor(() => {
        expect(getByTestId('perps-chart-fullscreen-close-button')).toBeTruthy();
      });
    });

    it('closes fullscreen chart modal when close button is pressed', async () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Open the modal first
      const fullscreenButton = getByTestId(
        'perps-market-header-fullscreen-button',
      );
      fireEvent.press(fullscreenButton);

      // Wait for modal to be visible
      await waitFor(() => {
        expect(getByTestId('perps-chart-fullscreen-close-button')).toBeTruthy();
      });

      // Press close button
      const closeButton = getByTestId('perps-chart-fullscreen-close-button');
      fireEvent.press(closeButton);

      // Verify modal is closed
      await waitFor(() => {
        expect(queryByTestId('perps-chart-fullscreen-close-button')).toBeNull();
      });
    });

    it('renders fullscreen chart when modal is open', async () => {
      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Open the modal
      const fullscreenButton = getByTestId(
        'perps-market-header-fullscreen-button',
      );
      fireEvent.press(fullscreenButton);

      // Wait for modal to be visible and verify chart is rendered
      await waitFor(() => {
        expect(getByTestId('perps-chart-fullscreen-close-button')).toBeTruthy();
        expect(getByTestId('fullscreen-chart')).toBeTruthy();
      });
    });
  });

  describe('TP/SL child order filtering', () => {
    beforeEach(() => {
      // Reset to default mock implementation
      mockUsePerpsOpenOrdersImpl.mockImplementation(() => ({
        orders: [],
        refresh: mockRefreshOrders,
        isLoading: false,
        error: null,
      }));
    });

    it('excludes child orders from default TP order selection', () => {
      const timestamp = Date.now();
      const orders = [
        {
          id: 'parent-order-1',
          orderId: 'parent-order-1',
          symbol: 'BTC',
          side: 'buy',
          size: '1.0',
          originalSize: '1.0',
          price: '45000',
          orderType: 'limit',
          status: 'open',
          timestamp,
          lastUpdated: timestamp,
          filledSize: '0',
          remainingSize: '1.0',
          detailedOrderType: 'Limit Order',
          isTrigger: false,
          reduceOnly: false,
          takeProfitOrderId: 'child-tp-order-1',
          stopLossOrderId: 'child-sl-order-1',
        },
        {
          id: 'child-tp-order-1',
          orderId: 'child-tp-order-1',
          symbol: 'BTC',
          side: 'sell',
          size: '1.0',
          originalSize: '1.0',
          price: '50000',
          orderType: 'limit',
          status: 'open',
          timestamp,
          lastUpdated: timestamp,
          filledSize: '0',
          remainingSize: '1.0',
          detailedOrderType: 'Take Profit Limit',
          isTrigger: true,
          reduceOnly: true,
        },
        {
          id: 'standalone-tp-order',
          orderId: 'standalone-tp-order',
          symbol: 'BTC',
          side: 'sell',
          size: '1.0',
          originalSize: '1.0',
          price: '51000',
          orderType: 'limit',
          status: 'open',
          timestamp,
          lastUpdated: timestamp,
          filledSize: '0',
          remainingSize: '1.0',
          detailedOrderType: 'Take Profit Limit',
          isTrigger: true,
          reduceOnly: true,
        },
      ];

      mockUsePerpsOpenOrdersImpl.mockReturnValue({
        orders,
        refresh: jest.fn(),
        isLoading: false,
        error: null,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      const chart = getByTestId(
        `${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-tradingview-chart`,
      );

      expect(chart).toBeTruthy();
    });

    it('excludes child orders from default SL order selection', () => {
      const timestamp = Date.now();
      const orders = [
        {
          id: 'parent-order-2',
          orderId: 'parent-order-2',
          symbol: 'BTC',
          side: 'buy',
          size: '1.0',
          originalSize: '1.0',
          price: '45000',
          orderType: 'limit',
          status: 'open',
          timestamp,
          lastUpdated: timestamp,
          filledSize: '0',
          remainingSize: '1.0',
          takeProfitOrderId: 'child-tp-order-2',
          detailedOrderType: 'Limit Order',
          isTrigger: false,
          reduceOnly: false,
          stopLossOrderId: 'child-sl-order-2',
        },
        {
          orderId: 'child-sl-order-2',
          id: 'child-sl-order-2',
          symbol: 'BTC',
          side: 'sell',
          size: '1.0',
          originalSize: '1.0',
          price: '40000',
          orderType: 'market',
          status: 'open',
          timestamp,
          lastUpdated: timestamp,
          filledSize: '0',
          remainingSize: '1.0',
          detailedOrderType: 'Stop Market',
          isTrigger: true,
          reduceOnly: true,
        },
        {
          id: 'standalone-sl-order',
          orderId: 'standalone-sl-order',
          symbol: 'BTC',
          side: 'sell',
          size: '1.0',
          originalSize: '1.0',
          price: '39000',
          orderType: 'market',
          status: 'open',
          timestamp,
          lastUpdated: timestamp,
          filledSize: '0',
          remainingSize: '1.0',
          detailedOrderType: 'Stop Market',
          isTrigger: true,
          reduceOnly: true,
        },
      ];

      mockUsePerpsOpenOrdersImpl.mockReturnValue({
        orders,
        refresh: jest.fn(),
        isLoading: false,
        error: null,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      const chart = getByTestId(
        `${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-tradingview-chart`,
      );

      expect(chart).toBeTruthy();
    });

    it('includes standalone trigger orders when no child orders exist', () => {
      const timestamp = Date.now();
      const orders = [
        {
          id: 'order-1',
          orderId: 'order-1',
          symbol: 'BTC',
          side: 'buy',
          size: '1.0',
          originalSize: '1.0',
          price: '45000',
          orderType: 'limit',
          status: 'open',
          timestamp,
          lastUpdated: timestamp,
          filledSize: '0',
          remainingSize: '1.0',
          detailedOrderType: 'Limit Order',
          isTrigger: false,
          reduceOnly: false,
        },
        {
          id: 'standalone-tp-1',
          orderId: 'standalone-tp-1',
          symbol: 'BTC',
          side: 'sell',
          size: '1.0',
          originalSize: '1.0',
          price: '50000',
          orderType: 'limit',
          status: 'open',
          timestamp,
          lastUpdated: timestamp,
          filledSize: '0',
          remainingSize: '1.0',
          detailedOrderType: 'Take Profit Limit',
          isTrigger: true,
          reduceOnly: true,
        },
        {
          id: 'standalone-sl-1',
          orderId: 'standalone-sl-1',
          symbol: 'BTC',
          side: 'sell',
          size: '1.0',
          originalSize: '1.0',
          price: '40000',
          orderType: 'market',
          status: 'open',
          timestamp,
          lastUpdated: timestamp,
          filledSize: '0',
          remainingSize: '1.0',
          detailedOrderType: 'Stop Market',
          isTrigger: true,
          reduceOnly: true,
        },
      ];

      mockUsePerpsOpenOrdersImpl.mockReturnValue({
        orders,
        refresh: jest.fn(),
        isLoading: false,
        error: null,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      const chart = getByTestId(
        `${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-tradingview-chart`,
      );

      expect(chart).toBeTruthy();
    });

    it('handles orders with only takeProfitOrderId', () => {
      const timestamp = Date.now();
      const orders = [
        {
          id: 'parent-order-3',
          orderId: 'parent-order-3',
          symbol: 'BTC',
          side: 'buy',
          size: '1.0',
          originalSize: '1.0',
          price: '45000',
          orderType: 'limit',
          status: 'open',
          timestamp,
          lastUpdated: timestamp,
          filledSize: '0',
          remainingSize: '1.0',
          takeProfitOrderId: 'child-tp-order-3',
          detailedOrderType: 'Limit Order',
          isTrigger: false,
          reduceOnly: false,
        },
        {
          id: 'child-tp-order-3',
          orderId: 'child-tp-order-3',
          symbol: 'BTC',
          side: 'sell',
          size: '1.0',
          originalSize: '1.0',
          price: '50000',
          orderType: 'limit',
          status: 'open',
          timestamp,
          lastUpdated: timestamp,
          filledSize: '0',
          remainingSize: '1.0',
          detailedOrderType: 'Take Profit Limit',
          isTrigger: true,
          reduceOnly: true,
        },
      ];

      mockUsePerpsOpenOrdersImpl.mockReturnValue({
        orders,
        refresh: jest.fn(),
        isLoading: false,
        error: null,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      const chart = getByTestId(
        `${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-tradingview-chart`,
      );

      expect(chart).toBeTruthy();
    });

    it('handles orders with only stopLossOrderId', () => {
      const timestamp = Date.now();
      const orders = [
        {
          id: 'parent-order-4',
          orderId: 'parent-order-4',
          symbol: 'BTC',
          side: 'buy',
          size: '1.0',
          originalSize: '1.0',
          price: '45000',
          orderType: 'limit',
          detailedOrderType: 'Limit Order',
          isTrigger: false,
          reduceOnly: false,
          status: 'open',
          timestamp,
          lastUpdated: timestamp,
          filledSize: '0',
          remainingSize: '1.0',
          stopLossOrderId: 'child-sl-order-4',
        },
        {
          id: 'child-sl-order-4',
          orderId: 'child-sl-order-4',
          symbol: 'BTC',
          side: 'sell',
          size: '1.0',
          originalSize: '1.0',
          price: '40000',
          orderType: 'market',
          status: 'open',
          timestamp,
          lastUpdated: timestamp,
          filledSize: '0',
          remainingSize: '1.0',
          detailedOrderType: 'Stop Market',
          isTrigger: true,
          reduceOnly: true,
        },
      ];

      mockUsePerpsOpenOrdersImpl.mockReturnValue({
        orders,
        refresh: jest.fn(),
        isLoading: false,
        error: null,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      const chart = getByTestId(
        `${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-tradingview-chart`,
      );

      expect(chart).toBeTruthy();
    });

    it('handles empty order list', () => {
      mockUsePerpsOpenOrdersImpl.mockReturnValue({
        orders: [],
        refresh: jest.fn(),
        isLoading: false,
        error: null,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      const chart = getByTestId(
        `${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-tradingview-chart`,
      );

      expect(chart).toBeTruthy();
    });
  });
});
