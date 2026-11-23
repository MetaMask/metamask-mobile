import {
  getCurrencyMinorUnits,
  minorUnitsToDecimal,
} from './currencyMinorUnits';

describe('currencyMinorUnits', () => {
  describe('getCurrencyMinorUnits', () => {
    it('returns 2 for unknown currencies', () => {
      expect(getCurrencyMinorUnits('USD')).toBe(2);
      expect(getCurrencyMinorUnits('EUR')).toBe(2);
    });

    it('returns known exceptions', () => {
      expect(getCurrencyMinorUnits('JPY')).toBe(0);
      expect(getCurrencyMinorUnits('KWD')).toBe(3);
      expect(getCurrencyMinorUnits('jpy')).toBe(0);
    });
  });

  describe('minorUnitsToDecimal', () => {
    it('converts USD minor units', () => {
      expect(minorUnitsToDecimal('31412', 'USD')).toBe('314.12');
      expect(minorUnitsToDecimal('12', 'USD')).toBe('0.12');
      expect(minorUnitsToDecimal('0', 'USD')).toBe('0');
    });

    it('converts zero-decimal currencies', () => {
      expect(minorUnitsToDecimal('500', 'JPY')).toBe('500');
    });

    it('converts three-decimal currencies', () => {
      expect(minorUnitsToDecimal('1234', 'KWD')).toBe('1.234');
    });

    it('strips trailing zeros from the fractional part', () => {
      expect(minorUnitsToDecimal('1000', 'USD')).toBe('10');
      expect(minorUnitsToDecimal('1010', 'USD')).toBe('10.1');
    });

    it('preserves a leading minus', () => {
      expect(minorUnitsToDecimal('-25000', 'USD')).toBe('-250');
    });
  });
});
