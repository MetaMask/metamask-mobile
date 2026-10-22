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
});
