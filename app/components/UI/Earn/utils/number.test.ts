import { parseFloatSafe } from './number';

describe('parseFloatSafe', () => {
  describe('positive floats', () => {
    it('parses float string', () => {
      const result = parseFloatSafe('75.12');
      expect(result).toEqual(75.12);
    });

    it('parses out non-integer or non-decimal characters', () => {
      const result = parseFloatSafe(',[]{}()/?*&%$#@!312.12+=-_|;:');
      expect(result).toEqual(312.12);
    });

    it('parses whole number', () => {
      const result = parseFloatSafe('!@#$%^312(){}/');
      expect(result).toEqual(312);
    });
  });

  describe('negative float string', () => {
    it('parses negative float strings', () => {
      const result = parseFloatSafe('-12.5');
      expect(result).toEqual(-12.5);
    });

    it('parses out non-integer or non-decimal characters', () => {
      const result = parseFloatSafe('-,[]{}()/?*&%$#@!-312.12+=-_|;:');
      expect(result).toEqual(-312.12);
    });

    it('parses whole number', () => {
      const result = parseFloatSafe('!@#$%^-312(){}/');
      expect(result).toEqual(-312);
    });
  });

  describe('invalid float string', () => {
    it('returns NaN value when str is empty string', () => {
      const result = parseFloatSafe('');
      expect(result).toEqual(NaN);
    });

    it('returns NaN value when str is undefined', () => {
      // @ts-expect-error forcing code path for test coverage
      const result = parseFloatSafe(undefined);
      expect(result).toEqual(NaN);
    });
  });

  describe('empty and whitespace inputs', () => {
    it('returns NaN for whitespace-only input', () => {
      const result = parseFloatSafe('   ');
      expect(result).toEqual(NaN);
    });
  });

  describe('no digits', () => {
    it('returns NaN when no digits exist in the string', () => {
      const result = parseFloatSafe('abc');
      expect(result).toEqual(NaN);
    });

    it('returns NaN when only non-numeric symbols exist', () => {
      const result = parseFloatSafe('-.');
      expect(result).toEqual(NaN);
    });
  });

  describe('negative number edge cases', () => {
    it('ignores minus sign when space exists between minus and digit', () => {
      const result = parseFloatSafe('- 123');
      expect(result).toEqual(123);
    });

    it('only considers the minus directly before first digit', () => {
      const result = parseFloatSafe('--123');
      expect(result).toEqual(-123);
    });

    it('ignores minus signs after digits have started', () => {
      const result = parseFloatSafe('123-456');
      expect(result).toEqual(123);
    });

    it('handles minus sign when other characters exist before it', () => {
      const result = parseFloatSafe('{}()?-312.12+=-_|;:');
      expect(result).toEqual(-312.12);
    });
  });

  describe('decimal point edge cases', () => {
    it('handles number starting with decimal point', () => {
      const result = parseFloatSafe('.123');
      expect(result).toEqual(0.123);
    });

    it('handles number ending with decimal point', () => {
      const result = parseFloatSafe('123.');
      expect(result).toEqual(123);
    });

    it('returns NaN for just a decimal point', () => {
      const result = parseFloatSafe('.');
      expect(result).toEqual(NaN);
    });

    it('returns NaN for multiple decimal points with no digits', () => {
      const result = parseFloatSafe('...');
      expect(result).toEqual(NaN);
    });

    it('returns NaN for multiple decimal points before any digit', () => {
      const result = parseFloatSafe('..123');
      expect(result).toEqual(NaN);
    });

    it('stops parsing at second decimal point', () => {
      const result = parseFloatSafe('312.12.34.56');
      expect(result).toEqual(312.12);
    });
  });

  describe('leading zeros', () => {
    it('handles multiple leading zeros', () => {
      const result = parseFloatSafe('000123');
      expect(result).toEqual(123);
    });

    it('handles leading zeros before decimal point', () => {
      const result = parseFloatSafe('00.123');
      expect(result).toEqual(0.123);
    });
  });

  describe('scientific notation', () => {
    it('does not interpret scientific notation as in native parseFloat', () => {
      const result = parseFloatSafe('1e3');
      expect(result).toEqual(1);
    });

    it('parses only the numeric part of scientific notation', () => {
      const result = parseFloatSafe('1.2e3');
      expect(result).toEqual(1.2);
    });

    it('treats e as a non-numeric character', () => {
      const result = parseFloatSafe('1.2e-3');
      expect(result).toEqual(1.2);
    });
  });

  describe('other special cases', () => {
    it('treats Infinity as a non-numeric string', () => {
      const result = parseFloatSafe('Infinity');
      expect(result).toEqual(NaN);
    });

    it('ignores commas in numbers', () => {
      const result = parseFloatSafe('1,000.00');
      expect(result).toEqual(1000);
    });

    it('handles currency symbols before negative numbers', () => {
      const result = parseFloatSafe('$-123.45');
      expect(result).toEqual(-123.45);
    });
  });

  describe('large numbers', () => {
    it('handles very large numbers', () => {
      const largeNumber = '9'.repeat(15); // Large number without overflowing JS number
      const result = parseFloatSafe(largeNumber);
      expect(result).toEqual(Number(largeNumber));
    });

    it('handles very small decimals', () => {
      const smallDecimal = '0.' + '0'.repeat(15) + '1';
      const result = parseFloatSafe(smallDecimal);
      expect(result).toEqual(Number(smallDecimal));
    });
  });

  describe('mixed scenarios', () => {
    it('correctly handles complex mixed scenario 1', () => {
      const result = parseFloatSafe('abc-123.45xyz.789');
      expect(result).toEqual(-123.45);
    });

    it('correctly handles complex mixed scenario 2', () => {
      const result = parseFloatSafe('price:$-0.50 (discount)');
      expect(result).toEqual(-0.5);
    });
  });
});
