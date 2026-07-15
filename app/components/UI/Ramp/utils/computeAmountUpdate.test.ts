import { computeAmountUpdate } from './computeAmountUpdate';

describe('computeAmountUpdate', () => {
  describe('when valueOrNumber is a string', () => {
    it('returns amount "0" and amountAsNumber 0 for empty string', () => {
      const result = computeAmountUpdate('');
      expect(result).toEqual({ amount: '0', amountAsNumber: 0 });
    });

    it('returns the string as amount and parsed number when valueAsNumber not provided', () => {
      const result = computeAmountUpdate('50');
      expect(result).toEqual({ amount: '50', amountAsNumber: 50 });
    });

    it('uses valueAsNumber when provided instead of parsing the string', () => {
      const result = computeAmountUpdate('50.99', 42);
      expect(result).toEqual({ amount: '50.99', amountAsNumber: 42 });
    });

    it('uses parseFloat when valueAsNumber is undefined', () => {
      const result = computeAmountUpdate('123.45');
      expect(result).toEqual({ amount: '123.45', amountAsNumber: 123.45 });
    });

    it('returns 0 for amountAsNumber when string is non-numeric (parseFloat NaN)', () => {
      const result = computeAmountUpdate('abc');
      expect(result).toEqual({ amount: 'abc', amountAsNumber: 0 });
    });

    it('returns 0 for amountAsNumber when string is empty and valueAsNumber not provided', () => {
      const result = computeAmountUpdate('');
      expect(result.amountAsNumber).toBe(0);
    });
  });

  describe('when valueOrNumber is a number', () => {
    it('converts number to string for amount and uses number for amountAsNumber', () => {
      const result = computeAmountUpdate(100);
      expect(result).toEqual({ amount: '100', amountAsNumber: 100 });
    });

    it('handles zero', () => {
      const result = computeAmountUpdate(0);
      expect(result).toEqual({ amount: '0', amountAsNumber: 0 });
    });

    it('handles decimal numbers', () => {
      const result = computeAmountUpdate(99.5);
      expect(result).toEqual({ amount: '99.5', amountAsNumber: 99.5 });
    });
  });
});
