import {
  isValidTakeProfitPrice,
  isValidStopLossPrice,
  validateTPSLPrices,
  getTakeProfitErrorDirection,
  getStopLossErrorDirection,
  calculatePriceForPercentage,
  calculatePercentageForPrice,
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
});
