import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import SpendAndEarnPromoCard from './SpendAndEarnPromoCard';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'card.card_spending_limit.spend_and_earn_title': 'Spend and earn',
      'card.card_spending_limit.spend_and_earn_action_hint':
        'Tap to use Money account',
      'card.card_spending_limit.use_money_account_cta': 'Use Money account',
    };
    return map[key] ?? key;
  },
}));

describe('SpendAndEarnPromoCard', () => {
  const defaultProps = {
    apySubline: '4% APY while you spend',
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, APY subline and pressable hint', () => {
    render(<SpendAndEarnPromoCard {...defaultProps} />);

    expect(screen.getByText('Spend and earn')).toBeOnTheScreen();
    expect(screen.getByText('4% APY while you spend')).toBeOnTheScreen();
    expect(screen.getByText('Tap to use Money account')).toBeOnTheScreen();
  });

  it('renders an alternate subline when APY is not available', () => {
    render(
      <SpendAndEarnPromoCard
        {...defaultProps}
        apySubline="Earn while you spend"
      />,
    );

    expect(screen.getByText('Earn while you spend')).toBeOnTheScreen();
  });

  it('invokes onPress when the card is tapped', () => {
    const onPress = jest.fn();

    render(<SpendAndEarnPromoCard {...defaultProps} onPress={onPress} />);

    fireEvent.press(screen.getByTestId('use-money-account-cta'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes a default accessibility label for the press target', () => {
    render(<SpendAndEarnPromoCard {...defaultProps} />);

    const target = screen.getByTestId('use-money-account-cta');
    expect(target.props.accessibilityLabel).toBe('Use Money account');
    expect(target.props.accessibilityRole).toBe('button');
  });

  it('honors a custom testID', () => {
    render(<SpendAndEarnPromoCard {...defaultProps} testID="custom-promo" />);

    expect(screen.getByTestId('custom-promo')).toBeOnTheScreen();
  });
});
