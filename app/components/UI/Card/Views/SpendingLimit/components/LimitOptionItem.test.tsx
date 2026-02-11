import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import LimitOptionItem, { LimitOptionItemProps } from './LimitOptionItem';

const defaultProps: LimitOptionItemProps = {
  title: 'Full access',
  description: 'Card can spend any amount',
  isSelected: false,
  onPress: jest.fn(),
  testID: 'limit-option-full',
};

const render = (props: Partial<LimitOptionItemProps> = {}) => {
  const Component = () => <LimitOptionItem {...defaultProps} {...props} />;
  return renderScreen(
    Component,
    { name: 'LimitOptionItem', options: {} },
    {
      state: {
        engine: {
          backgroundState: {
            PreferencesController: {
              isIpfsGatewayEnabled: true,
            },
          },
        },
      },
    },
  );
};

describe('LimitOptionItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders title text', () => {
      render({ title: 'Full access' });

      expect(screen.getByText('Full access')).toBeOnTheScreen();
    });

    it('renders description text', () => {
      render({ description: 'Card can spend any amount' });

      expect(screen.getByText('Card can spend any amount')).toBeOnTheScreen();
    });

    it('renders with testID when provided', () => {
      render({ testID: 'limit-option-test' });

      expect(screen.getByTestId('limit-option-test')).toBeOnTheScreen();
    });

    it('renders radio button', () => {
      render({ testID: 'limit-option' });

      // RadioButton is rendered and accessible via its wrapper
      expect(screen.getByTestId('limit-option')).toBeOnTheScreen();
    });
  });

  describe('Selection State', () => {
    it('renders unchecked radio when isSelected is false', () => {
      render({ isSelected: false, testID: 'limit-option' });

      const radioButton = screen.getByTestId('limit-option');
      expect(radioButton).toBeOnTheScreen();
    });

    it('renders checked radio when isSelected is true', () => {
      render({ isSelected: true, testID: 'limit-option' });

      // RadioButton component shows checked state
      expect(
        screen.getByTestId('RadioButton-icon-component'),
      ).toBeOnTheScreen();
    });
  });

  describe('Interaction', () => {
    it('calls onPress when option is pressed', () => {
      const mockOnPress = jest.fn();

      render({ onPress: mockOnPress, testID: 'limit-option' });

      const option = screen.getByTestId('limit-option');
      fireEvent.press(option);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPress for selected option', () => {
      const mockOnPress = jest.fn();

      render({
        onPress: mockOnPress,
        isSelected: true,
        testID: 'limit-option',
      });

      const option = screen.getByTestId('limit-option');
      fireEvent.press(option);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Input Field', () => {
    it('does not render input field when showInput is false', () => {
      render({ showInput: false, isSelected: true, testID: 'limit-option' });

      expect(screen.queryByTestId('limit-option-input')).toBeNull();
    });

    it('does not render input field when isSelected is false', () => {
      render({ showInput: true, isSelected: false, testID: 'limit-option' });

      expect(screen.queryByTestId('limit-option-input')).toBeNull();
    });

    it('renders input field when showInput is true and isSelected is true', () => {
      render({ showInput: true, isSelected: true, testID: 'limit-option' });

      expect(screen.getByTestId('limit-option-input')).toBeOnTheScreen();
    });

    it('displays input value in text field', () => {
      render({
        showInput: true,
        isSelected: true,
        inputValue: '500',
        testID: 'limit-option',
      });

      const input = screen.getByTestId('limit-option-input');
      expect(input.props.value).toBe('500');
    });

    it('displays empty input when inputValue is not provided', () => {
      render({
        showInput: true,
        isSelected: true,
        inputValue: '',
        testID: 'limit-option',
      });

      const input = screen.getByTestId('limit-option-input');
      expect(input.props.value).toBe('');
    });

    it('calls onInputChange when text is entered', () => {
      const mockOnInputChange = jest.fn();

      render({
        showInput: true,
        isSelected: true,
        onInputChange: mockOnInputChange,
        testID: 'limit-option',
      });

      const input = screen.getByTestId('limit-option-input');
      fireEvent.changeText(input, '1000');

      expect(mockOnInputChange).toHaveBeenCalledWith('1000');
    });

    it('calls onInputChange with decimal value', () => {
      const mockOnInputChange = jest.fn();

      render({
        showInput: true,
        isSelected: true,
        onInputChange: mockOnInputChange,
        testID: 'limit-option',
      });

      const input = screen.getByTestId('limit-option-input');
      fireEvent.changeText(input, '100.50');

      expect(mockOnInputChange).toHaveBeenCalledWith('100.50');
    });

    it('renders input with decimal-pad keyboard type', () => {
      render({
        showInput: true,
        isSelected: true,
        testID: 'limit-option',
      });

      const input = screen.getByTestId('limit-option-input');
      expect(input.props.keyboardType).toBe('decimal-pad');
    });

    it('renders input with placeholder "0"', () => {
      render({
        showInput: true,
        isSelected: true,
        testID: 'limit-option',
      });

      const input = screen.getByTestId('limit-option-input');
      expect(input.props.placeholder).toBe('0');
    });
  });

  describe('Different Option Types', () => {
    it('renders full access option', () => {
      render({
        title: 'Full access',
        description: 'Card can spend any amount',
      });

      expect(screen.getByText('Full access')).toBeOnTheScreen();
      expect(screen.getByText('Card can spend any amount')).toBeOnTheScreen();
    });

    it('renders restricted option', () => {
      render({
        title: 'Restricted',
        description: 'Set a spending limit',
      });

      expect(screen.getByText('Restricted')).toBeOnTheScreen();
      expect(screen.getByText('Set a spending limit')).toBeOnTheScreen();
    });

    it('renders restricted option with input field when selected', () => {
      render({
        title: 'Restricted',
        description: 'Set a spending limit',
        showInput: true,
        isSelected: true,
        testID: 'limit-option-restricted',
      });

      expect(screen.getByText('Restricted')).toBeOnTheScreen();
      expect(
        screen.getByTestId('limit-option-restricted-input'),
      ).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty title', () => {
      render({ title: '' });

      // Component renders without crashing
      expect(screen.getByText('Card can spend any amount')).toBeOnTheScreen();
    });

    it('handles empty description', () => {
      render({ description: '' });

      // Component renders without crashing
      expect(screen.getByText('Full access')).toBeOnTheScreen();
    });

    it('handles undefined inputValue when showInput is true', () => {
      render({
        showInput: true,
        isSelected: true,
        inputValue: undefined,
        testID: 'limit-option',
      });

      const input = screen.getByTestId('limit-option-input');
      expect(input.props.value).toBe('');
    });

    it('handles missing onInputChange callback', () => {
      render({
        showInput: true,
        isSelected: true,
        onInputChange: undefined,
        testID: 'limit-option',
      });

      const input = screen.getByTestId('limit-option-input');
      // Should not crash when typing without callback
      fireEvent.changeText(input, '100');
    });
  });
});
