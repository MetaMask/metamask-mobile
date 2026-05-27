import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import SpendAndEarnPromoCard from './SpendAndEarnPromoCard';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string | number>) => {
    if (key === 'card.card_spending_limit.spend_and_earn_description_apy') {
      return `${params?.apy}% APY`;
    }
    const map: Record<string, string> = {
      'card.card_spending_limit.spend_and_earn_title': 'Spend and earn',
      'card.card_spending_limit.spend_and_earn_description_prefix':
        'Link your balance to your card and get mUSD back on purchases. Plus, earn up to ',
      'card.card_spending_limit.spend_and_earn_description_suffix':
        ' on your balance.',
      'card.card_spending_limit.spend_and_earn_description_no_apy':
        'Link your balance to your card and get mUSD back on purchases.',
      'card.card_spending_limit.spend_and_earn_cta': 'Link card',
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

  it('renders the title, description with APY highlight, and CTA label', () => {
    render(<SpendAndEarnPromoCard {...defaultProps} />);

    expect(screen.getByText('Spend and earn')).toBeOnTheScreen();
    expect(
      screen.getByText(
        /Link your balance to your card and get mUSD back on purchases\. Plus, earn up to 4% APY on your balance\./,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Link card')).toBeOnTheScreen();
  });

  it('drops the APY clause when apyPercent is undefined', () => {
    render(<SpendAndEarnPromoCard {...defaultProps} apyPercent={undefined} />);

    expect(
      screen.getByText(
        'Link your balance to your card and get mUSD back on purchases.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('4% APY')).not.toBeOnTheScreen();
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
