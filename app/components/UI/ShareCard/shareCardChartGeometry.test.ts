import {
  buildSmoothPath,
  downsampleChart,
  projectChartPoints,
} from './shareCardChartGeometry';

describe('downsampleChart', () => {
  it('returns the chart unchanged when it already fits', () => {
    const chart = { points: [1, 2, 3], entryIndex: 1 };

    expect(downsampleChart(chart, 5)).toBe(chart);
  });

  it('keeps the first and last points and remaps marker indices', () => {
    const points = Array.from({ length: 101 }, (_, index) => index);

    const result = downsampleChart(
      { points, entryIndex: 50, exitIndex: 100 },
      11,
    );

    expect(result.points).toHaveLength(11);
    expect(result.points[0]).toBe(0);
    expect(result.points[10]).toBe(100);
    expect(result.entryIndex).toBe(5);
    expect(result.exitIndex).toBe(10);
  });

  it('clamps marker indices that fall outside the series', () => {
    const points = Array.from({ length: 20 }, (_, index) => index);

    const result = downsampleChart({ points, exitIndex: 99 }, 5);

    expect(result.exitIndex).toBe(4);
  });
});

describe('projectChartPoints', () => {
  const box = { width: 100, height: 50, paddingY: 5 };

  it('returns no points for a series too short to draw', () => {
    expect(projectChartPoints([1], box)).toEqual([]);
  });

  it('maps the highest value to the top padding and the lowest to the bottom', () => {
    const [low, high] = projectChartPoints([10, 20], box);

    expect(low).toEqual({ x: 0, y: 45 });
    expect(high).toEqual({ x: 100, y: 5 });
  });

  it('centres a flat series vertically', () => {
    const points = projectChartPoints([3, 3, 3], box);

    expect(points.map(({ y }) => y)).toEqual([25, 25, 25]);
  });
});

describe('buildSmoothPath', () => {
  it('returns an empty path for no points', () => {
    expect(buildSmoothPath([])).toBe('');
  });

  it('draws horizontal-tangent cubic segments between points', () => {
    expect(
      buildSmoothPath([
        { x: 0, y: 10 },
        { x: 20, y: 0 },
      ]),
    ).toBe('M0 10 C10 10 10 0 20 0');
  });
});
