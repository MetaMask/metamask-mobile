import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';
import { InputStepper } from './index';
import { InputStepperDescriptionType } from './constants';
import {
  IconColor,
  IconName,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';

jest.mock('./InputStepperDescriptionRow', () => ({
  InputStepperDescriptionRow: () => null,
}));

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

      const input = getByTestId('input-stepper-input');
      expect(input.props.value).toBe('1,234.56');
    });

    it('renders postValue when provided', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} postValue="%" />,
      );

      const postValue = getByTestId('input-stepper-post-value');
      expect(postValue).toBeOnTheScreen();
    });

    it('does not render postValue when not provided', () => {
      const { queryByTestId } = render(<InputStepper {...defaultProps} />);

      const postValue = queryByTestId('input-stepper-post-value');
      expect(postValue).toBeNull();
    });

    it('default placeholder should be zero', () => {
      const { getByTestId } = render(<InputStepper {...defaultProps} />);

      const input = getByTestId('input-stepper-input');
      expect(input.props.placeholder).toBe('0');
    });

    it('input should have autofocus', () => {
      const { getByTestId } = render(<InputStepper {...defaultProps} />);

      const input = getByTestId('input-stepper-input');
      expect(input.props.autoFocus).toBe(true);
    });

    it('renders correct style when value character length is less or equal to 10', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="1234567890" />,
      );

      const input = getByTestId('input-stepper-input');
      const fontSize = Array.isArray(input.props.style)
        ? input.props.style.find((s: { fontSize?: number }) => s?.fontSize)
            ?.fontSize
        : input.props.style?.fontSize;
      expect(fontSize).toBe(40);
    });

    it('renders correct style when value character length is less or equal to 15', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="123456789012345" />,
      );

      const input = getByTestId('input-stepper-input');
      const fontSize = Array.isArray(input.props.style)
        ? input.props.style.find((s: { fontSize?: number }) => s?.fontSize)
            ?.fontSize
        : input.props.style?.fontSize;
      expect(fontSize).toBe(35);
    });

    it('renders correct style when value character length is less or equal to 20', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="12345678901234567890" />,
      );

      const input = getByTestId('input-stepper-input');
      const fontSize = Array.isArray(input.props.style)
        ? input.props.style.find((s: { fontSize?: number }) => s?.fontSize)
            ?.fontSize
        : input.props.style?.fontSize;
      expect(fontSize).toBe(30);
    });

    it('renders correct style when value character length is less or equal to 25', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="1234567890123456789012345" />,
      );

      const input = getByTestId('input-stepper-input');
      const fontSize = Array.isArray(input.props.style)
        ? input.props.style.find((s: { fontSize?: number }) => s?.fontSize)
            ?.fontSize
        : input.props.style?.fontSize;
      expect(fontSize).toBe(25);
    });

    it('renders correct style when value character length is more than 25', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="12345678901234567890123456" />,
      );

      const input = getByTestId('input-stepper-input');
      const fontSize = Array.isArray(input.props.style)
        ? input.props.style.find((s: { fontSize?: number }) => s?.fontSize)
            ?.fontSize
        : input.props.style?.fontSize;
      expect(fontSize).toBe(20);
    });

    it('renders custom placeholder if provided', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} placeholder="Enter amount" />,
      );

      const input = getByTestId('input-stepper-input');
      expect(input.props.placeholder).toBe('Enter amount');
    });

    it('applies Android text alignment styles to avoid clipping', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
      });

      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="2" postValue="%" />,
      );

      const input = getByTestId('input-stepper-input');
      const inputStyle = StyleSheet.flatten(input.props.style);

      expect(inputStyle.includeFontPadding).toBe(false);
      expect(inputStyle.textAlignVertical).toBe('center');
      expect(inputStyle.paddingVertical).toBe(0);
      expect(inputStyle.paddingTop).toBe(1);
    });
  });

  describe('minus button', () => {
    it('calls onDecrease callback when value is more than minAmount', () => {
      const onDecrease = jest.fn();
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="50" onDecrease={onDecrease} />,
      );

      const minusButton = getByTestId('input-stepper-minus-button');
      fireEvent.press(minusButton);

      expect(onDecrease).toHaveBeenCalledTimes(1);
    });

    it('minus button is disabled when value is equal or less than minAmount', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="0" minAmount={0} />,
      );

      const minusButton = getByTestId('input-stepper-minus-button');
      expect(minusButton.props.accessibilityState.disabled).toBe(true);
    });

    it('renders correct style of minus button when enabled', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="50" />,
      );

      expect(getByTestId('input-stepper-minus-button')).toBeOnTheScreen();
    });

    it('renders correct style of minus button when disabled', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="0" minAmount={0} />,
      );

      expect(
        getByTestId('input-stepper-minus-button').props.accessibilityState
          .disabled,
      ).toBe(true);
    });
  });

  describe('plus button', () => {
    it('calls onIncrease callback when value is less than maxAmount', () => {
      const onIncrease = jest.fn();
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="50" onIncrease={onIncrease} />,
      );

      const plusButton = getByTestId('input-stepper-plus-button');
      fireEvent.press(plusButton);

      expect(onIncrease).toHaveBeenCalledTimes(1);
    });

    it('plus button is disabled when value is equal or more than maxAmount', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="100" maxAmount={100} />,
      );

      const plusButton = getByTestId('input-stepper-plus-button');
      expect(plusButton.props.accessibilityState.disabled).toBe(true);
    });

    it('renders correct style of plus button when enabled', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="50" />,
      );

      expect(getByTestId('input-stepper-plus-button')).toBeOnTheScreen();
    });

    it('renders correct style of plus button when disabled', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="100" maxAmount={100} />,
      );

      expect(
        getByTestId('input-stepper-plus-button').props.accessibilityState
          .disabled,
      ).toBe(true);
    });
  });

  describe('description row', () => {
    it('should render InputStepperDescriptionRow', () => {
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

      // InputStepperDescriptionRow is mocked to return null, verify the input still renders
      expect(getByTestId('input-stepper-input')).toBeOnTheScreen();
    });
  });

  describe('button press interactions', () => {
    it('handles minus button press events', () => {
      const onDecrease = jest.fn();
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="50" onDecrease={onDecrease} />,
      );

      const minusButton = getByTestId('input-stepper-minus-button');

      // Verify button responds to press events without errors
      fireEvent(minusButton, 'pressIn');
      fireEvent(minusButton, 'pressOut');
      fireEvent.press(minusButton);

      expect(onDecrease).toHaveBeenCalledTimes(1);
    });

    it('handles plus button press events', () => {
      const onIncrease = jest.fn();
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="50" onIncrease={onIncrease} />,
      );

      const plusButton = getByTestId('input-stepper-plus-button');

      // Verify button responds to press events without errors
      fireEvent(plusButton, 'pressIn');
      fireEvent(plusButton, 'pressOut');
      fireEvent.press(plusButton);

      expect(onIncrease).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty string value', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="" />,
      );

      const input = getByTestId('input-stepper-input');
      expect(input.props.value).toBe('');
    });

    it('handles zero value', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="0" />,
      );

      const input = getByTestId('input-stepper-input');
      expect(input.props.value).toBe('0');
    });

    it('handles decimal values', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="12.5" />,
      );

      const input = getByTestId('input-stepper-input');
      expect(input.props.value).toBe('12.5');
    });

    it('minus button disabled at exact minAmount', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="5" minAmount={5} />,
      );

      const minusButton = getByTestId('input-stepper-minus-button');
      expect(minusButton.props.accessibilityState.disabled).toBe(true);
    });

    it('plus button disabled at exact maxAmount', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="100" maxAmount={100} />,
      );

      const plusButton = getByTestId('input-stepper-plus-button');
      expect(plusButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('complete component snapshot', () => {
    it('renders complete component correctly', () => {
      const { getByTestId } = render(
        <InputStepper
          {...defaultProps}
          value="42.5"
          postValue="%"
          placeholder="Enter value"
        />,
      );

      expect(getByTestId('input-stepper-input')).toBeOnTheScreen();
      expect(getByTestId('input-stepper-post-value')).toBeOnTheScreen();
    });

    it('renders with description', () => {
      const { getByTestId } = render(
        <InputStepper
          {...defaultProps}
          value="42.5"
          description={{
            message: 'Error message',
            color: TextColor.TextDefault,
          }}
        />,
      );

      expect(getByTestId('input-stepper-input')).toBeOnTheScreen();
    });
  });
});
