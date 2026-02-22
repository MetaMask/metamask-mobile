import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import PerpsTPSLView from './PerpsTPSLView';
import type { Position } from '../../controllers/types';
import { PERPS_EVENT_VALUE } from '../../constants/eventNames';

// Mock dependencies
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

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    SafeAreaView: jest
      .fn()
      .mockImplementation(({ children, ...props }) => (
        <View {...props}>{children}</View>
      )),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

const mockUseTheme = jest.fn();
jest.mock('../../../../../util/theme', () => ({
  useTheme: mockUseTheme,
}));

jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(() => ({})),
}));

jest.mock('../../hooks/usePerpsLiquidationPrice', () => ({
  usePerpsLiquidationPrice: jest.fn(() => ({
    liquidationPrice: '2500.00',
    isCalculating: false,
    error: null,
  })),
}));

jest.mock('../../utils/formatUtils', () => ({
  formatPrice: jest.fn((value) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num)
      ? '$0.00'
      : `$${num.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
  }),
  formatPerpsFiat: jest.fn((value) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num)
      ? '$0.00'
      : `$${num.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
  }),
  PRICE_RANGES_UNIVERSAL: {},
  PRICE_RANGES_MINIMAL_VIEW: {},
}));

jest.mock('../../hooks/usePerpsTPSLForm', () => ({
  __esModule: true,
  usePerpsTPSLForm: jest.fn(),
}));

const mockUsePerpsTPSLForm = jest.requireMock(
  '../../hooks/usePerpsTPSLForm',
).usePerpsTPSLForm;

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  canGoBack: jest.fn(() => true),
};

let mockRouteParams: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    params: mockRouteParams,
    key: 'test-route',
    name: 'PerpsTPSL',
  }),
  useIsFocused: () => true,
}));

jest.mock('./PerpsTPSLView.styles', () => ({
  createStyles: () => ({
    container: {},
    section: {},
    inputRow: {},
    keypadContainer: {},
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

describe('PerpsTPSLView', () => {
  const mockTheme = {
    colors: {
      background: { alternative: '#f0f0f0' },
      text: { default: '#000', muted: '#666', alternative: '#888' },
      border: { muted: '#e1e1e1' },
      primary: { default: '#0376c9' },
      error: { default: '#d73847' },
    },
  };

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
      stopLossLiquidationError: '',
    },
    display: {
      formattedTakeProfitPercentage: '',
      formattedStopLossPercentage: '',
      expectedTakeProfitPnL: '',
      expectedStopLossPnL: '',
    },
  };

  const defaultRouteParams = {
    currentPrice: 3000,
    symbol: 'ETH',
    direction: 'long',
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);
    mockUsePerpsTPSLForm.mockReturnValue(defaultMockReturn);
    mockRouteParams = { ...defaultRouteParams };
  });

  // ==================== Test Helpers ====================

  const renderView = (overrides = {}) => {
    mockUsePerpsTPSLForm.mockReturnValue({
      ...defaultMockReturn,
      ...overrides,
    });
    return render(<PerpsTPSLView />);
  };

  const getTakeProfitPriceInput = () =>
    screen.getAllByPlaceholderText('perps.tpsl.trigger_price_placeholder')[0];

  const getTakeProfitPercentageInput = () =>
    screen.getByPlaceholderText('perps.tpsl.profit_roe_placeholder');

  const getStopLossPriceInput = () =>
    screen.getAllByPlaceholderText('perps.tpsl.trigger_price_placeholder')[1];

  const getStopLossPercentageInput = () =>
    screen.getByPlaceholderText('perps.tpsl.loss_roe_placeholder');

  // ==================== User Interactions ====================

  describe('User Interactions', () => {
    it.each([
      [
        'take profit price',
        () => getTakeProfitPriceInput(),
        'handleTakeProfitPriceChange',
      ],
      [
        'stop loss price',
        () => getStopLossPriceInput(),
        'handleStopLossPriceChange',
      ],
    ])(
      'calls %s handler when user types',
      (_description, getInput, handlerName) => {
        const mockHandler = jest.fn();
        renderView({
          handlers: {
            ...defaultMockReturn.handlers,
            [handlerName]: mockHandler,
          },
        });

        fireEvent.changeText(getInput(), '123.45');

        expect(mockHandler).toHaveBeenCalledWith('123.45');
      },
    );

    it('calls take profit clear handler when Clear button pressed', () => {
      const mockHandler = jest.fn();
      renderView({
        formState: {
          ...defaultMockReturn.formState,
          takeProfitPrice: '3150',
        },
        buttons: {
          ...defaultMockReturn.buttons,
          handleTakeProfitOff: mockHandler,
        },
      });

      const clearButtons = screen.getAllByText('perps.tpsl.clear');
      fireEvent.press(clearButtons[0]);

      expect(mockHandler).toHaveBeenCalled();
    });

    it('dismisses keyboard before clearing take profit when input is focused', () => {
      const mockHandler = jest.fn();
      renderView({
        formState: {
          ...defaultMockReturn.formState,
          takeProfitPrice: '3150',
        },
        buttons: {
          ...defaultMockReturn.buttons,
          handleTakeProfitOff: mockHandler,
        },
      });

      // Focus the input first to set internal focusedInput state
      const takeProfitInput = getTakeProfitPriceInput();
      fireEvent(takeProfitInput, 'focus');

      // Now press clear
      const clearButtons = screen.getAllByText('perps.tpsl.clear');
      fireEvent.press(clearButtons[0]);

      expect(mockHandler).toHaveBeenCalled();
    });

    it('dismisses keyboard before clearing stop loss when input is focused', () => {
      const mockHandler = jest.fn();
      renderView({
        formState: {
          ...defaultMockReturn.formState,
          stopLossPrice: '2850',
        },
        buttons: {
          ...defaultMockReturn.buttons,
          handleStopLossOff: mockHandler,
        },
      });

      // Focus the input first to set internal focusedInput state
      const stopLossInput = getStopLossPriceInput();
      fireEvent(stopLossInput, 'focus');

      // Now press clear
      const clearButtons = screen.getAllByText('perps.tpsl.clear');
      fireEvent.press(clearButtons[0]);

      expect(mockHandler).toHaveBeenCalled();
    });

    it('does not show Clear button when no value is set', () => {
      renderView({
        formState: {
          ...defaultMockReturn.formState,
          takeProfitPrice: '',
          stopLossPrice: '',
        },
      });

      expect(screen.queryByText('perps.tpsl.clear')).toBeNull();
    });

    it.each([
      [
        'take profit price',
        () => getTakeProfitPriceInput(),
        'handleTakeProfitPriceChange',
      ],
      [
        'take profit percentage',
        () => getTakeProfitPercentageInput(),
        'handleTakeProfitPercentageChange',
      ],
      [
        'stop loss price',
        () => getStopLossPriceInput(),
        'handleStopLossPriceChange',
      ],
      [
        'stop loss percentage',
        () => getStopLossPercentageInput(),
        'handleStopLossPercentageChange',
      ],
    ])(
      'prevents %s input exceeding 9 digits',
      (_description, getInput, handlerName) => {
        const mockHandler = jest.fn();
        renderView({
          handlers: {
            ...defaultMockReturn.handlers,
            [handlerName]: mockHandler,
          },
        });

        fireEvent.changeText(getInput(), '1234567890');

        expect(mockHandler).not.toHaveBeenCalled();
      },
    );

    it.each([
      [
        'take profit price',
        () => getTakeProfitPriceInput(),
        'handleTakeProfitPriceFocus',
        'handleTakeProfitPriceBlur',
      ],
      [
        'take profit percentage',
        () => getTakeProfitPercentageInput(),
        'handleTakeProfitPercentageFocus',
        'handleTakeProfitPercentageBlur',
      ],
      [
        'stop loss price',
        () => getStopLossPriceInput(),
        'handleStopLossPriceFocus',
        'handleStopLossPriceBlur',
      ],
      [
        'stop loss percentage',
        () => getStopLossPercentageInput(),
        'handleStopLossPercentageFocus',
        'handleStopLossPercentageBlur',
      ],
    ])(
      'handles focus and blur events for %s input',
      (_description, getInput, focusHandler, blurHandler) => {
        const mockFocusHandler = jest.fn();
        const mockBlurHandler = jest.fn();
        renderView({
          handlers: {
            ...defaultMockReturn.handlers,
            [focusHandler]: mockFocusHandler,
            [blurHandler]: mockBlurHandler,
          },
        });

        fireEvent(getInput(), 'focus');
        fireEvent(getInput(), 'blur');

        expect(mockFocusHandler).toHaveBeenCalled();
        expect(mockBlurHandler).toHaveBeenCalled();
      },
    );
  });

  // ==================== Display Hook Data ====================

  describe('Display Hook Data', () => {
    it('displays validation errors from hook', () => {
      renderView({
        validation: {
          ...defaultMockReturn.validation,
          isValid: false,
          takeProfitError: 'perps.order.validation.take_profit_below_entry',
        },
      });

      expect(
        screen.getByText('perps.order.validation.take_profit_below_entry'),
      ).toBeOnTheScreen();
    });

    it('displays stop loss liquidation error for long positions', () => {
      renderView({
        validation: {
          ...defaultMockReturn.validation,
          isValid: false,
          stopLossLiquidationError:
            'perps.order.validation.stop_loss_liquidation_long',
        },
      });

      expect(
        screen.getByText('perps.order.validation.stop_loss_liquidation_long'),
      ).toBeOnTheScreen();
    });

    it('displays formatted prices from hook', () => {
      renderView({
        formState: {
          ...defaultMockReturn.formState,
          takeProfitPrice: '$3,150.00',
          stopLossPrice: '$2,850.00',
        },
      });

      expect(getTakeProfitPriceInput().props.value).toBe('$3,150.00');
      expect(getStopLossPriceInput().props.value).toBe('$2,850.00');
    });
  });

  // ==================== Navigation and Actions ====================

  describe('Navigation and Actions', () => {
    it('navigates back when back button pressed', () => {
      renderView();

      const backButton = screen.getByTestId('back-button');
      fireEvent.press(backButton);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('calls onConfirm with hook values when Set button pressed', async () => {
      const mockOnConfirm = jest.fn().mockResolvedValue(undefined);
      mockRouteParams = { ...defaultRouteParams, onConfirm: mockOnConfirm };
      renderView({
        formState: {
          ...defaultMockReturn.formState,
          takeProfitPrice: '$3,150.00',
          stopLossPrice: '$2,850.00',
        },
      });

      const setButton = screen.getByText('perps.tpsl.set');
      await act(async () => {
        fireEvent.press(setButton);
      });

      expect(mockOnConfirm).toHaveBeenCalledWith('3150.00', '2850.00', {
        direction: 'long',
        source: PERPS_EVENT_VALUE.RISK_MANAGEMENT_SOURCE.TRADE_SCREEN,
        positionSize: 0,
        takeProfitPercentage: undefined,
        stopLossPercentage: undefined,
        isEditingExistingPosition: false,
        entryPrice: 3000,
      });
    });

    it('calls onConfirm with undefined when values are empty', async () => {
      const mockOnConfirm = jest.fn().mockResolvedValue(undefined);
      mockRouteParams = { ...defaultRouteParams, onConfirm: mockOnConfirm };
      renderView();

      const setButton = screen.getByText('perps.tpsl.set');
      await act(async () => {
        fireEvent.press(setButton);
      });

      expect(mockOnConfirm).toHaveBeenCalledWith(undefined, undefined, {
        direction: 'long',
        source: PERPS_EVENT_VALUE.RISK_MANAGEMENT_SOURCE.TRADE_SCREEN,
        positionSize: 0,
        takeProfitPercentage: undefined,
        stopLossPercentage: undefined,
        isEditingExistingPosition: false,
        entryPrice: 3000,
      });
    });

    it('dismisses keypad before confirming when input is focused', async () => {
      const mockOnConfirm = jest.fn().mockResolvedValue(undefined);
      mockRouteParams = { ...defaultRouteParams, onConfirm: mockOnConfirm };
      renderView({
        formState: {
          ...defaultMockReturn.formState,
          takeProfitPrice: '3150',
        },
        validation: {
          ...defaultMockReturn.validation,
          hasChanges: true,
        },
      });

      fireEvent(getTakeProfitPriceInput(), 'focus');

      const doneButton = screen.getByText('perps.tpsl.done');
      fireEvent.press(doneButton);

      const setButton = screen.getByText('perps.tpsl.set');
      fireEvent.press(setButton);

      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });

  // ==================== Keypad Integration ====================

  describe('Keypad Integration', () => {
    it('shows action buttons when keypad is not active', () => {
      renderView();

      expect(screen.getByText('perps.tpsl.cancel')).toBeOnTheScreen();
      expect(screen.getByText('perps.tpsl.set')).toBeOnTheScreen();
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('displays entry price when editing existing position', () => {
      const mockPosition: Position = {
        symbol: 'ETH',
        entryPrice: '2800.00',
        size: '0.5',
        positionValue: '1400.00',
        unrealizedPnl: '100.00',
        marginUsed: '140.00',
        leverage: { type: 'isolated', value: 10 },
        liquidationPrice: '2500.00',
        maxLeverage: 50,
        returnOnEquity: '0.71',
        cumulativeFunding: {
          allTime: '0.00',
          sinceOpen: '0.00',
          sinceChange: '0.00',
        },
        takeProfitCount: 0,
        stopLossCount: 0,
      };
      mockRouteParams = { ...defaultRouteParams, position: mockPosition };
      renderView();

      expect(screen.getByText('$2,800.00')).toBeOnTheScreen();
    });

    it('displays current price for new orders', () => {
      renderView();

      expect(screen.getByText('$3,000.00')).toBeOnTheScreen();
    });

    it('renders for SHORT direction', () => {
      mockRouteParams = { ...defaultRouteParams, direction: 'short' };
      renderView();

      expect(screen.getByTestId('back-button')).toBeOnTheScreen();
    });
  });
});
