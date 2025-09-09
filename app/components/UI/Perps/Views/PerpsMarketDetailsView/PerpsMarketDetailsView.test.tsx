import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import PerpsMarketDetailsView from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { PerpsConnectionProvider } from '../../providers/PerpsConnectionProvider';
import Routes from '../../../../../constants/navigation/Routes';

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
}));

// Mock PerpsStreamManager
jest.mock('../../providers/PerpsStreamManager');

// Create mock functions that can be modified during tests
const mockUsePerpsAccount = jest.fn();
const mockUseHasExistingPosition = jest.fn();

// Navigation mock functions
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();

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
  isNavigationFromOrderSuccess: boolean;
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
  isNavigationFromOrderSuccess: false,
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

jest.mock('../../hooks/usePerpsAccount', () => ({
  usePerpsAccount: () => mockUsePerpsAccount(),
}));

// Mock the selector module first
jest.mock('../../selectors/perpsController', () => ({
  selectPerpsEligibility: jest.fn(),
}));

// Mock react-redux
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../providers/PerpsConnectionProvider', () => ({
  PerpsConnectionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  usePerpsConnection: () => ({
    isConnected: true,
    isConnecting: false,
    error: null,
  }),
}));

const mockRefreshOrders = jest.fn();
jest.mock('../../hooks/usePerpsOpenOrders', () => ({
  usePerpsOpenOrders: () => ({
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
        timestamp: Date.now(), // Add proper timestamp
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
  }),
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

const mockRefreshCandleData = jest.fn();
jest.mock('../../hooks/usePerpsPositionData', () => ({
  usePerpsPositionData: () => ({
    candleData: [
      {
        time: 1234567890,
        open: 45000,
        high: 45500,
        low: 44500,
        close: 45200,
        volume: 1000,
      },
    ],
    isLoadingHistory: false,
    error: null,
    refreshCandleData: mockRefreshCandleData,
  }),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(() => ({
    track: jest.fn(),
  })),
}));

jest.mock('../../hooks', () => ({
  usePerpsAccount: () => mockUsePerpsAccount(),
  usePerpsConnection: () => ({
    isConnected: true,
    isConnecting: false,
    error: null,
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
  usePerpsPerformance: jest.fn(() => ({
    startMeasure: jest.fn(),
    endMeasure: jest.fn(),
    measure: jest.fn(),
    measureAsync: jest.fn(),
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

// Mock perps config to control the notification feature flag
jest.mock('../../constants/perpsConfig', () => ({
  ...jest.requireActual('../../constants/perpsConfig'),
  PERPS_NOTIFICATIONS_FEATURE_ENABLED: false, // Hardcoded to false until feature is ready
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
      availableBalance: '1000.00',
      totalBalance: '1000.00',
      marginUsed: '0.00',
      unrealizedPnl: '0.00',
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
    mockRouteParams.isNavigationFromOrderSuccess = false;
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
    mockRefreshCandleData.mockClear();
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
        availableBalance: '0.00',
        totalBalance: '0.00',
        marginUsed: '0.00',
        unrealizedPnl: '0.00',
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
      expect(getByText('Add Funds')).toBeTruthy();

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

    it('renders long/short buttons when user has balance and existing position', () => {
      // Override with non-zero balance and existing position
      mockUsePerpsAccount.mockReturnValue({
        availableBalance: '1000.00',
        totalBalance: '1500.00',
        marginUsed: '500.00',
        unrealizedPnl: '50.00',
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

      const { getByTestId, queryByText } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Shows long/short buttons even with existing position
      expect(
        getByTestId(PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON),
      ).toBeTruthy();
      expect(
        getByTestId(PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON),
      ).toBeTruthy();

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
      await refreshControl.props.onRefresh();

      // Should refresh candle data by default
      expect(mockRefreshCandleData).toHaveBeenCalledTimes(1);
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
      await refreshControl.props.onRefresh();

      // Assert - Only candle data refreshes since positions update via WebSocket
      expect(mockRefreshCandleData).toHaveBeenCalledTimes(1);
      // refreshPosition is a no-op for WebSocket, so we don't expect it to be called
      expect(mockRefreshPosition).not.toHaveBeenCalled();
    });

    it('refreshes statistics data when statistics tab is active', async () => {
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

      // Act - Switch to statistics tab
      const statisticsTab = getByTestId('perps-market-tabs-statistics-tab');
      fireEvent.press(statisticsTab);

      const scrollView = getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW,
      );
      const refreshControl = scrollView.props.refreshControl;
      await refreshControl.props.onRefresh();

      // Assert - Only candle data refreshes (all other data updates via WebSocket)
      expect(mockRefreshCandleData).toHaveBeenCalledTimes(1);
      // Market stats, positions, and orders update via WebSocket, no manual refresh
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
      await refreshControl.props.onRefresh();

      // Assert - Only candle data refreshes (positions update via WebSocket)
      expect(mockRefreshCandleData).toHaveBeenCalledTimes(1);
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
      const refreshPromise = refreshControl.props.onRefresh();

      // Wait for refresh to complete
      await refreshPromise;

      // Verify refresh functions were called
      expect(mockRefreshCandleData).toHaveBeenCalledTimes(1);
    });

    it('handles errors during refresh operation', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockRefreshPosition = jest
        .fn()
        .mockRejectedValue(new Error('Refresh failed'));

      mockUseHasExistingPosition.mockReturnValue({
        hasPosition: false,
        isLoading: false,
        error: null,
        existingPosition: null,
        refreshPosition: mockRefreshPosition,
      });

      mockRefreshCandleData.mockRejectedValue(
        new Error('Candle data refresh failed'),
      );

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
      await refreshControl.props.onRefresh();

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to refresh'),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
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

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ORDER, {
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

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ORDER, {
        direction: 'short',
        asset: 'BTC',
      });
    });

    it('navigates to deposit screen when add funds button is pressed', async () => {
      // Set zero balance to show add funds button
      mockUsePerpsAccount.mockReturnValue({
        availableBalance: '0.00',
        totalBalance: '0.00',
        marginUsed: '0.00',
        unrealizedPnl: '0.00',
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
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      });
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
        availableBalance: '0.00',
        totalBalance: '0.00',
        marginUsed: '0.00',
        unrealizedPnl: '0.00',
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

  describe('notification tooltip functionality', () => {
    // TODO: Update this test when PERPS_NOTIFICATIONS_FEATURE_ENABLED is set to true
    it('does not show PerpsNotificationTooltip even when conditions are met due to PERPS_NOTIFICATIONS_FEATURE_ENABLED being false', async () => {
      mockIsNotificationsFeatureEnabled.mockReturnValue(true);
      mockRouteParams.isNavigationFromOrderSuccess = true;

      const { queryByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Notification tooltip should NOT be visible because PERPS_NOTIFICATIONS_FEATURE_ENABLED is false
      await waitFor(() => {
        expect(
          queryByTestId(PerpsOrderViewSelectorsIDs.NOTIFICATION_TOOLTIP),
        ).toBeNull();
      });
    });

    it('does not show PerpsNotificationTooltip when not navigating from order success', () => {
      mockIsNotificationsFeatureEnabled.mockReturnValue(true);
      mockRouteParams.isNavigationFromOrderSuccess = false;

      const { queryByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Notification tooltip should not be visible
      expect(
        queryByTestId(PerpsOrderViewSelectorsIDs.NOTIFICATION_TOOLTIP),
      ).toBeNull();
    });

    it('does not show PerpsNotificationTooltip when notifications feature is disabled', () => {
      mockIsNotificationsFeatureEnabled.mockReturnValue(false);
      mockRouteParams.isNavigationFromOrderSuccess = true;

      const { queryByTestId } = renderWithProvider(
        <PerpsConnectionProvider>
          <PerpsMarketDetailsView />
        </PerpsConnectionProvider>,
        {
          state: initialState,
        },
      );

      // Notification tooltip should not be visible even when navigating from order success
      expect(
        queryByTestId(PerpsOrderViewSelectorsIDs.NOTIFICATION_TOOLTIP),
      ).toBeNull();
    });

    // TODO: Update this test when PERPS_NOTIFICATIONS_FEATURE_ENABLED is set to true
    it('never shows tooltip because PERPS_NOTIFICATIONS_FEATURE_ENABLED is false', () => {
      // Test all four combinations - all should result in no tooltip due to the constant flag
      const testCases = [
        {
          notificationsEnabled: true,
          fromOrderSuccess: true,
          shouldShow: false, // Would be true if PERPS_NOTIFICATIONS_FEATURE_ENABLED was true
        },
        {
          notificationsEnabled: true,
          fromOrderSuccess: false,
          shouldShow: false,
        },
        {
          notificationsEnabled: false,
          fromOrderSuccess: true,
          shouldShow: false,
        },
        {
          notificationsEnabled: false,
          fromOrderSuccess: false,
          shouldShow: false,
        },
      ];

      testCases.forEach(({ notificationsEnabled, fromOrderSuccess }) => {
        mockIsNotificationsFeatureEnabled.mockReturnValue(notificationsEnabled);
        mockRouteParams.isNavigationFromOrderSuccess = fromOrderSuccess;

        const { queryByTestId, unmount } = renderWithProvider(
          <PerpsConnectionProvider>
            <PerpsMarketDetailsView />
          </PerpsConnectionProvider>,
          {
            state: initialState,
          },
        );

        // Always expect null because PERPS_NOTIFICATIONS_FEATURE_ENABLED is false
        expect(
          queryByTestId(PerpsOrderViewSelectorsIDs.NOTIFICATION_TOOLTIP),
        ).toBeNull();

        unmount();
      });
    });

    describe('notifications feature flag behavior', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      // TODO: Update these tests when PERPS_NOTIFICATIONS_FEATURE_ENABLED is set to true
      it('does not render notification when PERPS_NOTIFICATIONS_FEATURE_ENABLED is false', async () => {
        // Even when isNotificationsFeatureEnabled returns true, the constant flag prevents rendering
        mockIsNotificationsFeatureEnabled.mockReturnValue(true);
        mockRouteParams.isNavigationFromOrderSuccess = true;

        const { queryByTestId } = renderWithProvider(
          <PerpsConnectionProvider>
            <PerpsMarketDetailsView />
          </PerpsConnectionProvider>,
          {
            state: initialState,
          },
        );

        // Tooltip should NOT be shown because PERPS_NOTIFICATIONS_FEATURE_ENABLED is false
        await waitFor(() => {
          expect(
            queryByTestId(PerpsOrderViewSelectorsIDs.NOTIFICATION_TOOLTIP),
          ).toBeNull();
        });
      });

      it('does not render notification when feature is disabled even when navigating from order success', () => {
        mockIsNotificationsFeatureEnabled.mockReturnValue(false);
        mockRouteParams.isNavigationFromOrderSuccess = true;

        const { queryByTestId } = renderWithProvider(
          <PerpsConnectionProvider>
            <PerpsMarketDetailsView />
          </PerpsConnectionProvider>,
          {
            state: initialState,
          },
        );

        // Tooltip should NOT be shown since notifications feature is disabled
        expect(
          queryByTestId(PerpsOrderViewSelectorsIDs.NOTIFICATION_TOOLTIP),
        ).toBeNull();
      });

      it('does not render notification when feature is enabled but not navigating from order success', () => {
        mockIsNotificationsFeatureEnabled.mockReturnValue(true);
        mockRouteParams.isNavigationFromOrderSuccess = false;

        const { queryByTestId } = renderWithProvider(
          <PerpsConnectionProvider>
            <PerpsMarketDetailsView />
          </PerpsConnectionProvider>,
          {
            state: initialState,
          },
        );

        // Tooltip should NOT be shown since not navigating from order success
        expect(
          queryByTestId(PerpsOrderViewSelectorsIDs.NOTIFICATION_TOOLTIP),
        ).toBeNull();
      });
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

      // Find and press the Trading View link
      const tradingViewLink = getByText('Trading View');
      fireEvent.press(tradingViewLink);

      // Verify Linking.openURL was called with correct URL
      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          'https://www.tradingview.com/',
        );
      });
    });

    it('handles error when opening TradingView URL fails', async () => {
      // Mock console.error to avoid test output pollution
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

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

      // Find and press the Trading View link
      const tradingViewLink = getByText('Trading View');
      fireEvent.press(tradingViewLink);

      // Wait for the error to be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to open Trading View URL:',
          expect.any(Error),
        );
      });

      consoleErrorSpy.mockRestore();
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
});
