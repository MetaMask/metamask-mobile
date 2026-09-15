import {
  FLIP_BUTTON_CUTOUT_HEIGHT,
  FLIP_BUTTON_CUTOUT_WIDTH,
  getFlipButtonFilletPaths,
} from './getFlipButtonFilletPaths';

describe('getFlipButtonFilletPaths', () => {
  it('returns four closed arc paths inside the cutout viewBox', () => {
    const paths = getFlipButtonFilletPaths();

    expect(paths).toHaveLength(4);
    expect(new Set(paths).size).toBe(4);

    paths.forEach((path) => {
      expect(path.startsWith('M ')).toBe(true);
      expect(path.endsWith(' Z')).toBe(true);
      expect(path.match(/A /g)).toHaveLength(2);
      expect(path).not.toMatch(
        new RegExp(
          `-\\d| ${FLIP_BUTTON_CUTOUT_WIDTH + 1}| ${FLIP_BUTTON_CUTOUT_HEIGHT + 1}`,
        ),
      );
    });
  });
});
