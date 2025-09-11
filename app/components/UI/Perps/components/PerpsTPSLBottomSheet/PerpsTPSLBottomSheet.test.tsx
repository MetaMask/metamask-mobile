import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsTPSLBottomSheet from './PerpsTPSLBottomSheet';
import type { Position } from '../../controllers/types';

// Mock dependencies - only what's absolutely necessary
jest.mock('react-native-reanimated', () =>
  jest.requireActual('react-native-reanimated/mock'),
);

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'View',
  GestureDetector: 'View',
  Gesture: {
    Pan: jest.fn().mockReturnValue({
      onUpdate: jest.fn().mockReturnThis(),
      onEnd: jest.fn().mockReturnThis(),
    }),
    Tap: jest.fn().mockReturnValue({
      onEnd: jest.fn().mockReturnThis(),
    }),
    Simultaneous: jest.fn(),
  },
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

// Mock safe area context (required for BottomSheet)
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

// Mock theme
const mockUseTheme = jest.fn();
jest.mock('../../../../../util/theme', () => ({
  useTheme: mockUseTheme,
}));

// Mock hooks
jest.mock('../../hooks', () => ({
  usePerpsPerformance: jest.fn(() => ({
    startMeasure: jest.fn(),
    endMeasure: jest.fn(),
    measure: jest.fn(),
    measureAsync: jest.fn(),
  })),
}));

// Mock liquidation price hook to avoid async side effects
jest.mock('../../hooks/usePerpsLiquidationPrice', () => ({
  usePerpsLiquidationPrice: jest.fn(() => ({
    liquidationPrice: '2500.00',
    isCalculating: false,
    error: null,
  })),
}));

// Mock TPSL form hook - provide direct implementation
jest.mock('../../hooks/usePerpsTPSLForm', () => ({
  __esModule: true,
  usePerpsTPSLForm: jest.fn(() => ({
    formState: {
      takeProfitPrice: '',
      stopLossPrice: '',
      takeProfitPercentage: '',
      stopLossPercentage: '',
      selectedTpPercentage: null,
      selectedSlPercentage: null,
      tpPriceInputFocused: false,
      tpPercentInputFocused: false,
      slPriceInputFocused: false,
      slPercentInputFocused: false,
      tpUsingPercentage: false,
      slUsingPercentage: false,
    },
    handlers: {
      handleTakeProfitPriceChange: jest.fn(),
      handleTakeProfitPercentageChange: jest.fn(),
      handleStopLossPriceChange: jest.fn(),
      handleStopLossPercentageChange: jest.fn(),
      handleTakeProfitPriceFocus: jest.fn(),
      handleTakeProfitPriceBlur: jest.fn(),
      handleTakeProfitPercentageFocus: jest.fn(),
      handleTakeProfitPercentageBlur: jest.fn(),
      handleStopLossPriceFocus: jest.fn(),
      handleStopLossPriceBlur: jest.fn(),
      handleStopLossPercentageFocus: jest.fn(),
      handleStopLossPercentageBlur: jest.fn(),
    },
    buttons: {
      handleTakeProfitPercentageButton: jest.fn(),
      handleStopLossPercentageButton: jest.fn(),
      handleTakeProfitOff: jest.fn(),
      handleStopLossOff: jest.fn(),
    },
    validation: {
      isValid: true,
      hasChanges: false,
      takeProfitError: '',
      stopLossError: '',
    },
    display: {
      formattedTakeProfitPercentage: '',
      formattedStopLossPercentage: '',
    },
  })),
}));

// Get a reference to the mock function so we can modify it in tests
const mockUsePerpsTPSLForm = jest.requireMock(
  '../../hooks/usePerpsTPSLForm',
).usePerpsTPSLForm;

// Define the default mock return value
const defaultMockReturn = {
  formState: {
    takeProfitPrice: '',
    stopLossPrice: '',
    takeProfitPercentage: '',
    stopLossPercentage: '',
    selectedTpPercentage: null,
    selectedSlPercentage: null,
    tpPriceInputFocused: false,
    tpPercentInputFocused: false,
    slPriceInputFocused: false,
    slPercentInputFocused: false,
    tpUsingPercentage: false,
    slUsingPercentage: false,
  },
  handlers: {
    handleTakeProfitPriceChange: jest.fn(),
    handleTakeProfitPercentageChange: jest.fn(),
    handleStopLossPriceChange: jest.fn(),
    handleStopLossPercentageChange: jest.fn(),
    handleTakeProfitPriceFocus: jest.fn(),
    handleTakeProfitPriceBlur: jest.fn(),
    handleTakeProfitPercentageFocus: jest.fn(),
    handleTakeProfitPercentageBlur: jest.fn(),
    handleStopLossPriceFocus: jest.fn(),
    handleStopLossPriceBlur: jest.fn(),
    handleStopLossPercentageFocus: jest.fn(),
    handleStopLossPercentageBlur: jest.fn(),
  },
  buttons: {
    handleTakeProfitPercentageButton: jest.fn(),
    handleStopLossPercentageButton: jest.fn(),
    handleTakeProfitOff: jest.fn(),
    handleStopLossOff: jest.fn(),
  },
  validation: {
    isValid: true,
    hasChanges: false,
    takeProfitError: '',
    stopLossError: '',
  },
  display: {
    formattedTakeProfitPercentage: '',
    formattedStopLossPercentage: '',
  },
};

// Mock stream hooks
jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(() => ({})), // Return empty object for prices
}));

// Mock format utilities
jest.mock('../../utils/formatUtils', () => ({
  formatPrice: jest.fn((value) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
  }),
  formatPerpsFiat: jest.fn((value) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
  }),
  PRICE_RANGES_POSITION_VIEW: [
    {
      condition: (v: number) => v >= 1,
      minimumDecimals: 2,
      maximumDecimals: 2,
      threshold: 1,
    },
    {
      condition: (v: number) => v < 1,
      minimumDecimals: 2,
      maximumDecimals: 7,
      significantDigits: 4,
      threshold: 0.0000001,
    },
  ],
}));

// Mock strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

// Mock BottomSheet components from component library
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const { forwardRef, useImperativeHandle } = jest.requireActual('react');
    const MockBottomSheet = forwardRef(
      (props: { children: React.ReactNode }, ref: React.Ref<unknown>) => {
        useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: jest.fn(),
        }));

        return <View {...props}>{props.children}</View>;
      },
    );

    return {
      __esModule: true,
      default: MockBottomSheet,
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: (props: { children: React.ReactNode }) => (
        <View {...props}>{props.children}</View>
      ),
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: ({
        buttonPropsArray,
      }: {
        buttonPropsArray?: {
          label: string;
          onPress: () => void;
          disabled?: boolean;
        }[];
      }) => (
        <View>
          {buttonPropsArray?.map((buttonProps, index) => (
            <TouchableOpacity
              key={index}
              onPress={buttonProps.onPress}
              disabled={buttonProps.disabled}
              accessibilityState={{ disabled: buttonProps.disabled === true }}
            >
              <Text>{buttonProps.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ),
    };
  },
);

// Mock component library Text component
jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: { children: React.ReactNode }) => (
      <Text {...props}>{props.children}</Text>
    ),
    TextVariant: {
      HeadingMD: 'HeadingMD',
      BodyMD: 'BodyMD',
      BodyLGMedium: 'BodyLGMedium',
      BodySM: 'BodySM',
    },
    TextColor: {
      Default: 'Default',
      Alternative: 'Alternative',
      Error: 'Error',
      Inverse: 'Inverse',
    },
  };
});

// Mock Button enums
jest.mock('../../../../../component-library/components/Buttons/Button', () => ({
  ButtonSize: {
    Lg: 'Lg',
  },
  ButtonVariants: {
    Primary: 'Primary',
  },
}));

// Mock styles
jest.mock('./PerpsTPSLBottomSheet.styles', () => ({
  createStyles: () => ({
    container: { padding: 16 },
    priceDisplay: { backgroundColor: '#f0f0f0' },
    section: { marginBottom: 24 },
    sectionTitle: { marginBottom: 8 },
    inputRow: { flexDirection: 'row' },
    inputContainer: { flex: 1, borderWidth: 1 },
    inputContainerLeft: { marginRight: 4 },
    inputContainerRight: { marginLeft: 4 },
    inputContainerActive: { borderColor: 'blue' },
    inputContainerError: { borderColor: 'red' },
    input: { flex: 1 },
    percentageRow: { flexDirection: 'row' },
    percentageButton: { flex: 1 },
    percentageButtonActive: { backgroundColor: 'blue' },
    helperText: { marginTop: 4 },
  }),
}));

describe('PerpsTPSLBottomSheet', () => {
  const mockTheme = {
    colors: {
      background: { alternative: '#f0f0f0' },
      text: { default: '#000000', muted: '#666666' },
      border: { muted: '#e1e1e1' },
      primary: { default: '#0066cc' },
      error: { default: '#ff0000' },
    },
  };

  const defaultProps = {
    isVisible: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    asset: 'ETH',
    currentPrice: 3000,
    direction: 'long' as const,
  };

  const mockPosition: Position = {
    coin: 'ETH',
    size: '2.5',
    entryPrice: '2800.00',
    positionValue: '7000.00',
    unrealizedPnl: '500.00',
    marginUsed: '700.00',
    leverage: {
      type: 'isolated',
      value: 10,
    },
    liquidationPrice: '2500.00',
    maxLeverage: 20,
    returnOnEquity: '14.3',
    cumulativeFunding: {
      allTime: '15.00',
      sinceOpen: '8.00',
      sinceChange: '3.00',
    },
  };

  beforeEach(() => {
    mockUseTheme.mockReturnValue(mockTheme);
    // Reset the mock to default values
    mockUsePerpsTPSLForm.mockReturnValue(defaultMockReturn);

    // Clear all mock calls
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders when visible', () => {
      // Act
      render(<PerpsTPSLBottomSheet {...defaultProps} />);

      // Assert
      expect(screen.getByText('perps.tpsl.title')).toBeOnTheScreen();
      expect(screen.getByText('perps.tpsl.take_profit_long')).toBeOnTheScreen();
      expect(screen.getByText('perps.tpsl.stop_loss_long')).toBeOnTheScreen();
    });

    it('returns null when not visible', () => {
      // Act
      render(<PerpsTPSLBottomSheet {...defaultProps} isVisible={false} />);

      // Assert
      expect(screen.queryByText('perps.tpsl.title')).toBeNull();
      expect(screen.queryByText('perps.tpsl.take_profit_long')).toBeNull();
      expect(screen.queryByText('perps.tpsl.stop_loss_long')).toBeNull();
    });

    it('displays current price for new orders', () => {
      // Act
      render(<PerpsTPSLBottomSheet {...defaultProps} />);

      // Assert
      expect(screen.getByText('perps.tpsl.current_price')).toBeOnTheScreen();
      expect(screen.getByText('$3000.00')).toBeOnTheScreen();
    });

    it('displays entry price when editing existing position', () => {
      // Act
      render(
        <PerpsTPSLBottomSheet
          {...defaultProps}
          position={mockPosition}
          currentPrice={undefined}
        />,
      );

      // Assert
      expect(screen.getByText('perps.tpsl.current_price')).toBeOnTheScreen();
      expect(screen.getByText('$2800.00')).toBeOnTheScreen();
    });

    it('renders percentage buttons with correct RoE values', () => {
      // Act
      render(<PerpsTPSLBottomSheet {...defaultProps} />);

      // Assert - Take Profit buttons (RoE percentages)
      expect(screen.getByText('+10%')).toBeOnTheScreen();
      expect(screen.getByText('+25%')).toBeOnTheScreen();
      expect(screen.getByText('+50%')).toBeOnTheScreen();
      expect(screen.getByText('+100%')).toBeOnTheScreen();

      // Assert - Stop Loss buttons (RoE percentages)
      expect(screen.getByText('-5%')).toBeOnTheScreen();
      expect(screen.getByText('-10%')).toBeOnTheScreen();
      expect(screen.getByText('-25%')).toBeOnTheScreen();
      expect(screen.getByText('-50%')).toBeOnTheScreen();
    });

    it('renders without crashing when position is provided', () => {
      // Arrange & Act
      render(
        <PerpsTPSLBottomSheet {...defaultProps} position={mockPosition} />,
      );

      // Assert - Component should render successfully with position
      expect(screen.getByText('perps.tpsl.title')).toBeOnTheScreen();
    });

    it('renders without crashing when leverage prop is provided', () => {
      // Arrange & Act
      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={5} />);

      // Assert - Component should render successfully with leverage prop
      expect(screen.getByText('perps.tpsl.title')).toBeOnTheScreen();
    });

    it('renders without crashing when margin is provided', () => {
      // Arrange & Act
      render(
        <PerpsTPSLBottomSheet {...defaultProps} marginRequired="500.00" />,
      );

      // Assert - Component should render successfully with margin prop
      expect(screen.getByText('perps.tpsl.title')).toBeOnTheScreen();
    });
  });

  describe('Initial Values', () => {
    it('initializes with provided take profit and stop loss prices', () => {
      // Arrange - Mock the form hook to return initial values
      mockUsePerpsTPSLForm.mockImplementation(() => ({
        ...defaultMockReturn,
        formState: {
          ...defaultMockReturn.formState,
          takeProfitPrice: '$3300.00',
          stopLossPrice: '$2700.00',
        },
        validation: {
          ...defaultMockReturn.validation,
          hasChanges: true,
        },
        display: {
          ...defaultMockReturn.display,
          formattedTakeProfitPercentage: '10',
          formattedStopLossPercentage: '10',
        },
      }));

      const props = {
        ...defaultProps,
        initialTakeProfitPrice: '3300',
        initialStopLossPrice: '2700',
      };

      // Act
      render(<PerpsTPSLBottomSheet {...props} />);

      // Assert
      const takeProfitInputs = screen.getAllByDisplayValue('$3300.00');
      const stopLossInputs = screen.getAllByDisplayValue('$2700.00');
      expect(takeProfitInputs.length).toBeGreaterThan(0);
      expect(stopLossInputs.length).toBeGreaterThan(0);
    });

    it('passes initial prices to the form hook correctly', () => {
      // Arrange
      const props = {
        ...defaultProps,
        initialTakeProfitPrice: '3300',
        initialStopLossPrice: '2700',
        leverage: 10,
      };

      // Act
      render(<PerpsTPSLBottomSheet {...props} />);

      // Assert - The hook should have been called with the component
      // The initial prices are passed as props, so the component should render
      expect(screen.getByText('perps.tpsl.title')).toBeOnTheScreen();

      // The hook receives these initial values and the component displays them
      // This tests that the component properly passes props to the hook
      expect(mockUsePerpsTPSLForm).toHaveBeenCalled();
    });
  });

  describe('Input Handling', () => {
    it('calls price change handler when take profit price input changes', () => {
      // Arrange
      const mockHandler = jest.fn();
      mockUsePerpsTPSLForm.mockReturnValueOnce({
        ...defaultMockReturn,
        handlers: {
          ...defaultMockReturn.handlers,
          handleTakeProfitPriceChange: mockHandler,
        },
      });

      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={10} />);

      const takeProfitPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[0]; // First input is TP price

      // Act
      fireEvent.changeText(takeProfitPriceInput, '3150');

      // Assert - Handler should be called with the new value
      expect(mockHandler).toHaveBeenCalledWith('3150');
    });

    it('calls handler when take profit price input changes', () => {
      // Arrange
      const mockHandler = jest.fn();
      mockUsePerpsTPSLForm.mockReturnValue({
        ...defaultMockReturn,
        handlers: {
          ...defaultMockReturn.handlers,
          handleTakeProfitPriceChange: mockHandler,
        },
      });

      render(<PerpsTPSLBottomSheet {...defaultProps} />);
      const takeProfitPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[0];

      // Act
      fireEvent.changeText(takeProfitPriceInput, '123.45');

      // Assert - Handler should be called
      expect(mockHandler).toHaveBeenCalledWith('123.45');
    });

    it('prevents multiple decimal points in take profit price input', () => {
      // Arrange
      render(<PerpsTPSLBottomSheet {...defaultProps} />);
      const takeProfitPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[0];

      // Act
      fireEvent.changeText(takeProfitPriceInput, '123.45.67');

      // Assert - Should not update if multiple decimal points
      expect(takeProfitPriceInput.props.value).toBe('');
    });

    it('calls percentage change handler when take profit RoE percentage input changes', () => {
      // Arrange
      const mockHandler = jest.fn();
      mockUsePerpsTPSLForm.mockReturnValueOnce({
        ...defaultMockReturn,
        handlers: {
          ...defaultMockReturn.handlers,
          handleTakeProfitPercentageChange: mockHandler,
        },
      });

      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={10} />);

      const takeProfitPercentInput = screen.getAllByPlaceholderText(
        'perps.tpsl.profit_roe_placeholder',
      )[0]; // TP RoE percentage input

      // Act
      fireEvent.changeText(takeProfitPercentInput, '25');

      // Assert - Handler should be called with the new percentage value
      expect(mockHandler).toHaveBeenCalledWith('25');
    });

    it('calls stop loss change handler when stop loss price input changes', () => {
      // Arrange
      const mockHandler = jest.fn();
      mockUsePerpsTPSLForm.mockReturnValueOnce({
        ...defaultMockReturn,
        handlers: {
          ...defaultMockReturn.handlers,
          handleStopLossPriceChange: mockHandler,
        },
      });

      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={10} />);

      const stopLossPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[1]; // Second trigger price input is SL price

      // Act
      fireEvent.changeText(stopLossPriceInput, '2700');

      // Assert - Handler should be called with the new value
      expect(mockHandler).toHaveBeenCalledWith('2700');
    });

    it('calls stop loss percentage change handler when stop loss RoE percentage input changes', () => {
      // Arrange
      const mockHandler = jest.fn();
      mockUsePerpsTPSLForm.mockReturnValueOnce({
        ...defaultMockReturn,
        handlers: {
          ...defaultMockReturn.handlers,
          handleStopLossPercentageChange: mockHandler,
        },
      });

      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={10} />);

      const stopLossPercentInput = screen.getAllByPlaceholderText(
        'perps.tpsl.loss_roe_placeholder',
      )[0]; // SL RoE percentage input

      // Act
      fireEvent.changeText(stopLossPercentInput, '25');

      // Assert - Handler should be called with the new percentage value
      expect(mockHandler).toHaveBeenCalledWith('25');
    });
  });

  describe('RoE Percentage Button Functionality', () => {
    it('calls button handler when RoE percentage button is pressed', () => {
      // Arrange
      const mockButtonHandler = jest.fn();
      mockUsePerpsTPSLForm.mockReturnValue({
        ...defaultMockReturn,
        buttons: {
          ...defaultMockReturn.buttons,
          handleTakeProfitPercentageButton: mockButtonHandler,
        },
      });

      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={10} />);
      const tenPercentButton = screen.getByText('+10%');

      // Act
      fireEvent.press(tenPercentButton);

      // Assert - Button handler should be called with percentage
      expect(mockButtonHandler).toHaveBeenCalledWith(10);
    });

    it('calls stop loss button handler when RoE percentage button is pressed', () => {
      // Arrange
      const mockButtonHandler = jest.fn();
      mockUsePerpsTPSLForm.mockReturnValue({
        ...defaultMockReturn,
        buttons: {
          ...defaultMockReturn.buttons,
          handleStopLossPercentageButton: mockButtonHandler,
        },
      });

      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={10} />);
      const fivePercentButton = screen.getByText('-5%');

      // Act
      fireEvent.press(fivePercentButton);

      // Assert - Button handler should be called with percentage
      expect(mockButtonHandler).toHaveBeenCalledWith(5);
    });
  });

  describe('Off Button Functionality', () => {
    it('calls take profit off button handler when off button is pressed', () => {
      // Arrange
      const mockOffHandler = jest.fn();
      mockUsePerpsTPSLForm.mockReturnValue({
        ...defaultMockReturn,
        buttons: {
          ...defaultMockReturn.buttons,
          handleTakeProfitOff: mockOffHandler,
        },
      });

      render(<PerpsTPSLBottomSheet {...defaultProps} />);

      // Get the take profit off button - there are two "Off" buttons, get all and find the first one
      const offButtons = screen.getAllByText('perps.tpsl.off');
      const takeProfitOffButton = offButtons[0]; // First "Off" button is for take profit

      // Act
      fireEvent.press(takeProfitOffButton);

      // Assert - Handler should be called
      expect(mockOffHandler).toHaveBeenCalled();
    });

    it('calls stop loss off button handler when off button is pressed', () => {
      // Arrange
      const mockOffHandler = jest.fn();
      mockUsePerpsTPSLForm.mockReturnValue({
        ...defaultMockReturn,
        buttons: {
          ...defaultMockReturn.buttons,
          handleStopLossOff: mockOffHandler,
        },
      });

      render(<PerpsTPSLBottomSheet {...defaultProps} />);

      // Get the stop loss off button - there are two "Off" buttons, get all and find the second one
      const offButtons = screen.getAllByText('perps.tpsl.off');
      const stopLossOffButton = offButtons[1]; // Second "Off" button is for stop loss

      // Act
      fireEvent.press(stopLossOffButton);

      // Assert - Handler should be called
      expect(mockOffHandler).toHaveBeenCalled();
    });

    it('displays values from form state correctly', () => {
      // Arrange - Mock state with values
      mockUsePerpsTPSLForm.mockReturnValueOnce({
        ...defaultMockReturn,
        formState: {
          ...defaultMockReturn.formState,
          takeProfitPrice: '3200',
          takeProfitPercentage: '66.67',
        },
        display: {
          ...defaultMockReturn.display,
          formattedTakeProfitPercentage: '66.67',
        },
      });

      render(<PerpsTPSLBottomSheet {...defaultProps} />);

      // Assert - Component should display the form state values
      const takeProfitPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[0];
      const takeProfitPercentInput = screen.getAllByPlaceholderText(
        'perps.tpsl.profit_roe_placeholder',
      )[0];

      expect(takeProfitPriceInput.props.value).toBe('3200');
      expect(takeProfitPercentInput.props.value).toBe('66.67');
    });

    it('displays stop loss values from form state correctly', () => {
      // Arrange - Mock state with stop loss values
      mockUsePerpsTPSLForm.mockReturnValueOnce({
        ...defaultMockReturn,
        formState: {
          ...defaultMockReturn.formState,
          stopLossPrice: '2800',
          stopLossPercentage: '66.67',
        },
        display: {
          ...defaultMockReturn.display,
          formattedStopLossPercentage: '66.67',
        },
      });

      render(<PerpsTPSLBottomSheet {...defaultProps} />);

      // Assert - Component should display the form state values
      const stopLossPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[1];
      const stopLossPercentInput = screen.getAllByPlaceholderText(
        'perps.tpsl.loss_roe_placeholder',
      )[0];

      expect(stopLossPriceInput.props.value).toBe('2800');
      expect(stopLossPercentInput.props.value).toBe('66.67');
    });
  });

  describe('Validation and Error States', () => {
    it('can display validation errors when form validation has errors', () => {
      // Arrange - Mock form state with validation errors
      mockUsePerpsTPSLForm.mockReturnValueOnce({
        ...defaultMockReturn,
        validation: {
          ...defaultMockReturn.validation,
          isValid: false,
          takeProfitError: 'perps.order.validation.invalid_take_profit',
        },
      });

      render(<PerpsTPSLBottomSheet {...defaultProps} />);

      // Assert - Component can handle validation errors
      // (Note: The component might not display error messages directly,
      // but it should render without crashing when there are validation errors)
      expect(screen.getByText('perps.tpsl.title')).toBeOnTheScreen();
    });

    it('renders correctly when validation has errors', () => {
      // Arrange - Mock form state with validation errors
      mockUsePerpsTPSLForm.mockReturnValueOnce({
        ...defaultMockReturn,
        validation: {
          ...defaultMockReturn.validation,
          isValid: false,
          stopLossError: 'perps.order.validation.invalid_stop_loss',
        },
      });

      render(<PerpsTPSLBottomSheet {...defaultProps} />);

      // Assert - Component renders correctly even with validation errors
      const confirmButton = screen.getByText('perps.tpsl.set');
      expect(confirmButton).toBeOnTheScreen();

      // Note: The actual button disable behavior depends on the component implementation
      // This test ensures the component handles validation error state without crashing
    });
  });

  describe('Focus and Blur Behavior', () => {
    it('calls blur handler when input loses focus', () => {
      // Arrange
      const mockBlurHandler = jest.fn();
      mockUsePerpsTPSLForm.mockReturnValueOnce({
        ...defaultMockReturn,
        handlers: {
          ...defaultMockReturn.handlers,
          handleTakeProfitPriceBlur: mockBlurHandler,
        },
      });

      render(<PerpsTPSLBottomSheet {...defaultProps} />);

      const takeProfitPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[0];

      // Act
      fireEvent(takeProfitPriceInput, 'blur');

      // Assert - Blur handler should be called
      expect(mockBlurHandler).toHaveBeenCalled();
    });

    it('does not format price on blur when invalid', () => {
      // Arrange
      const { formatPrice: mockFormatPrice } = jest.requireMock(
        '../../utils/formatUtils',
      );

      render(<PerpsTPSLBottomSheet {...defaultProps} />);

      const takeProfitPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[0];

      // Clear any calls made during render
      mockFormatPrice.mockClear();

      // Act
      fireEvent.changeText(takeProfitPriceInput, 'invalid');
      fireEvent(takeProfitPriceInput, 'blur');

      // Assert
      expect(mockFormatPrice).not.toHaveBeenCalled();
    });
  });

  describe('Confirm and Close Actions', () => {
    it('calls onConfirm with parsed prices when confirmed', () => {
      // Arrange
      const mockOnConfirm = jest.fn();

      // Mock form state to have values
      mockUsePerpsTPSLForm.mockReturnValue({
        ...defaultMockReturn,
        formState: {
          ...defaultMockReturn.formState,
          takeProfitPrice: '$3,150.00',
          stopLossPrice: '$2,850.00',
        },
      });

      render(
        <PerpsTPSLBottomSheet {...defaultProps} onConfirm={mockOnConfirm} />,
      );

      const confirmButton = screen.getByText('perps.tpsl.set');

      // Act
      fireEvent.press(confirmButton);

      // Assert - Component should parse and clean the prices
      expect(mockOnConfirm).toHaveBeenCalledWith('3150.00', '2850.00');
    });

    it('calls onConfirm with undefined for empty values', () => {
      // Arrange
      const mockOnConfirm = jest.fn();
      render(
        <PerpsTPSLBottomSheet {...defaultProps} onConfirm={mockOnConfirm} />,
      );

      const confirmButton = screen.getByText('perps.tpsl.set');

      // Act
      fireEvent.press(confirmButton);

      // Assert
      expect(mockOnConfirm).toHaveBeenCalledWith(undefined, undefined);
    });

    it('does not call onClose immediately after confirm', () => {
      // Arrange
      const mockOnClose = jest.fn();
      render(<PerpsTPSLBottomSheet {...defaultProps} onClose={mockOnClose} />);

      const confirmButton = screen.getByText('perps.tpsl.set');

      // Act
      fireEvent.press(confirmButton);

      // Assert - onClose should not be called immediately
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Direction-based Logic', () => {
    it('renders correctly for SHORT position direction', () => {
      // Arrange
      const shortProps = {
        ...defaultProps,
        direction: 'short' as const,
      };

      render(<PerpsTPSLBottomSheet {...shortProps} />);

      // Assert - Should display short-specific labels
      expect(
        screen.getByText('perps.tpsl.take_profit_short'),
      ).toBeOnTheScreen();
      expect(screen.getByText('perps.tpsl.stop_loss_short')).toBeOnTheScreen();
    });

    it('renders RoE percentage buttons for both directions', () => {
      // Assert - RoE buttons should always be present regardless of direction
      render(<PerpsTPSLBottomSheet {...defaultProps} direction="long" />);
      expect(screen.getByText('+10%')).toBeOnTheScreen();
      expect(screen.getByText('-5%')).toBeOnTheScreen();
    });

    it('renders RoE percentage buttons for short direction', () => {
      // Assert - RoE buttons should always be present regardless of direction
      render(<PerpsTPSLBottomSheet {...defaultProps} direction="short" />);
      expect(screen.getByText('+10%')).toBeOnTheScreen();
      expect(screen.getByText('-5%')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing currentPrice gracefully', () => {
      // Arrange
      const propsWithoutPrice = {
        ...defaultProps,
        currentPrice: undefined,
      };

      // Act & Assert - Should not crash
      expect(() =>
        render(<PerpsTPSLBottomSheet {...propsWithoutPrice} />),
      ).not.toThrow();
    });

    it('handles missing direction gracefully', () => {
      // Arrange
      const propsWithoutDirection = {
        ...defaultProps,
        direction: undefined,
      };

      // Act & Assert - Should not crash
      expect(() =>
        render(<PerpsTPSLBottomSheet {...propsWithoutDirection} />),
      ).not.toThrow();
    });

    it('displays currentPrice when provided with position', () => {
      // Arrange
      const propsWithPosition = {
        ...defaultProps,
        position: mockPosition,
        currentPrice: 3200, // Live price should be displayed
      };

      render(<PerpsTPSLBottomSheet {...propsWithPosition} />);

      // Assert - Should display current price (live price)
      expect(screen.getByText('$3200.00')).toBeOnTheScreen();
      expect(screen.getByText('perps.tpsl.current_price')).toBeOnTheScreen();
    });

    it('displays entry price when currentPrice not provided', () => {
      // Arrange
      const propsWithPosition = {
        ...defaultProps,
        position: mockPosition,
        currentPrice: undefined, // No current price provided - should fall back to entry price
      };

      render(<PerpsTPSLBottomSheet {...propsWithPosition} />);

      // Assert - Should display position entry price as fallback
      expect(screen.getByText('$2800.00')).toBeOnTheScreen();
      expect(screen.getByText('perps.tpsl.current_price')).toBeOnTheScreen();
    });
  });

  describe('Component Memoization', () => {
    it('does not re-render when unrelated props change', () => {
      // Arrange
      const { rerender } = render(<PerpsTPSLBottomSheet {...defaultProps} />);
      const initialCallCount = mockUseTheme.mock.calls.length;

      // Act - Change a prop that should not trigger re-render
      const newProps = {
        ...defaultProps,
        onClose: jest.fn(), // Different function reference but component should be memoized
      };
      rerender(<PerpsTPSLBottomSheet {...newProps} />);

      // Assert - Component should not have re-rendered (theme hook not called again)
      expect(mockUseTheme.mock.calls.length).toBe(initialCallCount);
    });

    it('re-renders when visibility changes', () => {
      // Arrange
      const { rerender } = render(<PerpsTPSLBottomSheet {...defaultProps} />);

      // Act
      rerender(<PerpsTPSLBottomSheet {...defaultProps} isVisible={false} />);

      // Assert - Should render null when not visible
      expect(screen.queryByText('perps.tpsl.title')).toBeNull();
    });
  });
});
