import { ALPHA2_TO_ALPHA3 } from '@metamask/kyc-controller';
import { alpha3ToAlpha2 } from './alpha3ToAlpha2';

describe('alpha3ToAlpha2', () => {
  it.each([
    ['USA', 'US'],
    ['BRA', 'BR'],
    ['SWE', 'SE'],
  ])('converts %s to %s', (alpha3, expected) => {
    const result = alpha3ToAlpha2(alpha3);

    expect(result).toBe(expected);
  });

  it('ignores case and surrounding whitespace', () => {
    const result = alpha3ToAlpha2(' usa ');

    expect(result).toBe('US');
  });

  it.each([
    ['an unknown code', 'XXX'],
    ['an alpha-2 code', 'US'],
    ['an empty string', ''],
    ['whitespace', '   '],
    ['null', null],
    ['undefined', undefined],
  ])('returns undefined for %s', (_label, input) => {
    const result = alpha3ToAlpha2(input);

    expect(result).toBeUndefined();
  });

  it('inverts every entry of ALPHA2_TO_ALPHA3', () => {
    const entries = Object.entries(ALPHA2_TO_ALPHA3);

    const mismatches = entries.filter(
      ([alpha2, alpha3]) => alpha3ToAlpha2(alpha3) !== alpha2,
    );

    expect(mismatches).toStrictEqual([]);
  });
});
