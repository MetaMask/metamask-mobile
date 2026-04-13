import { getFontSizeForInputLength } from './getFontSizeForInputLength';

describe('getFontSizeForInputLength', () => {
  it.each([
    [0, 60],
    [7, 60],
    [8, 60],
    [9, 48],
    [10, 48],
    [11, 32],
    [12, 32],
    [13, 24],
    [14, 24],
    [15, 18],
    [17, 18],
    [18, 18],
    [19, 12],
    [30, 12],
  ])('returns correct size for content length %i', (length, expected) => {
    expect(getFontSizeForInputLength(length)).toBe(expected);
  });
});
