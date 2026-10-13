import {
  buildChartScale,
  buildLinePath,
  buildLinePoints,
  findNearestMarkerIndex,
  layoutLevelPills,
  measurePolylineLength,
} from './chartGeometry';

const FRAME = { width: 100, height: 100, insetTop: 0, insetBottom: 0 };

describe('chartGeometry', () => {
  describe('buildChartScale', () => {
    it('returns null without at least two points or a size', () => {
      expect(buildChartScale({ values: [1], frame: FRAME })).toBeNull();
      expect(
        buildChartScale({ values: [1, 2], frame: { ...FRAME, width: 0 } }),
      ).toBeNull();
    });

    it('maps the first and last index to the edges', () => {
      const scale = buildChartScale({ values: [1, 2, 3], frame: FRAME });

      expect(scale?.toX(0)).toBe(0);
      expect(scale?.toX(2)).toBe(100);
      expect(scale?.indexAtX(49)).toBe(1);
      expect(scale?.indexAtX(-10)).toBe(0);
      expect(scale?.indexAtX(500)).toBe(2);
    });

    it('keeps reference levels inside the plot', () => {
      const scale = buildChartScale({
        values: [10, 11],
        extraValues: [20],
        frame: FRAME,
      });

      const y = scale?.toY(20) ?? -1;
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(100);
      expect(scale?.toY(10)).toBeGreaterThan(y);
    });

    it('gives a flat series some height', () => {
      const scale = buildChartScale({ values: [5, 5], frame: FRAME });

      expect(scale?.toY(5)).toBeCloseTo(50);
    });
  });

  describe('line helpers', () => {
    it('builds a move-then-line path and measures it', () => {
      const scale = buildChartScale({ values: [0, 1], frame: FRAME });
      const points = scale ? buildLinePoints([0, 1], scale) : [];

      expect(buildLinePath(points)).toMatch(/^M0\.00,[\d.]+ L100\.00,[\d.]+$/);
      expect(
        measurePolylineLength([
          { x: 0, y: 0 },
          { x: 3, y: 4 },
        ]),
      ).toBe(5);
    });
  });

  describe('layoutLevelPills', () => {
    it('keeps pills that already fit at their line', () => {
      expect(layoutLevelPills([20, 60], 10, 100)).toEqual([20, 60]);
    });

    it('pushes overlapping pills apart, preserving input order', () => {
      expect(layoutLevelPills([52, 50], 10, 100)).toEqual([60, 50]);
    });

    it('pulls pills back inside the chart', () => {
      expect(layoutLevelPills([98, 99], 10, 100)).toEqual([85, 95]);
    });
  });

  describe('findNearestMarkerIndex', () => {
    it('returns the closest marker within the threshold', () => {
      expect(findNearestMarkerIndex([10, 30, 34], 33, 8)).toBe(2);
    });

    it('returns -1 when nothing is close enough', () => {
      expect(findNearestMarkerIndex([10], 50, 8)).toBe(-1);
    });
  });
});
