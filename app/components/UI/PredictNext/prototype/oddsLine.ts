const PAD = 2;

const rangeOf = (trails: number[][]) => {
  const points = trails.flat();
  const low = points.length ? Math.min(...points) : 0;
  const high = points.length ? Math.max(...points) : 1;
  const span = Math.max(4, high - low);
  const floor = low - span * 0.25;
  return { floor, plot: high + span * 0.25 - floor };
};

/**
 * SVG paths for one odds chart. Progress 0 is a flat line at each series'
 * first price. Progress 1 is the trail. Every series shares one scale.
 */
export const oddsChartPaths = (
  trails: number[][],
  width: number,
  height: number,
  progress: number,
): string[] => {
  if (width <= 0 || height <= 0) return trails.map(() => '');
  const { floor, plot } = rangeOf(trails);
  const inner = height - PAD * 2;
  const yOf = (value: number) => PAD + inner * (1 - (value - floor) / plot);
  const amount = Math.min(1, Math.max(0, progress));
  return trails.map((trail) => {
    if (trail.length < 2) return '';
    const baseline = yOf(trail[0]);
    return trail
      .map((value, index) => {
        const x = (index / (trail.length - 1)) * width;
        const y = baseline + (yOf(value) - baseline) * amount;
        const command = index === 0 ? 'M' : 'L';
        return `${command}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  });
};

export const pathYs = (path: string): number[] =>
  path
    .split(' ')
    .filter((part) => !/^[ML]/.test(part))
    .map(Number);
