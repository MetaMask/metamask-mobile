import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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

  afterEach(() => {
    jest.clearAllMocks();
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
      expect(postValue).toBeTruthy();
    });

    it('should not render postValue when not provided', () => {
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
      const { toJSON } = render(
        <InputStepper {...defaultProps} value="1234567890" />,
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correct style when value character length is less or equal to 15', () => {
      const { toJSON } = render(
        <InputStepper {...defaultProps} value="123456789012345" />,
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correct style when value character length is less or equal to 20', () => {
      const { toJSON } = render(
        <InputStepper {...defaultProps} value="12345678901234567890" />,
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correct style when value character length is less or equal to 25', () => {
      const { toJSON } = render(
        <InputStepper {...defaultProps} value="1234567890123456789012345" />,
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correct style when value character length is more than 25', () => {
      const { toJSON } = render(
        <InputStepper {...defaultProps} value="12345678901234567890123456" />,
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders custom placeholder if provided', () => {
      const { getByTestId } = render(
        <InputStepper {...defaultProps} placeholder="Enter amount" />,
      );

      const input = getByTestId('input-stepper-input');
      expect(input.props.placeholder).toBe('Enter amount');
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
      const { toJSON } = render(<InputStepper {...defaultProps} value="50" />);

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correct style of minus button when disabled', () => {
      const { toJSON } = render(
        <InputStepper {...defaultProps} value="0" minAmount={0} />,
      );

      expect(toJSON()).toMatchSnapshot();
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
      const { toJSON } = render(<InputStepper {...defaultProps} value="50" />);

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correct style of plus button when disabled', () => {
      const { toJSON } = render(
        <InputStepper {...defaultProps} value="100" maxAmount={100} />,
      );

      expect(toJSON()).toMatchSnapshot();
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

      const { toJSON } = render(
        <InputStepper {...defaultProps} description={description} />,
      );

      // Since InputStepperDescriptionRow is mocked to return null,
      // we verify the component renders without it in the snapshot
      expect(toJSON()).toMatchSnapshot();
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
      const { toJSON } = render(
        <InputStepper
          {...defaultProps}
          value="42.5"
          postValue="%"
          placeholder="Enter value"
        />,
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders with description', () => {
      const { toJSON } = render(
        <InputStepper
          {...defaultProps}
          value="42.5"
          description={{
            type: InputStepperDescriptionType.ERROR,
            message: 'Error message',
            color: TextColor.TextDefault,
          }}
        />,
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
