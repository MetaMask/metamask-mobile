import {
  buildBottomCutoutCurvePath,
  buildBottomShapeMaskPath,
} from './BottomShape';

const dimensions = {
  width: 400,
  height: 35,
  peakHeight: 16,
  peakBezierLength: 25,
  baseBezierLength: 55,
};

describe('BottomShape paths', () => {
  it('builds a closed mask path for the cutout fill', () => {
    const path = buildBottomShapeMaskPath(dimensions);

    expect(path.endsWith('Z')).toBe(true);
    expect(path).toContain('V 0');
  });

  it('builds an open curve path for border strokes', () => {
    const path = buildBottomCutoutCurvePath(dimensions);

    expect(path).toContain('C ');
    expect(path).toContain('S ');
    expect(path.endsWith('Z')).toBe(false);
  });
});
