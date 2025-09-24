import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import PredictMarketDetails from './PredictMarketDetails';
import { getNavigationOptionsTitle } from '../../../Navbar';
import { formatPrice } from '../../utils/format';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 32,
        gap: 16,
      },
      headerContainer: {
        alignItems: 'center',
        marginBottom: 32,
      },
      button: {
        width: '100%',
      },
    },
  })),
}));

const mockUseTheme = jest.fn(() => ({
  colors: {
    background: {
      default: '#ffffff',
    },
    text: {
      default: '#121314',
    },
  },
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: mockUseTheme,
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../../Base/ScreenView', () => {
  const { View } = jest.requireActual('react-native');
  return function MockScreenView({ children }: { children: React.ReactNode }) {
    return <View testID="screen-view">{children}</View>;
  };
});

jest.mock('../../../Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(() => ({})),
}));

jest.mock('../../utils/format', () => ({
  formatPrice: jest.fn(
    (value: number, options?: { maximumDecimals?: number }) =>
      `$${value.toFixed(options?.maximumDecimals || 2)}`,
  ),
}));

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: Text,
    TextVariant: {
      HeadingLG: 'HeadingLG',
      BodyMD: 'BodyMD',
    },
    TextColor: {
      Alternative: 'Alternative',
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
    }: {
      onPress: () => void;
      label: string;
      variant: string;
      style: object;
      children: React.ReactNode;
    }) {
      return (
        <TouchableOpacity
          onPress={onPress}
          testID="cash-out-button"
          style={style}
        >
          <Text>{children}</Text>
        </TouchableOpacity>
      );
    },
    ButtonVariants: {
      Primary: 'Primary',
    },
  };
});

// Helper function to create mock position
function createMockPosition(overrides = {}) {
  return {
    id: 'position-1',
    marketId: 'market-1',
    outcomeId: 'outcome-1',
    title: 'Will Bitcoin reach $100k by end of 2024?',
    outcome: 'Yes',
    currentValue: 150.75,
    size: 100,
    price: 0.65,
    cashPnl: 25.5,
    percentPnl: 20.4,
    initialValue: 125.25,
    avgPrice: 0.625,
    ...overrides,
  };
}

// Helper function to setup test environment
function setupPredictMarketDetailsTest(
  positionOverrides = {},
  routeOverrides = {},
) {
  jest.clearAllMocks();

  const mockNavigate = jest.fn();
  const mockSetOptions = jest.fn();
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;
  const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;

  const mockPosition = createMockPosition(positionOverrides);

  const mockRoute = {
    key: 'PredictMarketDetails',
    name: 'PredictMarketDetails' as const,
    params: {
      position: mockPosition,
    },
    ...routeOverrides,
  };

  mockUseNavigation.mockReturnValue({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
  } as unknown as NavigationProp<ParamListBase>);

  mockUseRoute.mockReturnValue(mockRoute);

  const result = render(<PredictMarketDetails />);

  return {
    ...result,
    mockNavigate,
    mockSetOptions,
    mockPosition,
    mockRoute,
  };
}

describe('PredictMarketDetails', () => {
  describe('Component Rendering', () => {
    it('renders the component with correct structure', () => {
      setupPredictMarketDetailsTest();

      expect(screen.getByTestId('screen-view')).toBeOnTheScreen();
      expect(screen.getByText('Market Detail')).toBeOnTheScreen();
      expect(screen.getByText('Cash Out')).toBeOnTheScreen();
    });

    it('displays position title correctly', () => {
      const { mockPosition } = setupPredictMarketDetailsTest();

      expect(screen.getByText(mockPosition.title)).toBeOnTheScreen();
    });

    it('displays position outcome correctly', () => {
      const { mockPosition } = setupPredictMarketDetailsTest();

      expect(
        screen.getByText(`Outcome: ${mockPosition.outcome}`),
      ).toBeOnTheScreen();
    });

    it('displays current value with proper formatting', () => {
      setupPredictMarketDetailsTest();

      expect(screen.getByText('Current Value: $150.75')).toBeOnTheScreen();
    });

    it('renders cash out button with correct properties', () => {
      setupPredictMarketDetailsTest();

      const cashOutButton = screen.getByTestId('cash-out-button');
      expect(cashOutButton).toBeOnTheScreen();
      expect(screen.getByText('Cash Out')).toBeOnTheScreen();
    });
  });

  describe('Navigation Setup', () => {
    it('sets navigation options on mount', () => {
      const { mockSetOptions } = setupPredictMarketDetailsTest();

      expect(mockSetOptions).toHaveBeenCalledWith({});
    });

    it('calls getNavigationOptionsTitle with correct parameters', () => {
      setupPredictMarketDetailsTest();

      expect(getNavigationOptionsTitle).toHaveBeenCalledWith(
        'predict.title',
        expect.any(Object),
        false,
        expect.any(Object),
      );
    });
  });

  describe('Cash Out Functionality', () => {
    it('navigates to cash out modal when cash out button is pressed', () => {
      const { mockNavigate, mockPosition } = setupPredictMarketDetailsTest();

      const cashOutButton = screen.getByTestId('cash-out-button');
      fireEvent.press(cashOutButton);

      expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
        screen: 'PredictCashOut',
        params: { position: mockPosition },
      });
    });

    it('passes correct position data to cash out modal', () => {
      const { mockNavigate, mockPosition } = setupPredictMarketDetailsTest();

      const cashOutButton = screen.getByTestId('cash-out-button');
      fireEvent.press(cashOutButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        'PredictModals',
        expect.objectContaining({
          params: { position: mockPosition },
        }),
      );
    });
  });

  describe('Data Display', () => {
    it('displays all position information correctly', () => {
      const { mockPosition } = setupPredictMarketDetailsTest();

      expect(screen.getByText('Market Detail')).toBeOnTheScreen();
      expect(screen.getByText(mockPosition.title)).toBeOnTheScreen();
      expect(
        screen.getByText(`Outcome: ${mockPosition.outcome}`),
      ).toBeOnTheScreen();
      expect(screen.getByText('Current Value: $150.75')).toBeOnTheScreen();
    });

    it('formats price with correct decimal places', () => {
      const { mockPosition } = setupPredictMarketDetailsTest();

      expect(formatPrice).toHaveBeenCalledWith(mockPosition.currentValue, {
        maximumDecimals: 2,
      });
    });

    it('handles different position data correctly', () => {
      const { mockPosition: differentPosition } = setupPredictMarketDetailsTest(
        {
          title: 'Will Ethereum reach $10k?',
          outcome: 'No',
          currentValue: 75.25,
        },
      );

      expect(screen.getByText(differentPosition.title)).toBeOnTheScreen();
      expect(
        screen.getByText(`Outcome: ${differentPosition.outcome}`),
      ).toBeOnTheScreen();
      expect(screen.getByText('Current Value: $75.25')).toBeOnTheScreen();
    });
  });

  describe('Component Props and Styling', () => {
    it('applies correct styles to content container', () => {
      setupPredictMarketDetailsTest();

      expect(useStyles).toHaveBeenCalledWith(expect.any(Function), {});
    });

    it('renders with proper text variants', () => {
      setupPredictMarketDetailsTest();

      const headingText = screen.getByText('Market Detail');
      const outcomeText = screen.getByText('Outcome: Yes');
      const currentValueText = screen.getByText('Current Value: $150.75');

      expect(headingText).toBeOnTheScreen();
      expect(outcomeText).toBeOnTheScreen();
      expect(currentValueText).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles position with zero current value', () => {
      setupPredictMarketDetailsTest({
        currentValue: 0,
      });

      expect(screen.getByText('Current Value: $0.00')).toBeOnTheScreen();
    });

    it('handles position with very large current value', () => {
      setupPredictMarketDetailsTest({
        currentValue: 999999.999,
      });

      expect(screen.getByText('Current Value: $1000000.00')).toBeOnTheScreen();
    });

    it('handles position with empty title', () => {
      setupPredictMarketDetailsTest({
        title: '',
      });

      expect(screen.getByText('Outcome: Yes')).toBeOnTheScreen();
      expect(screen.getByText('Current Value: $150.75')).toBeOnTheScreen();
    });

    it('handles position with special characters in outcome', () => {
      setupPredictMarketDetailsTest({
        outcome: 'Yes/No',
      });

      expect(screen.getByText('Outcome: Yes/No')).toBeOnTheScreen();
    });
  });

  describe('Component Integration', () => {
    it('integrates with ScreenView component', () => {
      setupPredictMarketDetailsTest();

      expect(screen.getByTestId('screen-view')).toBeOnTheScreen();
    });

    it('integrates with internationalization', () => {
      setupPredictMarketDetailsTest();

      expect(strings).toHaveBeenCalledWith('predict.title');
    });
  });

  describe('Button Interaction', () => {
    it('button is pressable and responds to touch events', () => {
      const { mockNavigate } = setupPredictMarketDetailsTest();

      const cashOutButton = screen.getByTestId('cash-out-button');

      expect(cashOutButton).toBeOnTheScreen();

      fireEvent.press(cashOutButton);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('button maintains state after press', () => {
      setupPredictMarketDetailsTest();

      const cashOutButton = screen.getByTestId('cash-out-button');

      fireEvent.press(cashOutButton);

      expect(cashOutButton).toBeOnTheScreen();
      expect(screen.getByText('Cash Out')).toBeOnTheScreen();
    });
  });
});
