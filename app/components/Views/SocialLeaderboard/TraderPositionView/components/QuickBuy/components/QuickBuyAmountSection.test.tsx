import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import QuickBuyAmountSection from './QuickBuyAmountSection';

jest.mock('../../../../../../UI/Bridge/utils/currencyUtils', () => ({
  formatCurrency: jest.fn((amount: number, currency: string) => {
    if (currency === 'EUR') {
      return `${amount} €`;
    }
    return `$${amount}`;
  }),
  getCurrencySymbol: jest.fn((currency: string) => {
    if (currency === 'EUR') {
      return '€';
    }
    return '$';
  }),
}));

describe('QuickBuyAmountSection', () => {
  const baseProps = {
    amountDisplayMode: 'fiat' as const,
    fiatAmountLabel: '$2.55',
    destSymbol: 'GIGA',
    estimatedReceiveAmount: '56.52037',
    isQuoteLoading: false,
  };

  it('renders the secondary amount label when not loading', () => {
    render(<QuickBuyAmountSection {...baseProps} />);

    expect(screen.getByText('$2.55')).toBeOnTheScreen();
    expect(screen.getByText('56.52037 GIGA')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('quick-buy-amount-loading'),
    ).not.toBeOnTheScreen();
  });

  it('shows skeleton and token symbol while quote is loading', () => {
    render(<QuickBuyAmountSection {...baseProps} isQuoteLoading />);

    expect(screen.getByText('$2.55')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-amount-loading')).toBeOnTheScreen();
    expect(
      screen.getByTestId('quick-buy-amount-loading-skeleton'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('quick-buy-amount-loading-symbol'),
    ).toHaveTextContent('GIGA');
    expect(
      screen.queryByTestId('quick-buy-amount-loading-icon'),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText('56.52037 GIGA')).not.toBeOnTheScreen();
  });

  it('is not pressable when no onAmountAreaPress is provided (control)', () => {
    render(<QuickBuyAmountSection {...baseProps} />);

    expect(
      screen.queryByTestId('quick-buy-amount-area-pressable'),
    ).not.toBeOnTheScreen();
  });

  it('opens the keypad when the headline is tapped (treatment)', () => {
    const onAmountAreaPress = jest.fn();
    render(
      <QuickBuyAmountSection
        {...baseProps}
        onAmountAreaPress={onAmountAreaPress}
      />,
    );

    fireEvent.press(screen.getByTestId('quick-buy-amount-area-pressable'));

    expect(onAmountAreaPress).toHaveBeenCalledTimes(1);
  });

  it('places the caret after the amount digits for a prefix currency', () => {
    render(
      <QuickBuyAmountSection
        {...baseProps}
        showCursor
        fiatAmount="12.5"
        currency="USD"
      />,
    );

    expect(screen.getByText('$')).toBeOnTheScreen();
    expect(screen.getByText('12.5')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-amount-cursor')).toBeOnTheScreen();
  });

  it('places the caret before a suffix currency symbol', () => {
    render(
      <QuickBuyAmountSection
        {...baseProps}
        showCursor
        fiatAmount="12.5"
        currency="EUR"
        fiatAmountLabel="12.5 €"
      />,
    );

    expect(screen.getByText('12.5')).toBeOnTheScreen();
    expect(screen.getByText(' €')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-amount-cursor')).toBeOnTheScreen();
  });

  it('places the caret before the token symbol for unpriced sources', () => {
    render(
      <QuickBuyAmountSection
        {...baseProps}
        showCursor
        isUnpricedSource
        sourceCryptoAmount="1.25"
        sourceSymbol="CAKE"
      />,
    );

    expect(screen.getByText('1.25')).toBeOnTheScreen();
    expect(screen.getByText(' CAKE')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-amount-cursor')).toBeOnTheScreen();
  });

  it('hides the cursor when showCursor is false', () => {
    render(<QuickBuyAmountSection {...baseProps} />);

    expect(
      screen.queryByTestId('quick-buy-amount-cursor'),
    ).not.toBeOnTheScreen();
  });
});
