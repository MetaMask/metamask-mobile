import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import QuickBuyConfirmButton from './QuickBuyConfirmButton';

const defaultProps = {
  state: 'idle' as const,
  label: 'Confirm',
  hasValidAmount: false,
  isDisabled: false,
  onPress: jest.fn(),
  testID: 'confirm-button',
};

describe('QuickBuyConfirmButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the label in idle state', () => {
    render(<QuickBuyConfirmButton {...defaultProps} state="idle" />);
    expect(screen.getByText('Confirm')).toBeOnTheScreen();
  });

  it('does not render the label in loading state', () => {
    render(<QuickBuyConfirmButton {...defaultProps} state="loading" />);
    expect(screen.queryByText('Confirm')).not.toBeOnTheScreen();
  });

  it('does not render the label in success state', () => {
    render(<QuickBuyConfirmButton {...defaultProps} state="success" />);
    expect(screen.queryByText('Confirm')).not.toBeOnTheScreen();
  });

  it('calls onPress when tapped in idle state with a valid amount', () => {
    const onPress = jest.fn();
    render(
      <QuickBuyConfirmButton
        {...defaultProps}
        hasValidAmount
        onPress={onPress}
      />,
    );
    fireEvent.press(screen.getByTestId('confirm-button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when state is loading', () => {
    const onPress = jest.fn();
    render(
      <QuickBuyConfirmButton
        {...defaultProps}
        state="loading"
        onPress={onPress}
      />,
    );
    fireEvent.press(screen.getByTestId('confirm-button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when isDisabled is true', () => {
    const onPress = jest.fn();
    render(
      <QuickBuyConfirmButton {...defaultProps} isDisabled onPress={onPress} />,
    );
    fireEvent.press(screen.getByTestId('confirm-button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
