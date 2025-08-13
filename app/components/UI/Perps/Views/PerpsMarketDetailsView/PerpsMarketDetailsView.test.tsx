import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PerpsMarketDetailsView from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PerpsMarketDetailsViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { PerpsConnectionProvider } from '../../providers/PerpsConnectionProvider';

// Create mock functions that can be modified during tests
const mockUsePerpsAccount = jest.fn();
const mockUseHasExistingPosition = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
    useRoute: () => ({
      params: {
        market: {
          symbol: 'BTC',
          name: 'Bitcoin',
          price: '$45,000.00',
          change24h: '+$1,125.00',
          change24hPercent: '+2.50%',
          volume: '$1.23B',
          maxLeverage: '40x',
        },
      },
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
    orders: [],
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

// Mock PerpsBottomSheetTooltip to avoid SafeAreaProvider issues
jest.mock('../../components/PerpsBottomSheetTooltip', () => ({
  __esModule: true,
  default: ({ isVisible }: { isVisible: boolean }) => {
    const { View } = jest.requireActual('react-native');
    return isVisible ? <View testID="perps-bottom-sheet-tooltip" /> : null;
  },
}));

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
  });

  // Clean up mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
    mockRefreshCandleData.mockClear();
    mockRefreshOrders.mockClear();
    mockRefreshMarketStats.mockClear();
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
    const { getByTestId } = renderWithProvider(
      <PerpsConnectionProvider>
        <PerpsMarketDetailsView />
      </PerpsConnectionProvider>,
      {
        state: initialState,
      },
    );

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
    const { getByTestId } = renderWithProvider(
      <PerpsConnectionProvider>
        <PerpsMarketDetailsView />
      </PerpsConnectionProvider>,
      {
        state: initialState,
      },
    );

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
    const { getByTestId } = renderWithProvider(
      <PerpsConnectionProvider>
        <PerpsMarketDetailsView />
      </PerpsConnectionProvider>,
      {
        state: initialState,
      },
    );

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

    it('refreshes position data when position tab is active', async () => {
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

      // Trigger the refresh (position tab is active by default)
      await refreshControl.props.onRefresh();

      // Should refresh both candle data and position data
      expect(mockRefreshCandleData).toHaveBeenCalledTimes(1);
      expect(mockRefreshPosition).toHaveBeenCalledTimes(1);
    });

    it('calls refresh functions for chart data and position by default', async () => {
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

      // Trigger the refresh
      await refreshControl.props.onRefresh();

      // Should refresh candle data and position data (default behavior)
      expect(mockRefreshCandleData).toHaveBeenCalledTimes(1);
      expect(mockRefreshPosition).toHaveBeenCalledTimes(1);
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
});
