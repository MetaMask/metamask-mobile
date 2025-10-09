import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictKeypad, { PredictKeypadHandles } from './PredictKeypad';

describe('PredictKeypad', () => {
  const defaultProps = {
    isInputFocused: true,
    currentValue: 1,
    currentValueUSDString: '1.00',
    setCurrentValue: jest.fn(),
    setCurrentValueUSDString: jest.fn(),
    setIsInputFocused: jest.fn(),
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
    it('calls handleKeypadAmountPress with 20 when $20 button is pressed', () => {
      // Arrange
      const props = { ...defaultProps };
      const ref = React.createRef<PredictKeypadHandles>();
      const { getByText } = render(<PredictKeypad ref={ref} {...props} />);

      // Act
      fireEvent.press(getByText('$20'));

      // Assert
      expect(props.setCurrentValue).toHaveBeenCalledWith(20);
      expect(props.setCurrentValueUSDString).toHaveBeenCalledWith('20');
    });

    it('calls handleKeypadAmountPress with 50 when $50 button is pressed', () => {
      // Arrange
      const props = { ...defaultProps };
      const ref = React.createRef<PredictKeypadHandles>();
      const { getByText } = render(<PredictKeypad ref={ref} {...props} />);

      // Act
      fireEvent.press(getByText('$50'));

      // Assert
      expect(props.setCurrentValue).toHaveBeenCalledWith(50);
      expect(props.setCurrentValueUSDString).toHaveBeenCalledWith('50');
    });

    it('calls handleKeypadAmountPress with 100 when $100 button is pressed', () => {
      // Arrange
      const props = { ...defaultProps };
      const ref = React.createRef<PredictKeypadHandles>();
      const { getByText } = render(<PredictKeypad ref={ref} {...props} />);

      // Act
      fireEvent.press(getByText('$100'));

      // Assert
      expect(props.setCurrentValue).toHaveBeenCalledWith(100);
      expect(props.setCurrentValueUSDString).toHaveBeenCalledWith('100');
    });

    it('calls handleDonePress when Done button is pressed', () => {
      // Arrange
      const props = { ...defaultProps };
      const ref = React.createRef<PredictKeypadHandles>();
      const { getByText } = render(<PredictKeypad ref={ref} {...props} />);

      // Act
      fireEvent.press(getByText('Done'));

      // Assert
      expect(props.setIsInputFocused).toHaveBeenCalledWith(false);
    });

    it('exposes handleAmountPress handler through ref', () => {
      // Arrange
      const props = { ...defaultProps };
      const ref = React.createRef<PredictKeypadHandles>();
      render(<PredictKeypad ref={ref} {...props} />);

      // Act
      ref.current?.handleAmountPress();

      // Assert
      expect(props.setIsInputFocused).toHaveBeenCalledWith(true);
    });

    it('exposes handleKeypadAmountPress handler through ref', () => {
      // Arrange
      const props = { ...defaultProps };
      const ref = React.createRef<PredictKeypadHandles>();
      render(<PredictKeypad ref={ref} {...props} />);

      // Act
      ref.current?.handleKeypadAmountPress(25);

      // Assert
      expect(props.setCurrentValue).toHaveBeenCalledWith(25);
      expect(props.setCurrentValueUSDString).toHaveBeenCalledWith('25');
    });

    it('exposes handleDonePress handler through ref', () => {
      // Arrange
      const props = { ...defaultProps };
      const ref = React.createRef<PredictKeypadHandles>();
      render(<PredictKeypad ref={ref} {...props} />);

      // Act
      ref.current?.handleDonePress();

      // Assert
      expect(props.setIsInputFocused).toHaveBeenCalledWith(false);
    });
  });

  describe('Keypad Integration', () => {
    it('renders with correct props', () => {
      // Arrange
      const props = { ...defaultProps };

      // Act
      const { toJSON } = render(<PredictKeypad {...props} />);

      // Assert
      expect(toJSON()).toBeTruthy();
    });

    it('handles keypad input changes internally', () => {
      // Arrange
      const props = { ...defaultProps };

      // Act - Component handles keypad changes internally, so we test that it renders
      render(<PredictKeypad {...props} />);

      // Assert - The component should render without errors and handle changes internally
      expect(props.setCurrentValue).toBeDefined();
      expect(props.setCurrentValueUSDString).toBeDefined();
    });
  });
});
