import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import QuickBuyAmountSection, {
  formatAmountDigitsForDisplay,
} from './QuickBuyAmountSection';
import { getFontSizeForInputLength } from '../../../../component-library/components-temp/AnimatedAmountDisplay';
import { mockTheme } from '../../../../util/theme';

jest.mock('../../Bridge/utils/currencyUtils', () => ({
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

describe('formatAmountDigitsForDisplay', () => {
  it('keeps dot decimals when the currency uses a dot separator', () => {
    expect(formatAmountDigitsForDisplay('12.5', '.')).toBe('12.5');
  });

  it('swaps to a locale decimal separator while editing', () => {
    expect(formatAmountDigitsForDisplay('12.5', ',')).toBe('12,5');
  });

  it('falls back to 0 for an empty amount', () => {
    expect(formatAmountDigitsForDisplay('', ',')).toBe('0');
  });
});

describe('QuickBuyAmountSection', () => {
  const baseProps = {
    amountDisplayMode: 'fiat' as const,
    fiatAmountLabel: '$2.55',
    destSymbol: 'GIGA',
    estimatedReceiveAmount: '56.52037',
    isQuoteLoading: false,
  };

  it('sizes the primary amount with the send length scale', () => {
    render(<QuickBuyAmountSection {...baseProps} />);

    const fontSize = getFontSizeForInputLength('$2.55'.length + 2);

    expect(screen.getByTestId('quick-buy-amount-value')).toHaveTextContent(
      '$2.55',
    );
    expect(StyleSheet.flatten(screen.getByText('$').props.style)).toMatchObject(
      {
        fontFamily: 'GrotzecCond-Bold',
        fontSize,
        lineHeight: fontSize,
      },
    );
  });

  it('holds the amount row at the largest font step for long amounts', () => {
    render(
      <QuickBuyAmountSection
        {...baseProps}
        showCursor
        fiatAmount="123456789012.5"
        currency="USD"
      />,
    );

    expect(screen.getByTestId('quick-buy-amount-row')).toHaveStyle({
      minHeight: getFontSizeForInputLength(0),
    });
  });

  it('renders the secondary amount label when not loading', () => {
    render(<QuickBuyAmountSection {...baseProps} />);

    expect(screen.getByTestId('quick-buy-amount-value')).toHaveTextContent(
      '$2.55',
    );
    expect(screen.getByText('≈ 56.52037 GIGA')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('quick-buy-amount-loading'),
    ).not.toBeOnTheScreen();
  });

  it('shows skeleton and token symbol while quote is loading', () => {
    render(<QuickBuyAmountSection {...baseProps} isQuoteLoading />);

    expect(screen.getByTestId('quick-buy-amount-value')).toHaveTextContent(
      '$2.55',
    );
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
    expect(screen.getByTestId('quick-buy-amount-value')).toHaveTextContent(
      '12.5',
    );
    expect(screen.getByTestId('quick-buy-amount-cursor')).toBeOnTheScreen();
  });

  it('sizes the caret to the confirmation cursor scale', () => {
    render(
      <QuickBuyAmountSection
        {...baseProps}
        showCursor
        fiatAmount="12.5"
        currency="USD"
      />,
    );

    const fontSize = getFontSizeForInputLength('$'.length + '12.5'.length + 2);
    const cursorStyle = StyleSheet.flatten(
      screen.getByTestId('quick-buy-amount-cursor').props.style,
    );

    expect(cursorStyle).toMatchObject({
      width: 1,
      height: Math.round(fontSize * 0.95),
      backgroundColor: mockTheme.colors.text.muted,
      transform: [{ translateY: Math.round(fontSize * -0.04) }],
    });
    expect(cursorStyle.marginHorizontal).toBeUndefined();
  });

  it('places the caret before a suffix currency and uses its decimal separator', () => {
    render(
      <QuickBuyAmountSection
        {...baseProps}
        showCursor
        fiatAmount="12.5"
        currency="EUR"
        fiatAmountLabel="12,5 €"
      />,
    );

    expect(screen.getByTestId('quick-buy-amount-value')).toHaveTextContent(
      '12,5',
    );
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

    expect(screen.getByTestId('quick-buy-amount-value')).toHaveTextContent(
      '1.25',
    );
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
