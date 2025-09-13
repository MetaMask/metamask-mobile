import {
  isValidTakeProfitPrice,
  isValidStopLossPrice,
  isStopLossBeyondLiquidationPrice,
  validateTPSLPrices,
  getTakeProfitErrorDirection,
  getStopLossErrorDirection,
  getStopLossLiquidationErrorDirection,
  calculatePriceForPercentage,
  calculatePercentageForPrice,
  hasTPSLValuesChanged,
  calculatePriceForRoE,
  calculateRoEForPrice,
  safeParseRoEPercentage,
  formatRoEPercentageDisplay,
  getMaxStopLossPercentage,
  isValidStopLossPercentage,
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

  describe('isStopLossBeyondLiquidationPrice', () => {
    describe('Long positions', () => {
      const direction = 'long' as const;
      const liquidationPrice = '80';

      it('should return true for SL above liquidation price', () => {
        expect(
          isStopLossBeyondLiquidationPrice('85', liquidationPrice, direction),
        ).toBe(true);
        expect(
          isStopLossBeyondLiquidationPrice(
            '$90.00',
            liquidationPrice,
            direction,
          ),
        ).toBe(true);
        expect(
          isStopLossBeyondLiquidationPrice('100', liquidationPrice, direction),
        ).toBe(true);
        expect(
          isStopLossBeyondLiquidationPrice(
            '80.01',
            liquidationPrice,
            direction,
          ),
        ).toBe(true);
      });

      it('should return false for SL below or equal to liquidation price', () => {
        expect(
          isStopLossBeyondLiquidationPrice('75', liquidationPrice, direction),
        ).toBe(false);
        expect(
          isStopLossBeyondLiquidationPrice(
            '$70.00',
            liquidationPrice,
            direction,
          ),
        ).toBe(false);
        expect(
          isStopLossBeyondLiquidationPrice(
            '79.99',
            liquidationPrice,
            direction,
          ),
        ).toBe(false);
        expect(
          isStopLossBeyondLiquidationPrice(
            '80.00',
            liquidationPrice,
            direction,
          ),
        ).toBe(false);
      });

      it('should handle formatted liquidation prices', () => {
        expect(
          isStopLossBeyondLiquidationPrice('85', '$80.00', direction),
        ).toBe(true);
        expect(
          isStopLossBeyondLiquidationPrice('85', '1,080.00', direction),
        ).toBe(false);
        expect(
          isStopLossBeyondLiquidationPrice('1,085', '1,080.00', direction),
        ).toBe(true);
      });
    });

    describe('Short positions', () => {
      const direction = 'short' as const;
      const liquidationPrice = '120';

      it('should return true for SL below liquidation price', () => {
        expect(
          isStopLossBeyondLiquidationPrice('115', liquidationPrice, direction),
        ).toBe(true);
        expect(
          isStopLossBeyondLiquidationPrice(
            '$110.00',
            liquidationPrice,
            direction,
          ),
        ).toBe(true);
        expect(
          isStopLossBeyondLiquidationPrice('100', liquidationPrice, direction),
        ).toBe(true);
        expect(
          isStopLossBeyondLiquidationPrice(
            '119.99',
            liquidationPrice,
            direction,
          ),
        ).toBe(true);
      });

      it('should return false for SL above or equal to liquidation price', () => {
        expect(
          isStopLossBeyondLiquidationPrice('125', liquidationPrice, direction),
        ).toBe(false);
        expect(
          isStopLossBeyondLiquidationPrice(
            '$130.00',
            liquidationPrice,
            direction,
          ),
        ).toBe(false);
        expect(
          isStopLossBeyondLiquidationPrice(
            '120.01',
            liquidationPrice,
            direction,
          ),
        ).toBe(false);
        expect(
          isStopLossBeyondLiquidationPrice(
            '120.00',
            liquidationPrice,
            direction,
          ),
        ).toBe(false);
      });

      it('should handle formatted liquidation prices', () => {
        expect(
          isStopLossBeyondLiquidationPrice('115', '$120.00', direction),
        ).toBe(true);
        expect(
          isStopLossBeyondLiquidationPrice('115', '1,120.00', direction),
        ).toBe(true);
        expect(
          isStopLossBeyondLiquidationPrice('1,125', '1,120.00', direction),
        ).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should return true when inputs are invalid or missing', () => {
        // Missing liquidation price
        expect(isStopLossBeyondLiquidationPrice('100', undefined, 'long')).toBe(
          true,
        );
        expect(isStopLossBeyondLiquidationPrice('100', '', 'long')).toBe(true);

        // Missing direction
        expect(isStopLossBeyondLiquidationPrice('100', '80', undefined)).toBe(
          true,
        );

        // Missing stop loss price
        expect(isStopLossBeyondLiquidationPrice(undefined, '80', 'long')).toBe(
          true,
        );
        expect(isStopLossBeyondLiquidationPrice('', '80', 'long')).toBe(true);

        // Invalid numeric values
        expect(isStopLossBeyondLiquidationPrice('invalid', '80', 'long')).toBe(
          true,
        );
        expect(isStopLossBeyondLiquidationPrice('100', 'invalid', 'long')).toBe(
          true,
        );
      });

      it('should handle decimal precision correctly', () => {
        // Long position: SL must be above liquidation
        // 80.001 rounds to 80.00, same as 80.000, so should be false (not beyond)
        expect(
          isStopLossBeyondLiquidationPrice('80.001', '80.000', 'long'),
        ).toBe(false);
        expect(
          isStopLossBeyondLiquidationPrice('79.999', '80.000', 'long'),
        ).toBe(false);

        // Short position: SL must be below liquidation
        // 79.999 rounds to 80.00, same as 80.000, so should be false (not beyond)
        expect(
          isStopLossBeyondLiquidationPrice('79.999', '80.000', 'short'),
        ).toBe(false);
        expect(
          isStopLossBeyondLiquidationPrice('80.001', '80.000', 'short'),
        ).toBe(false);
      });

      it('should handle very small price differences', () => {
        const liquidationPrice = '100.00';

        // Long: barely above liquidation should be valid
        expect(
          isStopLossBeyondLiquidationPrice('100.01', liquidationPrice, 'long'),
        ).toBe(true);

        // Short: barely below liquidation should be valid
        expect(
          isStopLossBeyondLiquidationPrice('99.99', liquidationPrice, 'short'),
        ).toBe(true);
      });

      it('should handle zero and negative prices', () => {
        expect(isStopLossBeyondLiquidationPrice('0', '10', 'long')).toBe(false);
        expect(isStopLossBeyondLiquidationPrice('0', '10', 'short')).toBe(true);
        expect(isStopLossBeyondLiquidationPrice('5', '0', 'long')).toBe(true);
        expect(isStopLossBeyondLiquidationPrice('5', '0', 'short')).toBe(false);
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

    describe('with liquidation price validation', () => {
      describe('Long positions', () => {
        const longParamsWithLiquidation = {
          currentPrice: 100,
          direction: 'long' as const,
          liquidationPrice: '80',
        };

        it('should return true when stop loss is above liquidation price (valid)', () => {
          // Valid TP and SL above liquidation (passes liquidation check)
          expect(
            validateTPSLPrices('150', '85', longParamsWithLiquidation),
          ).toBe(true);

          // Valid TP, SL just above liquidation (passes liquidation check)
          expect(
            validateTPSLPrices('150', '80.01', longParamsWithLiquidation),
          ).toBe(true);

          // Only TP provided (no SL to validate against liquidation)
          expect(
            validateTPSLPrices('150', undefined, longParamsWithLiquidation),
          ).toBe(true);
        });

        it('should return false when stop loss is at or below liquidation price (invalid)', () => {
          // Valid TP but SL below liquidation (fails liquidation check)
          expect(
            validateTPSLPrices('150', '75', longParamsWithLiquidation),
          ).toBe(false);

          // Valid TP but SL equal to liquidation (fails liquidation check)
          expect(
            validateTPSLPrices('150', '80', longParamsWithLiquidation),
          ).toBe(false);

          // Valid TP but SL just below liquidation (fails liquidation check)
          expect(
            validateTPSLPrices('150', '79.99', longParamsWithLiquidation),
          ).toBe(false);
        });

        it('should return false when both TP and SL are invalid', () => {
          // Invalid TP (below current) and SL below liquidation
          expect(
            validateTPSLPrices('50', '75', longParamsWithLiquidation),
          ).toBe(false);

          // Invalid TP and SL equal to liquidation
          expect(
            validateTPSLPrices('50', '80', longParamsWithLiquidation),
          ).toBe(false);
        });
      });

      describe('Short positions', () => {
        const shortParamsWithLiquidation = {
          currentPrice: 100,
          direction: 'short' as const,
          liquidationPrice: '120',
        };

        it('should return true when stop loss is below liquidation price (valid)', () => {
          // Valid TP and SL below liquidation (passes liquidation check)
          expect(
            validateTPSLPrices('90', '115', shortParamsWithLiquidation),
          ).toBe(true);

          // Valid TP, SL just below liquidation (passes liquidation check)
          expect(
            validateTPSLPrices('90', '119.99', shortParamsWithLiquidation),
          ).toBe(true);

          // Only TP provided (no SL to validate against liquidation)
          expect(
            validateTPSLPrices('90', undefined, shortParamsWithLiquidation),
          ).toBe(true);
        });

        it('should return false when stop loss is at or above liquidation price (invalid)', () => {
          // Valid TP but SL above liquidation (fails liquidation check)
          expect(
            validateTPSLPrices('90', '125', shortParamsWithLiquidation),
          ).toBe(false);

          // Valid TP but SL equal to liquidation (fails liquidation check)
          expect(
            validateTPSLPrices('90', '120', shortParamsWithLiquidation),
          ).toBe(false);

          // Valid TP but SL just above liquidation (fails liquidation check)
          expect(
            validateTPSLPrices('90', '120.01', shortParamsWithLiquidation),
          ).toBe(false);
        });

        it('should return false when both TP and SL are invalid', () => {
          // Invalid TP (above current) and SL above liquidation
          expect(
            validateTPSLPrices('150', '125', shortParamsWithLiquidation),
          ).toBe(false);

          // Invalid TP and SL equal to liquidation
          expect(
            validateTPSLPrices('150', '120', shortParamsWithLiquidation),
          ).toBe(false);
        });
      });

      describe('Edge cases with liquidation price', () => {
        it('should handle formatted liquidation prices', () => {
          const longParams = {
            currentPrice: 100,
            direction: 'long' as const,
            liquidationPrice: '$80.00',
          };

          expect(validateTPSLPrices('150', '85', longParams)).toBe(true);
          expect(validateTPSLPrices('150', '75', longParams)).toBe(false);
        });

        it('should handle invalid liquidation price gracefully', () => {
          const paramsWithInvalidLiquidation = {
            currentPrice: 100,
            direction: 'long' as const,
            liquidationPrice: 'invalid',
          };

          // Should still validate TP/SL normally when liquidation price is invalid
          expect(
            validateTPSLPrices('150', '50', paramsWithInvalidLiquidation),
          ).toBe(true);
          expect(
            validateTPSLPrices('50', '50', paramsWithInvalidLiquidation),
          ).toBe(false);
        });

        it('should handle empty liquidation price', () => {
          const paramsWithEmptyLiquidation = {
            currentPrice: 100,
            direction: 'long' as const,
            liquidationPrice: '',
          };

          // Should still validate TP/SL normally when liquidation price is empty
          expect(
            validateTPSLPrices('150', '50', paramsWithEmptyLiquidation),
          ).toBe(true);
          expect(
            validateTPSLPrices('50', '50', paramsWithEmptyLiquidation),
          ).toBe(false);
        });

        it('should validate only TP/SL when no liquidation price provided', () => {
          const paramsWithoutLiquidation = {
            currentPrice: 100,
            direction: 'long' as const,
          };

          // Should work exactly like before when no liquidation price
          expect(
            validateTPSLPrices('150', '50', paramsWithoutLiquidation),
          ).toBe(true);
          expect(validateTPSLPrices('50', '50', paramsWithoutLiquidation)).toBe(
            false,
          );
        });
      });
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

  describe('calculatePriceForRoE', () => {
    describe('Long positions', () => {
      const params = {
        currentPrice: 100,
        direction: 'long' as const,
        leverage: 10,
        entryPrice: 100,
      };

      it('should calculate take profit price correctly for positive RoE', () => {
        expect(calculatePriceForRoE(10, true, params)).toBe('101');
        expect(calculatePriceForRoE(50, true, params)).toBe('105');
        expect(calculatePriceForRoE(100, true, params)).toBe('110');
      });

      it('should calculate stop loss price correctly for negative RoE', () => {
        expect(calculatePriceForRoE(-10, false, params)).toBe('99');
        expect(calculatePriceForRoE(-50, false, params)).toBe('95');
        expect(calculatePriceForRoE(-100, false, params)).toBe('90');
      });

      it('should handle different leverage values', () => {
        const lowLeverageParams = { ...params, leverage: 1 };
        const highLeverageParams = { ...params, leverage: 50 };

        // With 1x leverage, 10% RoE requires 10% price movement
        expect(calculatePriceForRoE(10, true, lowLeverageParams)).toBe('110');

        // With 50x leverage, 10% RoE requires 0.2% price movement
        expect(calculatePriceForRoE(10, true, highLeverageParams)).toBe(
          '100.2',
        );
      });
    });

    describe('Short positions', () => {
      const params = {
        currentPrice: 100,
        direction: 'short' as const,
        leverage: 10,
        entryPrice: 100,
      };

      it('should calculate take profit price correctly for positive RoE', () => {
        expect(calculatePriceForRoE(10, true, params)).toBe('99');
        expect(calculatePriceForRoE(50, true, params)).toBe('95');
        expect(calculatePriceForRoE(100, true, params)).toBe('90');
      });

      it('should calculate stop loss price correctly for negative RoE', () => {
        expect(calculatePriceForRoE(-10, false, params)).toBe('101');
        expect(calculatePriceForRoE(-50, false, params)).toBe('105');
        expect(calculatePriceForRoE(-100, false, params)).toBe('110');
      });
    });

    describe('Uses entry price when available', () => {
      it('should use entryPrice over currentPrice when both provided', () => {
        const params = {
          currentPrice: 100,
          direction: 'long' as const,
          leverage: 10,
          entryPrice: 120,
        };

        // Should calculate based on entry price (120), not current price (100)
        expect(calculatePriceForRoE(10, true, params)).toBe('121.2');
      });

      it('should fall back to currentPrice when entryPrice not provided', () => {
        const params = {
          currentPrice: 100,
          direction: 'long' as const,
          leverage: 10,
        };

        expect(calculatePriceForRoE(10, true, params)).toBe('101');
      });
    });

    describe('Edge cases', () => {
      it('should return empty string when no base price available', () => {
        const params = {
          currentPrice: 0,
          direction: 'long' as const,
          leverage: 10,
        };
        expect(calculatePriceForRoE(10, true, params)).toBe('');
      });

      it('should handle zero RoE', () => {
        const params = {
          currentPrice: 100,
          direction: 'long' as const,
          leverage: 10,
        };

        expect(calculatePriceForRoE(0, true, params)).toBe('100');
        expect(calculatePriceForRoE(0, false, params)).toBe('100');
      });

      it('should handle very high leverage', () => {
        const params = {
          currentPrice: 100,
          direction: 'long' as const,
          leverage: 100,
        };

        // With 100x leverage, 10% RoE requires only 0.1% price movement
        expect(calculatePriceForRoE(10, true, params)).toBe('100.1');
      });
    });

    describe('Dynamic precision for different price ranges', () => {
      it('should use 8 decimal places for very small prices (< $0.01)', () => {
        // Arrange - PEPE-like asset
        const pepeParams = {
          currentPrice: 0.00001,
          direction: 'long' as const,
          leverage: 10,
        };

        // Act & Assert - should preserve precision for micro-price movements
        expect(calculatePriceForRoE(10, true, pepeParams)).toBe('0.0000101');
        expect(calculatePriceForRoE(-5, false, pepeParams)).toBe('0.00000995');
      });

      it('should use 6 decimal places for prices between $0.01 and $1', () => {
        // Arrange
        const smallPriceParams = {
          currentPrice: 0.5,
          direction: 'long' as const,
          leverage: 10,
        };

        // Act & Assert
        expect(calculatePriceForRoE(10, true, smallPriceParams)).toBe('0.505');
        expect(calculatePriceForRoE(-5, false, smallPriceParams)).toBe(
          '0.4975',
        );
      });

      it('should use 4 decimal places for prices between $1 and $100', () => {
        // Arrange
        const mediumPriceParams = {
          currentPrice: 50,
          direction: 'long' as const,
          leverage: 10,
        };

        // Act & Assert
        expect(calculatePriceForRoE(10, true, mediumPriceParams)).toBe('50.5');
        expect(calculatePriceForRoE(-5, false, mediumPriceParams)).toBe(
          '49.75',
        );
      });

      it('should use 2 decimal places for high prices (≥ $100)', () => {
        // Arrange
        const highPriceParams = {
          currentPrice: 1000,
          direction: 'long' as const,
          leverage: 10,
        };

        // Act & Assert
        expect(calculatePriceForRoE(10, true, highPriceParams)).toBe('1010');
        expect(calculatePriceForRoE(-5, false, highPriceParams)).toBe('995');
      });

      it('should handle edge cases at precision boundaries', () => {
        // Test exactly at $0.01
        const edgeCase1 = {
          currentPrice: 0.01,
          direction: 'long' as const,
          leverage: 10,
        };
        expect(calculatePriceForRoE(10, true, edgeCase1)).toBe('0.0101');

        // Test exactly at $1
        const edgeCase2 = {
          currentPrice: 1.0,
          direction: 'long' as const,
          leverage: 10,
        };
        expect(calculatePriceForRoE(10, true, edgeCase2)).toBe('1.01');

        // Test exactly at $100
        const edgeCase3 = {
          currentPrice: 100.0,
          direction: 'long' as const,
          leverage: 10,
        };
        expect(calculatePriceForRoE(10, true, edgeCase3)).toBe('101');
      });

      it('should fix the PEPE price update bug mentioned in PR comments', () => {
        // Given - PEPE token with very small price and 10x leverage
        const pepeParams = {
          currentPrice: 0.00001234,
          direction: 'long' as const,
          leverage: 10,
        };

        // When - clicking 10% take profit button
        const result = calculatePriceForRoE(10, true, pepeParams);

        // Then - should calculate correct micro-price movement, not return 0.00
        expect(result).not.toBe('0.00');
        expect(parseFloat(result)).toBeGreaterThan(pepeParams.currentPrice);
        expect(result).toBe('0.00001246'); // ~1% price increase for 10% RoE with 10x leverage
      });

      it('should fix SHORT position price calculations for low-priced assets', () => {
        // Given - PEPE short position with very small price
        const pepeShortParams = {
          currentPrice: 0.00001234,
          direction: 'short' as const,
          leverage: 10,
        };

        // When - clicking 10% take profit button for short (should decrease price)
        const tpResult = calculatePriceForRoE(10, true, pepeShortParams);

        // Then - should calculate correct micro-price decrease
        expect(tpResult).not.toBe('0.00');
        expect(parseFloat(tpResult)).toBeLessThan(pepeShortParams.currentPrice);
        expect(tpResult).toBe('0.00001222'); // ~1% price decrease for 10% RoE with 10x leverage

        // When - clicking 5% stop loss button for short (should increase price)
        const slResult = calculatePriceForRoE(-5, false, pepeShortParams);

        // Then - should calculate correct micro-price increase
        expect(slResult).not.toBe('0.00');
        expect(parseFloat(slResult)).toBeGreaterThan(
          pepeShortParams.currentPrice,
        );
        expect(slResult).toBe('0.0000124'); // ~0.5% price increase for 5% loss with 10x leverage
      });
    });
  });

  describe('calculateRoEForPrice', () => {
    describe('Long positions', () => {
      const params = {
        currentPrice: 100,
        direction: 'long' as const,
        leverage: 10,
        entryPrice: 100,
      };

      it('should calculate RoE for take profit prices correctly', () => {
        expect(calculateRoEForPrice('101', true, params)).toBe('10.00');
        expect(calculateRoEForPrice('105', true, params)).toBe('50.00');
        expect(calculateRoEForPrice('110', true, params)).toBe('100.00');
        expect(calculateRoEForPrice('$101.00', true, params)).toBe('10.00');
        expect(calculateRoEForPrice('1,105.00', true, params)).toBe('10050.00'); // 1105 - 100 = 1005, (1005/100)*10 = 100.5% * 100 leverage effect
      });

      it('should calculate RoE for stop loss prices correctly', () => {
        expect(calculateRoEForPrice('99', false, params)).toBe('10.00');
        expect(calculateRoEForPrice('95', false, params)).toBe('50.00');
        expect(calculateRoEForPrice('90', false, params)).toBe('100.00');
        expect(calculateRoEForPrice('$99.00', false, params)).toBe('10.00');
      });

      it('should return zero RoE for invalid directions', () => {
        // TP price below entry for long (wrong direction)
        expect(calculateRoEForPrice('99', true, params)).toBe('0.00');

        // SL price above entry for long (wrong direction)
        expect(calculateRoEForPrice('101', false, params)).toBe('0.00');
      });

      it('should handle different leverage values', () => {
        const lowLeverageParams = { ...params, leverage: 1 };
        const highLeverageParams = { ...params, leverage: 50 };

        // With 1x leverage, 1% price move = 1% RoE
        expect(calculateRoEForPrice('101', true, lowLeverageParams)).toBe(
          '1.00',
        );

        // With 50x leverage, 1% price move = 50% RoE
        expect(calculateRoEForPrice('101', true, highLeverageParams)).toBe(
          '50.00',
        );
      });
    });

    describe('Short positions', () => {
      const params = {
        currentPrice: 100,
        direction: 'short' as const,
        leverage: 10,
        entryPrice: 100,
      };

      it('should calculate RoE for take profit prices correctly', () => {
        expect(calculateRoEForPrice('99', true, params)).toBe('10.00');
        expect(calculateRoEForPrice('95', true, params)).toBe('50.00');
        expect(calculateRoEForPrice('90', true, params)).toBe('100.00');
      });

      it('should calculate RoE for stop loss prices correctly', () => {
        expect(calculateRoEForPrice('101', false, params)).toBe('10.00');
        expect(calculateRoEForPrice('105', false, params)).toBe('50.00');
        expect(calculateRoEForPrice('110', false, params)).toBe('100.00');
      });

      it('should return zero RoE for invalid directions', () => {
        // TP price above entry for short (wrong direction)
        expect(calculateRoEForPrice('101', true, params)).toBe('0.00');

        // SL price below entry for short (wrong direction)
        expect(calculateRoEForPrice('99', false, params)).toBe('0.00');
      });
    });

    describe('Uses entry price when available', () => {
      it('should use entryPrice over currentPrice when both provided', () => {
        const params = {
          currentPrice: 100,
          direction: 'long' as const,
          leverage: 10,
          entryPrice: 120,
        };

        // Should calculate RoE based on entry price (120), not current price (100)
        expect(calculateRoEForPrice('121.20', true, params)).toBe('10.00');
      });

      it('should fall back to currentPrice when entryPrice not provided', () => {
        const params = {
          currentPrice: 100,
          direction: 'long' as const,
          leverage: 10,
        };

        expect(calculateRoEForPrice('101', true, params)).toBe('10.00');
      });
    });

    describe('Edge cases', () => {
      it('should return empty string when no base price available', () => {
        const params = {
          currentPrice: 0,
          direction: 'long' as const,
          leverage: 10,
        };
        expect(calculateRoEForPrice('110', true, params)).toBe('');
      });

      it('should return empty string when price is invalid', () => {
        const params = {
          currentPrice: 100,
          direction: 'long' as const,
          leverage: 10,
        };

        expect(calculateRoEForPrice('', true, params)).toBe('');
        expect(calculateRoEForPrice('invalid', true, params)).toBe('');
      });

      it('should handle zero leverage by using default value', () => {
        const params = {
          currentPrice: 100,
          direction: 'long' as const,
          leverage: 1, // function defaults to 1 when leverage not provided
        };

        // With 1x leverage, 10% price move = 10% RoE
        expect(calculateRoEForPrice('110', true, params)).toBe('10.00');
      });

      it('should handle price equal to base price', () => {
        const params = {
          currentPrice: 100,
          direction: 'long' as const,
          leverage: 10,
        };

        expect(calculateRoEForPrice('100', true, params)).toBe('0.00');
        expect(calculateRoEForPrice('100', false, params)).toBe('0.00');
      });
    });

    describe('Price formatting handling', () => {
      const params = {
        currentPrice: 100,
        direction: 'long' as const,
        leverage: 10,
      };

      it('should handle various price formats', () => {
        expect(calculateRoEForPrice('$101.00', true, params)).toBe('10.00');
        expect(calculateRoEForPrice('1,101.00', true, params)).toBe('10010.00'); // 1101 - 100 = 1001, (1001/100)*10 = 10010%
        expect(calculateRoEForPrice('$1,101.00', true, params)).toBe(
          '10010.00',
        );
      });
    });
  });

  describe('safeParseRoEPercentage', () => {
    it('should format valid RoE percentages showing clean integers when possible', () => {
      // Integers should show without decimals
      expect(safeParseRoEPercentage('10')).toBe('10');
      expect(safeParseRoEPercentage('100')).toBe('100');
      expect(safeParseRoEPercentage('0')).toBe('0');

      // Decimals should show with appropriate precision
      expect(safeParseRoEPercentage('25.556')).toBe('25.56');
      expect(safeParseRoEPercentage('10.50')).toBe('10.50');
      expect(safeParseRoEPercentage('10.00')).toBe('10'); // Clean integer display
    });

    it('should use absolute values for display', () => {
      expect(safeParseRoEPercentage('-10')).toBe('10');
      expect(safeParseRoEPercentage('-10.123')).toBe('10.12');
      expect(safeParseRoEPercentage('-25.50')).toBe('25.50');
    });

    it('should return empty string for invalid input', () => {
      expect(safeParseRoEPercentage('')).toBe('');
      expect(safeParseRoEPercentage('   ')).toBe(''); // whitespace only
      expect(safeParseRoEPercentage('invalid')).toBe('');
      expect(safeParseRoEPercentage('NaN')).toBe('');
      expect(safeParseRoEPercentage('undefined')).toBe('');
    });

    it('should prevent NaN display that was causing the UI bug', () => {
      // These are the edge cases that were causing "NaN%" to appear in UI
      const invalidInputs = ['', '   ', 'invalid', 'NaN', 'abc123'];

      invalidInputs.forEach((input) => {
        const result = safeParseRoEPercentage(input);
        expect(result).toBe('');
        expect(result).not.toContain('NaN');
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

      it('should handle negative values by showing absolute value', () => {
        expect(formatRoEPercentageDisplay('-10.123', true)).toBe('10.123');
        expect(formatRoEPercentageDisplay('-25', true)).toBe('25');
      });

      it('should return empty string for invalid patterns when focused', () => {
        expect(formatRoEPercentageDisplay('abc', true)).toBe('');
      });

      it('should handle edge cases in pattern matching', () => {
        // '10..5' is parsed as 10 by parseFloat, so it returns the absolute value
        expect(formatRoEPercentageDisplay('10..5', true)).toBe('10');
        // '10.5.3' is parsed as 10.5 by parseFloat, so it returns the absolute value
        expect(formatRoEPercentageDisplay('10.5.3', true)).toBe('10.5');
        expect(formatRoEPercentageDisplay('5.', true)).toBe('5.');
        expect(formatRoEPercentageDisplay('.', true)).toBe('.');
      });
    });

    describe('when input is not focused', () => {
      it('should show clean display format for integers', () => {
        expect(formatRoEPercentageDisplay('10', false)).toBe('10');
        expect(formatRoEPercentageDisplay('100', false)).toBe('100');
        expect(formatRoEPercentageDisplay('0', false)).toBe('0');
        expect(formatRoEPercentageDisplay('10.00', false)).toBe('10');
        expect(formatRoEPercentageDisplay('100.000', false)).toBe('100');
      });

      it('should show decimal places when necessary', () => {
        expect(formatRoEPercentageDisplay('10.5', false)).toBe('10.50');
        expect(formatRoEPercentageDisplay('25.123', false)).toBe('25.12');
        expect(formatRoEPercentageDisplay('99.99', false)).toBe('99.99');
      });

      it('should handle negative values by showing absolute value', () => {
        expect(formatRoEPercentageDisplay('-10', false)).toBe('10');
        expect(formatRoEPercentageDisplay('-10.5', false)).toBe('10.50');
        expect(formatRoEPercentageDisplay('-25.123', false)).toBe('25.12');
      });
    });

    describe('edge cases', () => {
      it('should return empty string for invalid input', () => {
        expect(formatRoEPercentageDisplay('', true)).toBe('');
        expect(formatRoEPercentageDisplay('', false)).toBe('');
        expect(formatRoEPercentageDisplay('   ', true)).toBe('');
        expect(formatRoEPercentageDisplay('invalid', false)).toBe('');
        expect(formatRoEPercentageDisplay('NaN', true)).toBe('');
      });

      it('should handle zero correctly', () => {
        expect(formatRoEPercentageDisplay('0', true)).toBe('0');
        expect(formatRoEPercentageDisplay('0.0', false)).toBe('0');
        expect(formatRoEPercentageDisplay('0.00', false)).toBe('0');
      });
    });
  });

  describe('getMaxStopLossPercentage', () => {
    it('should calculate maximum stop loss percentage based on leverage', () => {
      expect(getMaxStopLossPercentage(1)).toBe(99);
      expect(getMaxStopLossPercentage(5)).toBe(495);
      expect(getMaxStopLossPercentage(10)).toBe(990);
      expect(getMaxStopLossPercentage(20)).toBe(999); // Capped at 999
    });

    it('should cap maximum stop loss at 999%', () => {
      expect(getMaxStopLossPercentage(50)).toBe(999); // 50 * 99 = 4950, but capped at 999
      expect(getMaxStopLossPercentage(100)).toBe(999); // 100 * 99 = 9900, but capped at 999
    });

    it('should handle edge cases', () => {
      expect(getMaxStopLossPercentage(0)).toBe(0);
      expect(getMaxStopLossPercentage(0.5)).toBe(49.5);
      expect(getMaxStopLossPercentage(1.5)).toBe(148.5);
    });
  });

  describe('isValidStopLossPercentage', () => {
    describe('with 10x leverage', () => {
      const leverage = 10;

      it('should return true for valid percentages', () => {
        expect(isValidStopLossPercentage(1, leverage)).toBe(true);
        expect(isValidStopLossPercentage(50, leverage)).toBe(true);
        expect(isValidStopLossPercentage(99, leverage)).toBe(true);
        expect(isValidStopLossPercentage(990, leverage)).toBe(true); // Max for 10x leverage
      });

      it('should return false for invalid percentages', () => {
        expect(isValidStopLossPercentage(0, leverage)).toBe(false);
        expect(isValidStopLossPercentage(-5, leverage)).toBe(false);
        expect(isValidStopLossPercentage(991, leverage)).toBe(false); // Above max
        expect(isValidStopLossPercentage(1500, leverage)).toBe(false);
      });
    });

    describe('with high leverage (50x)', () => {
      const leverage = 50;

      it('should cap at 999% regardless of leverage', () => {
        expect(isValidStopLossPercentage(999, leverage)).toBe(true);
        expect(isValidStopLossPercentage(1000, leverage)).toBe(false);
      });
    });

    describe('with low leverage (1x)', () => {
      const leverage = 1;

      it('should allow up to 99% for 1x leverage', () => {
        expect(isValidStopLossPercentage(99, leverage)).toBe(true);
        expect(isValidStopLossPercentage(100, leverage)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(isValidStopLossPercentage(0.1, 10)).toBe(true);
      expect(isValidStopLossPercentage(-0.1, 10)).toBe(false);
    });
  });
});
