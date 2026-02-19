import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsHomeView from './PerpsHomeView';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import { selectPerpsFeedbackEnabledFlag } from '../../selectors/featureFlags';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';

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
      source: 'main_action_button', // PERPS_EVENT_VALUE.SOURCE.MAIN_ACTION_BUTTON
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
const mockTrack = jest.fn();
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
  usePerpsEventTracking: jest.fn(() => ({
    track: mockTrack,
  })),
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

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn((props: Record<string, unknown>) => ({
        build: jest.fn(() => props),
      })),
      build: jest.fn(() => ({})),
    })),
  }),
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
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
}));

// Mock design system - needed because real module requires tailwind setup
jest.mock('@metamask/design-system-react-native', () => {
  const { TouchableOpacity, Text: RNText } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return {
    ...jest.requireActual('@metamask/design-system-react-native'),
    ButtonIcon: ({
      testID,
      onPress,
    }: {
      testID?: string;
      onPress?: () => void;
    }) => React.createElement(TouchableOpacity, { testID, onPress }),
    Text: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => React.createElement(RNText, { testID }, children),
    Box: 'Box',
  };
});

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

jest.mock('@metamask/perps-controller', () => ({
  PERPS_EVENT_PROPERTY: {
    SCREEN_TYPE: 'screen_type',
    SOURCE: 'source',
    BUTTON_CLICKED: 'button_clicked',
    BUTTON_LOCATION: 'button_location',
    INTERACTION_TYPE: 'interaction_type',
    LOCATION: 'location',
  },
  PERPS_EVENT_VALUE: {
    SCREEN_TYPE: {
      MARKETS: 'markets',
      HOMESCREEN: 'homescreen',
      PERPS_HOME: 'perps_home',
      WALLET_HOME_PERPS_TAB: 'wallet_home_perps_tab',
      GEO_BLOCK_NOTIF: 'geo_block_notif',
    },
    SOURCE: {
      MAIN_ACTION_BUTTON: 'main_action_button',
      HOMESCREEN_TAB: 'homescreen_tab',
      CLOSE_ALL_POSITIONS_BUTTON: 'close_all_positions_button',
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
      GIVE_FEEDBACK: 'give_feedback',
    },
    INTERACTION_TYPE: {
      BUTTON_CLICKED: 'button_clicked',
      CONTACT_SUPPORT: 'contact_support',
    },
  },
  DECIMAL_PRECISION_CONFIG: {
    MaxPriceDecimals: 6,
    MaxSignificantFigures: 5,
    FallbackSizeDecimals: 6,
  },
  PERPS_CONSTANTS: {
    FeatureFlagKey: 'perpsEnabled',
    FeatureName: 'perps',
    PerpsBalanceTokenDescription: 'perps-balance',
    PerpsBalanceTokenSymbol: 'USD',
  },
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.useSharedValue = jest.fn((initial: number) => ({
    value: initial,
  }));
  Reanimated.useAnimatedStyle = jest.fn((fn: () => object) => () => fn());
  Reanimated.useDerivedValue = jest.fn((fn: () => number) => ({ value: fn() }));
  Reanimated.interpolate = jest.fn(
    (_value: number, _inputRange: number[], outputRange: number[]) =>
      outputRange[0],
  );
  Reanimated.Extrapolation = { CLAMP: 'clamp' };
  return Reanimated;
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
const mockUsePerpsHomeActions = jest.requireMock(
  '../../hooks/usePerpsHomeActions',
).usePerpsHomeActions as jest.Mock;

const defaultHomeActionsReturn = {
  handleAddFunds: mockHandleAddFunds,
  handleWithdraw: mockHandleWithdraw,
  isEligibilityModalVisible: false,
  closeEligibilityModal: mockCloseEligibilityModal,
  isEligible: true,
  isProcessing: false,
  error: null,
};

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
      orders: false,
      markets: false,
      activity: false,
    },
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigateBack.mockClear();
    mockNavigateToWallet.mockClear();
    mockNavigateToMarketList.mockClear();
    mockTrack.mockClear();
    mockUsePerpsHomeData.mockReturnValue(mockDefaultData);
    mockUsePerpsHomeActions.mockReturnValue(defaultHomeActionsReturn);
  });

  it('renders without crashing', () => {
    const { getByTestId } = render(<PerpsHomeView />);

    expect(getByTestId('back-button')).toBeOnTheScreen();
    expect(
      getByTestId(PerpsHomeViewSelectorsIDs.SEARCH_TOGGLE),
    ).toBeOnTheScreen();
  });

  it('renders collapsible header with testID', () => {
    const { getByTestId } = render(<PerpsHomeView />);

    expect(getByTestId('perps-home')).toBeOnTheScreen();
    expect(getByTestId('back-button')).toBeOnTheScreen();
  });

  it('shows header with navigation controls', () => {
    const { getByTestId } = render(<PerpsHomeView />);

    expect(getByTestId('back-button')).toBeOnTheScreen();
    expect(
      getByTestId(PerpsHomeViewSelectorsIDs.SEARCH_TOGGLE),
    ).toBeOnTheScreen();
  });

  it('shows search toggle button', () => {
    const { getByTestId } = render(<PerpsHomeView />);

    expect(
      getByTestId(PerpsHomeViewSelectorsIDs.SEARCH_TOGGLE),
    ).toBeOnTheScreen();
  });

  it('navigates to market list view with search enabled when search button is pressed', () => {
    const { getByTestId, queryByTestId } = render(<PerpsHomeView />);

    expect(queryByTestId('perps-home-search-bar')).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(PerpsHomeViewSelectorsIDs.SEARCH_TOGGLE));

    expect(mockNavigateToMarketList).toHaveBeenCalledWith({
      defaultSearchVisible: true,
      defaultMarketTypeFilter: 'all',
      source: PERPS_EVENT_VALUE.SOURCE.HOMESCREEN_TAB,
      fromHome: true,
      button_clicked: 'magnifying_glass',
      button_location: 'perps_home',
    });
    expect(queryByTestId('perps-home-search-bar')).not.toBeOnTheScreen();
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

    expect(getByText('perps.home.positions')).toBeOnTheScreen();
    expect(getByTestId('section-header-button')).toBeOnTheScreen();
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

    expect(getByText('perps.home.orders')).toBeOnTheScreen();
    expect(getByTestId('section-header-button')).toBeOnTheScreen();
  });

  it('hides positions section when no positions', () => {
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      positions: [],
    });

    const { queryByText } = render(<PerpsHomeView />);

    expect(queryByText('perps.home.positions')).not.toBeOnTheScreen();
  });

  it('hides orders section when no orders', () => {
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      orders: [],
    });

    const { queryByText } = render(<PerpsHomeView />);

    expect(queryByText('perps.home.orders')).not.toBeOnTheScreen();
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

    fireEvent.press(getByTestId('section-header-button'));

    expect(getByTestId('section-header-button')).toBeOnTheScreen();
  });

  it('tracks geo-block when user is not eligible and presses close all', () => {
    mockUsePerpsHomeActions.mockReturnValue({
      ...defaultHomeActionsReturn,
      isEligible: false,
    });
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

    fireEvent.press(getByTestId('section-header-button'));

    expect(mockTrack).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        screen_type: PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
        source: PERPS_EVENT_VALUE.SOURCE.CLOSE_ALL_POSITIONS_BUTTON,
      }),
    );
    expect(
      getByTestId('perps-home-close-all-geo-block-tooltip'),
    ).toBeOnTheScreen();
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

    const sectionHeaderButton = getByTestId('section-header-button');
    expect(sectionHeaderButton).toBeOnTheScreen();
  });

  it('renders navigation card with support and learn more', () => {
    const { getByTestId } = render(<PerpsHomeView />);

    expect(getByTestId('perps-navigation-card')).toBeOnTheScreen();
    expect(
      getByTestId(PerpsHomeViewSelectorsIDs.SUPPORT_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsHomeViewSelectorsIDs.LEARN_MORE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('navigates to tutorial when learn more is pressed', () => {
    const { getByTestId } = render(<PerpsHomeView />);

    fireEvent.press(getByTestId(PerpsHomeViewSelectorsIDs.LEARN_MORE_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith('PerpsTutorial', {
      source: PERPS_EVENT_VALUE.SOURCE.HOMESCREEN_TAB,
    });
  });

  it('navigates to support webview when support is pressed', () => {
    const { getByTestId } = render(<PerpsHomeView />);

    fireEvent.press(getByTestId(PerpsHomeViewSelectorsIDs.SUPPORT_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: expect.any(String),
        title: expect.any(String),
      },
    });
  });

  it('renders main sections', () => {
    const { UNSAFE_getByType } = render(<PerpsHomeView />);

    expect(
      UNSAFE_getByType('PerpsMarketBalanceActions' as never),
    ).toBeOnTheScreen();
    expect(
      UNSAFE_getByType('PerpsRecentActivityList' as never),
    ).toBeOnTheScreen();
  });

  it('shows watchlist section when watchlist markets exist', () => {
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

    const { UNSAFE_getByType } = render(<PerpsHomeView />);

    expect(
      UNSAFE_getByType('PerpsWatchlistMarkets' as never),
    ).toBeOnTheScreen();
  });

  it('renders watchlist component with empty markets array', () => {
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      watchlistMarkets: [],
    });

    const { UNSAFE_getByType } = render(<PerpsHomeView />);

    expect(
      UNSAFE_getByType('PerpsWatchlistMarkets' as never),
    ).toBeOnTheScreen();
  });

  describe('Feedback Feature', () => {
    it('does not show feedback button when feature flag is disabled', () => {
      mockUseSelector.mockReturnValue(false);

      const { queryByTestId } = render(<PerpsHomeView />);

      expect(
        queryByTestId(PerpsHomeViewSelectorsIDs.FEEDBACK_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('shows feedback button when feature flag is enabled', () => {
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectPerpsFeedbackEnabledFlag) {
          return true;
        }
        return false;
      });

      const { getByTestId } = render(<PerpsHomeView />);

      expect(
        getByTestId(PerpsHomeViewSelectorsIDs.FEEDBACK_BUTTON),
      ).toBeOnTheScreen();
    });

    it('opens survey URL in in-app browser when feedback button is pressed', () => {
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectPerpsFeedbackEnabledFlag) {
          return true;
        }
        return false;
      });

      const { getByTestId } = render(<PerpsHomeView />);

      fireEvent.press(getByTestId(PerpsHomeViewSelectorsIDs.FEEDBACK_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://survey.alchemer.com/s3/8649911/MetaMask-Perps-Trading-Feedback',
          title: 'perps.feedback.title',
        },
      });
    });
  });
});
