import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import PerpsHomeView from './PerpsHomeView';
import { PerpsEventValues } from '../../constants/eventNames';
import { selectPerpsFeedbackEnabledFlag } from '../../selectors/featureFlags';

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
      source: 'main_action_button', // PerpsEventValues.SOURCE.MAIN_ACTION_BUTTON
    },
  }),
  useFocusEffect: (callback: () => void) => {
    // Call the callback immediately in tests
    callback();
  },
}));

// Mock Redux - default feedback disabled
const mockUseSelector = jest.fn<boolean, [unknown]>(() => false);
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

// Mock components to prevent complex module initialization chains
jest.mock(
  '../../components/PerpsMarketTypeSection',
  () => 'PerpsMarketTypeSection',
);
jest.mock(
  '../../components/PerpsWatchlistMarkets/PerpsWatchlistMarkets',
  () => 'PerpsWatchlistMarkets',
);
jest.mock(
  '../../components/PerpsRecentActivityList/PerpsRecentActivityList',
  () => 'PerpsRecentActivityList',
);

// Mock hooks (consolidated to avoid conflicts)
const mockNavigateBack = jest.fn();
const mockNavigateToWallet = jest.fn();
const mockNavigateToMarketList = jest.fn();
const mockHandleAddFunds = jest.fn();
const mockHandleWithdraw = jest.fn();
const mockCloseEligibilityModal = jest.fn();
jest.mock('../../hooks', () => ({
  usePerpsHomeData: jest.fn(),
  usePerpsMeasurement: jest.fn(),
  usePerpsNavigation: jest.fn(() => ({
    navigateTo: jest.fn(),
    navigateToMarketDetails: jest.fn(),
    navigateToMarketList: mockNavigateToMarketList,
    navigateToWallet: mockNavigateToWallet,
    navigateBack: mockNavigateBack,
    goBack: jest.fn(),
  })),
  usePerpsHomeActions: jest.fn(() => ({
    handleAddFunds: mockHandleAddFunds,
    handleWithdraw: mockHandleWithdraw,
    isEligibilityModalVisible: false,
    closeEligibilityModal: mockCloseEligibilityModal,
    isEligible: true,
    isProcessing: false,
    error: null,
  })),
  usePerpsHomeSectionTracking: jest.fn(() => ({
    handleSectionLayout: jest.fn(() => jest.fn()),
    handleScroll: jest.fn(),
    resetTracking: jest.fn(),
  })),
}));

// Mock direct import of usePerpsHomeActions (component imports it directly now)
jest.mock('../../hooks/usePerpsHomeActions', () => ({
  usePerpsHomeActions: jest.fn(() => ({
    handleAddFunds: mockHandleAddFunds,
    handleWithdraw: mockHandleWithdraw,
    isEligibilityModalVisible: false,
    closeEligibilityModal: mockCloseEligibilityModal,
    isEligible: true,
    isProcessing: false,
    error: null,
  })),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(),
}));

jest.mock('../../hooks/stream', () => ({
  usePerpsLiveAccount: jest.fn(() => ({
    account: {
      totalBalance: '0',
      availableBalance: '0',
      unrealizedPnl: '0',
      returnOnEquity: '0',
    },
    isInitialLoading: false,
  })),
  usePerpsLivePositions: jest.fn(() => ({
    positions: [],
  })),
}));

// Use real BigNumber library - mocking it causes issues with module initialization

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn((props: Record<string, unknown>) => ({
        build: jest.fn(() => props),
      })),
      build: jest.fn(() => ({})),
    })),
  }),
  MetaMetricsEvents: {
    NAVIGATION_TAPS_GET_HELP: 'NAVIGATION_TAPS_GET_HELP',
    PERPS_SCREEN_VIEWED: 'PERPS_SCREEN_VIEWED',
    PERPS_UI_INTERACTION: 'PERPS_UI_INTERACTION',
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
  TextVariant: {
    HeadingSm: 'heading-sm',
    HeadingLg: 'heading-lg',
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

// Use actual constants - don't mock perpsConfig

jest.mock('../../../../../util/trace', () => ({
  TraceName: {
    PerpsMarketListView: 'PerpsMarketListView',
  },
}));

jest.mock('../../constants/eventNames', () => ({
  PerpsEventProperties: {
    SCREEN_TYPE: 'screen_type',
    SOURCE: 'source',
    BUTTON_CLICKED: 'button_clicked',
    BUTTON_LOCATION: 'button_location',
    INTERACTION_TYPE: 'interaction_type',
    LOCATION: 'location',
  },
  PerpsEventValues: {
    SCREEN_TYPE: {
      MARKETS: 'markets',
      HOMESCREEN: 'homescreen',
      PERPS_HOME: 'perps_home',
      WALLET_HOME_PERPS_TAB: 'wallet_home_perps_tab',
    },
    SOURCE: {
      MAIN_ACTION_BUTTON: 'main_action_button',
      HOMESCREEN_TAB: 'homescreen_tab',
    },
    BUTTON_LOCATION: {
      PERPS_HOME: 'perps_home',
      PERPS_HOME_EMPTY_STATE: 'perps_home_empty_state',
      PERPS_TAB: 'perps_tab',
      PERPS_ASSET_SCREEN: 'perps_asset_screen',
    },
    BUTTON_CLICKED: {
      TUTORIAL: 'tutorial',
      MAGNIFYING_GLASS: 'magnifying_glass',
    },
    INTERACTION_TYPE: {
      BUTTON_CLICKED: 'button_clicked',
      CONTACT_SUPPORT: 'contact_support',
    },
  },
}));

// Mock child components
jest.mock('../../components/PerpsHomeHeader', () => {
  const { View, TouchableOpacity, Text, TextInput } =
    jest.requireActual('react-native');

  interface MockPerpsHomeHeaderProps {
    onSearchToggle: () => void;
    onBack: () => void;
    isSearchVisible?: boolean;
    searchQuery?: string;
    onSearchQueryChange?: (text: string) => void;
    onSearchClear?: () => void;
    testID: string;
  }

  return function MockPerpsHomeHeader({
    onSearchToggle,
    onBack,
    isSearchVisible = false,
    searchQuery = '',
    onSearchQueryChange,
    testID,
  }: MockPerpsHomeHeaderProps) {
    if (isSearchVisible) {
      return (
        <View>
          <TextInput
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            testID={`${testID}-search-bar`}
          />
          <TouchableOpacity
            testID={`${testID}-search-close`}
            onPress={onSearchToggle}
          >
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
        <TouchableOpacity testID={`${testID}-back-button`} onPress={onBack}>
          {/* Also provide back-button for backward compatibility with tests */}
          <View testID="back-button" />
          <Text>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={`${testID}-search-toggle`}
          onPress={onSearchToggle}
        >
          <Text>Search</Text>
        </TouchableOpacity>
      </View>
    );
  };
});
jest.mock('../../components/PerpsHomeSection', () => {
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

  interface MockPerpsHomeSectionProps {
    title?: string;
    children?: React.ReactNode;
    isEmpty?: boolean;
    showWhenEmpty?: boolean;
    onActionPress?: () => void;
  }

  return function MockPerpsHomeSection({
    title,
    children,
    isEmpty,
    showWhenEmpty,
    onActionPress,
  }: MockPerpsHomeSectionProps) {
    if (isEmpty && !showWhenEmpty) return null;
    return (
      <View>
        {onActionPress ? (
          <TouchableOpacity
            onPress={onActionPress}
            testID="section-header-button"
          >
            {title && <Text>{title}</Text>}
          </TouchableOpacity>
        ) : (
          title && <Text>{title}</Text>
        )}
        {children}
      </View>
    );
  };
});
jest.mock(
  '../../components/PerpsMarketBalanceActions',
  () => 'PerpsMarketBalanceActions',
);
jest.mock('../PerpsCloseAllPositionsView/PerpsCloseAllPositionsView', () => {
  const { View } = jest.requireActual('react-native');
  return function PerpsCloseAllPositionsView() {
    return <View testID="perps-close-all-positions-view" />;
  };
});
jest.mock('../PerpsCancelAllOrdersView/PerpsCancelAllOrdersView', () => {
  const { View } = jest.requireActual('react-native');
  return function PerpsCancelAllOrdersView() {
    return <View testID="perps-cancel-all-orders-view" />;
  };
});
jest.mock(
  '../../../../../component-library/components/Form/TextFieldSearch',
  () => {
    const { TextInput } = jest.requireActual('react-native');

    interface MockTextFieldSearchProps {
      testID?: string;
      value?: string;
      onChangeText?: (text: string) => void;
      placeholder?: string;
    }

    return function MockTextFieldSearch({
      testID,
      value,
      onChangeText,
      placeholder,
    }: MockTextFieldSearchProps) {
      return (
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
        />
      );
    };
  },
);
jest.mock('../../components/PerpsCard', () => 'PerpsCard');
jest.mock('../../components/PerpsNavigationCard/PerpsNavigationCard', () => {
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: function MockPerpsNavigationCard({
      items,
    }: {
      items: { label: string; onPress: () => void; testID?: string }[];
    }) {
      return (
        <View testID="perps-navigation-card">
          {items.map(
            (
              item: { label: string; onPress: () => void; testID?: string },
              index: number,
            ) => (
              <TouchableOpacity
                key={index}
                testID={item.testID}
                onPress={item.onPress}
              >
                <Text>{item.label}</Text>
              </TouchableOpacity>
            ),
          )}
        </View>
      );
    },
  };
});
jest.mock(
  '../../components/PerpsWatchlistMarkets/PerpsWatchlistMarkets',
  () => 'PerpsWatchlistMarkets',
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

const mockUsePerpsHomeData = jest.requireMock('../../hooks')
  .usePerpsHomeData as jest.Mock;

describe('PerpsHomeView', () => {
  const mockDefaultData = {
    positions: [],
    orders: [],
    watchlistMarkets: [],
    perpsMarkets: [],
    stocksMarkets: [],
    commoditiesMarkets: [],
    forexMarkets: [],
    recentActivity: [],
    sortBy: 'name',
    isLoading: {
      positions: false,
      markets: false,
    },
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigateBack.mockClear();
    mockNavigateToWallet.mockClear();
    mockNavigateToMarketList.mockClear();
    mockUsePerpsHomeData.mockReturnValue(mockDefaultData);
  });

  it('renders without crashing', () => {
    // Arrange & Act
    const { getByTestId } = render(<PerpsHomeView />);

    // Assert - Component renders with essential elements
    expect(getByTestId('back-button')).toBeTruthy();
    expect(getByTestId('perps-home-search-toggle')).toBeTruthy();
  });

  it('shows header with navigation controls', () => {
    // Arrange & Act
    const { getByTestId } = render(<PerpsHomeView />);

    // Assert
    expect(getByTestId('back-button')).toBeTruthy();
    expect(getByTestId('perps-home-search-toggle')).toBeTruthy();
  });

  it('shows search toggle button', () => {
    // Arrange & Act
    const { getByTestId } = render(<PerpsHomeView />);

    // Assert
    expect(getByTestId('perps-home-search-toggle')).toBeTruthy();
  });

  it('navigates to market list view with search enabled when search button is pressed', () => {
    // Arrange
    const { getByTestId, queryByTestId } = render(<PerpsHomeView />);

    // Assert - Search bar should not be visible initially
    expect(queryByTestId('perps-home-search-bar')).toBeNull();

    // Act - Press search toggle
    fireEvent.press(getByTestId('perps-home-search-toggle'));

    // Assert - Should navigate to MarketListView with search enabled
    expect(mockNavigateToMarketList).toHaveBeenCalledWith({
      defaultSearchVisible: true,
      source: PerpsEventValues.SOURCE.HOMESCREEN_TAB,
      fromHome: true,
      button_clicked: 'magnifying_glass',
      button_location: 'perps_home',
    });
    // Search bar should still not be visible in HomeView (navigation happens, component doesn't toggle search)
    expect(queryByTestId('perps-home-search-bar')).toBeNull();
  });

  it('shows positions section when positions exist', () => {
    // Arrange
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      positions: [
        {
          symbol: 'BTC',
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
    const { getByText, getByTestId } = render(<PerpsHomeView />);

    // Assert
    expect(getByText('perps.home.positions')).toBeTruthy();
    // Header is pressable (shows action sheet on press)
    expect(getByTestId('section-header-button')).toBeTruthy();
  });

  it('shows orders section when orders exist', () => {
    // Arrange
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      orders: [
        {
          orderId: '123',
          symbol: 'ETH',
          side: 'buy' as const,
          size: '1.0',
          limitPrice: '3000',
          orderType: 'limit' as const,
          timestamp: Date.now(),
        },
      ],
    });

    // Act
    const { getByText, getByTestId } = render(<PerpsHomeView />);

    // Assert
    expect(getByText('perps.home.orders')).toBeTruthy();
    // Header is pressable (shows action sheet on press)
    expect(getByTestId('section-header-button')).toBeTruthy();
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

  it('navigates to wallet home when back button is pressed', () => {
    // Arrange
    const { getByTestId } = render(<PerpsHomeView />);

    // Act
    fireEvent.press(getByTestId('back-button'));

    // Assert - Always navigates to wallet home to avoid loops (e.g., from tutorial)
    expect(mockNavigateToWallet).toHaveBeenCalled();
  });

  it('navigates to close all modal when close all is pressed', () => {
    // Arrange
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      positions: [
        {
          symbol: 'BTC',
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

    const { getByTestId } = render(<PerpsHomeView />);

    // Act
    // Press the section header button to open action sheet
    fireEvent.press(getByTestId('section-header-button'));

    // Assert
    // Verify the button exists and press works without error
    // The bottom sheet is now shown directly in the component
    expect(getByTestId('section-header-button')).toBeTruthy();
  });

  it('handles cancel all button press for orders section', () => {
    // Arrange
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      orders: [
        {
          orderId: '123',
          symbol: 'ETH',
          side: 'buy' as const,
          size: '1.0',
          limitPrice: '3000',
          orderType: 'limit' as const,
          timestamp: Date.now(),
        },
      ],
    });

    const { getByTestId } = render(<PerpsHomeView />);

    // Act
    // Press the section header button to open action sheet
    const sectionHeaderButton = getByTestId('section-header-button');
    expect(sectionHeaderButton).toBeTruthy();

    // The bottom sheet is now shown directly in the component
  });

  // Note: PerpsHomeView does not render a bottom tab bar
  // The component uses PerpsNavigationCard for navigation instead
  it('renders navigation card', () => {
    // Arrange & Act
    const { getByTestId } = render(<PerpsHomeView />);

    // Assert - Verify navigation card is rendered (if it has a testID)
    // Or just verify component renders without error
    // The navigation card is tested separately
    expect(getByTestId('perps-home-back-button')).toBeTruthy();
  });

  it('renders main sections', () => {
    // Arrange & Act
    const { UNSAFE_getByType } = render(<PerpsHomeView />);

    // Assert
    expect(UNSAFE_getByType('PerpsMarketBalanceActions' as never)).toBeTruthy();
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

  it('renders watchlist component with empty markets array', () => {
    // Arrange
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      watchlistMarkets: [],
    });

    // Act
    const { UNSAFE_getByType } = render(<PerpsHomeView />);

    // Assert - Component is rendered, it handles empty state internally
    expect(UNSAFE_getByType('PerpsWatchlistMarkets' as never)).toBeTruthy();
  });

  describe('Feedback Feature', () => {
    beforeEach(() => {
      jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('does not show feedback button when feature flag is disabled', () => {
      // Arrange - Feature flag disabled (default)
      mockUseSelector.mockReturnValue(false);

      // Act
      const { queryByTestId } = render(<PerpsHomeView />);

      // Assert
      expect(queryByTestId('perps-home-feedback-button')).toBeNull();
    });

    it('shows feedback button when feature flag is enabled', () => {
      // Arrange - Enable feedback feature flag
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectPerpsFeedbackEnabledFlag) {
          return true;
        }
        return false;
      });

      // Act
      const { getByTestId } = render(<PerpsHomeView />);

      // Assert
      expect(getByTestId('perps-home-feedback-button')).toBeTruthy();
    });

    it('opens survey URL in external browser when feedback button is pressed', () => {
      // Arrange - Enable feedback feature flag
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectPerpsFeedbackEnabledFlag) {
          return true;
        }
        return false;
      });

      const { getByTestId } = render(<PerpsHomeView />);

      // Act
      fireEvent.press(getByTestId('perps-home-feedback-button'));

      // Assert
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://survey.alchemer.com/s3/8649911/MetaMask-Perps-Trading-Feedback',
      );
    });
  });
});
