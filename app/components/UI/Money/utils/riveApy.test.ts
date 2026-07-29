import { APY_DIGIT_MAX, APY_DIGIT_MIN, apyDigitCount } from './riveApy';

describe('apyDigitCount', () => {
  it.each([
    ['4%', 1],
    ['4.6%', 2],
    ['14%', 2],
    ['146%', 3],
  ])('reports %s as %i digits, matching the artboard spec', (apy, expected) => {
    expect(apyDigitCount(apy)).toBe(expected);
  });

  it('counts the same digits without a percent sign', () => {
    expect(apyDigitCount('4.6')).toBe(2);
  });

  it('does not count a decimal separator as a digit', () => {
    expect(apyDigitCount('1.5%')).toBe(2);
  });

  it('clamps an APY with more digits than the artboard can lay out', () => {
    expect(apyDigitCount('1234.56%')).toBe(APY_DIGIT_MAX);
  });

  it('falls back to the smallest layout for an APY with no digits', () => {
    expect(apyDigitCount('%')).toBe(APY_DIGIT_MIN);
  });

  it('falls back to the smallest layout for an empty value', () => {
    expect(apyDigitCount('')).toBe(APY_DIGIT_MIN);
  });
});
