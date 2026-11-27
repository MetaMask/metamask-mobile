import React from 'react';
import { render } from '@testing-library/react-native';
import CardBalanceDisplay, {
  formatCardHomeZeroBalance,
  isBareZeroBalanceAmount,
} from './CardBalanceDisplay';
import { CardHomeSelectors } from '../CardHome.testIds';
import { MoneyBalanceSummaryTestIds } from '../../../../Money/components/MoneyBalanceSummary/MoneyBalanceSummary.testIds';
import I18n, { strings } from '../../../../../../../locales/i18n';

const baseProps = {
  isLoading: false,
  balanceAmount: undefined,
  privacyMode: false,
  onTogglePrivacy: jest.fn(),
};

describe('isBareZeroBalanceAmount', () => {
  it.each([
    ['undefined', undefined],
    ['empty', ''],
    ['whitespace only', '   '],
    ['plain zero', '0'],
    ['decimal zero', '0.0'],
    ['long decimal zero', '0.000'],
  ])('treats %s as a bare zero', (_label, amount) => {
    expect(isBareZeroBalanceAmount(amount)).toBe(true);
  });

  it.each([
    ['token-unit zero', '0.000000 USDC'],
    ['small non-zero', '0.01'],
    ['non-zero', '1,000.00'],
  ])('leaves %s alone', (_label, amount) => {
    expect(isBareZeroBalanceAmount(amount)).toBe(false);
  });
});

describe('formatCardHomeZeroBalance', () => {
  const originalLocale = I18n.locale;

  afterEach(() => {
    I18n.locale = originalLocale;
  });

  it.each([
    ['USD', '$0.00'],
    ['EUR', '€0.00'],
    ['JPY', '¥0'],
  ])('formats zero as %s in the en-US locale', (currency, expected) => {
    I18n.locale = 'en-US';

    expect(formatCardHomeZeroBalance(currency)).toBe(expected);
  });

  it('formats zero with an already-uppercased currency', () => {
    I18n.locale = 'en-US';

    expect(formatCardHomeZeroBalance('eur')).toBe('€0.00');
  });

  it('falls back to USD when no currency is available', () => {
    I18n.locale = 'en-US';

    expect(formatCardHomeZeroBalance(undefined)).toBe('$0.00');
    expect(formatCardHomeZeroBalance('')).toBe('$0.00');
  });
});

describe('CardBalanceDisplay', () => {
  const originalLocale = I18n.locale;

  afterEach(() => {
    I18n.locale = originalLocale;
  });

  it('renders the unavailable dash state when the balance could not be read', () => {
    const { queryByText, getByTestId } = render(
      <CardBalanceDisplay {...baseProps} isUnavailable />,
    );

    expect(
      getByTestId(MoneyBalanceSummaryTestIds.BALANCE_UNAVAILABLE),
    ).toBeOnTheScreen();
    expect(queryByText('$0.00')).toBeNull();
  });

  it('renders a bare zero as currency instead of "0"', () => {
    I18n.locale = 'en-US';
    const { getByTestId, queryByText } = render(
      <CardBalanceDisplay {...baseProps} balanceAmount="0" />,
    );

    expect(getByTestId(MoneyBalanceSummaryTestIds.BALANCE)).toHaveTextContent(
      '$0.00',
    );
    expect(queryByText('0')).toBeNull();
  });

  it('renders a missing balance as currency instead of "0"', () => {
    I18n.locale = 'en-US';
    const { getByTestId } = render(<CardBalanceDisplay {...baseProps} />);

    expect(getByTestId(MoneyBalanceSummaryTestIds.BALANCE)).toHaveTextContent(
      '$0.00',
    );
  });

  it('passes a non-zero balance through unchanged', () => {
    I18n.locale = 'en-US';
    const { getByTestId } = render(
      <CardBalanceDisplay {...baseProps} balanceAmount="$1,000.00" />,
    );

    expect(getByTestId(MoneyBalanceSummaryTestIds.BALANCE)).toHaveTextContent(
      '$1,000.00',
    );
  });

  it('leaves a token-unit zero alone so the unit stays visible', () => {
    I18n.locale = 'en-US';
    const { getByTestId } = render(
      <CardBalanceDisplay {...baseProps} balanceAmount="0.000000 USDC" />,
    );

    expect(getByTestId(MoneyBalanceSummaryTestIds.BALANCE)).toHaveTextContent(
      '0.000000 USDC',
    );
  });

  it('labels the info button with what it opens, not the visible text', () => {
    const { getByLabelText } = render(
      <CardBalanceDisplay
        {...baseProps}
        balanceAmount="$10.00"
        showInfoBadge
        onInfoPress={jest.fn()}
      />,
    );

    expect(
      getByLabelText(strings('card.card_home.available_balance_info')),
    ).toBeOnTheScreen();
  });

  it('keeps the balance skeleton while loading', () => {
    const { getByTestId } = render(
      <CardBalanceDisplay {...baseProps} isLoading />,
    );

    expect(getByTestId(CardHomeSelectors.BALANCE_SKELETON)).toBeOnTheScreen();
  });

  it('reserves the subtitle row while loading', () => {
    const { getByTestId } = render(
      <CardBalanceDisplay {...baseProps} isLoading />,
    );

    expect(
      getByTestId(CardHomeSelectors.BALANCE_SUBTITLE_SKELETON),
    ).toBeOnTheScreen();
  });

  it('uses the passed currency for the zero figure', () => {
    I18n.locale = 'en-US';
    const { getByTestId } = render(
      <CardBalanceDisplay
        {...baseProps}
        balanceAmount="0"
        currentCurrency="EUR"
      />,
    );

    expect(getByTestId(MoneyBalanceSummaryTestIds.BALANCE)).toHaveTextContent(
      '€0.00',
    );
  });
});
