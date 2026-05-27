import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import QuickBuyRateTag from './QuickBuyRateTag';

describe('QuickBuyRateTag', () => {
  it('renders nothing when label is undefined', () => {
    render(<QuickBuyRateTag label={undefined} />);
    expect(screen.queryByTestId('quick-buy-rate-tag')).not.toBeOnTheScreen();
  });

  it('renders nothing when label is empty', () => {
    render(<QuickBuyRateTag label="" />);
    expect(screen.queryByTestId('quick-buy-rate-tag')).not.toBeOnTheScreen();
  });

  it('renders the label inside a non-pressable container when onPress is not provided', () => {
    render(<QuickBuyRateTag label="1 ETH = 1000 USDC" />);
    expect(screen.getByTestId('quick-buy-rate-tag')).toBeOnTheScreen();
    expect(screen.getByText('1 ETH = 1000 USDC')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('quick-buy-rate-tag-pressable'),
    ).not.toBeOnTheScreen();
  });

  it('renders a pressable wrapper when onPress is provided', () => {
    render(<QuickBuyRateTag label="1 ETH = 1000 USDC" onPress={jest.fn()} />);
    expect(
      screen.getByTestId('quick-buy-rate-tag-pressable'),
    ).toBeOnTheScreen();
  });

  it('invokes onPress when pressed', () => {
    const onPress = jest.fn();
    render(<QuickBuyRateTag label="1 ETH = 1000 USDC" onPress={onPress} />);
    fireEvent.press(screen.getByTestId('quick-buy-rate-tag-pressable'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
