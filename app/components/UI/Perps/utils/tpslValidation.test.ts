import {
  getTakeProfitErrorDirection,
  getStopLossErrorDirection,
  getStopLossLiquidationErrorDirection,
  hasTPSLValuesChanged,
  formatRoEPercentageDisplay,
  sanitizePercentageInput,
  getPerpsOrderTpSlWarnings,
} from './tpslValidation';

// Note: countSignificantFigures, hasExceededSignificantFigures, and roundToSignificantFigures
// tests have been moved to formatUtils.test.ts since the implementations now live in formatUtils.ts

describe('TPSL Validation Utilities', () => {
  describe('non-positive trigger prices', () => {
    it('flags a non-positive trigger price in the order form warnings before the market price resolves', () => {
      // Arrange - marketPrice of 0 previously short-circuited both warning checks
      const input = {
        orderType: 'market' as const,
        direction: 'short' as const,
        takeProfitPrice: '-37482.5',
        stopLossPrice: '0',
        liquidationPrice: '3123.4',
        marketPrice: 0,
      };

      // Act
      const warnings = getPerpsOrderTpSlWarnings(input);

      // Assert
      expect(warnings.isTakeProfitPriceInvalid).toBe(true);
      expect(warnings.isStopLossPriceInvalid).toBe(true);
    });

    it('flags a non-positive take profit in the order form warnings', () => {
      // Arrange
      const input = {
        orderType: 'market' as const,
        direction: 'short' as const,
        takeProfitPrice: '-37482.5',
        liquidationPrice: '3123.4',
        marketPrice: 2392.5,
      };

      // Act
      const warnings = getPerpsOrderTpSlWarnings(input);

      // Assert
      expect(warnings.isTakeProfitPriceInvalid).toBe(true);
    });
  });

  describe('Error message helpers', () => {
    it('should return correct error direction for take profit', () => {
      expect(getTakeProfitErrorDirection('long')).toBe('above');
      expect(getTakeProfitErrorDirection('short')).toBe('below');
      expect(getTakeProfitErrorDirection(undefined)).toBe('');
    });

    it('should return correct error direction for stop loss', () => {
      expect(getStopLossErrorDirection('long')).toBe('below');
      expect(getStopLossErrorDirection('short')).toBe('above');
      expect(getStopLossErrorDirection(undefined)).toBe('');
    });

    it('should return correct error direction for stop loss liquidation', () => {
      expect(getStopLossLiquidationErrorDirection('long')).toBe('above');
      expect(getStopLossLiquidationErrorDirection('short')).toBe('below');
      expect(getStopLossLiquidationErrorDirection(undefined)).toBe('');
    });
  });

  describe('hasTPSLValuesChanged', () => {
    describe('when values have not changed', () => {
      it('returns false for identical unformatted values', () => {
        expect(hasTPSLValuesChanged('100', '50', '100', '50')).toBe(false);
        expect(hasTPSLValuesChanged('0', '0', '0', '0')).toBe(false);
        expect(
          hasTPSLValuesChanged('1234.56', '789.12', '1234.56', '789.12'),
        ).toBe(false);
      });

      it('returns false for same values with different formatting', () => {
        expect(hasTPSLValuesChanged('$100.00', '$50.00', '100', '50')).toBe(
          false,
        );
        expect(hasTPSLValuesChanged('100', '50', '$100.00', '$50.00')).toBe(
          false,
        );
        expect(
          hasTPSLValuesChanged('$1,234.56', '$789.12', '1234.56', '789.12'),
        ).toBe(false);
        expect(
          hasTPSLValuesChanged('1,234.56', '789.12', '$1,234.56', '$789.12'),
        ).toBe(false);
      });

      it('returns false when both undefined', () => {
        expect(
          hasTPSLValuesChanged(undefined, undefined, undefined, undefined),
        ).toBe(false);
      });

      it('returns false when both empty strings', () => {
        expect(hasTPSLValuesChanged('', '', '', '')).toBe(false);
      });

      it('returns false for undefined vs empty string', () => {
        expect(hasTPSLValuesChanged(undefined, '', undefined, '')).toBe(false);
        expect(hasTPSLValuesChanged('', undefined, '', undefined)).toBe(false);
      });

      it('returns false when only one value is set and unchanged', () => {
        expect(hasTPSLValuesChanged('100', undefined, '100', undefined)).toBe(
          false,
        );
        expect(hasTPSLValuesChanged(undefined, '50', undefined, '50')).toBe(
          false,
        );
        expect(hasTPSLValuesChanged('$100.00', '', '100', undefined)).toBe(
          false,
        );
      });
    });

    describe('when values have changed', () => {
      it('returns true when take profit changed', () => {
        expect(hasTPSLValuesChanged('150', '50', '100', '50')).toBe(true);
        expect(hasTPSLValuesChanged('$150.00', '$50.00', '100', '50')).toBe(
          true,
        );
      });

      it('returns true when stop loss changed', () => {
        expect(hasTPSLValuesChanged('100', '75', '100', '50')).toBe(true);
        expect(hasTPSLValuesChanged('$100.00', '$75.00', '100', '50')).toBe(
          true,
        );
      });

      it('returns true when both values changed', () => {
        expect(hasTPSLValuesChanged('150', '75', '100', '50')).toBe(true);
        expect(hasTPSLValuesChanged('$150.00', '$75.00', '100', '50')).toBe(
          true,
        );
      });

      it('returns true when value changes from undefined to defined', () => {
        expect(
          hasTPSLValuesChanged('100', undefined, undefined, undefined),
        ).toBe(true);
        expect(
          hasTPSLValuesChanged(undefined, '50', undefined, undefined),
        ).toBe(true);
        expect(hasTPSLValuesChanged('100', '50', undefined, undefined)).toBe(
          true,
        );
      });

      it('returns true when value changes from defined to undefined', () => {
        expect(hasTPSLValuesChanged(undefined, '50', '100', '50')).toBe(true);
        expect(hasTPSLValuesChanged('100', undefined, '100', '50')).toBe(true);
        expect(hasTPSLValuesChanged(undefined, undefined, '100', '50')).toBe(
          true,
        );
      });

      it('returns true when value changes from defined to empty string', () => {
        expect(hasTPSLValuesChanged('', '50', '100', '50')).toBe(true);
        expect(hasTPSLValuesChanged('100', '', '100', '50')).toBe(true);
      });

      it('returns true when value changes from empty string to defined', () => {
        expect(hasTPSLValuesChanged('100', '50', '', '50')).toBe(true);
        expect(hasTPSLValuesChanged('100', '50', '100', '')).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('handles invalid numeric values by treating them as undefined', () => {
        expect(hasTPSLValuesChanged('invalid', '50', 'invalid', '50')).toBe(
          false,
        );
        expect(hasTPSLValuesChanged('invalid', '50', '100', '50')).toBe(true);
        expect(hasTPSLValuesChanged('100', 'invalid', '100', 'invalid')).toBe(
          false,
        );
      });

      it('handles whitespace-only strings as undefined', () => {
        expect(hasTPSLValuesChanged('   ', '50', undefined, '50')).toBe(false);
        expect(hasTPSLValuesChanged('100', '   ', '100', undefined)).toBe(
          false,
        );
        expect(hasTPSLValuesChanged('   ', '   ', '', '')).toBe(false);
      });

      it('handles mixed formatting scenarios', () => {
        expect(hasTPSLValuesChanged('$1,500.75', '50', '1500.75', '50')).toBe(
          false,
        );
        expect(
          hasTPSLValuesChanged('1,500.75', '$50.00', '1500.75', '50'),
        ).toBe(false);
        expect(hasTPSLValuesChanged('$1,500.76', '50', '1500.75', '50')).toBe(
          true,
        );
      });

      it('handles decimal precision correctly', () => {
        expect(hasTPSLValuesChanged('100.00', '50.00', '100', '50')).toBe(
          false,
        );
        expect(hasTPSLValuesChanged('100.01', '50.00', '100', '50')).toBe(true);
        expect(hasTPSLValuesChanged('100.00', '50.01', '100', '50')).toBe(true);
      });
    });
  });

  describe('formatRoEPercentageDisplay', () => {
    describe('when input is focused', () => {
      it('should preserve valid numeric input patterns for editing', () => {
        expect(formatRoEPercentageDisplay('10.123', true)).toBe('10.123');
        expect(formatRoEPercentageDisplay('25.5678', true)).toBe('25.5678');
        expect(formatRoEPercentageDisplay('100', true)).toBe('100');
        expect(formatRoEPercentageDisplay('0', true)).toBe('0');
        expect(formatRoEPercentageDisplay('10.', true)).toBe('10.');
        expect(formatRoEPercentageDisplay('.5', true)).toBe('.5');
      });

      it('should preserve negative values when focused', () => {
        expect(formatRoEPercentageDisplay('-10.123', true)).toBe('-10.123');
        expect(formatRoEPercentageDisplay('-25', true)).toBe('-25');
      });

      it('should return empty string for invalid patterns when focused', () => {
        expect(formatRoEPercentageDisplay('abc', true)).toBe('');
      });

      it('should handle edge cases in pattern matching', () => {
        expect(formatRoEPercentageDisplay('5.', true)).toBe('5.');
        expect(formatRoEPercentageDisplay('.', true)).toBe('.');
      });
    });

    describe('when input is not focused', () => {
      it('should show signed display format for integers', () => {
        expect(formatRoEPercentageDisplay('10', false)).toBe('+ 10');
        expect(formatRoEPercentageDisplay('100', false)).toBe('+ 100');
        expect(formatRoEPercentageDisplay('0', false)).toBe('+ 0');
        expect(formatRoEPercentageDisplay('10.00', false)).toBe('+ 10');
        expect(formatRoEPercentageDisplay('100.000', false)).toBe('+ 100');
      });

      it('should show signed decimal format when necessary', () => {
        expect(formatRoEPercentageDisplay('10.5', false)).toBe('+ 10.50');
        expect(formatRoEPercentageDisplay('25.123', false)).toBe('+ 25.12');
        expect(formatRoEPercentageDisplay('99.99', false)).toBe('+ 99.99');
      });

      it('should handle negative values with signed format', () => {
        expect(formatRoEPercentageDisplay('-10', false)).toBe('- 10');
        expect(formatRoEPercentageDisplay('-10.5', false)).toBe('- 10.50');
        expect(formatRoEPercentageDisplay('-25.123', false)).toBe('- 25.12');
      });
    });

    describe('Edge cases', () => {
      it('should return empty string for invalid input', () => {
        expect(formatRoEPercentageDisplay('', true)).toBe('');
        expect(formatRoEPercentageDisplay('', false)).toBe('');
        expect(formatRoEPercentageDisplay('   ', true)).toBe('');
        expect(formatRoEPercentageDisplay('invalid', false)).toBe('');
        expect(formatRoEPercentageDisplay('NaN', true)).toBe('');
      });

      it('should handle zero correctly', () => {
        expect(formatRoEPercentageDisplay('0', true)).toBe('0');
        expect(formatRoEPercentageDisplay('0.0', false)).toBe('+ 0');
        expect(formatRoEPercentageDisplay('0.00', false)).toBe('+ 0');
      });
    });
  });

  describe('formatRoEPercentageDisplay with signed input', () => {
    it('should handle focused input with signs correctly', () => {
      // Given a focused input with sign patterns
      expect(formatRoEPercentageDisplay('+', true)).toBe('+');
      expect(formatRoEPercentageDisplay('-', true)).toBe('-');
      expect(formatRoEPercentageDisplay('+10', true)).toBe('+10');
      expect(formatRoEPercentageDisplay('-5', true)).toBe('-5');
    });

    it('should handle unfocused input with proper sign formatting', () => {
      // Given unfocused input, should format with proper signs
      expect(formatRoEPercentageDisplay('10', false)).toBe('+ 10');
      expect(formatRoEPercentageDisplay('-5', false)).toBe('- 5');
      expect(formatRoEPercentageDisplay('0', false)).toBe('+ 0');
    });

    it('should handle decimal values with signs', () => {
      // Given decimal values with signs
      expect(formatRoEPercentageDisplay('+10.5', true)).toBe('+10.5');
      expect(formatRoEPercentageDisplay('-7.25', true)).toBe('-7.25');
      expect(formatRoEPercentageDisplay('15.75', false)).toBe('+ 15.75');
      expect(formatRoEPercentageDisplay('-8.33', false)).toBe('- 8.33');
    });

    it('should handle invalid input gracefully', () => {
      // Given invalid input, should return empty string
      expect(formatRoEPercentageDisplay('invalid', false)).toBe('');
      expect(formatRoEPercentageDisplay('++5', true)).toBe(''); // Invalid pattern not preserved
      expect(formatRoEPercentageDisplay('++5', false)).toBe(''); // Clean up when unfocused
    });

    it('omits the sign when includeSign is false', () => {
      expect(formatRoEPercentageDisplay('10', false, false)).toBe('10');
      expect(formatRoEPercentageDisplay('-10', false, false)).toBe('10');
      expect(formatRoEPercentageDisplay('10.5', false, false)).toBe('10.50');
    });
  });

  describe('sanitizePercentageInput', () => {
    it('should remove invalid characters', () => {
      expect(sanitizePercentageInput('abc123def')).toBe('123');
      expect(sanitizePercentageInput('12.34@#$')).toBe('12.34');
      expect(sanitizePercentageInput('$%^&*()12.5')).toBe('12.5');
    });

    it('should handle signs correctly', () => {
      expect(sanitizePercentageInput('+10.5')).toBe('+10.5');
      expect(sanitizePercentageInput('-25.75')).toBe('-25.75');
      expect(sanitizePercentageInput('++10')).toBe('+10');
      expect(sanitizePercentageInput('--5')).toBe('-5');
    });

    it('should handle mixed signs by keeping the first one', () => {
      expect(sanitizePercentageInput('+-10')).toBe('+10');
      expect(sanitizePercentageInput('-+5')).toBe('-5');
      expect(sanitizePercentageInput('+--10')).toBe('+10');
    });

    it('should handle en-dash and em-dash', () => {
      expect(sanitizePercentageInput('–10')).toBe('-10');
      expect(sanitizePercentageInput('—25')).toBe('-25');
      expect(sanitizePercentageInput('––10')).toBe('-10');
    });

    it('should prevent multiple decimal points', () => {
      expect(sanitizePercentageInput('10.5.25')).toBe(null);
      expect(sanitizePercentageInput('1.2.3.4')).toBe(null);
      expect(sanitizePercentageInput('10.5')).toBe('10.5');
    });

    it('should handle edge cases', () => {
      expect(sanitizePercentageInput('.')).toBe('.');
      expect(sanitizePercentageInput('+')).toBe('+');
      expect(sanitizePercentageInput('-')).toBe('-');
      expect(sanitizePercentageInput('')).toBe('');
    });

    it('should limit decimal places when currentValue is provided', () => {
      // Should allow up to 5 decimal places by default
      expect(sanitizePercentageInput('10.12345', '10.1234')).toBe('10.12345');

      // Should prevent adding more than 5 decimal places
      expect(sanitizePercentageInput('10.123456', '10.12345')).toBe(null);

      // Should allow erasing (shorter length)
      expect(sanitizePercentageInput('10.1234', '10.12345')).toBe('10.1234');

      // Should work with custom max decimal places
      expect(sanitizePercentageInput('10.123', '10.12', 2)).toBe(null);
      expect(sanitizePercentageInput('10.12', '10.1', 2)).toBe('10.12');
    });

    it('should work without currentValue parameter', () => {
      // Should not limit decimal places when currentValue is not provided
      expect(sanitizePercentageInput('10.123456789')).toBe('10.123456789');
    });
  });

  describe('getPerpsOrderTpSlWarnings', () => {
    const base = {
      direction: 'long' as const,
      liquidationPrice: '0',
      marketPrice: 3000,
    };

    it('returns all-clear with current reference for a market order without TP/SL', () => {
      // Arrange / Act
      const result = getPerpsOrderTpSlWarnings({
        ...base,
        orderType: 'market',
      });

      // Assert
      expect(result).toEqual({
        doesStopLossRiskLiquidation: false,
        isTakeProfitPriceInvalid: false,
        isStopLossPriceInvalid: false,
        tpslPriceType: 'current',
      });
    });

    it('uses the entry reference type for a priced limit order', () => {
      // Arrange / Act
      const result = getPerpsOrderTpSlWarnings({
        ...base,
        orderType: 'limit',
        limitPrice: '2500',
      });

      // Assert
      expect(result.tpslPriceType).toBe('entry');
    });

    it('flags a take profit on the wrong side of the reference price', () => {
      // Arrange / Act: long TP below market is invalid
      const result = getPerpsOrderTpSlWarnings({
        ...base,
        orderType: 'market',
        takeProfitPrice: '2000',
      });

      // Assert
      expect(result.isTakeProfitPriceInvalid).toBe(true);
    });

    it('flags a stop loss on the wrong side of the reference price', () => {
      // Arrange / Act: long SL above market is invalid
      const result = getPerpsOrderTpSlWarnings({
        ...base,
        orderType: 'market',
        stopLossPrice: '4000',
      });

      // Assert
      expect(result.isStopLossPriceInvalid).toBe(true);
    });

    it('flags a stop loss that risks liquidation', () => {
      // Arrange / Act: long SL below the liquidation price is unsafe
      const result = getPerpsOrderTpSlWarnings({
        ...base,
        orderType: 'market',
        stopLossPrice: '2000',
        liquidationPrice: '2500',
      });

      // Assert
      expect(result.doesStopLossRiskLiquidation).toBe(true);
    });

    it('skips the liquidation check when no liquidation price is known', () => {
      // Arrange / Act: the same stop loss is safe once liquidation is unknown
      const result = getPerpsOrderTpSlWarnings({
        ...base,
        orderType: 'market',
        stopLossPrice: '2000',
        liquidationPrice: '',
      });

      // Assert
      expect(result.doesStopLossRiskLiquidation).toBe(false);
    });
  });
});
