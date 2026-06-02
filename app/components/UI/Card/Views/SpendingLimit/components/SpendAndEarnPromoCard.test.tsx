import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import SpendAndEarnPromoCard from './SpendAndEarnPromoCard';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string | number>) => {
    if (key === 'card.card_spending_limit.spend_and_earn_description') {
      return `Spend with your Money account and earn up to ${params?.apy}% APY on your balance. Also get ${params?.cashback}% mUSD back.`;
    }
    if (key === 'card.card_spending_limit.spend_and_earn_description_no_apy') {
      return `Spend with your Money account and earn APY on your balance. Also get ${params?.cashback}% mUSD back.`;
    }
    const map: Record<string, string> = {
      'card.card_spending_limit.spend_and_earn_title': 'Spend while you earn',
      'card.card_spending_limit.spend_and_earn_cta': 'Link to Money account',
      'card.card_spending_limit.use_money_account_cta': 'Use Money account',
    };
    return map[key] ?? key;
  },
}));

describe('SpendAndEarnPromoCard', () => {
  const defaultProps = {
    apyPercent: 4,
    cashbackPercent: 1,
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, full description with APY + cashback, and CTA label', () => {
    render(<SpendAndEarnPromoCard {...defaultProps} />);

    expect(screen.getByText('Spend while you earn')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Spend with your Money account and earn up to 4% APY on your balance. Also get 1% mUSD back.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Link to Money account')).toBeOnTheScreen();
  });

  it('drops the explicit APY clause when apyPercent is undefined', () => {
    render(<SpendAndEarnPromoCard {...defaultProps} apyPercent={undefined} />);

    expect(
      screen.getByText(
        'Spend with your Money account and earn APY on your balance. Also get 1% mUSD back.',
      ),
    ).toBeOnTheScreen();
  });

  it('advertises the 3% Metal cashback rate when cashbackPercent is 3', () => {
    render(<SpendAndEarnPromoCard {...defaultProps} cashbackPercent={3} />);

    expect(
      screen.getByText(
        'Spend with your Money account and earn up to 4% APY on your balance. Also get 3% mUSD back.',
      ),
    ).toBeOnTheScreen();
  });

  it('invokes onPress when the CTA button is tapped', () => {
    const onPress = jest.fn();

    render(<SpendAndEarnPromoCard {...defaultProps} onPress={onPress} />);

    fireEvent.press(screen.getByTestId('use-money-account-cta'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes a default accessibility label on the CTA', () => {
    render(<SpendAndEarnPromoCard {...defaultProps} />);

    const target = screen.getByTestId('use-money-account-cta');
    expect(target.props.accessibilityLabel).toBe('Use Money account');
    expect(target.props.accessibilityRole).toBe('button');
  });

  it('honors a custom testID for the CTA and its shimmer overlay', () => {
    render(<SpendAndEarnPromoCard {...defaultProps} testID="custom-promo" />);

    expect(screen.getByTestId('custom-promo')).toBeOnTheScreen();
  });
});
