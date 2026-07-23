import { detectResolution, INTERVAL_MS_TO_TV } from '../resolution';

const bars = (intervals: number[]): { time: number }[] => {
  const out: { time: number }[] = [{ time: 0 }];
  let t = 0;
  for (const ms of intervals) {
    t += ms;
    out.push({ time: t });
  }
  return out;
};

describe('detectResolution', () => {
  it('returns default "5" for fewer than 2 bars', () => {
    expect(detectResolution([])).toBe('5');
    expect(detectResolution([{ time: 0 }])).toBe('5');
  });

  it.each(Object.entries(INTERVAL_MS_TO_TV))(
    'maps %s ms steps → %s',
    (intervalMs, expected) => {
      const data = bars(Array(5).fill(Number(intervalMs)));
      expect(detectResolution(data)).toBe(expected);
    },
  );

  it('uses the median diff to ignore single-bar gaps', () => {
    // 4× one-minute diffs + 1× ten-minute gap. Median = 60_000 → "1".
    const data = bars([60_000, 60_000, 10 * 60_000, 60_000, 60_000]);
    expect(detectResolution(data)).toBe('1');
  });

  it('snaps to the closest defined interval', () => {
    // 6.5 min between bars → closest mapped is 5min ("5") not 15min ("15").
    const data = bars([390_000, 390_000, 390_000]);
    expect(detectResolution(data)).toBe('5');
  });
});
