/**
 * @jest-environment node
 */

import { matchesAccessibilityLabel } from './AppiumAssertions';

describe('AppiumAssertions label matching', () => {
  it('supports exact label matching', () => {
    expect(matchesAccessibilityLabel('0', '0', true)).toBe(true);
  });

  it('supports exact matching when accessibility and visible labels are joined', () => {
    expect(matchesAccessibilityLabel('0, 0', '0', true)).toBe(true);
  });

  it('does not treat a containing label as an exact match', () => {
    expect(matchesAccessibilityLabel('250', '0', true)).toBe(false);
    expect(matchesAccessibilityLabel('250, 2500', '250', true)).toBe(false);
  });

  it('exact-matches a thousands-separated amount when labels are joined', () => {
    expect(matchesAccessibilityLabel('1,000, 1,000', '1,000', true)).toBe(true);
  });

  it('rejects an empty label for exact matching', () => {
    expect(matchesAccessibilityLabel('', '', true)).toBe(false);
    expect(matchesAccessibilityLabel('', '1,000', true)).toBe(false);
    expect(matchesAccessibilityLabel('1,000', '', true)).toBe(false);
  });

  it('does not exact-match an amount that is only part of a longer value', () => {
    expect(matchesAccessibilityLabel('500', '50', true)).toBe(false);
    expect(matchesAccessibilityLabel('500, 500', '50', true)).toBe(false);
    expect(matchesAccessibilityLabel('0.5', '5', true)).toBe(false);
    expect(matchesAccessibilityLabel('0.5, 0.5', '5', true)).toBe(false);
    expect(matchesAccessibilityLabel('50, 50', '50', true)).toBe(true);
  });
});
