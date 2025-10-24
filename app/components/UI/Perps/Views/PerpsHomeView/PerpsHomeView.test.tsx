import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsHomeView from './PerpsHomeView';
import Routes from '../../../../../constants/navigation/Routes';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
  useRoute: () => ({
    params: {
      source: 'main_action_button',
    },
  }),
}));

// Mock Redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => false), // isRewardsEnabled
}));

// Mock hooks
jest.mock('../../hooks/usePerpsHomeData', () => ({
  usePerpsHomeData: jest.fn(),
}));

jest.mock('../../hooks', () => ({
  usePerpsMeasurement: jest.fn(),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      build: jest.fn(),
    })),
  }),
  MetaMetricsEvents: {
    NAVIGATION_TAPS_GET_HELP: 'NAVIGATION_TAPS_GET_HELP',
    PERPS_SCREEN_VIEWED: 'PERPS_SCREEN_VIEWED',
  },
}));

// Mock design system
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (className: string) => ({ testID: className }),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  BoxFlexDirection: {
    Row: 'Row',
  },
  BoxAlignItems: {
    Center: 'Center',
  },
}));

// Mock stylesheet
jest.mock('./PerpsHomeView.styles', () => ({}));

// Mock styles hook
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      header: {},
      headerTitle: {},
      searchButton: {},
      searchContainer: {},
      scrollView: {},
      scrollViewContent: {},
      section: {},
      sectionHeader: {},
      sectionContent: {},
      actionButtonsContainer: {},
      actionButton: {},
      actionButtonContent: {},
      actionButtonTextContainer: {},
      bottomSpacer: {},
      tabBarContainer: {},
    },
    theme: {
      colors: {
        primary: { default: '#0000ff' },
        icon: { default: '#000000' },
      },
    },
  }),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// Mock constants
jest.mock('../../constants/perpsConfig', () => ({
  LEARN_MORE_CONFIG: {
    TITLE_KEY: 'perps.learn_more.title',
    DESCRIPTION_KEY: 'perps.learn_more.description',
  },
  SUPPORT_CONFIG: {
    URL: 'https://example.com/support',
    TITLE_KEY: 'perps.support.title',
    DESCRIPTION_KEY: 'perps.support.description',
  },
}));

jest.mock('../../../../../util/trace', () => ({
  TraceName: {
    PerpsMarketListView: 'PerpsMarketListView',
  },
}));

jest.mock('../../constants/eventNames', () => ({
  PerpsEventProperties: {
    SCREEN_TYPE: 'screen_type',
    SOURCE: 'source',
  },
  PerpsEventValues: {
    SCREEN_TYPE: {
      MARKETS: 'markets',
    },
    SOURCE: {
      MAIN_ACTION_BUTTON: 'main_action_button',
      HOMESCREEN_TAB: 'homescreen_tab',
    },
  },
}));

// Mock child components
jest.mock(
  '../../components/PerpsMarketBalanceActions',
  () => 'PerpsMarketBalanceActions',
);
jest.mock(
  '../../../../../component-library/components/Form/TextFieldSearch',
  () => 'TextFieldSearch',
);
jest.mock('../../components/PerpsCard', () => 'PerpsCard');
jest.mock(
  '../../components/PerpsWatchlistMarkets/PerpsWatchlistMarkets',
  () => 'PerpsWatchlistMarkets',
);
jest.mock(
  '../../components/PerpsTrendingMarkets/PerpsTrendingMarkets',
  () => 'PerpsTrendingMarkets',
);
jest.mock(
  '../../components/PerpsRecentActivityList/PerpsRecentActivityList',
  () => 'PerpsRecentActivityList',
);
jest.mock('../../../../../component-library/components/Texts/Text', () => ({
  __esModule: true,
  default: 'Text',
  TextVariant: {
    HeadingLG: 'HeadingLG',
    HeadingSM: 'HeadingSM',
    BodyMD: 'BodyMD',
    BodyMDMedium: 'BodyMDMedium',
    BodySM: 'BodySM',
  },
  TextColor: {
    Default: 'Default',
    Alternative: 'Alternative',
  },
}));
jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  __esModule: true,
  default: 'Icon',
  IconName: {
    ArrowLeft: 'ArrowLeft',
    Search: 'Search',
    Close: 'Close',
    Arrow2Right: 'Arrow2Right',
    Home: 'Home',
    Explore: 'Explore',
    SwapVertical: 'SwapVertical',
    Activity: 'Activity',
    Setting: 'Setting',
    MetamaskFoxOutline: 'MetamaskFoxOutline',
  },
  IconSize: {
    Lg: 'Lg',
    Md: 'Md',
  },
  IconColor: {
    Default: 'Default',
  },
}));
jest.mock(
  '../../../../../component-library/components/Buttons/ButtonIcon',
  () => ({
    __esModule: true,
    default: 'ButtonIcon',
    ButtonIconSizes: {
      Md: 'Md',
    },
  }),
);
jest.mock(
  '../../../../../component-library/components/Navigation/TabBarItem',
  () => 'TabBarItem',
);

const mockUsePerpsHomeData = jest.requireMock('../../hooks/usePerpsHomeData')
  .usePerpsHomeData as jest.Mock;

describe('PerpsHomeView', () => {
  const mockDefaultData = {
    positions: [],
    orders: [],
    watchlistMarkets: [],
    trendingMarkets: [],
    recentActivity: [],
    isLoading: {
      positions: false,
      markets: false,
    },
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsHomeData.mockReturnValue(mockDefaultData);
  });

  it('renders without crashing', () => {
    // Arrange & Act
    const { getByText } = render(<PerpsHomeView />);

    // Assert
    expect(getByText('perps.title')).toBeTruthy();
  });

  it('shows header with title', () => {
    // Arrange & Act
    const { getByText } = render(<PerpsHomeView />);

    // Assert
    expect(getByText('perps.title')).toBeTruthy();
  });

  it('shows search toggle button', () => {
    // Arrange & Act
    const { getByTestId } = render(<PerpsHomeView />);

    // Assert
    expect(getByTestId('perps-home-search-toggle')).toBeTruthy();
  });

  it('toggles search bar visibility when search button is pressed', () => {
    // Arrange
    const { getByTestId, queryByTestId } = render(<PerpsHomeView />);

    // Act - Initially search should not be visible
    expect(queryByTestId('perps-home-search')).toBeNull();

    // Press search toggle
    fireEvent.press(getByTestId('perps-home-search-toggle'));

    // Assert - Search should now be visible
    expect(getByTestId('perps-home-search')).toBeTruthy();
  });

  it('hides search bar when toggle is pressed again', () => {
    // Arrange
    const { getByTestId, queryByTestId } = render(<PerpsHomeView />);

    // Act - Open search
    fireEvent.press(getByTestId('perps-home-search-toggle'));
    expect(getByTestId('perps-home-search')).toBeTruthy();

    // Close search
    fireEvent.press(getByTestId('perps-home-search-toggle'));

    // Assert - Search should be hidden
    expect(queryByTestId('perps-home-search')).toBeNull();
  });

  it('shows positions section when positions exist', () => {
    // Arrange
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      positions: [
        {
          coin: 'BTC',
          size: '0.5',
          entryPrice: '50000',
          positionValue: '25000',
          unrealizedPnl: '100',
          marginUsed: '1000',
          leverage: { type: 'cross' as const, value: 25 },
          liquidationPrice: '48000',
          maxLeverage: 50,
          returnOnEquity: '10',
          cumulativeFunding: {
            allTime: '0',
            sinceOpen: '0',
            sinceChange: '0',
          },
          roi: '10',
          takeProfitPrice: undefined,
          stopLossPrice: undefined,
          takeProfitCount: 0,
          stopLossCount: 0,
          marketPrice: '50200',
          timestamp: Date.now(),
        },
      ],
    });

    // Act
    const { getByText } = render(<PerpsHomeView />);

    // Assert
    expect(getByText('perps.home.positions')).toBeTruthy();
    expect(getByText('perps.home.close_all')).toBeTruthy();
  });

  it('shows orders section when orders exist', () => {
    // Arrange
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      orders: [
        {
          orderId: '123',
          coin: 'ETH',
          side: 'buy' as const,
          size: '1.0',
          limitPrice: '3000',
          orderType: 'limit' as const,
          timestamp: Date.now(),
        },
      ],
    });

    // Act
    const { getByText } = render(<PerpsHomeView />);

    // Assert
    expect(getByText('perps.home.orders')).toBeTruthy();
    expect(getByText('perps.home.cancel_all')).toBeTruthy();
  });

  it('hides positions section when no positions', () => {
    // Arrange
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      positions: [],
    });

    // Act
    const { queryByText } = render(<PerpsHomeView />);

    // Assert
    expect(queryByText('perps.home.positions')).toBeNull();
  });

  it('hides orders section when no orders', () => {
    // Arrange
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      orders: [],
    });

    // Act
    const { queryByText } = render(<PerpsHomeView />);

    // Assert
    expect(queryByText('perps.home.orders')).toBeNull();
  });

  it('handles back button press', () => {
    // Arrange
    const { getByTestId } = render(<PerpsHomeView />);

    // Act
    fireEvent.press(getByTestId('back-button'));

    // Assert
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('navigates to close all modal when close all is pressed', () => {
    // Arrange
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      positions: [
        {
          coin: 'BTC',
          size: '0.5',
          entryPrice: '50000',
          positionValue: '25000',
          unrealizedPnl: '100',
          marginUsed: '1000',
          leverage: { type: 'cross' as const, value: 25 },
          liquidationPrice: '48000',
          maxLeverage: 50,
          returnOnEquity: '10',
          cumulativeFunding: {
            allTime: '0',
            sinceOpen: '0',
            sinceChange: '0',
          },
          roi: '10',
          takeProfitPrice: undefined,
          stopLossPrice: undefined,
          takeProfitCount: 0,
          stopLossCount: 0,
          marketPrice: '50200',
          timestamp: Date.now(),
        },
      ],
    });

    const { getByText } = render(<PerpsHomeView />);

    // Act
    fireEvent.press(getByText('perps.home.close_all'));

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.CLOSE_ALL_POSITIONS,
    });
  });

  it('navigates to cancel all modal when cancel all is pressed', () => {
    // Arrange
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      orders: [
        {
          orderId: '123',
          coin: 'ETH',
          side: 'buy' as const,
          size: '1.0',
          limitPrice: '3000',
          orderType: 'limit' as const,
          timestamp: Date.now(),
        },
      ],
    });

    const { getByText } = render(<PerpsHomeView />);

    // Act
    fireEvent.press(getByText('perps.home.cancel_all'));

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.CANCEL_ALL_ORDERS,
    });
  });

  it('renders bottom tab bar with all tabs', () => {
    // Arrange & Act
    const { getByTestId } = render(<PerpsHomeView />);

    // Assert
    expect(getByTestId('tab-bar-item-wallet')).toBeTruthy();
    expect(getByTestId('tab-bar-item-browser')).toBeTruthy();
    expect(getByTestId('tab-bar-item-actions')).toBeTruthy();
    expect(getByTestId('tab-bar-item-activity')).toBeTruthy();
    expect(getByTestId('tab-bar-item-settings')).toBeTruthy();
  });

  it('renders main sections', () => {
    // Arrange & Act
    const { UNSAFE_getByType } = render(<PerpsHomeView />);

    // Assert
    expect(UNSAFE_getByType('PerpsMarketBalanceActions' as never)).toBeTruthy();
    expect(UNSAFE_getByType('PerpsTrendingMarkets' as never)).toBeTruthy();
    expect(UNSAFE_getByType('PerpsRecentActivityList' as never)).toBeTruthy();
  });

  it('shows watchlist section when watchlist markets exist', () => {
    // Arrange
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      watchlistMarkets: [
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          price: '$50000',
          change24h: '+$1250',
          change24hPercent: '+2.5%',
          volume: '$1.2B',
          volumeNumber: 1200000000,
          maxLeverage: '50',
        },
      ],
    });

    // Act
    const { UNSAFE_getByType } = render(<PerpsHomeView />);

    // Assert
    expect(UNSAFE_getByType('PerpsWatchlistMarkets' as never)).toBeTruthy();
  });

  it('hides watchlist section when no watchlist markets', () => {
    // Arrange
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      watchlistMarkets: [],
    });

    // Act
    const { UNSAFE_queryByType } = render(<PerpsHomeView />);

    // Assert
    expect(UNSAFE_queryByType('PerpsWatchlistMarkets' as never)).toBeNull();
  });
});
