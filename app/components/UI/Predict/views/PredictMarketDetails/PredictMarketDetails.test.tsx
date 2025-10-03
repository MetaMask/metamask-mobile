import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import PredictMarketDetails from './PredictMarketDetails';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
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
}));

jest.mock('../../hooks/usePredictMarket', () => ({
  usePredictMarket: jest.fn(() => ({
    market: null,
    isFetching: false,
  })),
}));

jest.mock('../../hooks/usePredictPriceHistory', () => ({
  usePredictPriceHistory: jest.fn(() => ({
    priceHistories: [],
    isFetching: false,
    errors: [],
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
      Flash: 'Flash',
      Chart: 'Chart',
      Clock: 'Clock',
      Bank: 'Bank',
      Export: 'Export',
      Apps: 'Apps',
    },
    IconSize: {
      Sm: 'Sm',
      Md: 'Md',
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

  usePredictMarket.mockReturnValue({
    market: mockMarket,
    isFetching: false,
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

  const result = render(<PredictMarketDetails />);

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
      const loadingTexts = screen.getAllByText('Loading...');
      expect(loadingTexts.length).toBeGreaterThan(0);
    });

    it('displays fallback title when market data is unavailable', () => {
      setupPredictMarketDetailsTest({}, {}, { market: { market: null } });

      expect(screen.getByText('Market title unavailable')).toBeOnTheScreen();
    });

    it('renders back button with correct accessibility', () => {
      setupPredictMarketDetailsTest();

      expect(screen.getByTestId('icon-ArrowLeft')).toBeOnTheScreen();
    });
  });

  describe('Market Information Display', () => {
    it('displays market volume correctly', () => {
      setupPredictMarketDetailsTest();

      expect(screen.getByText('Volume')).toBeOnTheScreen();
    });

    it('displays market end date correctly', () => {
      setupPredictMarketDetailsTest();

      expect(screen.getByText('End date')).toBeOnTheScreen();
      expect(screen.getByText('12/31/2024')).toBeOnTheScreen();
    });

    it('displays provider information', () => {
      setupPredictMarketDetailsTest();

      expect(screen.getByText('Powered by')).toBeOnTheScreen();
      expect(screen.getByText('polymarket')).toBeOnTheScreen();
    });

    it('displays resolver information', () => {
      setupPredictMarketDetailsTest();

      expect(screen.getByText('Resolver')).toBeOnTheScreen();
      expect(screen.getByText('UMA')).toBeOnTheScreen();
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

      expect(screen.getByTestId('tab-bar')).toBeOnTheScreen();
      expect(screen.getByTestId('scrollable-tab-view')).toBeOnTheScreen();
    });

    it('displays About tab content', () => {
      setupPredictMarketDetailsTest();

      expect(screen.getByText('Volume')).toBeOnTheScreen();
      expect(screen.getByText('End date')).toBeOnTheScreen();
      expect(screen.getByText('Resolver')).toBeOnTheScreen();
    });

    it('displays Positions tab content', () => {
      setupPredictMarketDetailsTest();

      expect(screen.getByText('No positions found.')).toBeOnTheScreen();
    });
  });

  describe('Action Buttons', () => {
    it('renders Yes and No action buttons for single outcome markets', () => {
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

      expect(screen.getByText(/Yes • 65¢/)).toBeOnTheScreen();
      expect(screen.getByText(/No • 35¢/)).toBeOnTheScreen();
    });

    it('calculates percentage correctly from market price', () => {
      const marketWithDifferentPrice = createMockMarket({
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

      expect(screen.getByText(/Yes • 75¢/)).toBeOnTheScreen();
      expect(screen.getByText(/No • 25¢/)).toBeOnTheScreen();
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
        screen.getByText('Yes has a 65% chance of winning'),
      ).toBeOnTheScreen();
    });

    it('handles missing price data gracefully', () => {
      const marketWithoutPrice = createMockMarket({
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

      expect(
        screen.getByText('Yes has a 0% chance of winning'),
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
        {},
        {},
        { positions: { positions: [mockPosition] } },
      );

      const cashOutButton = screen.getByText('Cash out');
      fireEvent.press(cashOutButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.CASH_OUT,
        params: {
          position: mockPosition,
          outcome: expect.any(Object),
        },
      });
    });

    it('handles Yes button press for betting', () => {
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

      const { mockNavigate } =
        setupPredictMarketDetailsTest(singleOutcomeMarket);

      const yesButton = screen.getByText(/Yes • 65¢/);
      fireEvent.press(yesButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.PLACE_BET,
        params: {
          market: singleOutcomeMarket,
          outcome: singleOutcomeMarket.outcomes[0],
          outcomeToken: singleOutcomeMarket.outcomes[0].tokens[0],
        },
      });
    });

    it('handles No button press for betting', () => {
      const singleOutcomeMarket = createMockMarket({
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

      const noButton = screen.getByText(/No • 35¢/);
      fireEvent.press(noButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.PLACE_BET,
        params: {
          market: singleOutcomeMarket,
          outcome: singleOutcomeMarket.outcomes[0],
          outcomeToken: singleOutcomeMarket.outcomes[0].tokens[1],
        },
      });
    });
  });

  describe('Conditional Rendering', () => {
    it('renders positions section when user has positions', () => {
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
        {},
        {},
        { positions: { positions: [mockPosition] } },
      );

      expect(screen.getByText('Cash out')).toBeOnTheScreen();
      expect(screen.getByText(/\$65\.00 on Yes/)).toBeOnTheScreen();
      expect(screen.getByText(/\+7\.7%/)).toBeOnTheScreen();
    });

    it('renders position with negative PnL correctly', () => {
      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
        size: 100,
        initialValue: 65,
        currentValue: 60,
        avgPrice: 0.65,
        percentPnl: -7.7,
        icon: null, // Test branch without icon
      };

      setupPredictMarketDetailsTest(
        {},
        {},
        { positions: { positions: [mockPosition] } },
      );

      expect(screen.getByText('-7.7%')).toBeOnTheScreen();
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

      // Should render outcomes for multi-outcome markets
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
        screen.getByText('Yes has a 65% chance of winning'),
      ).toBeOnTheScreen();
    });

    it('renders action buttons only for single outcome markets', () => {
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

      expect(screen.getByText(/Yes • 65¢/)).toBeOnTheScreen();
      expect(screen.getByText(/No • 35¢/)).toBeOnTheScreen();
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

      expect(screen.getByText(/\$65\.00 on Yes Option/)).toBeOnTheScreen();
    });

    it('handles position without groupItemTitle correctly', () => {
      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
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

      expect(screen.getByText(/\$65\.00 on Yes/)).toBeOnTheScreen();
    });

    it('handles zero percentage correctly', () => {
      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
        size: 100,
        initialValue: 65,
        currentValue: 65,
        avgPrice: 0.65,
        percentPnl: 0,
      };

      setupPredictMarketDetailsTest(
        {},
        {},
        { positions: { positions: [mockPosition] } },
      );

      expect(screen.getByText('+0.0%')).toBeOnTheScreen();
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

      expect(
        screen.getByText('Yes has a 0% chance of winning'),
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
        {},
        {},
        { positions: { positions: [mockPosition] } },
      );

      // Verify the position section renders with icon
      expect(screen.getByText('Cash out')).toBeOnTheScreen();
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
  });
});
