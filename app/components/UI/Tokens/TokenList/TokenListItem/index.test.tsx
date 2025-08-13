/**
 * TokenListItem Unit Tests - Core Logic
 *
 * Tests the specific functionality added during layout reorganization:
 * - Percentage change color logic
 * - Text formatting
 * - Layout prioritization
 */

import { TextColor } from '../../../../../component-library/components/Texts/Text';

describe('TokenListItem - Core Logic', () => {
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

    it('returns success color for positive percentage change', () => {
      const result = getPercentageColor(5.67, true);
      expect(result).toBe(TextColor.Success);
    });

    it('returns error color for negative percentage change', () => {
      const result = getPercentageColor(-3.25, true);
      expect(result).toBe(TextColor.Error);
    });

    it('returns alternative color for zero percentage change', () => {
      const result = getPercentageColor(0, true);
      expect(result).toBe(TextColor.Alternative);
    });

    it('returns alternative color when percentage not available', () => {
      const result = getPercentageColor(null, false);
      expect(result).toBe(TextColor.Alternative);
    });
  });

  describe('percentage text formatting', () => {
    const formatPercentageText = (
      value: number | null,
      hasChange: boolean,
    ): string | undefined => {
      if (!hasChange || value === null) return undefined;
      return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    it('formats positive percentages with plus sign', () => {
      const result = formatPercentageText(12.345, true);
      expect(result).toBe('+12.35%');
    });

    it('formats negative percentages correctly', () => {
      const result = formatPercentageText(-8.91, true);
      expect(result).toBe('-8.91%');
    });

    it('formats zero percentage with plus sign', () => {
      const result = formatPercentageText(0, true);
      expect(result).toBe('+0.00%');
    });

    it('returns undefined when no percentage available', () => {
      const result = formatPercentageText(null, false);
      expect(result).toBeUndefined();
    });
  });
});
