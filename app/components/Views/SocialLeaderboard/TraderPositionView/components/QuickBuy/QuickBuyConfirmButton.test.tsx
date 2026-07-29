import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import QuickBuyConfirmButton from './QuickBuyConfirmButton';

const defaultProps = {
  state: 'idle' as const,
  label: 'Confirm',
  hasValidAmount: false,
  isDisabled: false,
  onPress: jest.fn(),
  tradeMode: 'buy' as const,
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

  it('marks the button as busy in loading state', () => {
    render(<QuickBuyConfirmButton {...defaultProps} state="loading" />);
    expect(
      screen.getByTestId('confirm-button').props.accessibilityState,
    ).toEqual(expect.objectContaining({ busy: true, disabled: true }));
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

  it('applies the success color in buy mode', () => {
    render(<QuickBuyConfirmButton {...defaultProps} tradeMode="buy" />);

    expect(screen.getByTestId('confirm-button').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: expect.any(String) }),
      ]),
    );
  });

  it('applies the orange sell color in sell mode', () => {
    render(<QuickBuyConfirmButton {...defaultProps} tradeMode="sell" />);

    expect(screen.getByTestId('confirm-button').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: expect.any(String) }),
      ]),
    );
  });
});
