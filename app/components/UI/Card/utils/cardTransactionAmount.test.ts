import { formatCardAmount } from './cardTransactionAmount';

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
});
