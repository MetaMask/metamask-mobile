import {
  createChartModel,
  getScrubTimeLabelPosition,
  getScaledChartLayout,
  normalizeChartSeries,
  sampleAtTime,
} from './chartModel';

describe('normalizeChartSeries', () => {
  it('sorts points and keeps the last observation for duplicate timestamps', () => {
    const data = [
      { time: 300, value: 0.3 },
      { time: 100, value: 0.1 },
      { time: 200, value: 0.2 },
      { time: 200, value: 0.25 },
    ];

    const result = normalizeChartSeries([
      {
        id: 'yes',
        label: 'Yes',
        color: 'blue',
        data,
      },
    ]);

    expect(result[0].data).toEqual([
      { time: 100, value: 0.1 },
      { time: 200, value: 0.25 },
      { time: 300, value: 0.3 },
    ]);
    expect(data[0].time).toBe(300);
  });
});

describe('sampleAtTime', () => {
  const data = [
    { time: 100, value: 0.1 },
    { time: 200, value: 0.2 },
    { time: 300, value: 0.3 },
  ];

  it('carries the latest observation forward between timestamps', () => {
    const result = sampleAtTime(data, 250);

    expect(result).toBe(0.2);
  });

  it('returns no value before a series starts', () => {
    const result = sampleAtTime(data, 99);

    expect(result).toBeUndefined();
  });
});

describe('createChartModel', () => {
  it('preserves series presentation and smooths every observed movement', () => {
    const series = [
      {
        id: 'yes',
        label: 'Vikings',
        color: 'blue',
        data: [
          { time: 100, value: 0.6 },
          { time: 200, value: 0.5 },
        ],
      },
    ];

    const result = createChartModel({
      series,
      width: 300,
      height: 150,
      labelGutter: 100,
      continuationWidth: 0,
      lineWidth: 2,
      fontScale: 1,
    });

    expect(result?.series[0]).toMatchObject({
      id: 'yes',
      label: 'Vikings',
      color: 'blue',
      data: series[0].data,
    });
    expect(result?.series[0].linePath.match(/C/g)).toHaveLength(1);
    expect(result?.series[0].linePath).not.toContain('L');
  });

  it('extends a late-starting series left while omitting its pre-start scrub', () => {
    const result = createChartModel({
      series: [
        {
          id: 'home',
          label: 'Vikings',
          color: 'blue',
          data: [
            { time: 100, value: 0.6 },
            { time: 300, value: 0.5 },
          ],
        },
        {
          id: 'away',
          label: 'Ravens',
          color: 'red',
          data: [
            { time: 200, value: 0.4 },
            { time: 300, value: 0.5 },
          ],
        },
      ],
      width: 300,
      height: 150,
      labelGutter: 100,
      continuationWidth: 0,
      lineWidth: 2,
      fontScale: 1,
      scrub: { time: 150, x: 50 },
    });

    expect(result?.displayedSeries.map((entry) => entry.id)).toEqual(['home']);
    expect(result?.displayedSeries[0].endpoint.value).toBe(0.6);
    expect(result?.series[1].linePath.startsWith('M0,')).toBe(true);
  });

  it('normalizes unordered points before generating paths and endpoints', () => {
    const result = createChartModel({
      series: [
        {
          id: 'yes',
          label: 'Yes',
          color: 'blue',
          data: [
            { time: 300, value: 0.3 },
            { time: 100, value: 0.1 },
            { time: 200, value: 0.2 },
          ],
        },
      ],
      width: 300,
      height: 150,
      labelGutter: 100,
      continuationWidth: 0,
      lineWidth: 2,
      fontScale: 1,
    });

    expect(result?.series[0].data.map((point) => point.time)).toEqual([
      100, 200, 300,
    ]);
    expect(result?.series[0].endpoint.value).toBe(0.3);
  });
});

describe('getScaledChartLayout', () => {
  it('reserves width and height for scaled team and value labels', () => {
    const result = getScaledChartLayout({
      height: 150,
      labelGutter: 116,
      fontScale: 2,
      labels: ['Minnesota Vikings'],
      values: ['100%'],
    });

    expect(result.height).toBeGreaterThanOrEqual(211);
    expect(result.labelGutter).toBeGreaterThanOrEqual(312);
  });

  it('never shrinks a caller-provided gutter', () => {
    const result = getScaledChartLayout({
      height: 150,
      labelGutter: 360,
      fontScale: 1,
      labels: ['Yes'],
      values: ['50%'],
    });

    expect(result.labelGutter).toBe(360);
  });

  it('sizes the gutter to compact team labels instead of a wide default', () => {
    const result = getScaledChartLayout({
      height: 150,
      labelGutter: 0,
      fontScale: 1,
      labels: ['Bills', 'Steelers'],
      values: ['54%', '46%'],
    });

    expect(result.labelGutter).toBeGreaterThan(80);
    expect(result.labelGutter).toBeLessThan(116);
  });
});

describe('getScrubTimeLabelPosition', () => {
  it.each([
    { x: 0, expectedAnchor: 'start', expectedX: 0 },
    { x: 100, expectedAnchor: 'middle', expectedX: 100 },
    { x: 200, expectedAnchor: 'end', expectedX: 200 },
  ] as const)(
    'uses $expectedAnchor anchoring at x=$x',
    ({ x, expectedAnchor, expectedX }) => {
      const result = getScrubTimeLabelPosition({
        x,
        plotRight: 200,
        text: 'Aug 24, 12:00 PM',
        fontSize: 13,
      });

      expect(result).toEqual({ x: expectedX, textAnchor: expectedAnchor });
    },
  );
});
