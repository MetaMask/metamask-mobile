import { parseFloatSafe, truncateNumber } from './number';

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

describe('truncateNumber', () => {
  describe('basic inputs', () => {
    it('returns truncated string for number input with 2 decimals', () => {
      const input = 5.78;

      const result = truncateNumber(input);

      expect(result).toBe('5.78');
    });

    it('returns truncated string for string input with 2 decimals', () => {
      const input = '5.78';

      const result = truncateNumber(input);

      expect(result).toBe('5.78');
    });

    it('returns whole number without decimal for integer input', () => {
      const input = 42;

      const result = truncateNumber(input);

      expect(result).toBe('42');
    });

    it('returns whole number without decimal for string integer input', () => {
      const input = '42';

      const result = truncateNumber(input);

      expect(result).toBe('42');
    });
  });

  describe('truncation behavior', () => {
    it('truncates instead of rounding up for 3+ decimals', () => {
      const input = 5.789;

      const result = truncateNumber(input);

      expect(result).toBe('5.78');
    });

    it('truncates instead of rounding when third decimal is 9', () => {
      const input = 5.999;

      const result = truncateNumber(input);

      expect(result).toBe('5.99');
    });

    it('truncates instead of rounding when third decimal is 5', () => {
      const input = 5.125;

      const result = truncateNumber(input);

      expect(result).toBe('5.12');
    });

    it('truncates many decimal places to 2', () => {
      const input = 3.14159265359;

      const result = truncateNumber(input);

      expect(result).toBe('3.14');
    });
  });

  describe('trailing zeros removal', () => {
    it('removes single trailing zero after decimal', () => {
      const input = 3.5;

      const result = truncateNumber(input);

      expect(result).toBe('3.5');
    });

    it('removes all trailing zeros for whole number result', () => {
      const input = 5.0;

      const result = truncateNumber(input);

      expect(result).toBe('5');
    });

    it('preserves non-trailing zeros in decimal', () => {
      const input = 5.01;

      const result = truncateNumber(input);

      expect(result).toBe('5.01');
    });

    it('removes trailing zero when first decimal is non-zero', () => {
      const input = 5.2;

      const result = truncateNumber(input);

      expect(result).toBe('5.2');
    });
  });

  describe('negative numbers', () => {
    it('truncates negative number with decimals', () => {
      const input = -5.78;

      const result = truncateNumber(input);

      expect(result).toBe('-5.78');
    });

    it('returns negative whole number without decimal', () => {
      const input = -42;

      const result = truncateNumber(input);

      expect(result).toBe('-42');
    });

    it('truncates negative number instead of rounding', () => {
      const input = -5.789;

      const result = truncateNumber(input);

      expect(result).toBe('-5.78');
    });

    it('removes trailing zeros from negative number', () => {
      const input = -3.5;

      const result = truncateNumber(input);

      expect(result).toBe('-3.5');
    });

    it('handles negative number truncating to whole number', () => {
      const input = -5.001;

      const result = truncateNumber(input);

      expect(result).toBe('-5');
    });
  });

  describe('edge cases', () => {
    it('returns zero for zero input', () => {
      const input = 0;

      const result = truncateNumber(input);

      expect(result).toBe('0');
    });

    it('returns zero for very small positive decimal', () => {
      const input = 0.001;

      const result = truncateNumber(input);

      expect(result).toBe('0');
    });

    it('returns zero for very small negative decimal', () => {
      const input = -0.001;

      const result = truncateNumber(input);

      expect(result).toBe('0');
    });

    it('handles number with exactly one decimal place', () => {
      const input = 5.5;

      const result = truncateNumber(input);

      expect(result).toBe('5.5');
    });

    it('handles very large number', () => {
      const input = 999999999.99;

      const result = truncateNumber(input);

      expect(result).toBe('999999999.99');
    });

    it('handles very large whole number', () => {
      const input = 999999999999;

      const result = truncateNumber(input);

      expect(result).toBe('999999999999');
    });
  });

  describe('special values', () => {
    it('returns NaN string for NaN input', () => {
      const input = NaN;

      const result = truncateNumber(input);

      expect(result).toBe('NaN');
    });

    it('returns Infinity string for Infinity input', () => {
      const input = Infinity;

      const result = truncateNumber(input);

      expect(result).toBe('Infinity');
    });

    it('returns -Infinity string for negative Infinity input', () => {
      const input = -Infinity;

      const result = truncateNumber(input);

      expect(result).toBe('-Infinity');
    });

    it('returns NaN string for non-numeric string input', () => {
      const input = 'abc';

      const result = truncateNumber(input);

      expect(result).toBe('NaN');
    });

    it('returns zero for empty string input', () => {
      const input = '';

      const result = truncateNumber(input);

      expect(result).toBe('0');
    });
  });
});
