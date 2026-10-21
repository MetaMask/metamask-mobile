/**
 * @jest-environment node
 */

import { matchesAccessibilityLabel } from './AppiumAssertions';

describe('AppiumAssertions label matching', () => {
  it('supports exact label matching', () => {
    expect(matchesAccessibilityLabel('0', '0', true)).toBe(true);
  });

  it('does not treat a containing label as an exact match', () => {
    expect(matchesAccessibilityLabel('250', '0', true)).toBe(false);
  });
});
