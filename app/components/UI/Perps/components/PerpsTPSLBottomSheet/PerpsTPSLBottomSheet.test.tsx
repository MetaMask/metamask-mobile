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
}));

// Mock validation utilities
jest.mock('../../utils/tpslValidation', () => ({
  isValidTakeProfitPrice: jest.fn(),
  isValidStopLossPrice: jest.fn(),
  validateTPSLPrices: jest.fn(),
  getTakeProfitErrorDirection: jest.fn(),
  getStopLossErrorDirection: jest.fn(),
  calculatePriceForPercentage: jest.fn(),
  calculatePercentageForPrice: jest.fn(),
  hasTPSLValuesChanged: jest.fn(),
  calculatePriceForRoE: jest.fn(),
  calculateRoEForPrice: jest.fn(),
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
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);

    // Default mock implementations - reset the mocked functions from the modules
    const tpslValidation = jest.requireMock('../../utils/tpslValidation');
    tpslValidation.isValidTakeProfitPrice.mockReturnValue(true);
    tpslValidation.isValidStopLossPrice.mockReturnValue(true);
    tpslValidation.validateTPSLPrices.mockReturnValue(true);
    tpslValidation.getTakeProfitErrorDirection.mockReturnValue('above');
    tpslValidation.getStopLossErrorDirection.mockReturnValue('below');
    tpslValidation.calculatePriceForPercentage.mockReturnValue('3150.00');
    tpslValidation.calculatePercentageForPrice.mockReturnValue('5.00');
    tpslValidation.hasTPSLValuesChanged.mockReturnValue(true);
    tpslValidation.calculatePriceForRoE.mockReturnValue('3150.00');
    tpslValidation.calculateRoEForPrice.mockReturnValue('5.00');
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

    it('displays leverage from position when available', () => {
      // Act
      render(
        <PerpsTPSLBottomSheet {...defaultProps} position={mockPosition} />,
      );

      // Assert
      expect(screen.getByText('10x')).toBeOnTheScreen();
    });

    it('displays leverage from prop for new orders', () => {
      // Act
      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={5} />);

      // Assert
      expect(screen.getByText('5x')).toBeOnTheScreen();
    });

    it('displays margin when provided', () => {
      // Act
      render(
        <PerpsTPSLBottomSheet {...defaultProps} marginRequired="500.00" />,
      );

      // Assert - formatPrice should format the margin value
      expect(screen.getByText('$500.00')).toBeOnTheScreen();
    });
  });

  describe('Initial Values', () => {
    it('initializes with provided take profit and stop loss prices', () => {
      // Arrange
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

    it('calculates initial RoE percentages when opening with prices', () => {
      // Arrange
      const tpslValidation = jest.requireMock('../../utils/tpslValidation');
      tpslValidation.calculateRoEForPrice
        .mockReturnValueOnce('25.00') // TP RoE
        .mockReturnValueOnce('15.00'); // SL RoE (absolute value)

      const props = {
        ...defaultProps,
        initialTakeProfitPrice: '3300',
        initialStopLossPrice: '2700',
        leverage: 10,
      };

      // Act
      render(<PerpsTPSLBottomSheet {...props} />);

      // Assert - Should call RoE calculation functions for initial prices
      expect(tpslValidation.calculateRoEForPrice).toHaveBeenCalledWith(
        '3300',
        true,
        expect.objectContaining({
          currentPrice: 3000,
          direction: 'long',
          leverage: 10,
        }),
      );
      expect(tpslValidation.calculateRoEForPrice).toHaveBeenCalledWith(
        '2700',
        false,
        expect.objectContaining({
          currentPrice: 3000,
          direction: 'long',
          leverage: 10,
        }),
      );
    });
  });

  describe('Input Handling', () => {
    it('handles take profit price input changes', () => {
      // Arrange
      const tpslValidation = jest.requireMock('../../utils/tpslValidation');
      tpslValidation.calculateRoEForPrice.mockReturnValue('5.00');
      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={10} />);

      const takeProfitPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[0]; // First input is TP price

      // Act
      fireEvent.changeText(takeProfitPriceInput, '3150');

      // Assert
      expect(takeProfitPriceInput.props.value).toBe('3150');
      expect(tpslValidation.calculateRoEForPrice).toHaveBeenCalledWith(
        '3150',
        true,
        expect.objectContaining({
          currentPrice: 3000,
          direction: 'long',
          leverage: 10,
        }),
      );
    });

    it('sanitizes take profit price input to numbers and decimal only', () => {
      // Arrange
      render(<PerpsTPSLBottomSheet {...defaultProps} />);
      const takeProfitPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[0];

      // Act
      fireEvent.changeText(takeProfitPriceInput, 'abc123.45def');

      // Assert
      expect(takeProfitPriceInput.props.value).toBe('123.45');
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

    it('handles take profit RoE percentage input changes', () => {
      // Arrange
      const tpslValidation = jest.requireMock('../../utils/tpslValidation');
      tpslValidation.calculatePriceForRoE.mockReturnValue('3150.00');
      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={10} />);

      const takeProfitPercentInput = screen.getAllByPlaceholderText(
        'perps.tpsl.profit_roe_placeholder',
      )[0]; // TP RoE percentage input

      // Act
      fireEvent.changeText(takeProfitPercentInput, '25');

      // Assert
      expect(takeProfitPercentInput.props.value).toBe('25');
      expect(tpslValidation.calculatePriceForRoE).toHaveBeenCalledWith(
        25,
        true,
        expect.objectContaining({
          currentPrice: 3000,
          direction: 'long',
          leverage: 10,
        }),
      );
    });

    it('handles stop loss price input changes', () => {
      // Arrange
      const tpslValidation = jest.requireMock('../../utils/tpslValidation');
      tpslValidation.calculateRoEForPrice.mockReturnValue('-10.00');
      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={10} />);

      const stopLossPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[1]; // Second trigger price input is SL price

      // Act
      fireEvent.changeText(stopLossPriceInput, '2700');

      // Assert
      expect(stopLossPriceInput.props.value).toBe('2700');
      expect(tpslValidation.calculateRoEForPrice).toHaveBeenCalledWith(
        '2700',
        false,
        expect.objectContaining({
          currentPrice: 3000,
          direction: 'long',
          leverage: 10,
        }),
      );
    });

    it('handles stop loss RoE percentage input changes', () => {
      // Arrange
      const tpslValidation = jest.requireMock('../../utils/tpslValidation');
      tpslValidation.calculatePriceForRoE.mockReturnValue('2700.00');
      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={10} />);

      const stopLossPercentInput = screen.getAllByPlaceholderText(
        'perps.tpsl.loss_roe_placeholder',
      )[0]; // SL RoE percentage input

      // Act
      fireEvent.changeText(stopLossPercentInput, '25');

      // Assert
      expect(stopLossPercentInput.props.value).toBe('25');
      expect(tpslValidation.calculatePriceForRoE).toHaveBeenCalledWith(
        -25, // Negative because it's a loss
        false,
        expect.objectContaining({
          currentPrice: 3000,
          direction: 'long',
          leverage: 10,
        }),
      );
    });
  });

  describe('RoE Percentage Button Functionality', () => {
    it('sets take profit price when RoE percentage button is pressed', () => {
      // Arrange
      const tpslValidation = jest.requireMock('../../utils/tpslValidation');
      tpslValidation.calculatePriceForRoE.mockReturnValue('3150.00');
      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={10} />);

      const tenPercentButton = screen.getByText('+10%');

      // Act
      fireEvent.press(tenPercentButton);

      // Assert
      expect(tpslValidation.calculatePriceForRoE).toHaveBeenCalledWith(
        10,
        true,
        expect.objectContaining({
          currentPrice: 3000,
          direction: 'long',
          leverage: 10,
        }),
      );
    });

    it('sets stop loss price when RoE percentage button is pressed', () => {
      // Arrange
      const tpslValidation = jest.requireMock('../../utils/tpslValidation');
      tpslValidation.calculatePriceForRoE.mockReturnValue('2850.00');
      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={10} />);

      const fivePercentButton = screen.getByText('-5%');

      // Act
      fireEvent.press(fivePercentButton);

      // Assert
      expect(tpslValidation.calculatePriceForRoE).toHaveBeenCalledWith(
        -5, // Negative RoE for stop loss
        false,
        expect.objectContaining({
          currentPrice: 3000,
          direction: 'long',
          leverage: 10,
        }),
      );
    });
  });

  describe('Off Button Functionality', () => {
    it('clears take profit values when take profit off button is pressed', () => {
      // Arrange
      const tpslValidation = jest.requireMock('../../utils/tpslValidation');
      tpslValidation.calculatePriceForRoE.mockReturnValue('3150.00');
      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={10} />);

      // First set some take profit values using new RoE button
      const tenPercentButton = screen.getByText('+10%');
      fireEvent.press(tenPercentButton);

      // Get the take profit input to verify it has a value initially
      const takeProfitPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[0];
      const takeProfitPercentInput = screen.getAllByPlaceholderText(
        'perps.tpsl.profit_roe_placeholder',
      )[0];

      // Verify values are set before pressing off
      expect(takeProfitPriceInput.props.value).toBe('$3150.00');
      expect(takeProfitPercentInput.props.value).toBe('10');

      // Get the take profit off button - there are two "Off" buttons, get all and find the first one
      const offButtons = screen.getAllByText('perps.tpsl.off');
      const takeProfitOffButton = offButtons[0]; // First "Off" button is for take profit

      // Act
      fireEvent.press(takeProfitOffButton);

      // Assert
      expect(takeProfitPriceInput.props.value).toBe('');
      expect(takeProfitPercentInput.props.value).toBe('');
    });

    it('clears stop loss values when stop loss off button is pressed', () => {
      // Arrange
      const tpslValidation = jest.requireMock('../../utils/tpslValidation');
      tpslValidation.calculatePriceForRoE.mockReturnValue('2850.00');
      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={10} />);

      // First set some stop loss values using new RoE button
      const fivePercentButton = screen.getByText('-5%');
      fireEvent.press(fivePercentButton);

      // Get the stop loss input to verify it has a value initially
      const stopLossPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[1];
      const stopLossPercentInput = screen.getAllByPlaceholderText(
        'perps.tpsl.loss_roe_placeholder',
      )[0];

      // Verify values are set before pressing off
      expect(stopLossPriceInput.props.value).toBe('$2850.00');
      expect(stopLossPercentInput.props.value).toBe('5');

      // Get the stop loss off button - there are two "Off" buttons, get all and find the second one
      const offButtons = screen.getAllByText('perps.tpsl.off');
      const stopLossOffButton = offButtons[1]; // Second "Off" button is for stop loss

      // Act
      fireEvent.press(stopLossOffButton);

      // Assert
      expect(stopLossPriceInput.props.value).toBe('');
      expect(stopLossPercentInput.props.value).toBe('');
    });

    it('resets take profit state when off button is pressed after manual input', () => {
      // Arrange
      const tpslValidation = jest.requireMock('../../utils/tpslValidation');
      // Make the RoE calculation return a realistic value for 3200 price
      tpslValidation.calculateRoEForPrice.mockReturnValue('66.67');

      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={10} />);

      // First manually enter take profit values
      const takeProfitPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[0];
      const takeProfitPercentInput = screen.getAllByPlaceholderText(
        'perps.tpsl.profit_roe_placeholder',
      )[0];

      fireEvent.changeText(takeProfitPriceInput, '3200');

      // After entering price, the component calculates RoE percentage and updates display
      // The price input will show the raw input until blur, percentage will show calculated value
      expect(takeProfitPriceInput.props.value).toBe('3200');
      expect(takeProfitPercentInput.props.value).toBe('66.67');

      // Get the take profit off button
      const offButtons = screen.getAllByText('perps.tpsl.off');
      const takeProfitOffButton = offButtons[0];

      // Act
      fireEvent.press(takeProfitOffButton);

      // Assert
      expect(takeProfitPriceInput.props.value).toBe('');
      expect(takeProfitPercentInput.props.value).toBe('');
    });

    it('resets stop loss state when off button is pressed after manual input', () => {
      // Arrange
      const tpslValidation = jest.requireMock('../../utils/tpslValidation');
      // Make the RoE calculation return a realistic value for 2800 price
      tpslValidation.calculateRoEForPrice.mockReturnValue('-66.67');

      render(<PerpsTPSLBottomSheet {...defaultProps} leverage={10} />);

      // First manually enter stop loss values
      const stopLossPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[1];
      const stopLossPercentInput = screen.getAllByPlaceholderText(
        'perps.tpsl.loss_roe_placeholder',
      )[0];

      fireEvent.changeText(stopLossPriceInput, '2800');

      // After entering price, the component calculates RoE percentage and updates display
      expect(stopLossPriceInput.props.value).toBe('2800');
      expect(stopLossPercentInput.props.value).toBe('66.67'); // Should show as positive (absolute value)

      // Get the stop loss off button
      const offButtons = screen.getAllByText('perps.tpsl.off');
      const stopLossOffButton = offButtons[1];

      // Act
      fireEvent.press(stopLossOffButton);

      // Assert
      expect(stopLossPriceInput.props.value).toBe('');
      expect(stopLossPercentInput.props.value).toBe('');
    });
  });

  describe('Validation and Error States', () => {
    it('shows error styling when take profit price is invalid', () => {
      // Arrange
      const tpslValidation = jest.requireMock('../../utils/tpslValidation');
      tpslValidation.isValidTakeProfitPrice.mockReturnValue(false);
      tpslValidation.getTakeProfitErrorDirection.mockReturnValue('above');

      render(<PerpsTPSLBottomSheet {...defaultProps} />);

      const takeProfitPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[0];

      // Act
      fireEvent.changeText(takeProfitPriceInput, '2500');

      // Assert - Should show error message
      expect(
        screen.getByText('perps.order.validation.invalid_take_profit'),
      ).toBeOnTheScreen();
    });

    it('shows error styling when stop loss price is invalid', () => {
      // Arrange
      const tpslValidation = jest.requireMock('../../utils/tpslValidation');
      tpslValidation.isValidStopLossPrice.mockReturnValue(false);
      tpslValidation.getStopLossErrorDirection.mockReturnValue('below');

      render(<PerpsTPSLBottomSheet {...defaultProps} />);

      const stopLossPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[1];

      // Act
      fireEvent.changeText(stopLossPriceInput, '3500');

      // Assert - Should show error message
      expect(
        screen.getByText('perps.order.validation.invalid_stop_loss'),
      ).toBeOnTheScreen();
    });
  });

  describe('Focus and Blur Behavior', () => {
    it('formats price on blur when valid', () => {
      // Arrange
      const { formatPrice } = jest.requireMock('../../utils/formatUtils');
      formatPrice.mockReturnValue('$3150.00');

      render(<PerpsTPSLBottomSheet {...defaultProps} />);

      const takeProfitPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[0];

      // Act
      fireEvent.changeText(takeProfitPriceInput, '3150');
      fireEvent(takeProfitPriceInput, 'blur');

      // Assert
      expect(formatPrice).toHaveBeenCalledWith('3150');
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
      render(
        <PerpsTPSLBottomSheet {...defaultProps} onConfirm={mockOnConfirm} />,
      );

      // Set some values first
      const takeProfitPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[0];
      const stopLossPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[1];

      fireEvent.changeText(takeProfitPriceInput, '$3,150.00');
      fireEvent.changeText(stopLossPriceInput, '$2,850.00');

      const confirmButton = screen.getByText('perps.tpsl.set');

      // Act
      fireEvent.press(confirmButton);

      // Assert
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
    it('handles SHORT position direction', () => {
      // Arrange
      const tpslValidation = jest.requireMock('../../utils/tpslValidation');
      tpslValidation.calculateRoEForPrice.mockReturnValue('15.00');

      const shortProps = {
        ...defaultProps,
        direction: 'short' as const,
        leverage: 10,
      };

      render(<PerpsTPSLBottomSheet {...shortProps} />);

      const takeProfitPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[0];

      // Act
      fireEvent.changeText(takeProfitPriceInput, '2850');

      // Assert
      expect(tpslValidation.calculateRoEForPrice).toHaveBeenCalledWith(
        '2850',
        true,
        expect.objectContaining({
          currentPrice: 3000,
          direction: 'short',
          leverage: 10,
        }),
      );
    });

    it.each(['long', 'short'] as const)(
      'handles %s direction for RoE percentage calculations',
      (direction) => {
        // Arrange
        const props = {
          ...defaultProps,
          direction,
          leverage: 10,
        };

        render(<PerpsTPSLBottomSheet {...props} />);

        // TP RoE buttons always show positive values regardless of direction
        const tenPercentButton = screen.getByText('+10%');

        // Act
        fireEvent.press(tenPercentButton);

        // Assert
        const tpslValidation = jest.requireMock('../../utils/tpslValidation');
        expect(tpslValidation.calculatePriceForRoE).toHaveBeenCalledWith(
          10,
          true,
          expect.objectContaining({
            currentPrice: 3000,
            direction,
            leverage: 10,
          }),
        );
      },
    );
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

    it('uses currentPrice when provided, falls back to entry price', () => {
      // Arrange
      const tpslValidation = jest.requireMock('../../utils/tpslValidation');
      tpslValidation.calculateRoEForPrice.mockReturnValue('-75.00');

      const propsWithPosition = {
        ...defaultProps,
        position: mockPosition,
        currentPrice: 3200, // This will be used (live price)
      };

      render(<PerpsTPSLBottomSheet {...propsWithPosition} />);

      const takeProfitPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[0];

      // Act
      fireEvent.changeText(takeProfitPriceInput, '2950');

      // Assert - Should use currentPrice (3200) when provided
      expect(tpslValidation.calculateRoEForPrice).toHaveBeenCalledWith(
        '2950',
        true,
        expect.objectContaining({
          currentPrice: 3200,
          direction: 'long',
          leverage: 10,
        }),
      );
    });

    it('uses position entry price when currentPrice not provided', () => {
      // Arrange
      const tpslValidation = jest.requireMock('../../utils/tpslValidation');
      tpslValidation.calculateRoEForPrice.mockReturnValue('53.57');

      const propsWithPosition = {
        ...defaultProps,
        position: mockPosition,
        currentPrice: undefined, // No current price provided
      };

      render(<PerpsTPSLBottomSheet {...propsWithPosition} />);

      const takeProfitPriceInput = screen.getAllByPlaceholderText(
        'perps.tpsl.trigger_price_placeholder',
      )[0];

      // Act
      fireEvent.changeText(takeProfitPriceInput, '2950');

      // Assert - Should fall back to position.entryPrice (2800)
      expect(tpslValidation.calculateRoEForPrice).toHaveBeenCalledWith(
        '2950',
        true,
        expect.objectContaining({
          currentPrice: 2800,
          direction: 'long',
          leverage: 10,
          entryPrice: 2800,
        }),
      );
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
