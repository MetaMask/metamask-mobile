import type { PredictIndexPoint } from '../contracts/v1/liveData';
import {
  appendIndexPoint,
  PREDICT_INDEX_SERIES_MAX_POINTS,
  PREDICT_INDEX_SERIES_MIN_POINT_GAP_MS,
  toOrderedIndexPoints,
} from './indexSeries';

const START = Date.parse('2026-11-26T23:00:00.000Z');

const point = (seconds: number, value = String(60000 + seconds)) =>
  ({
    time: new Date(START + seconds * 1000).toISOString(),
    value,
  }) as PredictIndexPoint;

describe('appendIndexPoint', () => {
  it('appends ticks in time order', () => {
    const buffer: PredictIndexPoint[] = [];

    appendIndexPoint(buffer, point(0), { minPointGapMs: 0 });
    appendIndexPoint(buffer, point(1), { minPointGapMs: 0 });
    appendIndexPoint(buffer, point(2), { minPointGapMs: 0 });

    expect(buffer.map(({ value }) => value)).toEqual([
      '60000',
      '60001',
      '60002',
    ]);
  });

  it('reports whether the buffer changed', () => {
    const buffer: PredictIndexPoint[] = [point(5)];

    expect(appendIndexPoint(buffer, point(10))).toBe(true);
    expect(appendIndexPoint(buffer, point(3))).toBe(false);
  });

  it('drops a late tick', () => {
    const buffer: PredictIndexPoint[] = [point(10)];

    appendIndexPoint(buffer, point(4), { minPointGapMs: 0 });

    expect(buffer).toEqual([point(10)]);
  });

  it('drops a repeated tick', () => {
    const buffer: PredictIndexPoint[] = [point(10)];

    appendIndexPoint(buffer, point(10, '1'), { minPointGapMs: 0 });

    expect(buffer).toEqual([point(10)]);
  });

  it('drops a point with an invalid time', () => {
    const buffer: PredictIndexPoint[] = [];

    const changed = appendIndexPoint(buffer, {
      time: 'not a time',
      value: '1',
    } as PredictIndexPoint);

    expect(changed).toBe(false);
    expect(buffer).toEqual([]);
  });

  it('thins ticks that come inside the minimum gap', () => {
    const buffer: PredictIndexPoint[] = [];

    [0, 1, 2, 3, 4, 5, 6, 10].forEach((seconds) =>
      appendIndexPoint(buffer, point(seconds)),
    );

    expect(PREDICT_INDEX_SERIES_MIN_POINT_GAP_MS).toBe(5000);
    expect(buffer.map(({ time }) => (Date.parse(time) - START) / 1000)).toEqual(
      [0, 5, 10],
    );
  });

  it('trims the oldest points when the buffer is over its size', () => {
    const buffer: PredictIndexPoint[] = [];

    for (let seconds = 0; seconds < 7; seconds += 1) {
      appendIndexPoint(buffer, point(seconds), {
        maxPoints: 3,
        minPointGapMs: 0,
      });
    }

    expect(buffer.map(({ value }) => value)).toEqual([
      '60004',
      '60005',
      '60006',
    ]);
  });

  it('keeps the default size bound', () => {
    const buffer: PredictIndexPoint[] = [];

    for (let seconds = 0; seconds < 400; seconds += 1) {
      appendIndexPoint(buffer, point(seconds * 5));
    }

    expect(buffer).toHaveLength(PREDICT_INDEX_SERIES_MAX_POINTS);
    expect(buffer[buffer.length - 1]).toEqual(point(399 * 5));
  });

  it('appends in place without replacing the buffer', () => {
    const buffer: PredictIndexPoint[] = [point(0)];
    const same = buffer;

    appendIndexPoint(buffer, point(5));

    expect(buffer).toBe(same);
  });
});

describe('toOrderedIndexPoints', () => {
  it('keeps points that are in order', () => {
    expect(toOrderedIndexPoints([point(0), point(5), point(10)])).toEqual([
      point(0),
      point(5),
      point(10),
    ]);
  });

  it('drops out-of-order, repeated and invalid points', () => {
    const result = toOrderedIndexPoints([
      point(0),
      point(10),
      point(5),
      point(10),
      { time: 'bad', value: '1' } as PredictIndexPoint,
      point(15),
    ]);

    expect(result).toEqual([point(0), point(10), point(15)]);
  });

  it('keeps the newest points up to the size bound', () => {
    const result = toOrderedIndexPoints(
      [point(0), point(5), point(10), point(15)],
      { maxPoints: 2 },
    );

    expect(result).toEqual([point(10), point(15)]);
  });

  it('returns a new array', () => {
    const points = [point(0)];

    expect(toOrderedIndexPoints(points)).not.toBe(points);
  });
});
