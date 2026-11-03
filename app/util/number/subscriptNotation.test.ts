import {
  formatPriceWithSubscriptNotation,
  formatSubscriptNotation,
} from './subscriptNotation';

describe('formatSubscriptNotation', () => {
  it('formats a very small number with subscript notation', () => {
    expect(formatSubscriptNotation(0.00000614)).toBe('0.0₅614');
  });

  it('formats number with many leading zeros', () => {
    expect(formatSubscriptNotation(0.0000000001234)).toBe('0.0₉1234');
  });

  it('trims trailing zeros from significant digits', () => {
    expect(formatSubscriptNotation(0.000001)).toBe('0.0₅1');
  });

  it('returns null for numbers >= 0.0001', () => {
    expect(formatSubscriptNotation(0.0001)).toBeNull();
    expect(formatSubscriptNotation(0.01)).toBeNull();
    expect(formatSubscriptNotation(1)).toBeNull();
  });

  it('returns null for zero and negative numbers', () => {
    expect(formatSubscriptNotation(0)).toBeNull();
    expect(formatSubscriptNotation(-0.00000614)).toBeNull();
  });

  it('returns null for NaN and Infinity', () => {
    expect(formatSubscriptNotation(NaN)).toBeNull();
    expect(formatSubscriptNotation(Infinity)).toBeNull();
    expect(formatSubscriptNotation(-Infinity)).toBeNull();
  });

  it('caps digits after the subscript when maxDigitsAfterSubscript is set', () => {
    expect(
      formatSubscriptNotation(0.00003415, { maxDigitsAfterSubscript: 2 }),
    ).toBe('0.0₄34');
    expect(
      formatSubscriptNotation(0.000000337, { maxDigitsAfterSubscript: 2 }),
    ).toBe('0.0₆33');
  });
});

describe('formatPriceWithSubscriptNotation', () => {
  describe('Regular price formatting', () => {
    it('formats regular price with 2 decimals', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(1.99);

      // Assert
      expect(result).toBe('$1.99');
    });

    it('formats price with 4 decimals when needed', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.144566);

      // Assert
      expect(result).toBe('$0.1446');
    });

    it('formats large price correctly', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(1234.56);

      // Assert
      expect(result).toBe('$1,234.56');
    });

    it('formats whole number with 2 decimals', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(100);

      // Assert
      expect(result).toBe('$100.00');
    });

    it('formats price with minimum 2 decimals', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(5.5);

      // Assert
      expect(result).toBe('$5.50');
    });

    it('formats very large price correctly', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(1000000.99);

      // Assert
      expect(result).toBe('$1,000,000.99');
    });

    it('formats price between 0.0001 and 1', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.5678);

      // Assert
      expect(result).toBe('$0.5678');
    });

    it('truncates to 2 decimals for prices >= 1 with extra decimal places', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(2285.013);

      // Assert
      expect(result).toBe('$2,285.01');
    });

    it('truncates to 2 decimals for prices >= 1 with 4 decimal places', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(1.2345);

      // Assert
      expect(result).toBe('$1.23');
    });
  });

  describe('Zero value', () => {
    it('returns dash for zero number', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0);

      // Assert
      expect(result).toBe('—');
    });

    it('returns dash for zero string', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation('0');

      // Assert
      expect(result).toBe('—');
    });

    it('returns dash for 0.00', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation('0.00');

      // Assert
      expect(result).toBe('—');
    });

    it('returns dash for 0.0000', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.0);

      // Assert
      expect(result).toBe('—');
    });
  });

  describe('Very small values with subscript notation', () => {
    it('formats 0.00000614 with subscript notation (5 leading zeros)', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00000614);

      // Assert
      expect(result).toBe('$0.0₅614');
    });

    it('formats 0.00001 with subscript notation (4 leading zeros)', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00001);

      // Assert
      expect(result).toBe('$0.0₄1');
    });

    it('formats 0.000001 with subscript notation (5 leading zeros)', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.000001);

      // Assert
      expect(result).toBe('$0.0₅1');
    });

    it('formats 0.0000001234 with subscript notation (6 leading zeros)', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.0000001234);

      // Assert
      expect(result).toBe('$0.0₆1234');
    });

    it('formats 0.00000999 with subscript notation (5 leading zeros)', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00000999);

      // Assert
      expect(result).toBe('$0.0₅999');
    });

    it('formats 0.000000001 with subscript notation (8 leading zeros)', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.000000001);

      // Assert
      expect(result).toBe('$0.0₈1');
    });

    it('formats 0.0000000123 with subscript notation (7 leading zeros)', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.0000000123);

      // Assert
      expect(result).toBe('$0.0₇123');
    });

    it('formats 0.00000005 with subscript notation (7 leading zeros)', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00000005);

      // Assert
      expect(result).toBe('$0.0₇5');
    });

    it('formats 0.000000123456 with subscript notation showing 4 significant digits', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.000000123456);

      // Assert
      expect(result).toBe('$0.0₆1234');
    });
  });

  describe('Boundary values', () => {
    it('formats 0.0001 without subscript (at boundary)', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.0001);

      // Assert
      expect(result).toBe('$0.0001');
    });

    it('formats 0.00009 with subscript (4 leading zeros)', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00009);

      // Assert
      expect(result).toBe('$0.0₄9');
    });

    it('formats 0.0000999 with subscript (4 leading zeros)', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.0000999);

      // Assert
      expect(result).toBe('$0.0₄999');
    });

    it('formats 0.00001 with subscript (4 leading zeros - at threshold)', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00001);

      // Assert
      expect(result).toBe('$0.0₄1');
    });

    it('formats 0.001 without subscript', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.001);

      // Assert
      expect(result).toBe('$0.001');
    });

    it('formats 0.01 without subscript', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.01);

      // Assert
      expect(result).toBe('$0.01');
    });

    it('formats 0.1 without subscript', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.1);

      // Assert
      expect(result).toBe('$0.10');
    });

    it('formats 1 with 2 decimals', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(1);

      // Assert
      expect(result).toBe('$1.00');
    });
  });

  describe('String input', () => {
    it('handles string input for regular price', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation('1.99');

      // Assert
      expect(result).toBe('$1.99');
    });

    it('handles string input for very small value', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation('0.00000614');

      // Assert
      expect(result).toBe('$0.0₅614');
    });

    it('handles string input with many decimals', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation('0.144566');

      // Assert
      expect(result).toBe('$0.1446');
    });

    it('handles string input for large value', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation('1234.56');

      // Assert
      expect(result).toBe('$1,234.56');
    });

    it('handles string input for whole number', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation('100');

      // Assert
      expect(result).toBe('$100.00');
    });
  });

  describe('Invalid input', () => {
    it('returns $0.00 for NaN string', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation('not-a-number');

      // Assert
      expect(result).toBe('$0.00');
    });

    it('returns $0.00 for invalid string', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation('abc');

      // Assert
      expect(result).toBe('$0.00');
    });

    it('returns $0.00 for empty string', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation('');

      // Assert
      expect(result).toBe('$0.00');
    });

    it('returns $0.00 for NaN', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(NaN);

      // Assert
      expect(result).toBe('$0.00');
    });

    it('returns $0.00 for undefined converted to NaN', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(
        undefined as unknown as number,
      );

      // Assert
      expect(result).toBe('$0.00');
    });
  });

  describe('Edge cases with trailing zeros', () => {
    it('trims trailing zeros from significant digits', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00001);

      // Assert
      expect(result).toBe('$0.0₄1');
    });

    it('handles value with all trailing zeros after first digit', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00005);

      // Assert
      expect(result).toBe('$0.0₄5');
    });

    it('keeps at least 2 significant digits when all 4 are zeros', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00001);

      // Assert
      expect(result).toBe('$0.0₄1');
    });

    it('handles value with 2 significant digits', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.000012);

      // Assert
      expect(result).toBe('$0.0₄12');
    });

    it('handles value with 3 significant digits', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.0000123);

      // Assert
      expect(result).toBe('$0.0₄123');
    });

    it('handles value with 4 significant digits and no trailing zeros', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00001234);

      // Assert
      expect(result).toBe('$0.0₄1234');
    });
  });

  describe('Subscript with different leading zero counts', () => {
    it('uses subscript 4 for 4 leading zeros', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00001);

      // Assert
      expect(result).toBe('$0.0₄1');
    });

    it('uses subscript 5 for 5 leading zeros', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.000001);

      // Assert
      expect(result).toBe('$0.0₅1');
    });

    it('uses subscript 6 for 6 leading zeros', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.0000001);

      // Assert
      expect(result).toBe('$0.0₆1');
    });

    it('uses subscript 7 for 7 leading zeros', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00000001);

      // Assert
      expect(result).toBe('$0.0₇1');
    });

    it('uses subscript 8 for 8 leading zeros', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.000000001);

      // Assert
      expect(result).toBe('$0.0₈1');
    });

    it('uses subscript 10 for 10 leading zeros', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00000000001);

      // Assert
      expect(result).toBe('$0.0₁₀1');
    });
  });

  describe('with currencyCode param', () => {
    it('defaults to USD when no currencyCode is provided', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(1.99);

      // Assert
      expect(result).toBe('$1.99');
    });

    it('formats regular price with EUR', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(1.99, 'EUR');

      // Assert
      expect(result).toBe('€1.99');
    });

    it('formats price with up to 4 decimal places with EUR', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.144566, 'EUR');

      // Assert
      expect(result).toBe('€0.1446');
    });

    it('formats large price with GBP (not in symbol map, uses suffix)', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(1234.56, 'GBP');

      // Assert
      expect(result).toBe('1,234.56 GBP');
    });

    it('accepts lowercase currency code', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(99.99, 'eur');

      // Assert
      expect(result).toBe('€99.99');
    });

    it('formats subscript value with EUR symbol', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00000614, 'EUR');

      // Assert
      expect(result).toBe('€0.0₅614');
    });

    it('caps digits after the subscript when maxDigitsAfterSubscript is set', () => {
      const result = formatPriceWithSubscriptNotation(0.00003415, 'USD', {
        maxDigitsAfterSubscript: 2,
      });
      expect(result).toBe('$0.0₄34');
    });

    it('formats subscript value with GBP (not in symbol map, uses suffix)', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00001, 'GBP');

      // Assert
      expect(result).toBe('0.0₄1 GBP');
    });

    it('returns dash for zero regardless of currency', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0, 'EUR');

      // Assert
      expect(result).toBe('—');
    });

    it('formats whole number with EUR showing 2 decimals', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(100, 'EUR');

      // Assert
      expect(result).toBe('€100.00');
    });

    it('uses currency code as suffix for currencies not in the symbol map (e.g. PLN)', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00001263, 'PLN');

      // Assert
      expect(result).toBe('0.0₄1263 PLN');
    });

    it('uses currency code as suffix for subscript values with unknown currency', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00000614, 'CHF');

      // Assert
      expect(result).toBe('0.0₅614 CHF');
    });

    it('accepts lowercase unknown currency code and uppercases it as suffix', () => {
      // Arrange & Act
      const result = formatPriceWithSubscriptNotation(0.00001, 'pln');

      // Assert
      expect(result).toBe('0.0₄1 PLN');
    });
  });

  it.each([
    [0, '—'],
    [0.01, '$0.01'],
    [0.1, '$0.10'],
    [1, '$1.00'],
    [1.99, '$1.99'],
    [5.5, '$5.50'],
    [10, '$10.00'],
    [100, '$100.00'],
    [1234.56, '$1,234.56'],
    [0.144566, '$0.1446'],
    [0.5678, '$0.5678'],
    [0.001, '$0.001'],
    [0.0001, '$0.0001'],
    [0.00001, '$0.0₄1'],
    [0.000001, '$0.0₅1'],
    [0.00000614, '$0.0₅614'],
    [0.0000001234, '$0.0₆1234'],
    [0.000000001, '$0.0₈1'],
  ])('formats %f as %s', (input, expected) => {
    expect(formatPriceWithSubscriptNotation(input)).toBe(expected);
  });
});
