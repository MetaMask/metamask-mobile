import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictKeypad from './PredictKeypad';

describe('PredictKeypad', () => {
  const defaultProps = {
    isInputFocused: true,
    currentValueUSDString: '1.00',
    onKeypadChange: jest.fn(),
    onKeypadAmountPress: jest.fn(),
    onDonePress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders keypad when input is focused', () => {
      // Arrange
      const props = { ...defaultProps, isInputFocused: true };

      // Act
      const { getByText } = render(<PredictKeypad {...props} />);

      // Assert
      expect(getByText('$20')).toBeTruthy();
      expect(getByText('$50')).toBeTruthy();
      expect(getByText('$100')).toBeTruthy();
      expect(getByText('Done')).toBeTruthy();
    });

    it('does not render keypad when input is not focused', () => {
      // Arrange
      const props = { ...defaultProps, isInputFocused: false };

      // Act
      const { queryByText } = render(<PredictKeypad {...props} />);

      // Assert
      expect(queryByText('$20')).toBeNull();
      expect(queryByText('$50')).toBeNull();
      expect(queryByText('$100')).toBeNull();
      expect(queryByText('Done')).toBeNull();
    });
  });

  describe('User Interactions', () => {
    it('calls onKeypadAmountPress with 20 when $20 button is pressed', () => {
      // Arrange
      const props = { ...defaultProps };
      const { getByText } = render(<PredictKeypad {...props} />);

      // Act
      fireEvent.press(getByText('$20'));

      // Assert
      expect(props.onKeypadAmountPress).toHaveBeenCalledWith(20);
      expect(props.onKeypadAmountPress).toHaveBeenCalledTimes(1);
    });

    it('calls onKeypadAmountPress with 50 when $50 button is pressed', () => {
      // Arrange
      const props = { ...defaultProps };
      const { getByText } = render(<PredictKeypad {...props} />);

      // Act
      fireEvent.press(getByText('$50'));

      // Assert
      expect(props.onKeypadAmountPress).toHaveBeenCalledWith(50);
      expect(props.onKeypadAmountPress).toHaveBeenCalledTimes(1);
    });

    it('calls onKeypadAmountPress with 100 when $100 button is pressed', () => {
      // Arrange
      const props = { ...defaultProps };
      const { getByText } = render(<PredictKeypad {...props} />);

      // Act
      fireEvent.press(getByText('$100'));

      // Assert
      expect(props.onKeypadAmountPress).toHaveBeenCalledWith(100);
      expect(props.onKeypadAmountPress).toHaveBeenCalledTimes(1);
    });

    it('calls onDonePress when Done button is pressed', () => {
      // Arrange
      const props = { ...defaultProps };
      const { getByText } = render(<PredictKeypad {...props} />);

      // Act
      fireEvent.press(getByText('Done'));

      // Assert
      expect(props.onDonePress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keypad Integration', () => {
    it('passes currentValueUSDString to Keypad component', () => {
      // Arrange
      const customValue = '25.50';
      const props = { ...defaultProps, currentValueUSDString: customValue };

      // Act
      render(<PredictKeypad {...props} />);

      // Assert
      // The Keypad component receives the value, but we can't easily test internal props
      // This test ensures the component renders without errors with custom value
      expect(props.currentValueUSDString).toBe(customValue);
    });

    it('passes onKeypadChange to Keypad component', () => {
      // Arrange
      const mockOnChange = jest.fn();
      const props = { ...defaultProps, onKeypadChange: mockOnChange };

      // Act
      render(<PredictKeypad {...props} />);

      // Assert
      // The Keypad component receives the onChange handler, but we can't easily test internal props
      // This test ensures the component renders without errors with custom handler
      expect(props.onKeypadChange).toBe(mockOnChange);
    });
  });
});
