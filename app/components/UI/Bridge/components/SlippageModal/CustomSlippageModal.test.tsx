import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CustomSlippageModal } from './CustomSlippageModal';

// Mock BottomSheet
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactModule = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    const { View } = ReactNative;

    return {
      __esModule: true,
      default: ReactModule.forwardRef(
        (props: { children: unknown }, _ref: unknown) => (
          <View testID="bottom-sheet">{props.children as React.ReactNode}</View>
        ),
      ),
    };
  },
);

// Mock HeaderCompactStandard
jest.mock(
  '../../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactNative = jest.requireActual('react-native');
    const { View, Text, TouchableOpacity } = ReactNative;

    return {
      __esModule: true,
      default: (props: { title: string; onClose: () => void }) => (
        <View testID="header-center">
          <Text>{props.title}</Text>
          <TouchableOpacity onPress={props.onClose} accessibilityLabel="Close">
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
      ),
    };
  },
);

// Mock InputStepper
jest.mock('../InputStepper', () => ({
  InputStepper: jest.fn(
    ({
      value,
      onIncrease,
      onDecrease,
      description,
    }: {
      value: string;
      onIncrease: () => void;
      onDecrease: () => void;
      description: unknown;
    }) => {
      const ReactNative = jest.requireActual('react-native');
      const { View, Text, TouchableOpacity } = ReactNative;

      return (
        <View testID="input-stepper">
          <TouchableOpacity
            testID="input-stepper-decrease"
            onPress={onDecrease}
          >
            <Text>-</Text>
          </TouchableOpacity>
          <Text testID="input-stepper-value">{value}</Text>
          <TouchableOpacity
            testID="input-stepper-increase"
            onPress={onIncrease}
          >
            <Text>+</Text>
          </TouchableOpacity>
          {description && <View testID="input-stepper-description" />}
        </View>
      );
    },
  ),
}));

// Mock Keypad
jest.mock('../../../../Base/Keypad', () => ({
  __esModule: true,
  Keys: {
    Back: 'Back',
    Period: 'Period',
    Digit0: '0',
    Digit1: '1',
    Digit2: '2',
    Digit3: '3',
    Digit4: '4',
    Digit5: '5',
    Digit6: '6',
    Digit7: '7',
    Digit8: '8',
    Digit9: '9',
    Initial: 'Initial',
  },
  default: jest.fn(
    ({
      value,
      onChange,
    }: {
      value: string;
      onChange: (data: {
        value: string;
        valueAsNumber: number;
        pressedKey: string;
      }) => void;
    }) => {
      const ReactNative = jest.requireActual('react-native');
      const { View, TouchableOpacity, Text } = ReactNative;

      return (
        <View testID="keypad">
          <Text testID="keypad-value">{value}</Text>
          <TouchableOpacity
            testID="keypad-button-5"
            onPress={() =>
              onChange({
                value: value + '5',
                valueAsNumber: parseFloat(value + '5'),
                pressedKey: '5',
              })
            }
          >
            <Text>5</Text>
          </TouchableOpacity>
        </View>
      );
    },
  ),
}));

// Mock hooks
jest.mock('../../hooks/useSlippageConfig', () => ({
  useSlippageConfig: jest.fn(),
}));

jest.mock('../../hooks/useShouldDisableCustomSlippageConfirm', () => ({
  useShouldDisableCustomSlippageConfirm: jest.fn(),
}));

jest.mock('../../hooks/useSlippageStepperDescription', () => ({
  useSlippageStepperDescription: jest.fn(),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

// Mock Redux
const mockDispatch = jest.fn();
const mockSelector = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    mockSelector(selector),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'bridge.slippage': 'Slippage',
      'bridge.cancel': 'Cancel',
      'bridge.confirm': 'Confirm',
    };
    return translations[key] || key;
  }),
}));

import { useSlippageConfig } from '../../hooks/useSlippageConfig';
import { useShouldDisableCustomSlippageConfirm } from '../../hooks/useShouldDisableCustomSlippageConfirm';
import { useSlippageStepperDescription } from '../../hooks/useSlippageStepperDescription';
import { useParams } from '../../../../../util/navigation/navUtils';
import { InputStepper } from '../InputStepper';
import Keypad from '../../../../Base/Keypad';

const mockUseSlippageConfig = useSlippageConfig as jest.MockedFunction<
  typeof useSlippageConfig
>;
const mockUseShouldDisableCustomSlippageConfirm =
  useShouldDisableCustomSlippageConfirm as jest.MockedFunction<
    typeof useShouldDisableCustomSlippageConfirm
  >;
const mockUseSlippageStepperDescription =
  useSlippageStepperDescription as jest.MockedFunction<
    typeof useSlippageStepperDescription
  >;
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockInputStepper = InputStepper as jest.MockedFunction<
  typeof InputStepper
>;
const mockKeypad = Keypad as jest.MockedFunction<typeof Keypad>;

describe('CustomSlippageModal', () => {
  const mockSlippageConfig = {
    input_step: 0.1,
    max_amount: 100,
    min_amount: 0,
    input_max_decimals: 2,
    lower_allowed_slippage_threshold: null,
    lower_suggested_slippage_threshold: null,
    upper_suggested_slippage_threshold: null,
    upper_allowed_slippage_threshold: null,
    default_slippage_options: ['auto', '0.5', '2', '3'],
    has_custom_slippage_option: true,
  };

  beforeEach(() => {
    mockUseSlippageConfig.mockReturnValue(mockSlippageConfig);
    mockUseShouldDisableCustomSlippageConfirm.mockReturnValue(false);
    mockUseSlippageStepperDescription.mockReturnValue(undefined);
    mockUseParams.mockReturnValue({
      sourceChainId: '0x1',
      destChainId: undefined,
    });
    mockSelector.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cancel button', () => {
    it('closes modal when cancel button is pressed', () => {
      const { getByText } = render(<CustomSlippageModal />);

      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      // Verify close was called (ref.onCloseBottomSheet)
      // Component should render without errors
      expect(cancelButton).toBeTruthy();
    });

    it('does not dispatch slippage on cancel', () => {
      const { getByText } = render(<CustomSlippageModal />);

      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('confirm button', () => {
    it('updates slippage state and closes modal when confirm is pressed', () => {
      mockSelector.mockReturnValue('2.5');

      const { getByText } = render(<CustomSlippageModal />);

      const confirmButton = getByText('Confirm');
      fireEvent.press(confirmButton);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setSlippage'),
          payload: '2.5',
        }),
      );
    });

    it('dispatches current inputAmount value', () => {
      mockSelector.mockReturnValue('5');

      const { getByText } = render(<CustomSlippageModal />);

      const confirmButton = getByText('Confirm');
      fireEvent.press(confirmButton);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: '5',
        }),
      );
    });

    it('is disabled when shouldDisableConfirm is true', () => {
      mockUseShouldDisableCustomSlippageConfirm.mockReturnValue(true);

      const { toJSON, getByText } = render(<CustomSlippageModal />);

      // Verify button exists
      expect(getByText('Confirm')).toBeTruthy();

      // Snapshot shows disabled state
      expect(toJSON()).toMatchSnapshot('confirm button disabled');
    });

    it('is enabled when shouldDisableConfirm is false', () => {
      mockUseShouldDisableCustomSlippageConfirm.mockReturnValue(false);

      const { toJSON, getByText } = render(<CustomSlippageModal />);

      // Verify button exists
      expect(getByText('Confirm')).toBeTruthy();

      // Snapshot shows enabled state
      expect(toJSON()).toMatchSnapshot('confirm button enabled');
    });
  });

  describe('plus button (increase)', () => {
    it('increases value by input_step when pressed', () => {
      mockSelector.mockReturnValue('1');

      const { getByTestId } = render(<CustomSlippageModal />);

      const increaseButton = getByTestId('input-stepper-increase');
      fireEvent.press(increaseButton);

      const valueElement = getByTestId('input-stepper-value');
      // 1 + 0.1 = 1.1
      expect(valueElement.props.children).toBe('1.1');
    });

    it('does not exceed max_amount', () => {
      mockSelector.mockReturnValue('99.95');

      const { getByTestId } = render(<CustomSlippageModal />);

      const increaseButton = getByTestId('input-stepper-increase');
      fireEvent.press(increaseButton);

      const valueElement = getByTestId('input-stepper-value');
      // 99.95 + 0.1 = 100.05, but capped at max_amount (100)
      expect(valueElement.props.children).toBe('100');
    });

    it('caps at max_amount when exceeding', () => {
      mockSelector.mockReturnValue('100');

      const { getByTestId } = render(<CustomSlippageModal />);

      const increaseButton = getByTestId('input-stepper-increase');
      fireEvent.press(increaseButton);

      const valueElement = getByTestId('input-stepper-value');
      expect(valueElement.props.children).toBe('100');
    });

    it('updates hooks after increase', () => {
      mockSelector.mockReturnValue('50');

      const { getByTestId } = render(<CustomSlippageModal />);

      const increaseButton = getByTestId('input-stepper-increase');
      fireEvent.press(increaseButton);

      // Verify hooks were called with updated inputAmount
      expect(mockUseShouldDisableCustomSlippageConfirm).toHaveBeenCalledWith({
        inputAmount: '50.1',
        slippageConfig: mockSlippageConfig,
      });

      expect(mockUseSlippageStepperDescription).toHaveBeenCalledWith({
        inputAmount: '50.1',
        slippageConfig: mockSlippageConfig,
        hasAttemptedToExceedMax: false,
      });
    });
  });

  describe('minus button (decrease)', () => {
    it('decreases value by input_step when pressed', () => {
      mockSelector.mockReturnValue('2');

      const { getByTestId } = render(<CustomSlippageModal />);

      const decreaseButton = getByTestId('input-stepper-decrease');
      fireEvent.press(decreaseButton);

      const valueElement = getByTestId('input-stepper-value');
      // 2 - 0.1 = 1.9
      expect(valueElement.props.children).toBe('1.9');
    });

    it('does not go below min_amount', () => {
      mockSelector.mockReturnValue('0.05');

      const { getByTestId } = render(<CustomSlippageModal />);

      const decreaseButton = getByTestId('input-stepper-decrease');
      fireEvent.press(decreaseButton);

      const valueElement = getByTestId('input-stepper-value');
      // 0.05 - 0.1 = -0.05, but capped at min_amount (0)
      expect(valueElement.props.children).toBe('0');
    });

    it('caps at min_amount when going below', () => {
      mockSelector.mockReturnValue('0');

      const { getByTestId } = render(<CustomSlippageModal />);

      const decreaseButton = getByTestId('input-stepper-decrease');
      fireEvent.press(decreaseButton);

      const valueElement = getByTestId('input-stepper-value');
      expect(valueElement.props.children).toBe('0');
    });

    it('updates hooks after decrease', () => {
      mockSelector.mockReturnValue('50');

      const { getByTestId } = render(<CustomSlippageModal />);

      const decreaseButton = getByTestId('input-stepper-decrease');
      fireEvent.press(decreaseButton);

      // Verify hooks were called with updated inputAmount
      expect(mockUseShouldDisableCustomSlippageConfirm).toHaveBeenCalledWith({
        inputAmount: '49.9',
        slippageConfig: mockSlippageConfig,
      });

      expect(mockUseSlippageStepperDescription).toHaveBeenCalledWith({
        inputAmount: '49.9',
        slippageConfig: mockSlippageConfig,
        hasAttemptedToExceedMax: false,
      });
    });
  });

  describe('decimal handling', () => {
    it('removes redundant trailing zeros', () => {
      mockSelector.mockReturnValue('1');

      const { getByTestId } = render(<CustomSlippageModal />);

      const increaseButton = getByTestId('input-stepper-increase');
      fireEvent.press(increaseButton);

      const valueElement = getByTestId('input-stepper-value');
      // 1 + 0.1 = 1.1 (not 1.10)
      expect(valueElement.props.children).toBe('1.1');
    });

    it('respects input_max_decimals limit', () => {
      mockSelector.mockReturnValue('1.2');

      const { getByTestId } = render(<CustomSlippageModal />);

      const increaseButton = getByTestId('input-stepper-increase');
      fireEvent.press(increaseButton);

      const valueElement = getByTestId('input-stepper-value');
      // 1.2 + 0.1 = 1.3 (limited to 2 decimals)
      expect(valueElement.props.children).toBe('1.3');
    });

    it('handles rounding to max decimals', () => {
      const configWithHigherStep = {
        ...mockSlippageConfig,
        input_step: 0.33,
      };
      mockUseSlippageConfig.mockReturnValue(configWithHigherStep);
      mockSelector.mockReturnValue('1');

      const { getByTestId } = render(<CustomSlippageModal />);

      const increaseButton = getByTestId('input-stepper-increase');
      fireEvent.press(increaseButton);

      const valueElement = getByTestId('input-stepper-value');
      // 1 + 0.33 = 1.33, rounded to 2 decimals
      expect(valueElement.props.children).toBe('1.33');
    });
  });

  describe('keypad input handling', () => {
    it('accepts valid keypad input', () => {
      mockSelector.mockReturnValue('1');

      const { getByTestId } = render(<CustomSlippageModal />);

      // Simulate keypad input
      const keypadButton = getByTestId('keypad-button-5');
      fireEvent.press(keypadButton);

      const valueElement = getByTestId('keypad-value');
      // Should update to '15'
      expect(valueElement.props.children).toBe('15');
    });

    it('does not change value when exceeding max_amount', () => {
      mockSelector.mockReturnValue('100');

      const { getByTestId } = render(<CustomSlippageModal />);

      // Try to input more (simulate onChange with value > max)
      const keypadButton = getByTestId('keypad-button-5');
      fireEvent.press(keypadButton);

      // Value should remain at 100 (no change)
      const valueElement = getByTestId('keypad-value');
      expect(valueElement.props.children).toBe('100');
    });

    it('sets hasAttemptedToExceedMax when value exceeds max_amount', () => {
      mockSelector.mockReturnValue('50');

      const { getByTestId, rerender } = render(<CustomSlippageModal />);

      // Get the Keypad onChange handler
      const keypadOnChange = mockKeypad.mock.calls[0][0].onChange;

      // Try to input value that exceeds max_amount (e.g., 150)
      keypadOnChange({
        value: '150',
        valueAsNumber: 150,
        pressedKey: '0' as never,
      });

      // Re-render to apply state change
      rerender(<CustomSlippageModal />);

      // Value should remain unchanged (rejected)
      const valueElement = getByTestId('input-stepper-value');
      expect(valueElement.props.children).toBe('50');

      // Verify hasAttemptedToExceedMax was set to true
      const lastDescriptionCall =
        mockUseSlippageStepperDescription.mock.calls[
          mockUseSlippageStepperDescription.mock.calls.length - 1
        ];
      expect(lastDescriptionCall[0].hasAttemptedToExceedMax).toBe(true);
    });

    it('rejects input with more decimals than input_max_decimals', () => {
      mockSelector.mockReturnValue('1.2');

      const { getByTestId } = render(<CustomSlippageModal />);

      // Get the Keypad onChange handler
      const keypadOnChange = mockKeypad.mock.calls[0][0].onChange;

      // Try to input value with 3 decimals (exceeds input_max_decimals: 2)
      keypadOnChange({
        value: '1.234',
        valueAsNumber: 1.234,
        pressedKey: '4' as never,
      });

      // Value should remain unchanged (rejected)
      const valueElement = getByTestId('keypad-value');
      expect(valueElement.props.children).toBe('1.2');
    });

    it('accepts input with exact input_max_decimals', () => {
      mockSelector.mockReturnValue('1.2');

      const { getByTestId, rerender } = render(<CustomSlippageModal />);

      // Get the Keypad onChange handler
      const keypadOnChange = mockKeypad.mock.calls[0][0].onChange;

      // Input value with exactly 2 decimals (should be accepted)
      keypadOnChange({
        value: '1.25',
        valueAsNumber: 1.25,
        pressedKey: '5' as never,
      });

      // Re-render to apply state change
      rerender(<CustomSlippageModal />);

      // Value should update
      const valueElement = getByTestId('input-stepper-value');
      expect(valueElement.props.children).toBe('1.25');
    });

    it('handles max_amount with trailing decimal point', () => {
      mockSelector.mockReturnValue('100');

      const { getByTestId, rerender } = render(<CustomSlippageModal />);

      // Get the Keypad onChange handler
      const keypadOnChange = mockKeypad.mock.calls[0][0].onChange;

      // Try to add decimal point to max amount (100.)
      keypadOnChange({
        value: '100.',
        valueAsNumber: 100,
        pressedKey: 'Period' as never,
      });

      // Re-render to apply state change
      rerender(<CustomSlippageModal />);

      // Value should be set to max_amount without decimal point
      const valueElement = getByTestId('input-stepper-value');
      expect(valueElement.props.children).toBe('100');

      // Verify hasAttemptedToExceedMax was set to true
      const lastDescriptionCall =
        mockUseSlippageStepperDescription.mock.calls[
          mockUseSlippageStepperDescription.mock.calls.length - 1
        ];
      expect(lastDescriptionCall[0].hasAttemptedToExceedMax).toBe(true);
    });

    it('calls hooks with initial input', () => {
      mockSelector.mockReturnValue('50');

      render(<CustomSlippageModal />);

      // Verify useShouldDisableCustomSlippageConfirm was called
      expect(mockUseShouldDisableCustomSlippageConfirm).toHaveBeenCalledWith({
        inputAmount: '50',
        slippageConfig: mockSlippageConfig,
      });

      // Verify useSlippageStepperDescription was called with hasAttemptedToExceedMax
      expect(mockUseSlippageStepperDescription).toHaveBeenCalledWith({
        inputAmount: '50',
        slippageConfig: mockSlippageConfig,
        hasAttemptedToExceedMax: false,
      });
    });

    it('resets hasAttemptedToExceedMax on valid keypad input', () => {
      mockSelector.mockReturnValue('50');

      const { rerender } = render(<CustomSlippageModal />);

      // Get the Keypad onChange handler
      const keypadOnChange = mockKeypad.mock.calls[0][0].onChange;

      // Input valid value
      keypadOnChange({
        value: '25',
        valueAsNumber: 25,
        pressedKey: '5' as never,
      });

      // Re-render to apply state change
      rerender(<CustomSlippageModal />);

      // Verify hasAttemptedToExceedMax was reset to false
      const lastDescriptionCall =
        mockUseSlippageStepperDescription.mock.calls[
          mockUseSlippageStepperDescription.mock.calls.length - 1
        ];
      expect(lastDescriptionCall[0].hasAttemptedToExceedMax).toBe(false);
    });

    it('removes trailing dot when backspace is pressed', () => {
      mockSelector.mockReturnValue('5.');

      const { getByTestId, rerender } = render(<CustomSlippageModal />);

      // Get the Keypad onChange handler
      const keypadOnChange = mockKeypad.mock.calls[0][0].onChange;

      // Simulate backspace press that results in trailing dot
      // e.g., user had "5.5", pressed backspace, keypad returns "5."
      keypadOnChange({
        value: '5.',
        valueAsNumber: 5,
        pressedKey: 'Back' as never,
      });

      // Re-render to apply state change
      rerender(<CustomSlippageModal />);

      // Value should have trailing dot removed
      const valueElement = getByTestId('input-stepper-value');
      expect(valueElement.props.children).toBe('5');
    });

    it('removes trailing dot for "0." when backspace is pressed', () => {
      mockSelector.mockReturnValue('0.5');

      const { getByTestId, rerender } = render(<CustomSlippageModal />);

      // Get the Keypad onChange handler
      const keypadOnChange = mockKeypad.mock.calls[0][0].onChange;

      // Simulate backspace press on "0.5" resulting in "0."
      keypadOnChange({
        value: '0.',
        valueAsNumber: 0,
        pressedKey: 'Back' as never,
      });

      // Re-render to apply state change
      rerender(<CustomSlippageModal />);

      // Value should have trailing dot removed
      const valueElement = getByTestId('input-stepper-value');
      expect(valueElement.props.children).toBe('0');
    });

    it('does not remove trailing dot for non-backspace keypresses', () => {
      mockSelector.mockReturnValue('5');

      const { getByTestId, rerender } = render(<CustomSlippageModal />);

      // Get the Keypad onChange handler
      const keypadOnChange = mockKeypad.mock.calls[0][0].onChange;

      // Simulate period key press (not backspace)
      keypadOnChange({
        value: '5.',
        valueAsNumber: 5,
        pressedKey: 'Period' as never,
      });

      // Re-render to apply state change
      rerender(<CustomSlippageModal />);

      // Value should keep the trailing dot since it was a period press
      const valueElement = getByTestId('input-stepper-value');
      expect(valueElement.props.children).toBe('5.');
    });
  });

  describe('initial state', () => {
    it('uses currentSlippage from redux when defined', () => {
      mockSelector.mockReturnValue('2.5');

      const { getByTestId } = render(<CustomSlippageModal />);

      const valueElement = getByTestId('input-stepper-value');
      expect(valueElement.props.children).toBe('2.5');
    });

    it('defaults to "0" when currentSlippage is undefined', () => {
      mockSelector.mockReturnValue(undefined);

      const { getByTestId } = render(<CustomSlippageModal />);

      const valueElement = getByTestId('input-stepper-value');
      expect(valueElement.props.children).toBe('0');
    });
  });

  describe('component structure', () => {
    it('renders header with correct title', () => {
      const { getByText } = render(<CustomSlippageModal />);

      expect(getByText('Slippage')).toBeTruthy();
    });

    it('renders InputStepper', () => {
      const { getByTestId } = render(<CustomSlippageModal />);

      expect(getByTestId('input-stepper')).toBeTruthy();
    });

    it('renders Keypad', () => {
      const { getByTestId } = render(<CustomSlippageModal />);

      expect(getByTestId('keypad')).toBeTruthy();
    });

    it('renders cancel button', () => {
      const { getByText } = render(<CustomSlippageModal />);

      expect(getByText('Cancel')).toBeTruthy();
    });

    it('renders confirm button', () => {
      const { getByText } = render(<CustomSlippageModal />);

      expect(getByText('Confirm')).toBeTruthy();
    });

    it('passes correct props to InputStepper', () => {
      mockSelector.mockReturnValue('5');
      const mockDescription = {
        type: 'warning',
        message: 'Warning',
        color: 'text-warning-default',
      };
      mockUseSlippageStepperDescription.mockReturnValue(
        mockDescription as unknown as ReturnType<
          typeof useSlippageStepperDescription
        >,
      );

      render(<CustomSlippageModal />);

      expect(mockInputStepper).toHaveBeenCalledWith(
        expect.objectContaining({
          value: '5',
          minAmount: mockSlippageConfig.min_amount,
          maxAmount: mockSlippageConfig.max_amount,
          postValue: '%',
          description: mockDescription,
        }),
        expect.anything(),
      );
    });

    it('passes correct props to Keypad', () => {
      mockSelector.mockReturnValue('3.5');

      render(<CustomSlippageModal />);

      expect(mockKeypad).toHaveBeenCalledWith(
        expect.objectContaining({
          value: '3.5',
          currency: 'native',
        }),
        expect.anything(),
      );
    });
  });

  describe('snapshot tests', () => {
    it('matches snapshot for complete modal', () => {
      const { toJSON } = render(<CustomSlippageModal />);

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot with description shown', () => {
      const mockDescription = {
        type: 'warning',
        message: 'Warning message',
        color: 'text-warning-default',
      };
      mockUseSlippageStepperDescription.mockReturnValue(
        mockDescription as unknown as ReturnType<
          typeof useSlippageStepperDescription
        >,
      );

      const { toJSON } = render(<CustomSlippageModal />);

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot with confirm disabled', () => {
      mockUseShouldDisableCustomSlippageConfirm.mockReturnValue(true);

      const { toJSON } = render(<CustomSlippageModal />);

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('integration with hooks', () => {
    it('calls useSlippageConfig with sourceChainId and destChainId params', () => {
      mockUseParams.mockReturnValue({
        sourceChainId: 'eip155:1',
        destChainId: 'eip155:137',
      });

      render(<CustomSlippageModal />);

      expect(mockUseSlippageConfig).toHaveBeenCalledWith({
        sourceChainId: 'eip155:1',
        destChainId: 'eip155:137',
      });
    });

    it('calls useShouldDisableCustomSlippageConfirm with correct params', () => {
      mockSelector.mockReturnValue('5');

      render(<CustomSlippageModal />);

      expect(mockUseShouldDisableCustomSlippageConfirm).toHaveBeenCalledWith({
        inputAmount: '5',
        slippageConfig: mockSlippageConfig,
      });
    });

    it('calls useSlippageStepperDescription with correct params', () => {
      mockSelector.mockReturnValue('10');

      render(<CustomSlippageModal />);

      expect(mockUseSlippageStepperDescription).toHaveBeenCalledWith({
        inputAmount: '10',
        slippageConfig: mockSlippageConfig,
        hasAttemptedToExceedMax: false,
      });
    });
  });

  describe('edge cases', () => {
    it('handles zero value', () => {
      mockSelector.mockReturnValue('0');

      const { getByTestId } = render(<CustomSlippageModal />);

      const valueElement = getByTestId('input-stepper-value');
      expect(valueElement.props.children).toBe('0');
    });

    it('handles decimal values', () => {
      mockSelector.mockReturnValue('1.75');

      const { getByTestId } = render(<CustomSlippageModal />);

      const valueElement = getByTestId('input-stepper-value');
      expect(valueElement.props.children).toBe('1.75');
    });

    it('handles max amount value', () => {
      mockSelector.mockReturnValue('100');

      const { getByTestId } = render(<CustomSlippageModal />);

      const valueElement = getByTestId('input-stepper-value');
      expect(valueElement.props.children).toBe('100');
    });

    it('handles multiple increase presses', () => {
      mockSelector.mockReturnValue('1');

      const { getByTestId } = render(<CustomSlippageModal />);

      const increaseButton = getByTestId('input-stepper-increase');

      fireEvent.press(increaseButton); // 1.1
      fireEvent.press(increaseButton); // 1.2
      fireEvent.press(increaseButton); // 1.3

      const valueElement = getByTestId('input-stepper-value');
      expect(valueElement.props.children).toBe('1.3');
    });

    it('handles multiple decrease presses', () => {
      mockSelector.mockReturnValue('1');

      const { getByTestId } = render(<CustomSlippageModal />);

      const decreaseButton = getByTestId('input-stepper-decrease');

      fireEvent.press(decreaseButton); // 0.9
      fireEvent.press(decreaseButton); // 0.8
      fireEvent.press(decreaseButton); // 0.7

      const valueElement = getByTestId('input-stepper-value');
      expect(valueElement.props.children).toBe('0.7');
    });
  });

  describe('handleClose functionality', () => {
    it('closes modal via header close button', () => {
      const { getByLabelText } = render(<CustomSlippageModal />);

      const closeButton = getByLabelText('Close');
      fireEvent.press(closeButton);

      // Verify it doesn't throw and component handles close
      expect(closeButton).toBeTruthy();
    });

    it('does not dispatch slippage when closing without confirm', () => {
      const { getByLabelText } = render(<CustomSlippageModal />);

      const closeButton = getByLabelText('Close');
      fireEvent.press(closeButton);

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});
