import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import PredictBetButton from './PredictBetButton';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

const createDefaultProps = (overrides = {}) => ({
  label: 'Yes',
  price: 65,
  onPress: jest.fn(),
  variant: 'yes' as const,
  testID: 'bet-button',
  ...overrides,
});

describe('PredictBetButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with label and price', () => {
      const props = createDefaultProps({ label: 'Yes', price: 65 });

      renderWithProvider(<PredictBetButton {...props} />);

      expect(screen.getByText('YES · 65¢')).toBeOnTheScreen();
    });

    it('renders with no variant label and price', () => {
      const props = createDefaultProps({
        label: 'No',
        price: 35,
        variant: 'no',
      });

      renderWithProvider(<PredictBetButton {...props} />);

      expect(screen.getByText('NO · 35¢')).toBeOnTheScreen();
    });

    it('renders team abbreviation as label for game markets', () => {
      const props = createDefaultProps({
        label: 'SEA',
        price: 49,
        teamColor: '#002244',
      });

      renderWithProvider(<PredictBetButton {...props} />);

      expect(screen.getByText('SEA · 49¢')).toBeOnTheScreen();
    });

    it('renders with testID', () => {
      const props = createDefaultProps({ testID: 'custom-test-id' });

      renderWithProvider(<PredictBetButton {...props} />);

      expect(screen.getByTestId('custom-test-id')).toBeOnTheScreen();
    });
  });

  describe('press handling', () => {
    it('calls onPress when pressed', () => {
      const mockOnPress = jest.fn();
      const props = createDefaultProps({ onPress: mockOnPress });

      renderWithProvider(<PredictBetButton {...props} />);
      fireEvent.press(screen.getByTestId('bet-button'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const mockOnPress = jest.fn();
      const props = createDefaultProps({
        onPress: mockOnPress,
        disabled: true,
      });

      renderWithProvider(<PredictBetButton {...props} />);
      fireEvent.press(screen.getByTestId('bet-button'));

      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has button accessibility role', () => {
      const props = createDefaultProps();

      renderWithProvider(<PredictBetButton {...props} />);
      const button = screen.getByTestId('bet-button');

      expect(button.props.accessibilityRole).toBe('button');
    });

    it('has disabled accessibility state when disabled', () => {
      const props = createDefaultProps({ disabled: true });

      renderWithProvider(<PredictBetButton {...props} />);
      const button = screen.getByTestId('bet-button');

      expect(button.props.accessibilityState).toEqual({ disabled: true });
    });

    it('has enabled accessibility state when not disabled', () => {
      const props = createDefaultProps({ disabled: false });

      renderWithProvider(<PredictBetButton {...props} />);
      const button = screen.getByTestId('bet-button');

      expect(button.props.accessibilityState).toEqual({ disabled: false });
    });
  });

  describe('team color styling', () => {
    it('renders with team color background when teamColor is provided', () => {
      const props = createDefaultProps({ teamColor: '#002244' });

      renderWithProvider(<PredictBetButton {...props} />);

      expect(screen.getByTestId('bet-button')).toBeOnTheScreen();
    });

    it('renders with default variant styling when no teamColor is provided', () => {
      const props = createDefaultProps({ variant: 'yes' });

      renderWithProvider(<PredictBetButton {...props} />);

      expect(screen.getByTestId('bet-button')).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('renders with zero price', () => {
      const props = createDefaultProps({ price: 0 });

      renderWithProvider(<PredictBetButton {...props} />);

      expect(screen.getByText('YES · 0¢')).toBeOnTheScreen();
    });

    it('renders with 100 price', () => {
      const props = createDefaultProps({ price: 100 });

      renderWithProvider(<PredictBetButton {...props} />);

      expect(screen.getByText('YES · 100¢')).toBeOnTheScreen();
    });

    it('renders with empty label', () => {
      const props = createDefaultProps({ label: '' });

      renderWithProvider(<PredictBetButton {...props} />);

      expect(screen.getByText(' · 65¢')).toBeOnTheScreen();
    });
  });
});
