import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import PredictMarketDetails from './PredictMarketDetails';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackMarketDetailsOpened: jest.fn(),
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
  NavigationContainer: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children,
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((...args) => args.join(' ')),
  })),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Box: View,
    BoxFlexDirection: {
      Row: 'row',
      Column: 'column',
    },
    BoxAlignItems: {
      Center: 'center',
    },
    BoxJustifyContent: {
      Between: 'space-between',
    },
    ButtonSize: {
      Lg: 'lg',
      Md: 'md',
      Sm: 'sm',
    },
  };
});

const mockUseTheme = jest.fn(() => ({
  colors: {
    background: {
      default: '#ffffff',
    },
    text: {
      default: '#121314',
      muted: '#666666',
    },
    icon: {
      default: '#121314',
    },
    primary: {
      default: '#037DD6',
    },
    success: {
      default: '#28A745',
    },
    error: {
      default: '#DC3545',
    },
  },
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: mockUseTheme,
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({
      children,
      style,
      testID,
    }: {
      children: React.ReactNode;
      style?: React.ComponentProps<typeof View>['style'];
      testID?: string;
    }) => (
      <View style={style} testID={testID}>
        {children}
      </View>
    ),
    useSafeAreaInsets: jest.fn(() => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(() => ({})),
}));

jest.mock('../../utils/format', () => ({
  formatPrice: jest.fn(
    (value: number, options?: { maximumDecimals?: number }) =>
      `$${value.toFixed(options?.maximumDecimals || 2)}`,
  ),
  formatVolume: jest.fn((value: number) => value.toLocaleString()),
  formatPercentage: jest.fn((value: number) =>
    value === 0
      ? '0%'
      : `${value > 0 ? '+' : ''}${Math.abs(value).toFixed(2)}%`,
  ),
  formatAddress: jest.fn(
    (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`,
  ),
  estimateLineCount: jest.fn((text?: string) => {
    if (!text) return 1;
    // Simple mock implementation - returns 1 for short text, 2 for longer
    return text.length > 50 ? 2 : 1;
  }),
}));

jest.mock('../../hooks/usePredictMarket', () => ({
  usePredictMarket: jest.fn(() => ({
    market: null,
    isFetching: false,
    refetch: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePredictPriceHistory', () => ({
  usePredictPriceHistory: jest.fn(() => ({
    priceHistories: [],
    isFetching: false,
    errors: [],
    refetch: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePredictPositions', () => ({
  usePredictPositions: jest.fn(() => ({
    positions: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    loadPositions: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePredictBalance', () => ({
  usePredictBalance: jest.fn(() => ({
    balance: 100,
    hasNoBalance: false,
    isLoading: false,
    isRefreshing: false,
    error: null,
    loadBalance: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePredictClaim', () => ({
  usePredictClaim: jest.fn(() => ({
    claim: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePredictEligibility', () => ({
  usePredictEligibility: jest.fn(() => ({
    isEligible: true,
    refreshEligibility: jest.fn(),
  })),
}));

jest.mock('../../components/PredictDetailsChart/PredictDetailsChart', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockPredictDetailsChart() {
    return (
      <View testID="predict-details-chart">
        <Text>Chart Component</Text>
      </View>
    );
  };
});

jest.mock('../../components/PredictMarketOutcome', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockPredictMarketOutcome({
    outcome,
  }: {
    outcome: { title?: string };
  }) {
    return (
      <View testID="predict-market-outcome">
        <Text>{outcome?.title || 'Outcome'}</Text>
      </View>
    );
  };
});

jest.mock('../../../../Base/TabBar', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockTabBar({ textStyle }: { textStyle: object }) {
    return (
      <View testID="tab-bar">
        <Text style={textStyle}>Tab Bar</Text>
      </View>
    );
  };
});

jest.mock('@tommasini/react-native-scrollable-tab-view', () => {
  const { View } = jest.requireActual('react-native');
  return function MockScrollableTabView({
    children,
    renderTabBar,
  }: {
    children: React.ReactNode;
    renderTabBar?: () => React.ReactNode;
  }) {
    return (
      <View testID="scrollable-tab-view">
        {renderTabBar?.()}
        {children}
      </View>
    );
  };
});

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: Text,
    TextVariant: {
      HeadingMD: 'HeadingMD',
      BodyMD: 'BodyMD',
      BodyMDMedium: 'BodyMDMedium',
      BodySM: 'BodySM',
    },
    TextColor: {
      Default: 'Default',
      Alternative: 'Alternative',
      Success: 'Success',
      Error: 'Error',
      Primary: 'Primary',
    },
  };
});

jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockButton({
      onPress,
      style,
      children,
      label,
      testID,
    }: {
      onPress: () => void;
      label: string | React.ReactNode;
      variant: string;
      size: string;
      width: string;
      style: object;
      children?: React.ReactNode;
      testID?: string;
    }) {
      return (
        <TouchableOpacity
          onPress={onPress}
          testID={testID || 'button'}
          style={style}
        >
          <Text>{label || children}</Text>
        </TouchableOpacity>
      );
    },
    ButtonVariants: {
      Primary: 'Primary',
      Secondary: 'Secondary',
    },
    ButtonSize: {
      Lg: 'Lg',
    },
    ButtonWidthTypes: {
      Full: 'Full',
    },
  };
});

jest.mock(
  '../../../../../component-library/components-temp/Buttons/ButtonHero',
  () => {
    const { TouchableOpacity } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: function MockButtonHero({
        onPress,
        style,
        children,
        testID,
      }: {
        onPress?: () => void;
        style?: object;
        children?: React.ReactNode;
        size?: string;
        testID?: string;
      }) {
        return (
          <TouchableOpacity
            onPress={onPress}
            testID={testID || 'button-hero'}
            style={style}
          >
            {children}
          </TouchableOpacity>
        );
      },
    };
  },
);

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockIcon({
      name,
    }: {
      name: string;
      size?: string;
      color?: string;
    }) {
      return <View testID={`icon-${name}`} />;
    },
    IconName: {
      ArrowLeft: 'ArrowLeft',
      ArrowDown: 'ArrowDown',
      ArrowUp: 'ArrowUp',
      Flash: 'Flash',
      Chart: 'Chart',
      Clock: 'Clock',
      Bank: 'Bank',
      Export: 'Export',
      Apps: 'Apps',
      CheckBold: 'CheckBold',
    },
    IconSize: {
      Sm: 'Sm',
      Md: 'Md',
    },
    IconColor: {
      Default: 'Default',
      Alternative: 'Alternative',
      Success: 'Success',
      Error: 'Error',
      Primary: 'Primary',
    },
  };
});

function createMockMarket(overrides = {}) {
  return {
    id: 'market-1',
    title: 'Will Bitcoin reach $100k by end of 2024?',
    image: 'https://example.com/bitcoin.png',
    endDate: '2024-12-31T23:59:59Z',
    providerId: 'polymarket',
    outcomes: [
      {
        id: 'outcome-1',
        title: 'Yes',
        groupItemTitle: 'Yes',
        tokens: [
          {
            id: 'token-1',
            price: 0.65,
          },
        ],
        volume: 1000000,
      },
      {
        id: 'outcome-2',
        title: 'No',
        groupItemTitle: 'No',
        tokens: [
          {
            id: 'token-2',
            price: 0.35,
          },
        ],
        volume: 500000,
      },
    ],
    ...overrides,
  };
}

function setupPredictMarketDetailsTest(
  marketOverrides = {},
  routeOverrides = {},
  hookOverrides: {
    market?: object;
    priceHistory?: object;
    positions?: object;
    eligibility?: object;
  } = {},
) {
  jest.clearAllMocks();

  const mockNavigate = jest.fn();
  const mockSetOptions = jest.fn();
  const mockGoBack = jest.fn();
  const mockCanGoBack = jest.fn(() => true);
  const mockGetParent = jest.fn(() => ({
    canGoBack: jest.fn(() => true),
    goBack: jest.fn(),
  }));

  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;
  const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;

  const mockMarket = createMockMarket(marketOverrides);

  const mockRoute = {
    key: 'PredictMarketDetails',
    name: 'PredictMarketDetails' as const,
    params: {
      marketId: 'market-1',
    },
    ...routeOverrides,
  };

  mockUseNavigation.mockReturnValue({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
    getParent: mockGetParent,
  } as unknown as NavigationProp<ParamListBase>);

  mockUseRoute.mockReturnValue(mockRoute);

  const { usePredictMarket } = jest.requireMock('../../hooks/usePredictMarket');
  const { usePredictPriceHistory } = jest.requireMock(
    '../../hooks/usePredictPriceHistory',
  );
  const { usePredictPositions } = jest.requireMock(
    '../../hooks/usePredictPositions',
  );
  const { usePredictEligibility } = jest.requireMock(
    '../../hooks/usePredictEligibility',
  );

  usePredictEligibility.mockReturnValue({
    isEligible: true,
    refreshEligibility: jest.fn(),
    ...hookOverrides.eligibility,
  });

  usePredictMarket.mockReturnValue({
    market: mockMarket,
    isFetching: false,
    refetch: jest.fn(),
    ...hookOverrides.market,
  });

  usePredictPriceHistory.mockReturnValue({
    priceHistories: [],
    isFetching: false,
    errors: [],
    refetch: jest.fn(),
    ...hookOverrides.priceHistory,
  });

  usePredictPositions.mockReturnValue({
    positions: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    loadPositions: jest.fn(),
    ...hookOverrides.positions,
  });

  const result = renderWithProvider(<PredictMarketDetails />);

  return {
    ...result,
    mockNavigate,
    mockSetOptions,
    mockGoBack,
    mockCanGoBack,
    mockGetParent,
    mockMarket,
    mockRoute,
  };
}

describe('PredictMarketDetails', () => {
  describe('Component Rendering', () => {
    it('renders the main screen container', () => {
      setupPredictMarketDetailsTest();

      expect(
        screen.getByTestId('predict-market-details-screen'),
      ).toBeOnTheScreen();
    });

    it('displays market title when market data is loaded', () => {
      const { mockMarket } = setupPredictMarketDetailsTest();

      expect(screen.getByText(mockMarket.title)).toBeOnTheScreen();
    });

    it('displays loading state when market is fetching', () => {
      setupPredictMarketDetailsTest(
        {},
        {},
        { market: { isFetching: true, market: null } },
      );

      // Check that loading text appears (there may be multiple instances)
      const loadingTexts = screen.getAllByText('predict.loading');
      expect(loadingTexts.length).toBeGreaterThan(0);
    });

    it('displays fallback title when market data is unavailable', () => {
      setupPredictMarketDetailsTest({}, {}, { market: { market: null } });

      // Screen renders without a title; other sections may still show loading keys
      expect(
        screen.getByTestId('predict-market-details-screen'),
      ).toBeOnTheScreen();
    });

    it('renders back button with correct accessibility', () => {
      setupPredictMarketDetailsTest();

      expect(screen.getByTestId('icon-ArrowLeft')).toBeOnTheScreen();
    });
  });

  describe('Market Information Display', () => {
    it('displays market volume correctly', () => {
      setupPredictMarketDetailsTest();

      const aboutTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-1',
      );
      fireEvent.press(aboutTab);

      expect(
        screen.getByText('predict.market_details.volume'),
      ).toBeOnTheScreen();
    });

    it('displays market end date correctly', () => {
      setupPredictMarketDetailsTest();

      const aboutTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-1',
      );
      fireEvent.press(aboutTab);

      expect(
        screen.getByText('predict.market_details.end_date'),
      ).toBeOnTheScreen();
      expect(screen.getByText('12/31/2024')).toBeOnTheScreen();
    });

    it('displays resolution details information', () => {
      setupPredictMarketDetailsTest();

      const aboutTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-1',
      );
      fireEvent.press(aboutTab);

      expect(
        screen.getByText('predict.market_details.resolution_details'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Polymarket')).toBeOnTheScreen();
    });
  });

  describe('Chart Rendering', () => {
    it('renders single outcome chart for single outcome markets', () => {
      const singleOutcomeMarket = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 0.65 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(singleOutcomeMarket);

      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('renders multiple outcome chart for binary markets with two outcomes', () => {
      setupPredictMarketDetailsTest();

      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('renders multiple outcome chart for multi-outcome markets', () => {
      const multiOutcomeMarket = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            tokens: [{ id: 'token-1', price: 0.4 }],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            tokens: [{ id: 'token-2', price: 0.3 }],
            volume: 500000,
          },
          {
            id: 'outcome-3',
            title: 'Option C',
            tokens: [{ id: 'token-3', price: 0.3 }],
            volume: 300000,
          },
        ],
      });

      setupPredictMarketDetailsTest(multiOutcomeMarket);

      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });
  });

  describe('Tab Navigation', () => {
    it('renders tab bar with correct tabs', () => {
      setupPredictMarketDetailsTest();

      expect(
        screen.getByTestId('predict-market-details-tab-bar'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-market-details-scrollable-tab-view'),
      ).toBeOnTheScreen();
    });

    it('displays About tab content', () => {
      setupPredictMarketDetailsTest();

      const aboutTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-1',
      );
      fireEvent.press(aboutTab);

      expect(
        screen.getByText('predict.market_details.volume'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('predict.market_details.end_date'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('predict.market_details.resolution_details'),
      ).toBeOnTheScreen();
    });

    it('hides Positions tab when user has no positions', () => {
      setupPredictMarketDetailsTest();

      expect(
        screen.queryByText('predict.tabs.positions'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Action Buttons', () => {
    it('renders Yes and No action buttons for single outcome markets', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 0.65 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(singleOutcomeMarket);

      expect(
        screen.getByText(/predict\.market_details\.yes\s*•\s*65¢/),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(/predict\.market_details\.no\s*•\s*35¢/),
      ).toBeOnTheScreen();
    });

    it('calculates percentage correctly from market price', () => {
      const marketWithDifferentPrice = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 0.75 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithDifferentPrice);

      expect(
        screen.getByText(/predict\.market_details\.yes\s*•\s*75¢/),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(/predict\.market_details\.no\s*•\s*25¢/),
      ).toBeOnTheScreen();
    });
  });

  describe('Navigation Functionality', () => {
    it('handles back button press correctly', () => {
      const { mockGoBack, mockCanGoBack } = setupPredictMarketDetailsTest();

      const backButton = screen.getByTestId('icon-ArrowLeft');
      fireEvent.press(backButton);

      expect(mockCanGoBack).toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('navigates to predict root when current navigation cannot go back', () => {
      const { mockCanGoBack, mockNavigate } = setupPredictMarketDetailsTest();
      mockCanGoBack.mockReturnValue(false);

      const backButton = screen.getByTestId('icon-ArrowLeft');
      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT);
    });
  });

  describe('Current Prediction Display', () => {
    it('displays current prediction percentage for single outcome markets', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 0.65 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(singleOutcomeMarket);

      // The component now shows the percentage in the action buttons instead of a separate text
      expect(
        screen.getByText(/predict\.market_details\.yes\s*•\s*65¢/),
      ).toBeOnTheScreen();
    });

    it('handles missing price data gracefully', () => {
      const marketWithoutPrice = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: undefined }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithoutPrice);

      // The component now shows 0% in the action buttons when price is undefined
      expect(
        screen.getByText(/predict\.market_details\.yes\s*•\s*0¢/),
      ).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles market without image', () => {
      const marketWithoutImage = createMockMarket({ image: null });

      setupPredictMarketDetailsTest(marketWithoutImage);

      expect(screen.getByText(marketWithoutImage.title)).toBeOnTheScreen();
    });

    it('handles market without end date', () => {
      const marketWithoutEndDate = createMockMarket({ endDate: null });

      setupPredictMarketDetailsTest(marketWithoutEndDate);

      const aboutTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-1',
      );
      fireEvent.press(aboutTab);

      expect(screen.getByText('N/A')).toBeOnTheScreen();
    });

    it('handles market with minimal data', () => {
      const marketWithMinimalData = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 0.5 }],
            volume: 0,
          },
        ],
        title: 'Test Market',
        image: null,
        endDate: null,
      });

      setupPredictMarketDetailsTest(marketWithMinimalData);

      expect(screen.getByText('Test Market')).toBeOnTheScreen();
    });
  });

  describe('Internationalization', () => {
    it('uses correct string keys for back button', () => {
      setupPredictMarketDetailsTest();

      expect(strings).toHaveBeenCalledWith('back');
    });
  });

  describe('Event Handlers', () => {
    it('handles timeframe change with valid timeframe', () => {
      const { mockMarket } = setupPredictMarketDetailsTest();

      // Find the chart component and trigger timeframe change
      const chartComponent = screen.getByTestId('predict-details-chart');
      expect(chartComponent).toBeOnTheScreen();

      // The timeframe change is handled internally by the component
      // We can verify the component renders without errors
      expect(screen.getByText(mockMarket.title)).toBeOnTheScreen();
    });

    it('handles cash out button press', () => {
      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
        size: 100,
        initialValue: 65,
        currentValue: 70,
        avgPrice: 0.65,
        percentPnl: 7.7,
        icon: 'https://example.com/icon.png',
      };

      const { mockNavigate } = setupPredictMarketDetailsTest(
        { status: 'open' },
        {},
        { positions: { positions: [mockPosition] } },
      );

      // Switch to Positions tab (index 0 when positions exist)
      const positionsTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-0',
      );
      fireEvent.press(positionsTab);

      const cashOutButton = screen.getByText('predict.cash_out');
      fireEvent.press(cashOutButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.SELL_PREVIEW,
        params: {
          position: mockPosition,
          outcome: expect.any(Object),
          market: expect.any(Object),
          entryPoint: 'predict_market_details',
        },
      });
    });

    it('handles Yes button press for betting', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 0.65 }],
            volume: 1000000,
          },
        ],
      });

      const { mockNavigate } =
        setupPredictMarketDetailsTest(singleOutcomeMarket);

      const yesButton = screen.getByText(
        /predict\.market_details\.yes\s*•\s*65¢/,
      );
      fireEvent.press(yesButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
        params: {
          market: singleOutcomeMarket,
          outcome: singleOutcomeMarket.outcomes[0],
          outcomeToken: singleOutcomeMarket.outcomes[0].tokens[0],
          entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
        },
      });
    });

    it('handles No button press for betting', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', price: 0.65 },
              { id: 'token-2', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      const { mockNavigate } =
        setupPredictMarketDetailsTest(singleOutcomeMarket);

      const noButton = screen.getByText(
        /predict\.market_details\.no\s*•\s*35¢/,
      );
      fireEvent.press(noButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
        params: {
          market: singleOutcomeMarket,
          outcome: singleOutcomeMarket.outcomes[0],
          outcomeToken: singleOutcomeMarket.outcomes[0].tokens[1],
          entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
        },
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('attaches a themed RefreshControl to the scroll view', () => {
      setupPredictMarketDetailsTest();

      const scrollView = screen.getByTestId(
        'predict-market-details-scrollable-tab-view',
      );
      const refreshControlProps = scrollView.props.refreshControl.props;

      expect(scrollView.props.refreshControl).toBeDefined();
      expect(refreshControlProps.tintColor).toBeTruthy();
      expect(refreshControlProps.colors).toEqual([
        refreshControlProps.tintColor,
      ]);
      expect(refreshControlProps.refreshing).toBe(false);
    });

    it('triggers market, price history, and positions refresh', async () => {
      const mockRefetchMarket = jest.fn(() => Promise.resolve());
      const mockRefetchPriceHistory = jest.fn(() => Promise.resolve());
      const mockLoadPositions = jest.fn(() => Promise.resolve());

      setupPredictMarketDetailsTest(
        {},
        {},
        {
          market: { refetch: mockRefetchMarket },
          priceHistory: { refetch: mockRefetchPriceHistory },
          positions: { loadPositions: mockLoadPositions },
        },
      );

      const scrollView = screen.getByTestId(
        'predict-market-details-scrollable-tab-view',
      );

      await act(async () => {
        await scrollView.props.refreshControl.props.onRefresh();
      });

      await waitFor(() => {
        expect(mockRefetchMarket).toHaveBeenCalledTimes(1);
        expect(mockRefetchPriceHistory).toHaveBeenCalledTimes(1);
        expect(mockLoadPositions).toHaveBeenCalledTimes(1);
        expect(mockLoadPositions).toHaveBeenCalledWith({ isRefresh: true });
      });
    });
  });

  describe('Conditional Rendering', () => {
    it('renders positions section when user has positions', () => {
      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
        title: 'Yes',
        size: 100,
        initialValue: 65,
        currentValue: 70,
        avgPrice: 0.65,
        percentPnl: 7.7,
        icon: 'https://example.com/icon.png',
      };

      setupPredictMarketDetailsTest(
        { status: 'open' },
        {},
        { positions: { positions: [mockPosition] } },
      );

      // Switch to Positions tab (index 0 when positions exist)
      const positionsTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-0',
      );
      fireEvent.press(positionsTab);

      expect(screen.getByText('predict.cash_out')).toBeOnTheScreen();
      expect(
        screen.getByText('$65.00 on Yes • 65¢', { exact: false }),
      ).toBeOnTheScreen();
      expect(screen.getByText('+7.70%')).toBeOnTheScreen();
    });

    it('renders position with negative PnL correctly', () => {
      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
        title: 'Yes',
        size: 100,
        initialValue: 65,
        currentValue: 60,
        avgPrice: 0.65,
        percentPnl: -7.7,
        icon: null, // Test branch without icon
      };

      setupPredictMarketDetailsTest(
        { status: 'open' },
        {},
        { positions: { positions: [mockPosition] } },
      );

      // Switch to Positions tab (index 0 when positions exist)
      const positionsTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-0',
      );
      fireEvent.press(positionsTab);

      expect(screen.getByText('7.70%')).toBeOnTheScreen();
    });

    it('renders outcomes tab for multi-outcome markets', () => {
      const multiOutcomeMarket = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            tokens: [{ id: 'token-1', price: 0.4 }],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            tokens: [{ id: 'token-2', price: 0.3 }],
            volume: 500000,
          },
          {
            id: 'outcome-3',
            title: 'Option C',
            tokens: [{ id: 'token-3', price: 0.3 }],
            volume: 300000,
          },
        ],
      });

      setupPredictMarketDetailsTest(multiOutcomeMarket);

      // Outcomes is the default tab when there are no positions
      expect(screen.getAllByTestId('predict-market-outcome')).toHaveLength(3);
    });

    it('does not render outcomes tab for single outcome markets', () => {
      const singleOutcomeMarket = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 0.65 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(singleOutcomeMarket);

      // Should not render outcomes tab for single outcome
      expect(screen.queryByText('Outcomes')).not.toBeOnTheScreen();
    });

    it('renders current prediction section only for single outcome markets', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 0.65 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(singleOutcomeMarket);

      // The component now shows the percentage in the action buttons instead of a separate text
      expect(
        screen.getByText(/predict\.market_details\.yes\s*•\s*65¢/),
      ).toBeOnTheScreen();
    });

    it('renders action buttons only for single outcome markets', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 0.65 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(singleOutcomeMarket);

      expect(
        screen.getByText(/predict\.market_details\.yes\s*•\s*65¢/),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(/predict\.market_details\.no\s*•\s*35¢/),
      ).toBeOnTheScreen();
    });
  });

  describe('Data Processing Functions', () => {
    it('handles position with groupItemTitle correctly', () => {
      const mockMarket = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            groupItemTitle: 'Yes Option',
            tokens: [{ id: 'token-1', price: 0.65 }],
            volume: 1000000,
          },
        ],
      });

      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
        title: 'Yes',
        size: 100,
        initialValue: 65,
        currentValue: 70,
        avgPrice: 0.65,
        percentPnl: 7.7,
      };

      setupPredictMarketDetailsTest(
        mockMarket,
        {},
        { positions: { positions: [mockPosition] } },
      );

      // Switch to Positions tab (index 0 when positions exist)
      const positionsTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-0',
      );
      fireEvent.press(positionsTab);

      expect(screen.getByText('Yes Option')).toBeOnTheScreen();
      expect(
        screen.getByText('$65.00 on Yes • 65¢', { exact: false }),
      ).toBeOnTheScreen();
    });

    it('handles position without groupItemTitle correctly', () => {
      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
        title: 'Yes',
        size: 100,
        initialValue: 65,
        currentValue: 70,
        avgPrice: 0.65,
        percentPnl: 7.7,
      };

      setupPredictMarketDetailsTest(
        {},
        {},
        { positions: { positions: [mockPosition] } },
      );

      // Switch to Positions tab (index 0 when positions exist)
      const positionsTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-0',
      );
      fireEvent.press(positionsTab);

      expect(screen.getByText('Yes')).toBeOnTheScreen();
      expect(
        screen.getByText('$65.00 on Yes • 65¢', { exact: false }),
      ).toBeOnTheScreen();
    });

    it('handles zero percentage correctly', () => {
      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
        title: 'Yes',
        size: 100,
        initialValue: 65,
        currentValue: 65,
        avgPrice: 0.65,
        percentPnl: 0,
      };

      setupPredictMarketDetailsTest(
        { status: 'open' },
        {},
        { positions: { positions: [mockPosition] } },
      );

      // Switch to Positions tab (index 0 when positions exist)
      const positionsTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-0',
      );
      fireEvent.press(positionsTab);

      expect(screen.getByText('0%')).toBeOnTheScreen();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid timeframe change gracefully', () => {
      setupPredictMarketDetailsTest();

      // Component should render without errors even with invalid data
      expect(
        screen.getByTestId('predict-market-details-screen'),
      ).toBeOnTheScreen();
    });

    it('handles missing route params gracefully', () => {
      setupPredictMarketDetailsTest({}, { params: undefined });

      expect(
        screen.getByTestId('predict-market-details-screen'),
      ).toBeOnTheScreen();
    });

    it('handles market with missing outcome data', () => {
      const marketWithMissingData = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [], // Empty tokens array
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithMissingData);

      // Since this is a single outcome market with empty tokens, it should not render the current prediction
      // Instead, verify the market title is rendered
      expect(
        screen.getByText('Will Bitcoin reach $100k by end of 2024?'),
      ).toBeOnTheScreen();
    });

    it('handles market with undefined price correctly', () => {
      const marketWithUndefinedPrice = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: undefined }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithUndefinedPrice);

      // The component now shows 0% in the action buttons when price is undefined
      expect(
        screen.getByText(/predict\.market_details\.yes\s*•\s*0¢/),
      ).toBeOnTheScreen();
    });
  });

  describe('Closed Market Functionality', () => {
    it('displays winning outcome when market is closed', () => {
      const closedMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            groupItemTitle: 'Yes',
            tokens: [
              { id: 'token-1', price: 1.0 }, // Winning token
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'No',
            groupItemTitle: 'No',
            tokens: [
              { id: 'token-2', price: 0.0 }, // Losing token
            ],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(closedMarket);

      expect(
        screen.getByText('predict.market_details.market_ended_on'),
      ).toBeOnTheScreen();
    });

    it('renders claim button when market is closed', () => {
      const closedMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 1.0 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(
        closedMarket,
        {},
        {
          positions: {
            positions: [
              {
                id: 'position-1',
                outcomeId: 'outcome-1',
                outcome: 'Yes',
                size: 10,
                initialValue: 10,
                currentValue: 12,
                avgPrice: 0.5,
                percentPnl: 20,
              },
            ],
          },
        },
      );

      expect(
        screen.getByText('confirm.predict_claim.button_label'),
      ).toBeOnTheScreen();
    });

    it('handles claim button press', async () => {
      const mockClaim = jest.fn();
      const { usePredictClaim } = jest.requireMock(
        '../../hooks/usePredictClaim',
      );
      usePredictClaim.mockReturnValue({
        claim: mockClaim,
      });

      const closedMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 1.0 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(
        closedMarket,
        {},
        {
          positions: {
            positions: [
              {
                id: 'position-1',
                outcomeId: 'outcome-1',
                outcome: 'Yes',
                size: 10,
                initialValue: 10,
                currentValue: 12,
                avgPrice: 0.5,
                percentPnl: 20,
              },
            ],
          },
        },
      );

      const claimButton = screen.getByText(
        'confirm.predict_claim.button_label',
      );
      fireEvent.press(claimButton);

      expect(mockClaim).toHaveBeenCalled();
    });

    it('renders outcomes tab for closed markets', () => {
      const closedMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 1.0 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(closedMarket);

      // Outcomes is the default tab when there are no positions
      expect(
        screen.getAllByTestId('predict-market-outcome').length,
      ).toBeGreaterThan(0);
    });

    it('sets timeframe to MAX when market is closed', () => {
      const closedMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 1.0 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(closedMarket);

      // Verify the component renders without errors
      expect(
        screen.getByTestId('predict-market-details-screen'),
      ).toBeOnTheScreen();
    });

    it('finds winning outcome token when market is closed', () => {
      const closedMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            groupItemTitle: 'Yes',
            tokens: [
              { id: 'token-1', price: 1.0 }, // Winning token
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(closedMarket);

      expect(
        screen.getByText('predict.market_details.market_ended_on'),
      ).toBeOnTheScreen();
    });

    it('handles market without winning token', () => {
      const closedMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', price: 0.5 }, // No winning token
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(closedMarket);

      // Should not display winning outcome message
      expect(
        screen.queryByText('predict.market_details.market_ended_on'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Winning Outcome Logic', () => {
    it('finds winning outcome from multiple outcomes', () => {
      const marketWithWinningOutcome = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            tokens: [{ id: 'token-1', price: 0.3 }],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            tokens: [
              { id: 'token-2', price: 1.0 }, // Winning token
            ],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithWinningOutcome);

      expect(
        screen.getByText('predict.market_details.market_ended_on'),
      ).toBeOnTheScreen();
    });

    it('handles winning outcome with multiple tokens', () => {
      const marketWithMultipleTokens = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            groupItemTitle: 'Yes',
            tokens: [
              { id: 'token-1', price: 0.5 },
              { id: 'token-2', price: 1.0 }, // Winning token
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithMultipleTokens);

      expect(
        screen.getByText('predict.market_details.market_ended_on'),
      ).toBeOnTheScreen();
    });
  });

  describe('Additional Branch Coverage', () => {
    it('renders position icon when available', () => {
      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
        size: 100,
        initialValue: 65,
        currentValue: 70,
        avgPrice: 0.65,
        percentPnl: 7.7,
        icon: 'https://example.com/icon.png',
      };

      setupPredictMarketDetailsTest(
        { status: 'open' },
        {},
        { positions: { positions: [mockPosition] } },
      );

      // Switch to Positions tab (index 0 when positions exist)
      const positionsTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-0',
      );
      fireEvent.press(positionsTab);

      // Verify the position section renders with icon
      expect(screen.getByText('predict.cash_out')).toBeOnTheScreen();
    });

    it('handles chart color selection for single outcome', () => {
      const singleOutcomeMarket = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 0.65 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(singleOutcomeMarket);

      // Verify chart renders for single outcome
      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('handles chart color selection for multiple outcomes', () => {
      const multiOutcomeMarket = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            tokens: [{ id: 'token-1', price: 0.4 }],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            tokens: [{ id: 'token-2', price: 0.3 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(multiOutcomeMarket);

      // Verify chart renders for multiple outcomes
      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('handles outcome without tokens correctly', () => {
      const marketWithoutTokens = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            // No tokens property
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithoutTokens);

      expect(
        screen.getByText('Will Bitcoin reach $100k by end of 2024?'),
      ).toBeOnTheScreen();
    });

    it('handles fidelity selection for different timeframes', () => {
      setupPredictMarketDetailsTest();

      // Component should handle different fidelity settings based on timeframe
      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('handles empty price histories array', () => {
      setupPredictMarketDetailsTest(
        {},
        {},
        { priceHistory: { priceHistories: [] } },
      );

      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('handles errors in price history', () => {
      setupPredictMarketDetailsTest(
        {},
        {},
        { priceHistory: { errors: ['Network error'] } },
      );

      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('handles no balance scenario for Yes button', () => {
      const { usePredictBalance } = jest.requireMock(
        '../../hooks/usePredictBalance',
      );
      usePredictBalance.mockReturnValue({
        hasNoBalance: true,
      });

      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 0.65 }],
            volume: 1000000,
          },
        ],
      });

      const { mockNavigate } =
        setupPredictMarketDetailsTest(singleOutcomeMarket);

      const yesButton = screen.getByText(
        /predict\.market_details\.yes\s*•\s*65¢/,
      );
      fireEvent.press(yesButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
      });
    });

    it('handles no balance scenario for No button', () => {
      const { usePredictBalance } = jest.requireMock(
        '../../hooks/usePredictBalance',
      );
      usePredictBalance.mockReturnValue({
        hasNoBalance: true,
      });

      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', price: 0.65 },
              { id: 'token-2', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      const { mockNavigate } =
        setupPredictMarketDetailsTest(singleOutcomeMarket);

      const noButton = screen.getByText(
        /predict\.market_details\.no\s*•\s*35¢/,
      );
      fireEvent.press(noButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
      });
    });

    it('navigates to unavailable modal when user is not eligible - Yes button', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 0.65 }],
            volume: 1000000,
          },
        ],
      });

      const { mockNavigate } = setupPredictMarketDetailsTest(
        singleOutcomeMarket,
        {},
        { eligibility: { isEligible: false } },
      );

      const yesButton = screen.getByText(
        /predict\.market_details\.yes\s*•\s*65¢/,
      );
      fireEvent.press(yesButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
    });

    it('navigates to unavailable modal when user is not eligible - No button', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', price: 0.65 },
              { id: 'token-2', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      const { mockNavigate } = setupPredictMarketDetailsTest(
        singleOutcomeMarket,
        {},
        { eligibility: { isEligible: false } },
      );

      const noButton = screen.getByText(
        /predict\.market_details\.no\s*•\s*35¢/,
      );
      fireEvent.press(noButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
    });

    it('checks eligibility before balance for Yes button', () => {
      const { usePredictBalance } = jest.requireMock(
        '../../hooks/usePredictBalance',
      );
      usePredictBalance.mockReturnValue({
        hasNoBalance: true,
      });

      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 0.65 }],
            volume: 1000000,
          },
        ],
      });

      const { mockNavigate } = setupPredictMarketDetailsTest(
        singleOutcomeMarket,
        {},
        { eligibility: { isEligible: false } },
      );

      const yesButton = screen.getByText(
        /predict\.market_details\.yes\s*•\s*65¢/,
      );
      fireEvent.press(yesButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.ROOT,
        {
          screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
        },
      );
    });

    it('checks eligibility before balance for No button', () => {
      const { usePredictBalance } = jest.requireMock(
        '../../hooks/usePredictBalance',
      );
      usePredictBalance.mockReturnValue({
        hasNoBalance: true,
      });

      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', price: 0.65 },
              { id: 'token-2', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      const { mockNavigate } = setupPredictMarketDetailsTest(
        singleOutcomeMarket,
        {},
        { eligibility: { isEligible: false } },
      );

      const noButton = screen.getByText(
        /predict\.market_details\.no\s*•\s*35¢/,
      );
      fireEvent.press(noButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.ROOT,
        {
          screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
        },
      );
    });
  });

  describe('Closed Market Tab Selection', () => {
    it('defaults to Outcomes tab when market is closed and no tab is selected', () => {
      const closedMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 't1', price: 1 }],
            volume: 1,
          },
          {
            id: 'outcome-2',
            title: 'No',
            tokens: [{ id: 't2', price: 0 }],
            volume: 1,
          },
        ],
      });

      setupPredictMarketDetailsTest(closedMarket);

      expect(
        screen.getAllByTestId('predict-market-outcome').length,
      ).toBeGreaterThan(0);
    });

    it('keeps user-selected About tab on closed market', () => {
      const closedMarket = createMockMarket({
        status: 'closed',
      });

      setupPredictMarketDetailsTest(closedMarket);

      const aboutTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-1',
      );
      fireEvent.press(aboutTab);

      expect(
        screen.getByText('predict.market_details.volume'),
      ).toBeOnTheScreen();
    });

    it('resets to Outcomes when selected tab becomes invalid after tabs change on closed market', async () => {
      const closedMarket = createMockMarket({
        status: 'closed',
      });

      const { rerender } = setupPredictMarketDetailsTest(
        closedMarket,
        {},
        {
          positions: {
            positions: [
              {
                id: 'position-1',
                outcomeId: 'outcome-1',
                outcome: 'Yes',
                size: 1,
                initialValue: 1,
                currentValue: 1,
                avgPrice: 1,
                percentPnl: 0,
              },
            ],
          },
        },
      );

      const aboutTabWithPositions = screen.getByTestId(
        'predict-market-details-tab-bar-tab-2',
      );
      fireEvent.press(aboutTabWithPositions);

      const { usePredictPositions } = jest.requireMock(
        '../../hooks/usePredictPositions',
      );
      usePredictPositions.mockReturnValue({
        positions: [],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: jest.fn(),
      });

      rerender(<PredictMarketDetails />);

      await waitFor(() => {
        expect(
          screen.queryByText('predict.market_details.volume'),
        ).not.toBeOnTheScreen();
        expect(
          screen.getByTestId('predict-market-details-outcomes-tab'),
        ).toBeOnTheScreen();
      });
    });
  });

  describe('Multiple Open Outcomes Partially Resolved', () => {
    it('renders expandable resolved outcomes section when market has multiple outcomes with some resolved', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      expect(screen.getByText('predict.resolved_outcomes')).toBeOnTheScreen();
    });

    it('hides chart when multipleOpenOutcomesPartiallyResolved is true', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      expect(
        screen.queryByTestId('predict-details-chart'),
      ).not.toBeOnTheScreen();
    });

    it('displays resolved outcomes count badge', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      expect(screen.getByText('1')).toBeOnTheScreen();
    });

    it('expands to show closed outcomes when pressable is pressed', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A Long Title That Should Be Truncated',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      const arrowDownIcon = screen.getByTestId('icon-ArrowDown');
      const pressable = arrowDownIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);

        expect(
          screen.getByText('Option A Long Title That Should Be Truncated'),
        ).toBeOnTheScreen();
      }
    });

    it('displays groupItemTitle with truncation when expanded', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle:
              'Very Long Outcome Title That Exceeds One Line And Should Be Truncated',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      const arrowDownIcon = screen.getByTestId('icon-ArrowDown');
      const pressable = arrowDownIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);

        const groupItemTitle = screen.getByText(
          'Very Long Outcome Title That Exceeds One Line And Should Be Truncated',
        );
        expect(groupItemTitle).toBeOnTheScreen();
        expect(groupItemTitle.props.numberOfLines).toBe(1);
        expect(groupItemTitle.props.ellipsizeMode).toBe('tail');
      }
    });

    it('displays volume for closed outcomes when expanded', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      const arrowDownIcon = screen.getByTestId('icon-ArrowDown');
      const pressable = arrowDownIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);

        expect(screen.getByText(/1,000,000/)).toBeOnTheScreen();
        expect(
          screen.getByText(/predict\.volume_abbreviated/),
        ).toBeOnTheScreen();
      }
    });

    it('displays winning token title when token prices differ', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 0.8, title: 'Winner' },
              { id: 'token-2', price: 0.2, title: 'Loser' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      const arrowDownIcon = screen.getByTestId('icon-ArrowDown');
      const pressable = arrowDownIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);

        expect(screen.getByText('Winner')).toBeOnTheScreen();
      }
    });

    it('displays draw when token prices are equal', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 0.5, title: 'Token A' },
              { id: 'token-2', price: 0.5, title: 'Token B' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      const arrowDownIcon = screen.getByTestId('icon-ArrowDown');
      const pressable = arrowDownIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);

        expect(screen.getByText('draw')).toBeOnTheScreen();
      }
    });

    it('displays ArrowDown icon when collapsed', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      expect(screen.getByTestId('icon-ArrowDown')).toBeOnTheScreen();
    });

    it('displays ArrowUp icon when expanded', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      const arrowDownIcon = screen.getByTestId('icon-ArrowDown');
      const pressable = arrowDownIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);

        expect(screen.getByTestId('icon-ArrowUp')).toBeOnTheScreen();
      }
    });

    it('collapses when pressable is pressed again', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      const arrowDownIcon = screen.getByTestId('icon-ArrowDown');
      const pressable = arrowDownIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);
        expect(screen.getByText('Option A')).toBeOnTheScreen();

        const arrowUpIcon = screen.getByTestId('icon-ArrowUp');
        const pressableAgain = arrowUpIcon.parent?.parent;
        if (pressableAgain) {
          fireEvent.press(pressableAgain);
          expect(screen.queryByText('Option A')).not.toBeOnTheScreen();
          expect(screen.getByTestId('icon-ArrowDown')).toBeOnTheScreen();
        }
      }
    });

    it('displays open outcomes below resolved outcomes section', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      expect(screen.getByText('Option B')).toBeOnTheScreen();
    });

    it('handles multiple closed outcomes in expanded section', () => {
      const marketWithMultipleResolved = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won A' },
              { id: 'token-2', price: 0.0, title: 'Lost A' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-3', price: 0.7, title: 'Won B' },
              { id: 'token-4', price: 0.3, title: 'Lost B' },
            ],
            volume: 500000,
          },
          {
            id: 'outcome-3',
            title: 'Option C',
            groupItemTitle: 'Option C',
            status: 'open',
            tokens: [{ id: 'token-5', price: 0.5 }],
            volume: 300000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithMultipleResolved);

      expect(screen.getByText('2')).toBeOnTheScreen();

      const arrowDownIcon = screen.getByTestId('icon-ArrowDown');
      const pressable = arrowDownIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);

        expect(screen.getByText('Option A')).toBeOnTheScreen();
        expect(screen.getByText('Option B')).toBeOnTheScreen();
      }
    });

    it('does not render resolved outcomes section when market has no resolved outcomes', () => {
      const marketWithoutResolved = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'open',
            tokens: [{ id: 'token-1', price: 0.5 }],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-2', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithoutResolved);

      expect(
        screen.queryByText('predict.resolved_outcomes'),
      ).not.toBeOnTheScreen();
      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });
  });
});
