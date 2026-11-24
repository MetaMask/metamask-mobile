import { oddsChartPaths, pathYs } from './oddsLine';

describe('oddsChartPaths', () => {
  it('starts as a flat line at the first price', () => {
    const [path] = oddsChartPaths([[10, 50, 30]], 100, 40, 0);

    const ys = pathYs(path);

    expect(new Set(ys).size).toBe(1);
  });

  it('ends on the trail, with a higher price above a lower one', () => {
    const [path] = oddsChartPaths([[10, 50]], 100, 40, 1);

    const [start, end] = pathYs(path);

    expect(end).toBeLessThan(start);
  });

  it('sits halfway between the flat line and the trail at mid progress', () => {
    const trail = [[10, 50]];

    const [flat] = oddsChartPaths(trail, 100, 40, 0);
    const [mid] = oddsChartPaths(trail, 100, 40, 0.5);
    const [full] = oddsChartPaths(trail, 100, 40, 1);
    const flatY = pathYs(flat)[1];
    const midY = pathYs(mid)[1];
    const fullY = pathYs(full)[1];

    expect(midY).toBeGreaterThan(Math.min(flatY, fullY));
    expect(midY).toBeLessThan(Math.max(flatY, fullY));
  });

  it('keeps the first point fixed while the rest of the line moves', () => {
    const trail = [[10, 50]];

    const start = oddsChartPaths(trail, 100, 40, 0);
    const end = oddsChartPaths(trail, 100, 40, 1);

    expect(pathYs(start[0])[0]).toBe(pathYs(end[0])[0]);
  });

  it('plots two series on one scale', () => {
    const [high, low] = oddsChartPaths(
      [
        [80, 80],
        [20, 20],
      ],
      100,
      40,
      1,
    );

    expect(pathYs(high)[0]).toBeLessThan(pathYs(low)[0]);
  });

  it('returns no path for a single point', () => {
    const [path] = oddsChartPaths([[34]], 100, 40, 1);

    expect(path).toBe('');
  });
});
