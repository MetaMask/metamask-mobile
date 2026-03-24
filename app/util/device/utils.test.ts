import { compareSemver } from './utils';

describe('compareSemver', () => {
  it('returns 1 when v1 is greater than v2', () => {
    expect(compareSemver('2.0.0', '1.9.9')).toBe(1);
    expect(compareSemver('1.1', '1.0.9')).toBe(1);
  });

  it('returns -1 when v1 is less than v2', () => {
    expect(compareSemver('1.0.0', '2.0.0')).toBe(-1);
    expect(compareSemver('17.3.1', '17.4')).toBe(-1);
  });

  it('returns 0 when versions are equal', () => {
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
    expect(compareSemver('17.4', '17.4')).toBe(0);
  });

  it('compares numeric inputs using dotted segments', () => {
    expect(compareSemver(17, 16)).toBe(1);
    expect(compareSemver(17, 18)).toBe(-1);
    expect(compareSemver(17, 17)).toBe(0);
  });

  it('treats missing trailing segments as zero', () => {
    expect(compareSemver('1.0', '1.0.0')).toBe(0);
    expect(compareSemver('1.0.1', '1.0')).toBe(1);
    expect(compareSemver('1.0', '1.0.1')).toBe(-1);
  });

  it('handles mixed string and number arguments', () => {
    expect(compareSemver(17, '17.4')).toBe(-1);
    expect(compareSemver('18', 17)).toBe(1);
    expect(compareSemver('17', 17)).toBe(0);
  });
});
