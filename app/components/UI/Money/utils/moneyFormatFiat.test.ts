import { BigNumber } from 'bignumber.js';
import { addCurrencySymbol } from '../../../../util/number';
import { moneyFormatFiat } from './moneyFormatFiat';

jest.mock('../../../../util/number', () => ({
  addCurrencySymbol: jest.fn(
    (amount: string, currency: string) => `${currency}${amount}`,
  ),
}));

const mockAddCurrencySymbol = addCurrencySymbol as jest.MockedFunction<
  typeof addCurrencySymbol
>;

describe('moneyFormatFiat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('zero value', () => {
    it('formats zero as 0.00 with currency symbol', () => {
      const result = moneyFormatFiat(new BigNumber(0), 'usd');

      expect(mockAddCurrencySymbol).toHaveBeenCalledWith('0.00', 'usd');
      expect(result).toBe('usd0.00');
    });
  });

  describe('normal amounts (>= 0.01)', () => {
    it.each([
      ['exactly 0.01 (lower boundary)', new BigNumber(0.01), 'usd', '0.01'],
      ['a whole number', new BigNumber(10), 'usd', '10.00'],
      ['a decimal value', new BigNumber(10.5), 'usd', '10.50'],
      ['a large value', new BigNumber(1000), 'usd', '1000.00'],
      [
        'a value truncated to 2 decimal places',
        new BigNumber(1.234),
        'usd',
        '1.23',
      ],
    ])(
      'formats %s with two decimal places and currency symbol',
      (_label, value, currency, expectedAmount) => {
        const result = moneyFormatFiat(value, currency);

        expect(mockAddCurrencySymbol).toHaveBeenCalledWith(
          expectedAmount,
          currency,
        );
        expect(result).toBe(`${currency}${expectedAmount}`);
      },
    );

    it('uses the provided currency code', () => {
      moneyFormatFiat(new BigNumber(5), 'eur');

      expect(mockAddCurrencySymbol).toHaveBeenCalledWith('5.00', 'eur');
    });
  });

  describe('sub-cent amounts (> 0 and < 0.01)', () => {
    it.each([
      ['0.005', new BigNumber(0.005)],
      ['0.001', new BigNumber(0.001)],
      ['0.009', new BigNumber(0.009)],
    ])('returns "< [symbol]0.01" for %s', (_label, value) => {
      const result = moneyFormatFiat(value, 'usd');

      expect(mockAddCurrencySymbol).toHaveBeenCalledWith('0.01', 'usd');
      expect(result).toBe('< usd0.01');
    });

    it('uses the provided currency code in the small-amount prefix', () => {
      const result = moneyFormatFiat(new BigNumber(0.001), 'eur');

      expect(mockAddCurrencySymbol).toHaveBeenCalledWith('0.01', 'eur');
      expect(result).toBe('< eur0.01');
    });
  });
});
