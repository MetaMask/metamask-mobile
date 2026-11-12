import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import QuickBuyAmountSection, {
  formatAmountDigitsForDisplay,
} from './QuickBuyAmountSection';
import { getFontSizeForInputLength } from '../../../../component-library/components-temp/AnimatedAmountDisplay';
import { mockTheme } from '../../../../util/theme';
import { QuickBuySheetSelectorsIDs } from '../QuickBuySheet.testIds';
import I18n from '../../../../../locales/i18n';

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  strings: (key: string) => key,
  default: { locale: 'en', strings: (key: string) => key },
}));

const mockI18n = jest.mocked(I18n);

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'HIGH'),
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(() => 'WIFI'),
}));

describe('formatAmountDigitsForDisplay', () => {
  it('keeps dot decimals when the currency uses a dot separator', () => {
    expect(formatAmountDigitsForDisplay('12.5', '.')).toBe('12.5');
  });

  it('swaps to a locale decimal separator while editing', () => {
    expect(formatAmountDigitsForDisplay('12.5', ',')).toBe('12,5');
  });

  it('groups integer digits without colliding with the currency decimal separator', () => {
    expect(formatAmountDigitsForDisplay('1234.56', ',')).toBe('1.234,56');
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

    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.AMOUNT_LABEL),
    ).toHaveTextContent('$2.55');
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

    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.AMOUNT_LABEL),
    ).toHaveTextContent('$2.55');
    expect(screen.getByText('≈ 56.52037 GIGA')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('quick-buy-amount-loading'),
    ).not.toBeOnTheScreen();
  });

  it('shows skeleton and token symbol while quote is loading', () => {
    render(<QuickBuyAmountSection {...baseProps} isQuoteLoading />);

    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.AMOUNT_LABEL),
    ).toHaveTextContent('$2.55');
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
    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.AMOUNT_LABEL),
    ).toHaveTextContent('12.5');
    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.AMOUNT_CURSOR),
    ).toBeOnTheScreen();
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
      screen.getByTestId(QuickBuySheetSelectorsIDs.AMOUNT_CURSOR).props.style,
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
    // French renders the currency symbol after the digits, so the symbol is a
    // suffix while editing. The app formatters are language-only, so `fr-FR`
    // formats with `fr`.
    const previousLocale = mockI18n.locale;
    mockI18n.locale = 'fr-FR';
    try {
      render(
        <QuickBuyAmountSection
          {...baseProps}
          showCursor
          fiatAmount="12.5"
          currency="EUR"
          fiatAmountLabel="12,5 €"
        />,
      );

      expect(
        screen.getByTestId(QuickBuySheetSelectorsIDs.AMOUNT_LABEL),
      ).toHaveTextContent('12,5');
      expect(screen.getByText(' €')).toBeOnTheScreen();
      expect(
        screen.getByTestId(QuickBuySheetSelectorsIDs.AMOUNT_CURSOR),
      ).toBeOnTheScreen();
    } finally {
      mockI18n.locale = previousLocale;
    }
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

    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.AMOUNT_LABEL),
    ).toHaveTextContent('1.25');
    expect(screen.getByText(' CAKE')).toBeOnTheScreen();
    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.AMOUNT_CURSOR),
    ).toBeOnTheScreen();
  });

  it('hides the cursor when showCursor is false', () => {
    render(<QuickBuyAmountSection {...baseProps} />);

    expect(
      screen.queryByTestId(QuickBuySheetSelectorsIDs.AMOUNT_CURSOR),
    ).not.toBeOnTheScreen();
  });

  it('labels the interactive amount with the complete visible value', () => {
    render(
      <QuickBuyAmountSection {...baseProps} onAmountAreaPress={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: '$2.55' })).toBeOnTheScreen();
    expect(screen.queryByRole('text', { name: '$2.55' })).not.toBeOnTheScreen();
  });
});

describe('QuickBuyAmountSection open-keypad symbol', () => {
  const actualNumberFormat = Intl.NumberFormat;

  beforeEach(() => {
    mockI18n.locale = 'en';
    jest.spyOn(Intl, 'NumberFormat').mockImplementation((locale, options) => {
      delete options?.currencyDisplay;
      return actualNumberFormat(locale, options);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockI18n.locale = 'en';
  });

  it('shows $ as the amount prefix on en-GB devices, never US$', () => {
    mockI18n.locale = 'en-GB';

    render(
      <QuickBuyAmountSection
        amountDisplayMode="fiat"
        fiatAmountLabel="$0"
        destSymbol="GIGA"
        estimatedReceiveAmount={undefined}
        isQuoteLoading={false}
        showCursor
        fiatAmount="0"
        currency="usd"
      />,
    );

    expect(screen.getByText('$')).toBeOnTheScreen();
    expect(screen.queryByText('US$')).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.AMOUNT_LABEL),
    ).toHaveTextContent('0');
  });
});

describe('QuickBuyAmountSection post minimum disclaimer', () => {
  const baseProps = {
    amountDisplayMode: 'fiat' as const,
    fiatAmountLabel: '$0',
    destSymbol: 'ETH',
    estimatedReceiveAmount: undefined,
    isQuoteLoading: false,
  };

  it('replaces the secondary line with the buy disclaimer when the amount is empty', () => {
    render(
      <QuickBuyAmountSection {...baseProps} tradeMode="buy" isEmptyAmount />,
    );

    expect(
      screen.getByText('social_leaderboard.quick_buy.min_post_buy'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('0 ETH')).not.toBeOnTheScreen();
  });

  it('shows the sell disclaimer below the available balance when the amount is empty', () => {
    render(
      <QuickBuyAmountSection
        {...baseProps}
        tradeMode="sell"
        isEmptyAmount
        sourceBalanceDisplay="$18.46"
      />,
    );

    expect(
      screen.getByText('social_leaderboard.quick_buy.available_balance'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-post-disclaimer')).toHaveTextContent(
      'social_leaderboard.quick_buy.min_post_sell',
    );
  });

  it('hides the disclaimer once an amount is entered', () => {
    render(
      <QuickBuyAmountSection
        {...baseProps}
        fiatAmountLabel="$5"
        fiatAmount="5"
        tradeMode="buy"
        isEmptyAmount={false}
      />,
    );

    expect(
      screen.queryByText('social_leaderboard.quick_buy.min_post_buy'),
    ).not.toBeOnTheScreen();
  });
});
