import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';
import InputStepper from './InputStepper';
import {
  INPUTSTEPPER_INPUT_TESTID,
  INPUTSTEPPER_MINUS_BUTTON_TESTID,
  INPUTSTEPPER_PLUS_BUTTON_TESTID,
  INPUTSTEPPER_POST_VALUE_TESTID,
  InputStepperDescriptionType,
} from './InputStepper.constants';
import {
  IconColor,
  IconName,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';

describe('InputStepper', () => {
  const defaultProps = {
    value: '5',
    onIncrease: jest.fn(),
    onDecrease: jest.fn(),
    minAmount: 0,
    maxAmount: 100,
  };
  const originalPlatform = Platform.OS;

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
    });
  });

  describe('input', () => {
    it('renders formatted passed value', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="1234.56" />,
      );

      const input = getByTestId(INPUTSTEPPER_INPUT_TESTID);
      expect(input.props.value).toBe('1,234.56');
    });

    it('renders postValue when provided', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} postValue="%" />,
      );

      expect(getByTestId(INPUTSTEPPER_POST_VALUE_TESTID)).toBeOnTheScreen();
    });

    it('does not render postValue when not provided', () => {
      const { queryByTestId } = render(<InputStepper {...defaultProps} />);

      expect(queryByTestId(INPUTSTEPPER_POST_VALUE_TESTID)).toBeNull();
    });

    it('defaults placeholder to zero', () => {
      const { getByTestId } = render(<InputStepper {...defaultProps} />);

      expect(getByTestId(INPUTSTEPPER_INPUT_TESTID).props.placeholder).toBe(
        '0',
      );
    });

    it('enables autofocus on the input', () => {
      const { getByTestId } = render(<InputStepper {...defaultProps} />);

      expect(getByTestId(INPUTSTEPPER_INPUT_TESTID).props.autoFocus).toBe(true);
    });

    it('renders 40px font when value length is 10 or less', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="1234567890" />,
      );

      const input = getByTestId(INPUTSTEPPER_INPUT_TESTID);
      const fontSize = Array.isArray(input.props.style)
        ? input.props.style.find((s: { fontSize?: number }) => s?.fontSize)
            ?.fontSize
        : input.props.style?.fontSize;
      expect(fontSize).toBe(40);
    });

    it('renders 35px font when value length is 15 or less', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="123456789012345" />,
      );

      const input = getByTestId(INPUTSTEPPER_INPUT_TESTID);
      const fontSize = Array.isArray(input.props.style)
        ? input.props.style.find((s: { fontSize?: number }) => s?.fontSize)
            ?.fontSize
        : input.props.style?.fontSize;
      expect(fontSize).toBe(35);
    });

    it('renders 30px font when value length is 20 or less', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="12345678901234567890" />,
      );

      const input = getByTestId(INPUTSTEPPER_INPUT_TESTID);
      const fontSize = Array.isArray(input.props.style)
        ? input.props.style.find((s: { fontSize?: number }) => s?.fontSize)
            ?.fontSize
        : input.props.style?.fontSize;
      expect(fontSize).toBe(30);
    });

    it('renders 25px font when value length is 25 or less', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="1234567890123456789012345" />,
      );

      const input = getByTestId(INPUTSTEPPER_INPUT_TESTID);
      const fontSize = Array.isArray(input.props.style)
        ? input.props.style.find((s: { fontSize?: number }) => s?.fontSize)
            ?.fontSize
        : input.props.style?.fontSize;
      expect(fontSize).toBe(25);
    });

    it('renders 20px font when value length is more than 25', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="12345678901234567890123456" />,
      );

      const input = getByTestId(INPUTSTEPPER_INPUT_TESTID);
      const fontSize = Array.isArray(input.props.style)
        ? input.props.style.find((s: { fontSize?: number }) => s?.fontSize)
            ?.fontSize
        : input.props.style?.fontSize;
      expect(fontSize).toBe(20);
    });

    it('renders custom placeholder when provided', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} placeholder="Enter amount" />,
      );

      expect(getByTestId(INPUTSTEPPER_INPUT_TESTID).props.placeholder).toBe(
        'Enter amount',
      );
    });

    it('applies Android text alignment styles to avoid clipping', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
      });

      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="2" postValue="%" />,
      );

      const inputStyle = StyleSheet.flatten(
        getByTestId(INPUTSTEPPER_INPUT_TESTID).props.style,
      );

      expect(inputStyle.includeFontPadding).toBe(false);
      expect(inputStyle.textAlignVertical).toBe('center');
      expect(inputStyle.paddingVertical).toBe(0);
      expect(inputStyle.paddingTop).toBe(1);
    });
  });

  describe('minus button', () => {
    it('calls onDecrease when value is more than minAmount', () => {
      const onDecrease = jest.fn();
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="50" onDecrease={onDecrease} />,
      );

      fireEvent.press(getByTestId(INPUTSTEPPER_MINUS_BUTTON_TESTID));

      expect(onDecrease).toHaveBeenCalledTimes(1);
    });

    it('disables minus button when value is equal or less than minAmount', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="0" minAmount={0} />,
      );

      expect(
        getByTestId(INPUTSTEPPER_MINUS_BUTTON_TESTID).props.accessibilityState
          .disabled,
      ).toBe(true);
    });
  });

  describe('plus button', () => {
    it('calls onIncrease when value is less than maxAmount', () => {
      const onIncrease = jest.fn();
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="50" onIncrease={onIncrease} />,
      );

      fireEvent.press(getByTestId(INPUTSTEPPER_PLUS_BUTTON_TESTID));

      expect(onIncrease).toHaveBeenCalledTimes(1);
    });

    it('disables plus button when value is equal or more than maxAmount', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="100" maxAmount={100} />,
      );

      expect(
        getByTestId(INPUTSTEPPER_PLUS_BUTTON_TESTID).props.accessibilityState
          .disabled,
      ).toBe(true);
    });
  });

  describe('description row', () => {
    it('renders description message when description is provided', () => {
      const description = {
        type: InputStepperDescriptionType.WARNING,
        message: 'Warning message',
        color: TextColor.WarningDefault,
        icon: {
          name: IconName.Warning,
          size: IconSize.Sm,
          color: IconColor.WarningDefault,
        },
      };

      const { getByTestId } = render(
        <InputStepper {...defaultProps} description={description} />,
      );

      expect(getByTestId(INPUTSTEPPER_INPUT_TESTID)).toBeOnTheScreen();
      expect(getByTestId('input-text-description-message')).toBeOnTheScreen();
    });
  });

  describe('button press interactions', () => {
    it('invokes onDecrease after minus press in and press out', () => {
      const onDecrease = jest.fn();
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="50" onDecrease={onDecrease} />,
      );

      const minusButton = getByTestId(INPUTSTEPPER_MINUS_BUTTON_TESTID);
      fireEvent(minusButton, 'pressIn');
      fireEvent(minusButton, 'pressOut');
      fireEvent.press(minusButton);

      expect(onDecrease).toHaveBeenCalledTimes(1);
    });

    it('invokes onIncrease after plus press in and press out', () => {
      const onIncrease = jest.fn();
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="50" onIncrease={onIncrease} />,
      );

      const plusButton = getByTestId(INPUTSTEPPER_PLUS_BUTTON_TESTID);
      fireEvent(plusButton, 'pressIn');
      fireEvent(plusButton, 'pressOut');
      fireEvent.press(plusButton);

      expect(onIncrease).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('renders empty string value', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="" />,
      );

      expect(getByTestId(INPUTSTEPPER_INPUT_TESTID).props.value).toBe('');
    });

    it('renders zero value', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="0" />,
      );

      expect(getByTestId(INPUTSTEPPER_INPUT_TESTID).props.value).toBe('0');
    });

    it('renders decimal values', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="12.5" />,
      );

      expect(getByTestId(INPUTSTEPPER_INPUT_TESTID).props.value).toBe('12.5');
    });

    it('disables minus button at exact minAmount', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="5" minAmount={5} />,
      );

      expect(
        getByTestId(INPUTSTEPPER_MINUS_BUTTON_TESTID).props.accessibilityState
          .disabled,
      ).toBe(true);
    });

    it('disables plus button at exact maxAmount', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="100" maxAmount={100} />,
      );

      expect(
        getByTestId(INPUTSTEPPER_PLUS_BUTTON_TESTID).props.accessibilityState
          .disabled,
      ).toBe(true);
    });
  });
});
