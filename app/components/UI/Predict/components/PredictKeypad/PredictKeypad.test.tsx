import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictKeypad, { PredictKeypadHandles } from './PredictKeypad';

// Mock the Keypad component to capture onChange callback
let mockOnChange:
  | ((data: { value: string; valueAsNumber: number }) => void)
  | null = null;
jest.mock('../../../../Base/Keypad', () =>
  jest.fn((props) => {
    mockOnChange = props.onChange;
    return null;
  }),
);

describe('PredictKeypad', () => {
  beforeAll(() => {
    mockOnChange = null;
  });
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

  afterEach(() => {
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
    it('renders Keypad component with correct currency and decimals', () => {
      const props = { ...defaultProps };

      const { toJSON } = render(<PredictKeypad {...props} />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Add Funds Button', () => {
    it('renders Add Funds button when hasInsufficientFunds is true and onAddFunds is provided', () => {
      const onAddFundsMock = jest.fn();
      const props = {
        ...defaultProps,
        hasInsufficientFunds: true,
        onAddFunds: onAddFundsMock,
      };

      const { getByText, queryByText } = render(<PredictKeypad {...props} />);

      expect(getByText('Add funds')).toBeOnTheScreen();
      expect(queryByText('$20')).toBeNull();
      expect(queryByText('$50')).toBeNull();
      expect(queryByText('$100')).toBeNull();
    });

    it('calls onAddFunds when Add Funds button is pressed', () => {
      const onAddFundsMock = jest.fn();
      const props = {
        ...defaultProps,
        hasInsufficientFunds: true,
        onAddFunds: onAddFundsMock,
      };

      const { getByText } = render(<PredictKeypad {...props} />);
      fireEvent.press(getByText('Add funds'));

      expect(onAddFundsMock).toHaveBeenCalledTimes(1);
    });

    it('renders quick amount buttons when hasInsufficientFunds is false', () => {
      const props = {
        ...defaultProps,
        hasInsufficientFunds: false,
      };

      const { getByText, queryByText } = render(<PredictKeypad {...props} />);

      expect(getByText('$20')).toBeOnTheScreen();
      expect(getByText('$50')).toBeOnTheScreen();
      expect(getByText('$100')).toBeOnTheScreen();
      expect(queryByText('predict.deposit.add_funds')).toBeNull();
    });

    it('renders quick amount buttons when onAddFunds is not provided', () => {
      const props = {
        ...defaultProps,
        hasInsufficientFunds: true,
        onAddFunds: undefined,
      };

      const { getByText, queryByText } = render(<PredictKeypad {...props} />);

      expect(getByText('$20')).toBeOnTheScreen();
      expect(queryByText('predict.deposit.add_funds')).toBeNull();
    });
  });

  describe('handleDonePress', () => {
    it('removes trailing decimal point when Done is pressed', () => {
      const props = {
        ...defaultProps,
        currentValueUSDString: '25.',
      };
      const ref = React.createRef<PredictKeypadHandles>();

      render(<PredictKeypad ref={ref} {...props} />);
      ref.current?.handleDonePress();

      expect(props.setCurrentValueUSDString).toHaveBeenCalledWith('25');
      expect(props.setCurrentValue).toHaveBeenCalledWith(25);
      expect(props.setIsInputFocused).toHaveBeenCalledWith(false);
    });

    it('handles empty string after removing decimal point', () => {
      const props = {
        ...defaultProps,
        currentValueUSDString: '.',
      };
      const ref = React.createRef<PredictKeypadHandles>();

      render(<PredictKeypad ref={ref} {...props} />);
      ref.current?.handleDonePress();

      expect(props.setCurrentValueUSDString).toHaveBeenCalledWith('');
      expect(props.setCurrentValue).toHaveBeenCalledWith(0);
    });

    it('does not modify value when no trailing decimal point', () => {
      const props = {
        ...defaultProps,
        currentValueUSDString: '25.50',
      };
      const ref = React.createRef<PredictKeypadHandles>();

      render(<PredictKeypad ref={ref} {...props} />);
      ref.current?.handleDonePress();

      expect(props.setCurrentValueUSDString).not.toHaveBeenCalled();
      expect(props.setIsInputFocused).toHaveBeenCalledWith(false);
    });
  });

  describe('handleKeypadChange', () => {
    it('updates value when keypad input changes', () => {
      const props = {
        ...defaultProps,
        currentValue: 0,
        currentValueUSDString: '0',
      };

      render(<PredictKeypad {...props} />);
      mockOnChange?.({ value: '5', valueAsNumber: 5 });

      expect(props.setCurrentValueUSDString).toHaveBeenCalledWith('5');
      expect(props.setCurrentValue).toHaveBeenCalledWith(5);
    });

    it('blocks input exceeding 9 digits', () => {
      const props = {
        ...defaultProps,
        currentValue: 123456789,
        currentValueUSDString: '123456789',
      };

      render(<PredictKeypad {...props} />);
      mockOnChange?.({ value: '1234567890', valueAsNumber: 1234567890 });

      expect(props.setCurrentValueUSDString).not.toHaveBeenCalled();
      expect(props.setCurrentValue).not.toHaveBeenCalled();
    });

    it('limits decimal places to 2 digits', () => {
      const props = {
        ...defaultProps,
        currentValue: 25,
        currentValueUSDString: '25',
      };

      render(<PredictKeypad {...props} />);
      mockOnChange?.({ value: '25.999', valueAsNumber: 25.999 });

      expect(props.setCurrentValueUSDString).toHaveBeenCalledWith('25.99');
      expect(props.setCurrentValue).toHaveBeenCalledWith(25.99);
    });

    it('preserves decimal point when user just typed it', () => {
      const props = {
        ...defaultProps,
        currentValue: 25,
        currentValueUSDString: '25',
      };

      render(<PredictKeypad {...props} />);
      mockOnChange?.({ value: '25.', valueAsNumber: 25 });

      expect(props.setCurrentValueUSDString).toHaveBeenCalledWith('25.');
      expect(props.setCurrentValue).toHaveBeenCalledWith(25);
    });

    it('handles value with trailing decimal remaining the same', () => {
      const props = {
        ...defaultProps,
        currentValue: 25,
        currentValueUSDString: '25.',
      };

      render(<PredictKeypad {...props} />);
      mockOnChange?.({ value: '25.', valueAsNumber: 25 });

      expect(props.setCurrentValueUSDString).toHaveBeenCalledWith('25.');
      expect(props.setCurrentValue).toHaveBeenCalledWith(25);
    });

    it('removes decimal when deleting digit after decimal point', () => {
      const props = {
        ...defaultProps,
        currentValue: 2.5,
        currentValueUSDString: '2.5',
      };

      render(<PredictKeypad {...props} />);
      mockOnChange?.({ value: '2.', valueAsNumber: 2 });

      expect(props.setCurrentValueUSDString).toHaveBeenCalledWith('2');
    });

    it('handles empty input value', () => {
      const props = {
        ...defaultProps,
        currentValue: 25,
        currentValueUSDString: '25',
      };

      render(<PredictKeypad {...props} />);
      mockOnChange?.({ value: '', valueAsNumber: 0 });

      expect(props.setCurrentValueUSDString).toHaveBeenCalledWith('');
      expect(props.setCurrentValue).toHaveBeenCalledWith(0);
    });

    it('handles single decimal point input', () => {
      const props = {
        ...defaultProps,
        currentValue: 0,
        currentValueUSDString: '0',
      };

      render(<PredictKeypad {...props} />);
      mockOnChange?.({ value: '.', valueAsNumber: 0 });

      expect(props.setCurrentValueUSDString).toHaveBeenCalledWith('.');
      expect(props.setCurrentValue).toHaveBeenCalledWith(0);
    });

    it('handles decimal value with no integer part', () => {
      const props = {
        ...defaultProps,
        currentValue: 0,
        currentValueUSDString: '0',
      };

      render(<PredictKeypad {...props} />);
      mockOnChange?.({ value: '.5', valueAsNumber: 0.5 });

      expect(props.setCurrentValueUSDString).toHaveBeenCalledWith('.5');
      expect(props.setCurrentValue).toHaveBeenCalledWith(0.5);
    });

    it('handles normal numeric input', () => {
      const props = {
        ...defaultProps,
        currentValue: 0,
        currentValueUSDString: '0',
      };

      render(<PredictKeypad {...props} />);
      mockOnChange?.({ value: '123', valueAsNumber: 123 });

      expect(props.setCurrentValueUSDString).toHaveBeenCalledWith('123');
      expect(props.setCurrentValue).toHaveBeenCalledWith(123);
    });

    it('handles decimal input with multiple digits', () => {
      const props = {
        ...defaultProps,
        currentValue: 0,
        currentValueUSDString: '0',
      };

      render(<PredictKeypad {...props} />);
      mockOnChange?.({ value: '123.45', valueAsNumber: 123.45 });

      expect(props.setCurrentValueUSDString).toHaveBeenCalledWith('123.45');
      expect(props.setCurrentValue).toHaveBeenCalledWith(123.45);
    });
  });
});
