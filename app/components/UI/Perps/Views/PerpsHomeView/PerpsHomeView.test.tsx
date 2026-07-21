import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsHomeView from './PerpsHomeView';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import {
  selectPerpsFeedbackEnabledFlag,
  selectPerpsProductsEnabledFlag,
  selectPerpsTopMoversEnabledFlag,
  selectPerpsRecentlyAddedEnabledFlag,
  selectPerpsWatchlistEnabledFlag,
} from '../../selectors/featureFlags';
import { usePerpsCategories } from '../../hooks/usePerpsCategories';
import { selectWhatsHappeningEnabled } from '../../../../../selectors/featureFlagController/whatsHappening';
import { mockTheme } from '../../../../../util/theme';
import { useDiscoveryScrollManager } from '../../../Predict/hooks/useDiscoveryScrollManager';
import { createActiveABTestAssignment } from '../../../../../util/analytics/activeABTestAssignments';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';
import {
  HOME_SCREEN_CONFIG,
  SUPPORT_CONFIG,
} from '../../constants/perpsConfig';

// Mock useDiscoveryScrollManager
const mockPerpsOnTabEnter = jest.fn();
const mockPerpsScrollHandler = jest.fn();
jest.mock('../../../Predict/hooks/useDiscoveryScrollManager', () => ({
  useDiscoveryScrollManager: jest.fn(() => ({
    scrollHandler: mockPerpsScrollHandler,
    onTabEnter: mockPerpsOnTabEnter,
    headerHidden: false,
  })),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.default.ScrollView = jest.requireActual('react-native').ScrollView;
  return Reanimated;
});

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
let mockRouteParams: Record<string, unknown> = {
  source: 'main_action_button',
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
  useFocusEffect: (callback: () => void) => {
    // Call the callback immediately in tests
    callback();
  },
}));

// Mock Redux - default feedback disabled
const mockUseSelector = jest.fn<unknown, [unknown]>(() => false);
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
  useDispatch: () => jest.fn(),
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
jest.mock(
  '../../components/PerpsTopMoversSection',
  () => 'PerpsTopMoversSection',
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

// Mock direct import of usePerpsCategories (used for sections_displayed gating)
jest.mock('../../hooks/usePerpsCategories', () => ({
  usePerpsCategories: jest.fn(() => []),
}));

jest.mock('../../hooks/usePerpsTopMovers', () => ({
  usePerpsTopMovers: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
  isPerpsTopMoversSectionVisible: jest.requireActual(
    '../../hooks/usePerpsTopMovers',
  ).isPerpsTopMoversSectionVisible,
}));

const mockUsePerpsTopMovers = jest.requireMock('../../hooks/usePerpsTopMovers')
  .usePerpsTopMovers as jest.Mock;

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
    track: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePerpsNetworkManagement', () => ({
  usePerpsNetworkManagement: jest.fn(() => ({
    ensureArbitrumNetworkExists: jest.fn().mockResolvedValue(undefined),
    enableArbitrumNetwork: jest.fn(),
    getArbitrumChainId: jest.fn(),
    currentNetwork: 'mainnet',
  })),
}));

jest.mock('../../hooks/stream', () => ({
  usePerpsLiveAccount: jest.fn(() => ({
    account: {
      totalBalance: '0',
      spendableBalance: '0',
      withdrawableBalance: '0',
      unrealizedPnl: '0',
      returnOnEquity: '0',
    },
    isInitialLoading: false,
  })),
  usePerpsLivePositions: jest.fn(() => ({
    positions: [],
  })),
}));

jest.mock('../../hooks/usePerpsProvider', () => ({
  usePerpsProvider: jest.fn(() => ({
    isMultiProviderEnabled: false,
  })),
}));

// Use real BigNumber library - mocking it causes issues with module initialization

const mockOpenSupportWithConsent = jest.fn(
  (open: (url: string) => void, baseUrl?: string) => open(baseUrl ?? ''),
);
jest.mock('../../../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({
    openSupportWithConsent: mockOpenSupportWithConsent,
  }),
}));

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
    theme: mockTheme,
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
  ...jest.requireActual('@metamask/perps-controller'),
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
jest.mock('../../components/PerpsProducts', () => 'PerpsProducts');
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
jest.mock('../../components/PerpsMoreSection', () => {
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: function MockPerpsMoreSection({
      items,
      testID,
    }: {
      items: { label: string; onPress: () => void; testID?: string }[];
      testID?: string;
    }) {
      return (
        <View testID={testID ?? 'perps-more-section'}>
          <Text>More</Text>
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
jest.mock('../../../../UI/WhatsHappening', () => {
  const { View } = jest.requireActual('react-native');
  return function MockWhatsHappeningSection() {
    return <View testID="whats-happening-section" />;
  };
});
jest.mock(
  '../../../../../selectors/featureFlagController/whatsHappening',
  () => ({
    selectWhatsHappeningEnabled: jest.fn(),
  }),
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

const mockUsePerpsLiveAccount = jest.requireMock('../../hooks/stream')
  .usePerpsLiveAccount as jest.Mock;

describe('PerpsHomeView', () => {
  const mockDefaultData = {
    positions: [],
    orders: [],
    watchlistMarkets: [],
    perpsMarkets: [],
    stocksMarkets: [],
    commoditiesMarkets: [],
    forexMarkets: [],
    recentlyAddedMarkets: [],
    hasMarkets: false,
    recentActivity: [],
    sortBy: 'name',
    categoryMarketCounts: {},
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
    mockRouteParams = { source: 'main_action_button' };
    mockUsePerpsHomeData.mockReturnValue(mockDefaultData);
    mockUsePerpsTopMovers.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUsePerpsLiveAccount.mockReturnValue({
      account: {
        totalBalance: '0',
        spendableBalance: '0',
        withdrawableBalance: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
      },
      isInitialLoading: false,
    });
    (useDiscoveryScrollManager as jest.Mock).mockReturnValue({
      scrollHandler: mockPerpsScrollHandler,
      onTabEnter: mockPerpsOnTabEnter,
      headerHidden: false,
    });
  });

  it('renders without crashing', () => {
    // Arrange & Act
    const { getByTestId } = render(<PerpsHomeView />);

    // Assert - Component renders with essential elements
    expect(
      getByTestId(PerpsHomeViewSelectorsIDs.BACK_HOME_BUTTON),
    ).toBeTruthy();
    expect(getByTestId(PerpsHomeViewSelectorsIDs.SEARCH_TOGGLE)).toBeTruthy();
  });

  it('shows header with navigation controls', () => {
    // Arrange & Act
    const { getByTestId } = render(<PerpsHomeView />);

    // Assert
    expect(
      getByTestId(PerpsHomeViewSelectorsIDs.BACK_HOME_BUTTON),
    ).toBeTruthy();
    expect(getByTestId(PerpsHomeViewSelectorsIDs.SEARCH_TOGGLE)).toBeTruthy();
  });

  it('shows search toggle button', () => {
    // Arrange & Act
    const { getByTestId } = render(<PerpsHomeView />);

    // Assert
    expect(getByTestId(PerpsHomeViewSelectorsIDs.SEARCH_TOGGLE)).toBeTruthy();
  });

  it('navigates to market list view with search enabled when search button is pressed', () => {
    // Arrange
    const { getByTestId, queryByTestId } = render(<PerpsHomeView />);

    // Assert - Search bar should not be visible initially
    expect(queryByTestId('perps-home-search-bar')).toBeNull();

    // Act - Press search toggle
    fireEvent.press(getByTestId(PerpsHomeViewSelectorsIDs.SEARCH_TOGGLE));

    expect(mockNavigateToMarketList).toHaveBeenCalledWith({
      defaultMarketTypeFilter: 'all',
      source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
      fromHome: true,
      button_clicked: 'magnifying_glass',
      button_location: 'perps_home',
    });
    // Search bar should still not be visible in HomeView (navigation happens, component doesn't toggle search)
    expect(queryByTestId('perps-home-search-bar')).toBeNull();
  });

  it('carries route transactionActiveAbTests when search opens market list', () => {
    const transactionActiveAbTests = [
      createActiveABTestAssignment(
        'homeTMCU725AbtestHomepagePerpsPillsEmptyState',
        'treatment',
      ),
    ];
    mockRouteParams = {
      source: 'home_section',
      transactionActiveAbTests,
    };

    const { getByTestId } = render(<PerpsHomeView />);

    fireEvent.press(getByTestId(PerpsHomeViewSelectorsIDs.SEARCH_TOGGLE));

    expect(mockNavigateToMarketList).toHaveBeenCalledWith({
      defaultMarketTypeFilter: 'all',
      source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
      fromHome: true,
      button_clicked: 'magnifying_glass',
      button_location: 'perps_home',
      transactionActiveAbTests,
    });
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
    fireEvent.press(getByTestId(PerpsHomeViewSelectorsIDs.BACK_HOME_BUTTON));

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
  // The component uses PerpsMoreSection for footer actions
  it('renders more section', () => {
    const { getByTestId, getByText } = render(<PerpsHomeView />);

    expect(getByText('More')).toBeTruthy();
    expect(getByTestId(PerpsHomeViewSelectorsIDs.SUPPORT_BUTTON)).toBeTruthy();
    expect(
      getByTestId(PerpsHomeViewSelectorsIDs.LEARN_MORE_BUTTON),
    ).toBeTruthy();
  });

  it('renders main sections', () => {
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      isLoading: { ...mockDefaultData.isLoading, activity: true },
    });

    const { UNSAFE_getByType } = render(<PerpsHomeView />);

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

  it('does not render watchlist when markets and suggestions are empty', () => {
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      watchlistMarkets: [],
      suggestedWatchlistMarkets: [],
    });

    const { UNSAFE_queryByType } = render(<PerpsHomeView />);

    expect(UNSAFE_queryByType('PerpsWatchlistMarkets' as never)).toBeNull();
  });

  it('does not render watchlist when only suggested markets exist and redesign flag is off', () => {
    mockUseSelector.mockReturnValue(false);
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      watchlistMarkets: [],
      suggestedWatchlistMarkets: [
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

    const { UNSAFE_queryByType } = render(<PerpsHomeView />);

    expect(UNSAFE_queryByType('PerpsWatchlistMarkets' as never)).toBeNull();
  });

  it('renders watchlist when only suggested markets exist and redesign flag is on', () => {
    mockUseSelector.mockImplementation(
      (selector: unknown) => selector === selectPerpsWatchlistEnabledFlag,
    );
    mockUsePerpsHomeData.mockReturnValue({
      ...mockDefaultData,
      watchlistMarkets: [],
      suggestedWatchlistMarkets: [
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

    expect(UNSAFE_getByType('PerpsWatchlistMarkets' as never)).toBeTruthy();
  });

  it('passes enabled: false to usePerpsTopMovers when top movers flag is off', () => {
    mockUseSelector.mockReturnValue(false);

    render(<PerpsHomeView />);

    expect(mockUsePerpsTopMovers).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  describe('Feedback Feature', () => {
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

    it('opens survey URL in in-app browser when feedback button is pressed', () => {
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

      // Assert - Should navigate to in-app browser (same pattern as Contact Support)
      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://survey.alchemer.com/s3/8649911/MetaMask-Perps-Trading-Feedback',
          title: 'perps.feedback.title',
        },
      });
    });
  });

  describe('Contact Support', () => {
    beforeEach(() => {
      mockOpenSupportWithConsent.mockClear();
    });

    it('shows the support consent sheet with the support URL when the support button is pressed', () => {
      const { getByTestId } = render(<PerpsHomeView />);

      fireEvent.press(getByTestId(PerpsHomeViewSelectorsIDs.SUPPORT_BUTTON));

      expect(mockOpenSupportWithConsent).toHaveBeenCalledWith(
        expect.any(Function),
        SUPPORT_CONFIG.Url,
      );
    });

    it('navigates to the SimpleWebview with the resolved support URL when the opener resolves', () => {
      const { getByTestId } = render(<PerpsHomeView />);

      fireEvent.press(getByTestId(PerpsHomeViewSelectorsIDs.SUPPORT_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: SUPPORT_CONFIG.Url,
          title: 'perps.support.title',
        },
      });
    });
  });

  describe('fixed footer', () => {
    let originalShowHeaderActionButtons: boolean;

    beforeEach(() => {
      originalShowHeaderActionButtons =
        HOME_SCREEN_CONFIG.ShowHeaderActionButtons;
      Object.assign(HOME_SCREEN_CONFIG, { ShowHeaderActionButtons: false });
    });

    afterEach(() => {
      Object.assign(HOME_SCREEN_CONFIG, {
        ShowHeaderActionButtons: originalShowHeaderActionButtons,
      });
    });

    it('hides fixed footer when balance is a loading sentinel', () => {
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          totalBalance: '--',
          spendableBalance: '--',
          withdrawableBalance: '--',
          unrealizedPnl: '0',
          returnOnEquity: '0',
        },
        isInitialLoading: false,
      });

      const { queryByTestId } = render(<PerpsHomeView />);

      expect(
        queryByTestId(PerpsHomeViewSelectorsIDs.WITHDRAW_BUTTON),
      ).toBeNull();
      expect(
        queryByTestId(PerpsHomeViewSelectorsIDs.ADD_FUNDS_BUTTON),
      ).toBeNull();
    });

    it('shows fixed footer when balance is funded', () => {
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          totalBalance: '100',
          spendableBalance: '100',
          withdrawableBalance: '100',
          unrealizedPnl: '0',
          returnOnEquity: '0',
        },
        isInitialLoading: false,
      });

      const { getByTestId } = render(<PerpsHomeView />);

      expect(
        getByTestId(PerpsHomeViewSelectorsIDs.WITHDRAW_BUTTON),
      ).toBeTruthy();
      expect(
        getByTestId(PerpsHomeViewSelectorsIDs.ADD_FUNDS_BUTTON),
      ).toBeTruthy();
    });
  });

  describe('hideHeader prop', () => {
    it('renders the header by default', () => {
      const { getByTestId } = render(<PerpsHomeView />);
      expect(
        getByTestId(PerpsHomeViewSelectorsIDs.BACK_HOME_BUTTON),
      ).toBeTruthy();
      expect(getByTestId(PerpsHomeViewSelectorsIDs.SEARCH_TOGGLE)).toBeTruthy();
    });

    it('hides the header when hideHeader is true', () => {
      const { queryByTestId } = render(<PerpsHomeView hideHeader />);
      expect(
        queryByTestId(PerpsHomeViewSelectorsIDs.BACK_HOME_BUTTON),
      ).toBeNull();
      expect(queryByTestId(PerpsHomeViewSelectorsIDs.SEARCH_TOGGLE)).toBeNull();
    });

    it('still renders content when hideHeader is true', () => {
      const { UNSAFE_getByType } = render(<PerpsHomeView hideHeader />);
      expect(
        UNSAFE_getByType('PerpsMarketBalanceActions' as never),
      ).toBeTruthy();
    });

    it('hides the screen title and testnet badge when hideHeader is true', () => {
      const { queryByTestId } = render(<PerpsHomeView hideHeader />);

      expect(
        queryByTestId(`${PerpsHomeViewSelectorsIDs.HOME_HEADING}-title`),
      ).toBeNull();
    });
  });

  describe('tabEnterCallbackRef prop', () => {
    it('populates tabEnterCallbackRef.current with onTabEnter after mount', () => {
      const ref = { current: null } as React.MutableRefObject<
        (() => void) | null
      >;
      render(<PerpsHomeView tabEnterCallbackRef={ref} />);
      expect(ref.current).toBe(mockPerpsOnTabEnter);
    });

    it('updates tabEnterCallbackRef.current when onTabEnter changes', () => {
      const ref = { current: null } as React.MutableRefObject<
        (() => void) | null
      >;
      const newOnTabEnter = jest.fn();
      (useDiscoveryScrollManager as jest.Mock).mockReturnValue({
        scrollHandler: mockPerpsScrollHandler,
        onTabEnter: newOnTabEnter,
        headerHidden: false,
      });
      render(<PerpsHomeView tabEnterCallbackRef={ref} />);
      expect(ref.current).toBe(newOnTabEnter);
    });

    it('does not throw when tabEnterCallbackRef is not provided', () => {
      expect(() => render(<PerpsHomeView />)).not.toThrow();
    });
  });

  describe('useDiscoveryScrollManager integration', () => {
    it('passes walletHeaderHeight to useDiscoveryScrollManager', () => {
      render(<PerpsHomeView walletHeaderHeight={56} />);
      expect(useDiscoveryScrollManager).toHaveBeenCalledWith(
        expect.objectContaining({ walletHeaderHeight: 56 }),
      );
    });

    it('passes onHeaderHiddenChange to useDiscoveryScrollManager', () => {
      const onHeaderHiddenChange = jest.fn();
      render(<PerpsHomeView onHeaderHiddenChange={onHeaderHiddenChange} />);
      expect(useDiscoveryScrollManager).toHaveBeenCalledWith(
        expect.objectContaining({ onHeaderHiddenChange }),
      );
    });

    it('uses default walletHeaderHeight of 0 when not provided', () => {
      render(<PerpsHomeView />);
      expect(useDiscoveryScrollManager).toHaveBeenCalledWith(
        expect.objectContaining({ walletHeaderHeight: 0 }),
      );
    });
  });

  describe('WhatsHappening section', () => {
    it('renders WhatsHappeningSection when aiSocialWhatsHappeningEnabled flag is true', () => {
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectWhatsHappeningEnabled) return true;
        return false;
      });
      const { getByTestId } = render(<PerpsHomeView />);
      expect(getByTestId('whats-happening-section')).toBeOnTheScreen();
    });

    it('does not render WhatsHappeningSection when aiSocialWhatsHappeningEnabled flag is false', () => {
      mockUseSelector.mockReturnValue(false);
      const { queryByTestId } = render(<PerpsHomeView />);
      expect(queryByTestId('whats-happening-section')).not.toBeOnTheScreen();
    });
  });

  describe('Analytics: base perps_home screen view event', () => {
    const mockUsePerpsEventTracking = jest.requireMock(
      '../../hooks/usePerpsEventTracking',
    ).usePerpsEventTracking as jest.Mock;

    interface TrackingOptions {
      properties?: Record<string, unknown>;
    }

    const getBaseEventProperties = (
      calls: unknown[][],
    ): Record<string, unknown> | undefined => {
      const match = calls.find((c) => {
        const opts = c[0] as TrackingOptions;
        return opts?.properties?.screen_type === 'perps_home';
      });
      return (match?.[0] as TrackingOptions)?.properties;
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('includes sections_displayed containing balance and explore sections when markets exist', () => {
      mockUsePerpsHomeData.mockReturnValue({
        ...mockDefaultData,
        perpsMarkets: [{ symbol: 'BTC' }],
        stocksMarkets: [{ symbol: 'AAPL' }],
        recentActivity: [{ id: '1' }],
      });

      render(<PerpsHomeView />);

      const properties = getBaseEventProperties(
        mockUsePerpsEventTracking.mock.calls,
      );
      expect(properties?.sections_displayed).toEqual(
        expect.arrayContaining([
          'balance',
          'explore_crypto',
          'explore_stocks',
          'recent_activity',
        ]),
      );
    });

    it('includes watchlist_count and watchlist_markets from raw selector', () => {
      const mockWatchlist = ['BTC', 'ETH', 'SOL'];
      mockUseSelector.mockImplementation(() => mockWatchlist);

      render(<PerpsHomeView />);

      const properties = getBaseEventProperties(
        mockUsePerpsEventTracking.mock.calls,
      );
      expect(properties?.watchlist_count).toBe(3);
      expect(properties?.watchlist_markets).toEqual(mockWatchlist);
    });

    it('excludes positions section from sections_displayed when positions array is empty', () => {
      mockUsePerpsHomeData.mockReturnValue({
        ...mockDefaultData,
        positions: [],
      });

      render(<PerpsHomeView />);

      const properties = getBaseEventProperties(
        mockUsePerpsEventTracking.mock.calls,
      );
      expect(properties?.sections_displayed).not.toContain('positions');
    });

    it('includes positions section in sections_displayed when positions exist', () => {
      mockUsePerpsHomeData.mockReturnValue({
        ...mockDefaultData,
        positions: [{ symbol: 'BTC' }],
      });

      render(<PerpsHomeView />);

      const properties = getBaseEventProperties(
        mockUsePerpsEventTracking.mock.calls,
      );
      expect(properties?.sections_displayed).toContain('positions');
    });

    it('includes orders while orders are loading even when the array is empty', () => {
      mockUseSelector.mockReturnValue(false);
      mockUsePerpsHomeData.mockReturnValue({
        ...mockDefaultData,
        orders: [],
        isLoading: { ...mockDefaultData.isLoading, orders: true },
      });

      render(<PerpsHomeView />);

      const properties = getBaseEventProperties(
        mockUsePerpsEventTracking.mock.calls,
      );
      expect(properties?.sections_displayed).toContain('orders');
    });

    it('includes recent_activity while activity is loading even when the array is empty', () => {
      mockUseSelector.mockReturnValue(false);
      mockUsePerpsHomeData.mockReturnValue({
        ...mockDefaultData,
        recentActivity: [],
        isLoading: { ...mockDefaultData.isLoading, activity: true },
      });

      render(<PerpsHomeView />);

      const properties = getBaseEventProperties(
        mockUsePerpsEventTracking.mock.calls,
      );
      expect(properties?.sections_displayed).toContain('recent_activity');
    });

    it('excludes products and top_movers when their feature flags are disabled', () => {
      mockUseSelector.mockReturnValue(false);
      (usePerpsCategories as jest.Mock).mockReturnValue([
        { id: 'crypto', label: 'Crypto' },
      ]);
      mockUsePerpsHomeData.mockReturnValue({
        ...mockDefaultData,
        perpsMarkets: [{ symbol: 'BTC' }],
      });

      render(<PerpsHomeView />);

      const properties = getBaseEventProperties(
        mockUsePerpsEventTracking.mock.calls,
      );
      expect(properties?.sections_displayed).not.toContain('products');
      expect(properties?.sections_displayed).not.toContain('top_movers');
    });

    it('includes products when enabled and categories are available', () => {
      mockUseSelector.mockImplementation(
        (selector: unknown) => selector === selectPerpsProductsEnabledFlag,
      );
      (usePerpsCategories as jest.Mock).mockReturnValue([
        { id: 'crypto', label: 'Crypto' },
      ]);

      render(<PerpsHomeView />);

      const properties = getBaseEventProperties(
        mockUsePerpsEventTracking.mock.calls,
      );
      expect(properties?.sections_displayed).toContain('products');
    });

    it('excludes products when enabled but no categories are available', () => {
      mockUseSelector.mockImplementation(
        (selector: unknown) => selector === selectPerpsProductsEnabledFlag,
      );
      (usePerpsCategories as jest.Mock).mockReturnValue([]);

      render(<PerpsHomeView />);

      const properties = getBaseEventProperties(
        mockUsePerpsEventTracking.mock.calls,
      );
      expect(properties?.sections_displayed).not.toContain('products');
    });

    it('includes top_movers when enabled and top movers feed has data', () => {
      mockUseSelector.mockImplementation(
        (selector: unknown) => selector === selectPerpsTopMoversEnabledFlag,
      );
      mockUsePerpsTopMovers.mockReturnValue({
        data: [{ symbol: 'BTC' }],
        isLoading: false,
      });

      render(<PerpsHomeView />);

      const properties = getBaseEventProperties(
        mockUsePerpsEventTracking.mock.calls,
      );
      expect(properties?.sections_displayed).toContain('top_movers');
    });

    it('includes top_movers when enabled and top movers feed is loading', () => {
      mockUseSelector.mockImplementation(
        (selector: unknown) => selector === selectPerpsTopMoversEnabledFlag,
      );
      mockUsePerpsTopMovers.mockReturnValue({
        data: [],
        isLoading: true,
      });

      render(<PerpsHomeView />);

      const properties = getBaseEventProperties(
        mockUsePerpsEventTracking.mock.calls,
      );
      expect(properties?.sections_displayed).toContain('top_movers');
    });

    it('excludes top_movers when enabled but top movers feed is empty and loaded', () => {
      mockUseSelector.mockImplementation(
        (selector: unknown) => selector === selectPerpsTopMoversEnabledFlag,
      );
      mockUsePerpsTopMovers.mockReturnValue({
        data: [],
        isLoading: false,
      });
      mockUsePerpsHomeData.mockReturnValue({
        ...mockDefaultData,
        hasMarkets: true,
        perpsMarkets: [{ symbol: 'BTC' }],
      });

      render(<PerpsHomeView />);

      const properties = getBaseEventProperties(
        mockUsePerpsEventTracking.mock.calls,
      );
      expect(properties?.sections_displayed).not.toContain('top_movers');
    });

    it('excludes top_movers when enabled but top movers feed is empty', () => {
      mockUseSelector.mockImplementation(
        (selector: unknown) => selector === selectPerpsTopMoversEnabledFlag,
      );
      mockUsePerpsTopMovers.mockReturnValue({
        data: [],
        isLoading: false,
      });
      mockUsePerpsHomeData.mockReturnValue({ ...mockDefaultData });

      render(<PerpsHomeView />);

      const properties = getBaseEventProperties(
        mockUsePerpsEventTracking.mock.calls,
      );
      expect(properties?.sections_displayed).not.toContain('top_movers');
    });

    it('excludes recently_added when the feature flag is off even though data is present', () => {
      mockUseSelector.mockReturnValue(false);
      mockUsePerpsHomeData.mockReturnValue({
        ...mockDefaultData,
        recentlyAddedMarkets: [{ symbol: 'BTC' }],
      });

      render(<PerpsHomeView />);

      const properties = getBaseEventProperties(
        mockUsePerpsEventTracking.mock.calls,
      );
      expect(properties?.sections_displayed).not.toContain('recently_added');
    });

    it('includes recently_added when the feature flag is on and data is present', () => {
      mockUseSelector.mockImplementation(
        (selector: unknown) => selector === selectPerpsRecentlyAddedEnabledFlag,
      );
      mockUsePerpsHomeData.mockReturnValue({
        ...mockDefaultData,
        recentlyAddedMarkets: [
          {
            symbol: 'BTC',
            name: 'Bitcoin',
            price: '$50000',
            change24h: '+$1250',
            change24hPercent: '+2.5%',
            volume: '$1.2B',
            listedAt: Date.now() - 3 * 60 * 60 * 1000,
          },
        ],
      });

      render(<PerpsHomeView />);

      const properties = getBaseEventProperties(
        mockUsePerpsEventTracking.mock.calls,
      );
      expect(properties?.sections_displayed).toContain('recently_added');
    });
  });

  describe('Recently Added header navigation', () => {
    it('navigates to the market list filtered to new markets when the header is pressed', () => {
      mockUseSelector.mockImplementation(
        (selector: unknown) => selector === selectPerpsRecentlyAddedEnabledFlag,
      );
      mockUsePerpsHomeData.mockReturnValue({
        ...mockDefaultData,
        recentlyAddedMarkets: [
          {
            symbol: 'BTC',
            name: 'Bitcoin',
            price: '$50000',
            change24h: '+$1250',
            change24hPercent: '+2.5%',
            volume: '$1.2B',
            listedAt: Date.now() - 3 * 60 * 60 * 1000,
          },
        ],
      });

      const { getByTestId } = render(<PerpsHomeView />);

      fireEvent.press(
        getByTestId(PerpsHomeViewSelectorsIDs.RECENTLY_ADDED_HEADER),
      );

      expect(mockNavigateToMarketList).toHaveBeenCalledWith({
        defaultMarketTypeFilter: 'new',
        source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
      });
    });
  });
});
