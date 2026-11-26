import { clampToRange, isEvenLength } from '.';

describe('foldProbeNarrow', () => {
  it('clamps a value into the range', () => {
    expect(clampToRange(10, 0, 5)).toBe(5);
    expect(clampToRange(-1, 0, 5)).toBe(0);
    expect(clampToRange(3, 0, 5)).toBe(3);
  });

  it('reports whether a string has an even length', () => {
    expect(isEvenLength('ab')).toBe(true);
    expect(isEvenLength('abc')).toBe(false);
  });
});
