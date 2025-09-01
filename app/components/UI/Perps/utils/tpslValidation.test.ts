import {
  isValidTakeProfitPrice,
  isValidStopLossPrice,
  validateTPSLPrices,
  getTakeProfitErrorDirection,
  getStopLossErrorDirection,
  calculatePriceForPercentage,
  calculatePercentageForPrice,
  hasTPSLValuesChanged,
} from './tpslValidation';

describe('TPSL Validation Utilities', () => {
  describe('isValidTakeProfitPrice', () => {
    describe('Long positions', () => {
      const params = { currentPrice: 100, direction: 'long' as const };

      it('should return true for TP above current price', () => {
        expect(isValidTakeProfitPrice('150', params)).toBe(true);
        expect(isValidTakeProfitPrice('$150.00', params)).toBe(true);
        expect(isValidTakeProfitPrice('1,150.00', params)).toBe(true);
        expect(isValidTakeProfitPrice('100.01', params)).toBe(true);
      });

      it('should return false for TP below or equal to current price', () => {
        expect(isValidTakeProfitPrice('50', params)).toBe(false);
        expect(isValidTakeProfitPrice('99.99', params)).toBe(false);
        expect(isValidTakeProfitPrice('100', params)).toBe(false);
      });
    });

    describe('Short positions', () => {
      const params = { currentPrice: 100, direction: 'short' as const };

      it('should return true for TP below current price', () => {
        expect(isValidTakeProfitPrice('50', params)).toBe(true);
        expect(isValidTakeProfitPrice('$50.00', params)).toBe(true);
        expect(isValidTakeProfitPrice('99.99', params)).toBe(true);
      });

      it('should return false for TP above or equal to current price', () => {
        expect(isValidTakeProfitPrice('150', params)).toBe(false);
        expect(isValidTakeProfitPrice('100.01', params)).toBe(false);
        expect(isValidTakeProfitPrice('100', params)).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should return true when inputs are invalid', () => {
        expect(
          isValidTakeProfitPrice('', { currentPrice: 100, direction: 'long' }),
        ).toBe(true);
        expect(
          isValidTakeProfitPrice('invalid', {
            currentPrice: 100,
            direction: 'long',
          }),
        ).toBe(true);
        expect(
          isValidTakeProfitPrice('100', { currentPrice: 0, direction: 'long' }),
        ).toBe(true);
        expect(
          isValidTakeProfitPrice('100', {
            currentPrice: 100,
            direction: undefined,
          }),
        ).toBe(true);
      });
    });
  });

  describe('isValidStopLossPrice', () => {
    describe('Long positions', () => {
      const params = { currentPrice: 100, direction: 'long' as const };

      it('should return true for SL below current price', () => {
        expect(isValidStopLossPrice('50', params)).toBe(true);
        expect(isValidStopLossPrice('$50.00', params)).toBe(true);
        expect(isValidStopLossPrice('99.99', params)).toBe(true);
      });

      it('should return false for SL above or equal to current price', () => {
        expect(isValidStopLossPrice('150', params)).toBe(false);
        expect(isValidStopLossPrice('100.01', params)).toBe(false);
        expect(isValidStopLossPrice('100', params)).toBe(false);
      });
    });

    describe('Short positions', () => {
      const params = { currentPrice: 100, direction: 'short' as const };

      it('should return true for SL above current price', () => {
        expect(isValidStopLossPrice('150', params)).toBe(true);
        expect(isValidStopLossPrice('$150.00', params)).toBe(true);
        expect(isValidStopLossPrice('100.01', params)).toBe(true);
      });

      it('should return false for SL below or equal to current price', () => {
        expect(isValidStopLossPrice('50', params)).toBe(false);
        expect(isValidStopLossPrice('99.99', params)).toBe(false);
        expect(isValidStopLossPrice('100', params)).toBe(false);
      });
    });
  });

  describe('validateTPSLPrices', () => {
    const longParams = { currentPrice: 100, direction: 'long' as const };

    it('should validate both prices together', () => {
      // Both valid
      expect(validateTPSLPrices('150', '50', longParams)).toBe(true);

      // TP invalid
      expect(validateTPSLPrices('50', '50', longParams)).toBe(false);

      // SL invalid
      expect(validateTPSLPrices('150', '150', longParams)).toBe(false);

      // Both invalid
      expect(validateTPSLPrices('50', '150', longParams)).toBe(false);

      // Only one provided
      expect(validateTPSLPrices('150', undefined, longParams)).toBe(true);
      expect(validateTPSLPrices(undefined, '50', longParams)).toBe(true);

      // Neither provided
      expect(validateTPSLPrices(undefined, undefined, longParams)).toBe(true);
    });

    it('should return true when direction is missing', () => {
      const params = { currentPrice: 100, direction: undefined };
      expect(validateTPSLPrices('150', '50', params)).toBe(true);
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
  });

  describe('calculatePriceForPercentage', () => {
    describe('Long positions', () => {
      const params = { currentPrice: 100, direction: 'long' as const };

      it('should calculate take profit prices correctly', () => {
        expect(calculatePriceForPercentage(10, true, params)).toBe('110.00');
        expect(calculatePriceForPercentage(50, true, params)).toBe('150.00');
        expect(calculatePriceForPercentage(5.5, true, params)).toBe('105.50');
      });

      it('should calculate stop loss prices correctly', () => {
        expect(calculatePriceForPercentage(10, false, params)).toBe('90.00');
        expect(calculatePriceForPercentage(50, false, params)).toBe('50.00');
        expect(calculatePriceForPercentage(5.5, false, params)).toBe('94.50');
      });
    });

    describe('Short positions', () => {
      const params = { currentPrice: 100, direction: 'short' as const };

      it('should calculate take profit prices correctly', () => {
        expect(calculatePriceForPercentage(10, true, params)).toBe('90.00');
        expect(calculatePriceForPercentage(50, true, params)).toBe('50.00');
        expect(calculatePriceForPercentage(5.5, true, params)).toBe('94.50');
      });

      it('should calculate stop loss prices correctly', () => {
        expect(calculatePriceForPercentage(10, false, params)).toBe('110.00');
        expect(calculatePriceForPercentage(50, false, params)).toBe('150.00');
        expect(calculatePriceForPercentage(5.5, false, params)).toBe('105.50');
      });
    });

    it('should return empty string when current price is 0', () => {
      const params = { currentPrice: 0, direction: 'long' as const };
      expect(calculatePriceForPercentage(10, true, params)).toBe('');
    });
  });

  describe('calculatePercentageForPrice', () => {
    describe('Long positions', () => {
      const params = { currentPrice: 100, direction: 'long' as const };

      it('should calculate take profit percentage correctly', () => {
        expect(calculatePercentageForPrice('110', true, params)).toBe('10.00');
        expect(calculatePercentageForPrice('$150.00', true, params)).toBe(
          '50.00',
        );
        expect(calculatePercentageForPrice('105.50', true, params)).toBe(
          '5.50',
        );

        // Invalid direction (price below current for long TP)
        expect(calculatePercentageForPrice('90', true, params)).toBe('-10.00');
      });

      it('should calculate stop loss percentage correctly', () => {
        expect(calculatePercentageForPrice('90', false, params)).toBe('10.00');
        expect(calculatePercentageForPrice('$50.00', false, params)).toBe(
          '50.00',
        );
        expect(calculatePercentageForPrice('94.50', false, params)).toBe(
          '5.50',
        );

        // Invalid direction (price above current for long SL)
        expect(calculatePercentageForPrice('110', false, params)).toBe(
          '-10.00',
        );
      });
    });

    describe('Short positions', () => {
      const params = { currentPrice: 100, direction: 'short' as const };

      it('should calculate take profit percentage correctly', () => {
        expect(calculatePercentageForPrice('90', true, params)).toBe('10.00');
        expect(calculatePercentageForPrice('$50.00', true, params)).toBe(
          '50.00',
        );
        expect(calculatePercentageForPrice('94.50', true, params)).toBe('5.50');

        // Invalid direction (price above current for short TP)
        expect(calculatePercentageForPrice('110', true, params)).toBe('-10.00');
      });

      it('should calculate stop loss percentage correctly', () => {
        expect(calculatePercentageForPrice('110', false, params)).toBe('10.00');
        expect(calculatePercentageForPrice('$150.00', false, params)).toBe(
          '50.00',
        );
        expect(calculatePercentageForPrice('105.50', false, params)).toBe(
          '5.50',
        );

        // Invalid direction (price below current for short SL)
        expect(calculatePercentageForPrice('90', false, params)).toBe('-10.00');
      });
    });

    it('should handle edge cases', () => {
      const params = { currentPrice: 100, direction: 'long' as const };
      expect(calculatePercentageForPrice('', true, params)).toBe('');
      expect(calculatePercentageForPrice('invalid', true, params)).toBe('');
      expect(
        calculatePercentageForPrice('100', true, {
          currentPrice: 0,
          direction: 'long',
        }),
      ).toBe('');
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

    describe('edge cases', () => {
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
});
