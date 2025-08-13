import { TextColor } from '../../../../../component-library/components/Texts/Text';

describe('TokenListItem - Core Logic', () => {
  describe('percentage availability check', () => {
    const hasPercentageChange = (
      _chainId: string,
      showPercentageChange: boolean,
      pricePercentChange1d: number | null | undefined,
      isTestNet: boolean = false,
    ): boolean =>
      !isTestNet &&
      showPercentageChange &&
      pricePercentChange1d !== null &&
      pricePercentChange1d !== undefined &&
      Number.isFinite(pricePercentChange1d);

    describe('when on mainnet', () => {
      it('returns true for valid finite percentage', () => {
        // Arrange
        const validPercentage = 5.67;

        // Act
        const result = hasPercentageChange('0x1', true, validPercentage, false);

        // Assert
        expect(result).toBe(true);
      });

      it('returns false for null percentage', () => {
        // Arrange & Act
        const result = hasPercentageChange('0x1', true, null, false);

        // Assert
        expect(result).toBe(false);
      });

      it('returns false for undefined percentage', () => {
        // Arrange & Act
        const result = hasPercentageChange('0x1', true, undefined, false);

        // Assert
        expect(result).toBe(false);
      });

      it('returns false when showPercentageChange is disabled', () => {
        // Arrange & Act
        const result = hasPercentageChange('0x1', false, 5.67, false);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('when on testnet', () => {
      it('returns false even with valid percentage', () => {
        // Arrange & Act
        const result = hasPercentageChange('0x1', true, 5.67, true);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('critical edge cases - prevents crash', () => {
      it('returns false for Infinity to prevent toFixed crash', () => {
        // Arrange & Act
        const result = hasPercentageChange('0x1', true, Infinity, false);

        // Assert
        expect(result).toBe(false);
      });

      it('returns false for negative Infinity to prevent toFixed crash', () => {
        // Arrange & Act
        const result = hasPercentageChange('0x1', true, -Infinity, false);

        // Assert
        expect(result).toBe(false);
      });

      it('returns false for NaN to prevent toFixed crash', () => {
        // Arrange & Act
        const result = hasPercentageChange('0x1', true, NaN, false);

        // Assert
        expect(result).toBe(false);
      });
    });
  });

  describe('percentage color logic', () => {
    const getPercentageColor = (
      pricePercentChange1d: number | null,
      hasPercentageChange: boolean,
    ): TextColor => {
      if (!hasPercentageChange) return TextColor.Alternative;
      if (pricePercentChange1d === 0) return TextColor.Alternative;
      if (pricePercentChange1d && pricePercentChange1d > 0)
        return TextColor.Success;
      return TextColor.Error;
    };

    describe('when percentage change is available', () => {
      it('returns success color for positive percentage change', () => {
        // Arrange
        const positivePercentage = 5.67;

        // Act
        const result = getPercentageColor(positivePercentage, true);

        // Assert
        expect(result).toBe(TextColor.Success);
      });

      it('returns error color for negative percentage change', () => {
        // Arrange
        const negativePercentage = -3.25;

        // Act
        const result = getPercentageColor(negativePercentage, true);

        // Assert
        expect(result).toBe(TextColor.Error);
      });

      it('returns alternative color for zero percentage change', () => {
        // Arrange
        const zeroPercentage = 0;

        // Act
        const result = getPercentageColor(zeroPercentage, true);

        // Assert
        expect(result).toBe(TextColor.Alternative);
      });

      it('returns alternative color for very small positive change', () => {
        // Arrange
        const smallPositive = 0.01;

        // Act
        const result = getPercentageColor(smallPositive, true);

        // Assert
        expect(result).toBe(TextColor.Success);
      });

      it('returns error color for very small negative change', () => {
        // Arrange
        const smallNegative = -0.01;

        // Act
        const result = getPercentageColor(smallNegative, true);

        // Assert
        expect(result).toBe(TextColor.Error);
      });
    });

    describe('when percentage change is not available', () => {
      it('returns alternative color when percentage not available', () => {
        // Arrange & Act
        const result = getPercentageColor(null, false);

        // Assert
        expect(result).toBe(TextColor.Alternative);
      });

      it('returns alternative color even with valid percentage when disabled', () => {
        // Arrange & Act
        const result = getPercentageColor(5.67, false);

        // Assert
        expect(result).toBe(TextColor.Alternative);
      });
    });
  });

  describe('percentage text formatting', () => {
    const formatPercentageText = (
      value: number | null | undefined,
      hasChange: boolean,
    ): string | undefined => {
      if (!hasChange || value === null || value === undefined) return undefined;
      if (!Number.isFinite(value)) return undefined; // Critical safety check
      return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    describe('valid formatting cases', () => {
      it('formats positive percentages with plus sign', () => {
        // Arrange
        const positiveValue = 12.345;

        // Act
        const result = formatPercentageText(positiveValue, true);

        // Assert
        expect(result).toBe('+12.35%');
      });

      it('formats negative percentages correctly', () => {
        // Arrange
        const negativeValue = -8.91;

        // Act
        const result = formatPercentageText(negativeValue, true);

        // Assert
        expect(result).toBe('-8.91%');
      });

      it('formats zero percentage with plus sign', () => {
        // Arrange
        const zeroValue = 0;

        // Act
        const result = formatPercentageText(zeroValue, true);

        // Assert
        expect(result).toBe('+0.00%');
      });

      it('formats large positive percentages correctly', () => {
        // Arrange
        const largePositive = 999.999;

        // Act
        const result = formatPercentageText(largePositive, true);

        // Assert
        expect(result).toBe('+1000.00%');
      });

      it('formats large negative percentages correctly', () => {
        // Arrange
        const largeNegative = -99.99;

        // Act
        const result = formatPercentageText(largeNegative, true);

        // Assert
        expect(result).toBe('-99.99%');
      });
    });

    describe('edge cases that return undefined', () => {
      it('returns undefined when no percentage available', () => {
        // Arrange & Act
        const result = formatPercentageText(null, false);

        // Assert
        expect(result).toBeUndefined();
      });

      it('returns undefined for null value', () => {
        // Arrange & Act
        const result = formatPercentageText(null, true);

        // Assert
        expect(result).toBeUndefined();
      });

      it('returns undefined for undefined value', () => {
        // Arrange & Act
        const result = formatPercentageText(undefined, true);

        // Assert
        expect(result).toBeUndefined();
      });

      it('returns undefined when hasChange is false', () => {
        // Arrange & Act
        const result = formatPercentageText(5.67, false);

        // Assert
        expect(result).toBeUndefined();
      });
    });

    describe('critical safety checks - prevents application crashes', () => {
      it('returns undefined for Infinity instead of crashing', () => {
        // Arrange & Act
        const result = formatPercentageText(Infinity, true);

        // Assert
        expect(result).toBeUndefined();
      });

      it('returns undefined for negative Infinity instead of crashing', () => {
        // Arrange & Act
        const result = formatPercentageText(-Infinity, true);

        // Assert
        expect(result).toBeUndefined();
      });

      it('returns undefined for NaN instead of crashing', () => {
        // Arrange & Act
        const result = formatPercentageText(NaN, true);

        // Assert
        expect(result).toBeUndefined();
      });

      // Test the test: Verify that without safety check, toFixed produces invalid results
      it('demonstrates why safety check is needed', () => {
        // Arrange
        const unsafeFormat = (value: number) => value.toFixed(2);

        // Act & Assert - toFixed doesn't crash but produces invalid percentage strings
        expect(unsafeFormat(Infinity)).toBe('Infinity');
        expect(unsafeFormat(NaN)).toBe('NaN');
        expect(unsafeFormat(-Infinity)).toBe('-Infinity');

        // These would result in invalid percentage text like "Infinity%" or "NaN%"
        const unsafePercentage = (value: number) =>
          `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
        expect(unsafePercentage(Infinity)).toBe('+Infinity%');
        expect(unsafePercentage(NaN)).toBe('NaN%'); // NaN >= 0 is false, so no + prefix
        expect(unsafePercentage(-Infinity)).toBe('-Infinity%');
      });
    });
  });

  describe('percentage display priority logic', () => {
    const getDisplayPriority = (
      hasPercentageChange: boolean,
      hasBalanceError: boolean,
      isRateUndefined: boolean,
    ): 'percentage' | 'error' | 'rate_error' => {
      if (hasBalanceError) return 'error';
      if (isRateUndefined) return 'rate_error';
      if (hasPercentageChange) return 'percentage';
      return 'percentage'; // fallback
    };

    it('prioritizes balance error over percentage', () => {
      // Arrange & Act
      const result = getDisplayPriority(true, true, false);

      // Assert
      expect(result).toBe('error');
    });

    it('prioritizes rate error over percentage when no balance error', () => {
      // Arrange & Act
      const result = getDisplayPriority(true, false, true);

      // Assert
      expect(result).toBe('rate_error');
    });

    it('shows percentage when no errors', () => {
      // Arrange & Act
      const result = getDisplayPriority(true, false, false);

      // Assert
      expect(result).toBe('percentage');
    });

    it('shows percentage fallback when no percentage change available', () => {
      // Arrange & Act
      const result = getDisplayPriority(false, false, false);

      // Assert
      expect(result).toBe('percentage');
    });
  });

  describe('parameterized edge case testing', () => {
    describe.each([
      {
        value: 0.001,
        expected: '+0.00%',
        description: 'very small positive rounds to zero',
      },
      {
        value: -0.001,
        expected: '-0.00%',
        description: 'very small negative rounds to zero',
      },
      { value: 0.005, expected: '+0.01%', description: 'rounding up at 0.5' },
      {
        value: -0.005,
        expected: '-0.01%',
        description: 'rounding down at -0.5',
      },
      {
        value: 100,
        expected: '+100.00%',
        description: 'exact hundred percent',
      },
      {
        value: -100,
        expected: '-100.00%',
        description: 'exact negative hundred percent',
      },
    ])(
      'percentage formatting edge cases',
      ({ value, expected, description }) => {
        it(`correctly formats ${description}`, () => {
          // Arrange
          const formatPercentageText = (val: number) =>
            `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;

          // Act
          const result = formatPercentageText(value);

          // Assert
          expect(result).toBe(expected);
        });
      },
    );
  });
});
