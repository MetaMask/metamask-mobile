import { formatPackPrice } from './PackCard.utils';

describe('PackCard.utils', () => {
  it('formats pack prices', () => {
    expect(formatPackPrice(50)).toBe('50');
    expect(formatPackPrice(12.5)).toBe('12.50');
  });
});
