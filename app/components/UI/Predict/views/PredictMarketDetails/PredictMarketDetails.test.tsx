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
  hookOverrides: { market?: object; priceHistory?: object } = {},
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
});
