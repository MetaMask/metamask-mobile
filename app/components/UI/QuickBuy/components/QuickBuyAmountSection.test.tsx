import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { QuickBuySheetSelectorsIDs } from '../QuickBuySheet.testIds';
import QuickBuyAmountSection, {
  formatAmountDigitsForDisplay,
} from './QuickBuyAmountSection';

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

const getElementChildren = (node: ReactTestInstance) =>
  node.children.filter(
    (child): child is ReactTestInstance => typeof child !== 'string',
  );

const getNumericContainer = (amountRow: ReactTestInstance) => {
  const numericContainer = getElementChildren(amountRow).find(
    (child) => child.props.accessible === false,
  );

  expect(numericContainer).toBeDefined();
  return numericContainer as ReactTestInstance;
};

const expectPrimaryAmountTypography = (amountRow: ReactTestInstance) => {
  const glyphs = getNumericContainer(amountRow).findAllByType(Text);

  expect(glyphs).not.toHaveLength(0);
  glyphs.forEach((glyph) => {
    expect(StyleSheet.flatten(glyph.props.style)).toEqual(
      expect.objectContaining({
        fontSize: 54,
        lineHeight: 70,
      }),
    );
  });
};

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

  it('renders the primary amount with 54px typography', () => {
    render(<QuickBuyAmountSection {...baseProps} />);

    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.AMOUNT_AREA),
    ).toHaveTextContent(/\$2\.55/);
    expectPrimaryAmountTypography(screen.getByRole('text', { name: '$2.55' }));
  });

  it('renders the secondary amount label when not loading', () => {
    render(<QuickBuyAmountSection {...baseProps} />);

    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.AMOUNT_AREA),
    ).toHaveTextContent(/\$2\.55/);
    expect(screen.getByText('≈ 56.52037 GIGA')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('quick-buy-amount-loading'),
    ).not.toBeOnTheScreen();
  });

  it('shows skeleton and token symbol while quote is loading', () => {
    render(<QuickBuyAmountSection {...baseProps} isQuoteLoading />);

    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.AMOUNT_AREA),
    ).toHaveTextContent(/\$2\.55/);
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

    const amountRow = screen.getByRole('text', { name: '$12.5' });
    const [prefix, numericAmount, cursor] = getElementChildren(amountRow);

    expect(prefix.props.children).toBe('$');
    expect(numericAmount.props.value).toBe('12.5');
    expect(cursor.props.testID).toBe('quick-buy-amount-cursor');
    expect(screen.getByTestId('quick-buy-amount-cursor')).toHaveStyle({
      height: 48,
    });
    expectPrimaryAmountTypography(amountRow);
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

    const amountRow = screen.getByRole('text', { name: '12,5 €' });
    const [numericAmount, cursor, suffix] = getElementChildren(amountRow);

    expect(numericAmount.props.value).toBe('12,5');
    expect(cursor.props.testID).toBe('quick-buy-amount-cursor');
    expect(screen.getByTestId('quick-buy-amount-cursor')).toHaveStyle({
      height: 48,
    });
    expect(suffix.props.children).toBe(' €');
    expectPrimaryAmountTypography(amountRow);
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

    const amountRow = screen.getByRole('text', { name: '1.25 CAKE' });
    const [numericAmount, cursor, suffix] = getElementChildren(amountRow);

    expect(numericAmount.props.value).toBe('1.25');
    expect(cursor.props.testID).toBe('quick-buy-amount-cursor');
    expect(screen.getByTestId('quick-buy-amount-cursor')).toHaveStyle({
      height: 48,
    });
    expect(suffix.props.children).toBe(' CAKE');
    expectPrimaryAmountTypography(amountRow);
  });

  it('hides the cursor when showCursor is false', () => {
    render(<QuickBuyAmountSection {...baseProps} />);

    expect(
      screen.queryByTestId('quick-buy-amount-cursor'),
    ).not.toBeOnTheScreen();
  });
});
