import { brandColor } from '@metamask/design-tokens';
import { glowStyle, toAlphaHex } from './PackReveal.glow';

const COLOR = brandColor.blue300;

describe('toAlphaHex', () => {
  it.each([
    [0, '00'],
    [0x55 / 255, '55'],
    [0.85, 'd9'],
    [1, 'ff'],
    [-1, '00'],
    [2, 'ff'],
  ])('encodes opacity %s as %s', (opacity, expected) => {
    const result = toAlphaHex(opacity);

    expect(result).toBe(expected);
  });
});

describe('glowStyle', () => {
  it('keeps the iOS layer shadow unchanged', () => {
    const result = glowStyle({ color: COLOR, radius: 8, opacity: 0.85 }, 'ios');

    expect(result).toStrictEqual({
      shadowColor: COLOR,
      shadowOpacity: 0.85,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
    });
  });

  it('ignores the fill alpha on iOS, whose layer already applies it', () => {
    const result = glowStyle(
      { color: COLOR, radius: 16, opacity: 1, fillAlpha: 0x55 / 255 },
      'ios',
    );

    expect(result).toHaveProperty('shadowOpacity', 1);
  });

  it('draws the same centered glow on Android with a box shadow', () => {
    const result = glowStyle(
      { color: COLOR, radius: 8, opacity: 0.85 },
      'android',
    );

    expect(result).toStrictEqual({
      boxShadow: [
        { offsetX: 0, offsetY: 0, blurRadius: 16, color: `${COLOR}d9` },
      ],
    });
  });

  it('dims the Android glow by a translucent fill, like the iOS layer shadow', () => {
    const result = glowStyle(
      { color: COLOR, radius: 16, opacity: 1, fillAlpha: 0x55 / 255 },
      'android',
    );

    expect(result).toStrictEqual({
      boxShadow: [
        { offsetX: 0, offsetY: 0, blurRadius: 32, color: `${COLOR}55` },
      ],
    });
  });
});
