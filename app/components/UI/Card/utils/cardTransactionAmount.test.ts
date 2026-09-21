import {
  formatCardAmount,
  formatNetworkFeeLabel,
} from './cardTransactionAmount';

jest.mock('../../../../../locales/i18n', () => ({
  default: { locale: 'en-US' },
}));

jest.mock('../../../../util/intl', () => ({
  getIntlNumberFormatter: (
    _locale: string,
    options?: Intl.NumberFormatOptions,
  ) => ({
    format: (value: number) => {
      if (options?.currency === 'BRL') {
        return `R$${value.toFixed(2)}`;
      }
      if (options?.currency === 'USD') {
        return `$${value.toFixed(2)}`;
      }
      if (options?.currency === 'INVALID') {
        throw new RangeError('Invalid currency code');
      }
      return `${value} ${options?.currency ?? ''}`;
    },
  }),
}));

describe('formatCardAmount', () => {
  it('formats a USD amount with a narrow dollar symbol', () => {
    const result = formatCardAmount({ value: '11.95', currency: 'USD' });

    expect(result).toBe('$11.95');
  });

  it('formats a BRL amount with a reais symbol', () => {
    const result = formatCardAmount({ value: '61.35', currency: 'BRL' });

    expect(result).toBe('R$61.35');
  });

  it('prefixes a debit amount with a minus sign', () => {
    const result = formatCardAmount({ value: '11.95', currency: 'USD' }, true);

    expect(result).toBe('-$11.95');
  });

  it('prefixes a credit amount with a plus sign', () => {
    const result = formatCardAmount({ value: '5.00', currency: 'USD' }, false);

    expect(result).toBe('+$5.00');
  });

  it('falls back to value and currency code when Intl rejects the currency', () => {
    const result = formatCardAmount(
      { value: '10.00', currency: 'INVALID' },
      true,
    );

    expect(result).toBe('-10.00 INVALID');
  });

  it('omits a sign when isDebit is omitted', () => {
    const result = formatCardAmount({ value: '3.00', currency: 'USD' });

    expect(result).toBe('$3.00');
  });

  it('falls back to raw value and currency for non-numeric amounts', () => {
    const result = formatCardAmount({ value: 'n/a', currency: 'USD' }, true);

    expect(result).toBe('-n/a USD');
  });

  it('keeps the unsigned fallback when Intl rejects the currency and isDebit is omitted', () => {
    const result = formatCardAmount({ value: '10.00', currency: 'INVALID' });

    expect(result).toBe('10.00 INVALID');
  });
});

describe('formatNetworkFeeLabel', () => {
  it('returns undefined when feeAmount is undefined', () => {
    expect(formatNetworkFeeLabel(undefined)).toBeUndefined();
  });

  it('formats a numeric fee to two decimal places with the currency code', () => {
    const result = formatNetworkFeeLabel({ value: '0.02', currency: 'USDC' });

    expect(result).toBe('0.02 USDC');
  });

  it('rounds to two decimal places', () => {
    const result = formatNetworkFeeLabel({ value: '1.5', currency: 'USDC' });

    expect(result).toBe('1.50 USDC');
  });

  it('renders <0.01 when the fee is below the minimum displayable amount', () => {
    const result = formatNetworkFeeLabel({ value: '0.005', currency: 'USDC' });

    expect(result).toBe('<0.01 USDC');
  });

  it('renders <0.01 for a zero fee', () => {
    const result = formatNetworkFeeLabel({ value: '0', currency: 'USDC' });

    expect(result).toBe('<0.01 USDC');
  });

  it('falls back to the raw value string when the value is not numeric', () => {
    const result = formatNetworkFeeLabel({ value: 'n/a', currency: 'USDC' });

    expect(result).toBe('n/a USDC');
  });

  it('uses the assetSymbol override when provided', () => {
    const result = formatNetworkFeeLabel(
      { value: '0.02', currency: 'USD' },
      'mUSD',
    );

    expect(result).toBe('0.02 mUSD');
  });

  it('falls back to feeAmount.currency when assetSymbol is omitted', () => {
    const result = formatNetworkFeeLabel({ value: '0.02', currency: 'USDC' });

    expect(result).toBe('0.02 USDC');
  });
});
