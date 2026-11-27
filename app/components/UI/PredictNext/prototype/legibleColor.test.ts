/* eslint-disable @metamask/design-tokens/color-no-hex */
import { legibleColor } from './legibleColor';

const DARK = '#131416';
const LIGHT = '#ffffff';

describe('legibleColor', () => {
  it('keeps a color that already reads on the background', () => {
    const result = legibleColor('#b9f302', DARK);

    expect(result).toBe('#b9f302');
  });

  it('lightens a navy team color on a dark background', () => {
    const result = legibleColor('#00338d', DARK);

    expect(result).not.toBe('#00338d');
    expect(parseInt(result.slice(1, 3), 16)).toBeGreaterThan(0x33);
  });

  it('darkens a yellow team color on a light background', () => {
    const result = legibleColor('#f2b705', LIGHT);

    expect(parseInt(result.slice(1, 3), 16)).toBeLessThan(0xf2);
  });

  it('returns colors it cannot parse unchanged', () => {
    const result = legibleColor('rgb(1, 2, 3)', DARK);

    expect(result).toBe('rgb(1, 2, 3)');
  });
});
