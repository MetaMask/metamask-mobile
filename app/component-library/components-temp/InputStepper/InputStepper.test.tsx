import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform, StyleSheet, type TextStyle } from 'react-native';
import InputStepper from './InputStepper';
import {
  INPUTSTEPPER_CURSOR_TESTID,
  INPUTSTEPPER_DESCRIPTION_TESTID,
  INPUTSTEPPER_INPUT_TESTID,
  INPUTSTEPPER_MINUS_BUTTON_TESTID,
  INPUTSTEPPER_PLUS_BUTTON_TESTID,
  INPUTSTEPPER_POST_VALUE_TESTID,
} from './InputStepper.constants';
import { HelpTextSeverity } from '@metamask/design-system-react-native';

describe('InputStepper', () => {
  const defaultProps = {
    value: '5',
    onIncrease: jest.fn(),
    onDecrease: jest.fn(),
    minAmount: 0,
    maxAmount: 100,
  };
  const originalPlatform = Platform.OS;

  const getAmountFontSize = (amount: { props: { style?: unknown } }) =>
    (StyleSheet.flatten(amount.props.style as TextStyle) as TextStyle).fontSize;

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
    });
  });

  describe('amount', () => {
    it('renders formatted passed value', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="1234.56" />,
      );

      expect(getByTestId(INPUTSTEPPER_INPUT_TESTID).props.children).toBe(
        '1,234.56',
      );
    });

    it('renders a blinking cursor between the amount and the suffix', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} postValue="%" />,
      );

      expect(getByTestId(INPUTSTEPPER_CURSOR_TESTID)).toBeOnTheScreen();
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

    it('renders the default zero placeholder when value is empty', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="" />,
      );

      expect(getByTestId(INPUTSTEPPER_INPUT_TESTID).props.children).toBe('0');
    });

    it('renders custom placeholder when provided', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="" placeholder="Enter amount" />,
      );

      expect(getByTestId(INPUTSTEPPER_INPUT_TESTID).props.children).toBe(
        'Enter amount',
      );
    });

    it('shrinks the amount to fit rather than clipping it', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} postValue="%" />,
      );

      const amount = getByTestId(INPUTSTEPPER_INPUT_TESTID);
      expect(amount.props.numberOfLines).toBe(1);
      expect(amount.props.adjustsFontSizeToFit).toBe(true);
    });

    it('renders the amount and suffix in bold', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} postValue="%" />,
      );

      const amountStyle = StyleSheet.flatten(
        getByTestId(INPUTSTEPPER_INPUT_TESTID).props.style as TextStyle,
      ) as TextStyle;
      const suffixStyle = StyleSheet.flatten(
        getByTestId(INPUTSTEPPER_POST_VALUE_TESTID).props.style as TextStyle,
      ) as TextStyle;

      expect(String(amountStyle.fontFamily)).toMatch(/Bold/i);
      expect(String(suffixStyle.fontFamily)).toMatch(/Bold/i);
    });
  });

  describe('font size', () => {
    it('renders 40px font when visible length is 10 or less', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="0.12345678" />,
      );

      expect(getAmountFontSize(getByTestId(INPUTSTEPPER_INPUT_TESTID))).toBe(
        40,
      );
    });

    it('counts the suffix towards the visible length', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="0.12345678" postValue="%" />,
      );

      expect(getAmountFontSize(getByTestId(INPUTSTEPPER_INPUT_TESTID))).toBe(
        35,
      );
    });

    it('renders 35px font when visible length is 15 or less', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="0.123456789012" />,
      );

      expect(getAmountFontSize(getByTestId(INPUTSTEPPER_INPUT_TESTID))).toBe(
        35,
      );
    });

    it('renders 30px font when visible length is 20 or less', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="0.1234567890123456" />,
      );

      expect(getAmountFontSize(getByTestId(INPUTSTEPPER_INPUT_TESTID))).toBe(
        30,
      );
    });

    it('renders 25px font when visible length is 25 or less', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="0.12345678901234567890123" />,
      );

      expect(getAmountFontSize(getByTestId(INPUTSTEPPER_INPUT_TESTID))).toBe(
        25,
      );
    });

    it('renders 20px font when visible length is more than 25', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="0.123456789012345678901234" />,
      );

      expect(getAmountFontSize(getByTestId(INPUTSTEPPER_INPUT_TESTID))).toBe(
        20,
      );
    });

    it('applies Android text padding styles to avoid clipping', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
      });

      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="2" postValue="%" />,
      );

      const amountStyle = StyleSheet.flatten(
        getByTestId(INPUTSTEPPER_INPUT_TESTID).props.style as TextStyle,
      ) as TextStyle;

      expect(amountStyle.includeFontPadding).toBe(false);
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

  describe('description', () => {
    it('renders the description message when description is provided', () => {
      const { getByTestId } = render(
        <InputStepper
          {...defaultProps}
          description={{
            message: 'Warning message',
            severity: HelpTextSeverity.Warning,
          }}
        />,
      );

      expect(getByTestId(INPUTSTEPPER_DESCRIPTION_TESTID).props.children).toBe(
        'Warning message',
      );
    });

    it('does not render a description when none is provided', () => {
      const { queryByTestId } = render(<InputStepper {...defaultProps} />);

      expect(queryByTestId(INPUTSTEPPER_DESCRIPTION_TESTID)).toBeNull();
    });

    it('renders the severity icon when showIcon is set', () => {
      const { getByTestId } = render(
        <InputStepper
          {...defaultProps}
          description={{
            message: 'Enter a value greater than 0.1%',
            severity: HelpTextSeverity.Danger,
            showIcon: true,
          }}
        />,
      );

      expect(getByTestId('help-text-icon')).toBeOnTheScreen();
    });

    it('renders a consumer testID when provided', () => {
      const { getByTestId } = render(
        <InputStepper
          {...defaultProps}
          description={{
            message: 'Out of range',
            severity: HelpTextSeverity.Danger,
            testID: 'custom-slippage-error',
          }}
        />,
      );

      expect(getByTestId('custom-slippage-error')).toBeOnTheScreen();
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
    it('renders zero value', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="0" />,
      );

      expect(getByTestId(INPUTSTEPPER_INPUT_TESTID).props.children).toBe('0');
    });

    it('renders decimal values', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} value="12.5" />,
      );

      expect(getByTestId(INPUTSTEPPER_INPUT_TESTID).props.children).toBe(
        '12.5',
      );
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
