import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import QuickBuyRateTag from './QuickBuyRateTag';

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('QuickBuyRateTag', () => {
  it('renders nothing when label is undefined and isHighPriceImpact is false', () => {
    render(<QuickBuyRateTag label={undefined} />);
    expect(screen.queryByTestId('quick-buy-rate-tag')).not.toBeOnTheScreen();
  });

  it('renders nothing when label is empty and isHighPriceImpact is false', () => {
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

  describe('isHighPriceImpact variant', () => {
    it('renders even when label is undefined', () => {
      render(
        <QuickBuyRateTag
          label={undefined}
          isHighPriceImpact
          onPress={jest.fn()}
        />,
      );
      expect(screen.getByTestId('quick-buy-rate-tag')).toBeOnTheScreen();
    });

    it('shows the bridge.price_impact_warning_title i18n key as text', () => {
      render(
        <QuickBuyRateTag
          label="1 ETH = 1000 USDC"
          isHighPriceImpact
          onPress={jest.fn()}
        />,
      );
      expect(
        screen.getByText('bridge.price_impact_warning_title'),
      ).toBeOnTheScreen();
    });

    it('still calls onPress when the pill is tapped', () => {
      const onPress = jest.fn();
      render(
        <QuickBuyRateTag
          label="1 ETH = 1000 USDC"
          isHighPriceImpact
          onPress={onPress}
        />,
      );
      fireEvent.press(screen.getByTestId('quick-buy-rate-tag-pressable'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });
});
