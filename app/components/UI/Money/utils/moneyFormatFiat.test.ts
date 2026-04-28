import { BigNumber } from 'bignumber.js';
// eslint-disable-next-line import-x/no-namespace
import * as NumberUtils from '../../../../util/number';
import { moneyFormatFiat } from './moneyFormatFiat';

describe('moneyFormatFiat', () => {
  let addCurrencySymbolSpy: jest.SpyInstance;

  beforeEach(() => {
    addCurrencySymbolSpy = jest.spyOn(NumberUtils, 'addCurrencySymbol');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('zero value', () => {
    it('passes 0.00 and the currency code to addCurrencySymbol', () => {
      moneyFormatFiat(new BigNumber(0), 'usd');

      expect(addCurrencySymbolSpy).toHaveBeenCalledWith('0.00', 'usd');
    });

    it('returns the formatted zero amount', () => {
      const result = moneyFormatFiat(new BigNumber(0), 'usd');

      expect(result).toBe('$0.00');
    });
  });

  describe('normal amounts (>= 0.01)', () => {
    it.each([
      ['exactly 0.01 (lower boundary)', new BigNumber(0.01), '0.01', '$0.01'],
      ['a whole number', new BigNumber(10), '10.00', '$10.00'],
      ['a decimal value', new BigNumber(10.5), '10.50', '$10.50'],
      ['a large value', new BigNumber(1000), '1000.00', '$1000.00'],
      [
        'a value truncated to 2 decimal places',
        new BigNumber(1.234),
        '1.23',
        '$1.23',
      ],
    ])(
      'formats %s with two decimal places and a currency symbol',
      (_label, value, expectedAmount, expectedResult) => {
        const result = moneyFormatFiat(value, 'usd');

        expect(addCurrencySymbolSpy).toHaveBeenCalledWith(
          expectedAmount,
          'usd',
        );
        expect(result).toBe(expectedResult);
      },
    );

    it('uses the provided currency code', () => {
      const result = moneyFormatFiat(new BigNumber(5), 'eur');

      expect(addCurrencySymbolSpy).toHaveBeenCalledWith('5.00', 'eur');
      expect(result).toBe('€5.00');
    });
  });

  describe('sub-cent amounts (> 0 and < 0.01)', () => {
    it.each([
      ['0.005', new BigNumber(0.005)],
      ['0.001', new BigNumber(0.001)],
      ['0.009', new BigNumber(0.009)],
    ])(
      'passes 0.01 to addCurrencySymbol and prepends < for %s',
      (_label, value) => {
        const result = moneyFormatFiat(value, 'usd');

        expect(addCurrencySymbolSpy).toHaveBeenCalledWith('0.01', 'usd');
        expect(result).toBe('<$0.01');
      },
    );

    it('uses the provided currency code for sub-cent amounts', () => {
      const result = moneyFormatFiat(new BigNumber(0.001), 'eur');

      expect(addCurrencySymbolSpy).toHaveBeenCalledWith('0.01', 'eur');
      expect(result).toBe('<€0.01');
    });
  });
});
