import { area, curveBumpX, line } from 'd3-shape';

export interface ChartPoint {
  /** Unix timestamp in milliseconds. */
  time: number;
  /** Normalized probability in the inclusive range [0, 1]. */
  value: number;
}

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  data: readonly ChartPoint[];
}

export interface ChartEndpoint {
  x: number;
  y: number;
  labelY: number;
  value: number;
}

export interface PreparedChartSeries extends ChartSeries {
  linePath: string;
  areaPath: string;
  endpoint: ChartEndpoint;
}

/** Plot geometry needed to reposition endpoints without regenerating paths. */
export interface ChartPlot {
  valueDomain: readonly [number, number];
  plotBottom: number;
  plotHeight: number;
  strokeInset: number;
  height: number;
  fontScale: number;
}

export interface ChartModel {
  series: PreparedChartSeries[];
  displayedSeries: PreparedChartSeries[];
  timeDomain: readonly [number, number];
  plotRight: number;
  plot: ChartPlot;
}

interface CreateChartModelOptions {
  series: readonly ChartSeries[];
  width: number;
  height: number;
  labelGutter: number;
  continuationWidth: number;
  lineWidth: number;
  fontScale: number;
  scrub?: { time: number; x: number };
}

interface ScaledChartLayoutOptions {
  height: number;
  labelGutter: number;
  fontScale: number;
  labels: readonly string[];
  values: readonly string[];
}

export const CHART_PLOT_TOP = 20;
export const CHART_PLOT_BOTTOM_INSET = 12;
export const ENDPOINT_LABEL_GAP = 18;

const LABEL_NAME_LINE_HEIGHT = 17;
const LABEL_VALUE_LINE_HEIGHT = 34;
const LABEL_BLOCK_HEIGHT = LABEL_NAME_LINE_HEIGHT + LABEL_VALUE_LINE_HEIGHT;
const LABEL_VALUE_BASELINE_OFFSET = 24;
const LABEL_VALUE_BOTTOM_INSET = 10;
const LABEL_RIGHT_INSET = 10;
const LABEL_NAME_FONT_SIZE = 14;
const LABEL_VALUE_FONT_SIZE = 28;
const MIN_LABEL_SPACING = 46;
const VALUE_TICK_COUNT = 5;
const VALUE_SCALE_MARGIN = 0.08;

const estimateTextWidth = (
  text: string,
  fontSize: number,
  averageGlyphWidth: number,
) => text.length * fontSize * averageGlyphWidth;

export const getScaledChartLayout = ({
  height,
  labelGutter,
  fontScale,
  labels,
  values,
}: ScaledChartLayoutOptions) => {
  const scale = Math.max(1, fontScale);
  const estimatedLabelWidth = Math.max(
    0,
    ...labels.map((label) =>
      estimateTextWidth(label, LABEL_NAME_FONT_SIZE * scale, 0.56),
    ),
  );
  const estimatedValueWidth = Math.max(
    0,
    ...values.map((value) =>
      estimateTextWidth(value, LABEL_VALUE_FONT_SIZE * scale, 0.62),
    ),
  );
  const endpointLabelGap = ENDPOINT_LABEL_GAP * scale;
  const requiredLabelGutter =
    endpointLabelGap +
    Math.max(estimatedLabelWidth, estimatedValueWidth) +
    LABEL_RIGHT_INSET;

  return {
    fontScale: scale,
    height:
      height + (scale - 1) * (LABEL_BLOCK_HEIGHT + LABEL_VALUE_BOTTOM_INSET),
    labelGutter: Math.max(labelGutter, requiredLabelGutter),
    endpointLabelGap,
  };
};

export const normalizeChartSeries = (
  series: readonly ChartSeries[],
): ChartSeries[] =>
  series.map((entry) => {
    const orderedPoints = entry.data
      .map((point, index) => ({ point, index }))
      .sort(
        (first, second) =>
          first.point.time - second.point.time || first.index - second.index,
      );
    const pointsByTime = new Map<number, ChartPoint>();
    orderedPoints.forEach(({ point }) => pointsByTime.set(point.time, point));

    return { ...entry, data: [...pointsByTime.values()] };
  });

export const sampleAtTime = (
  data: readonly ChartPoint[],
  time: number,
): number | undefined => {
  let low = 0;
  let high = data.length - 1;
  let value: number | undefined;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (data[middle].time <= time) {
      value = data[middle].value;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return value;
};

const getTimeDomain = (
  series: readonly ChartSeries[],
): [number, number] | undefined => {
  const starts: (number | undefined)[] = series.map(
    (entry) => entry.data[0]?.time,
  );
  const ends: (number | undefined)[] = series.map(
    (entry) => entry.data.at(-1)?.time,
  );
  if (starts.includes(undefined) || ends.includes(undefined)) {
    return undefined;
  }

  const start = Math.min(...(starts as number[]));
  const end = Math.max(...(ends as number[]));
  return start < end ? [start, end] : undefined;
};

const clipToTimeDomain = (
  data: readonly ChartPoint[],
  minTime: number,
  maxTime: number,
): ChartPoint[] => {
  const points = data.filter(
    (point) => point.time >= minTime && point.time <= maxTime,
  );
  // Carry the first observation left so a late-starting series still
  // spans the shared domain instead of appearing mid-chart.
  const startValue =
    sampleAtTime(data, minTime) ?? points[0]?.value ?? data[0]?.value;
  const endValue =
    sampleAtTime(data, maxTime) ?? points.at(-1)?.value ?? data.at(-1)?.value;

  if (startValue !== undefined && points[0]?.time !== minTime) {
    points.unshift({ time: minTime, value: startValue });
  }
  if (endValue !== undefined && points.at(-1)?.time !== maxTime) {
    points.push({ time: maxTime, value: endValue });
  }

  return points;
};

const clampUnitInterval = (value: number) => Math.max(0, Math.min(1, value));

const domainFromTicks = (
  minValue: number,
  maxValue: number,
  ticks: readonly number[],
): [number, number] => [
  Math.max(0, Math.min(minValue, ticks[0])),
  Math.min(1, Math.max(maxValue, ticks.at(-1) ?? maxValue)),
];

const findNiceTicks = (
  minValue: number,
  maxValue: number,
): number[] | undefined => {
  const targetInteriorSpan =
    (maxValue - minValue) / (VALUE_TICK_COUNT - (VALUE_TICK_COUNT > 3 ? 3 : 2));
  const targetStep = (maxValue - minValue) / (VALUE_TICK_COUNT - 1);
  const maxExponent = Math.floor(Math.log10(targetInteriorSpan));
  const minExponent = Math.max(maxExponent - 3, -10);
  let bestTicks: number[] | undefined;
  let bestIntervalCount = 0;

  for (let exponent = maxExponent; exponent >= minExponent; exponent -= 1) {
    for (const multiple of [10, 5, 2.5, 2]) {
      const increment = multiple * 10 ** exponent;
      let step = Math.floor(targetStep / increment) * increment;

      while (step + increment < targetInteriorSpan) {
        step += increment;
        const tickMin = Math.floor(minValue / step) * step;
        const intervalCount = Math.ceil((maxValue - tickMin) / step);
        if (intervalCount > VALUE_TICK_COUNT - 1) continue;

        const tickStep = step;
        const ticks = Array.from(
          { length: VALUE_TICK_COUNT },
          (_, index) => tickMin + index * tickStep,
        );
        if ((ticks.at(-1) ?? 0) > 1) continue;
        if (intervalCount === VALUE_TICK_COUNT - 1) {
          return ticks;
        }
        if (intervalCount > bestIntervalCount) {
          bestIntervalCount = intervalCount;
          bestTicks = ticks;
        }
      }
    }
  }

  return bestTicks;
};

const getValueDomain = (
  series: readonly ChartSeries[],
): [number, number] | undefined => {
  const values = series.flatMap((entry) =>
    entry.data.map((point) => clampUnitInterval(point.value)),
  );
  if (values.length === 0) return undefined;

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  if (minValue >= maxValue) return [minValue, maxValue];

  const ticks = findNiceTicks(minValue, maxValue);
  return ticks
    ? domainFromTicks(minValue, maxValue, ticks)
    : [minValue, maxValue];
};

const scaleValue = (
  value: number,
  valueDomain: readonly [number, number],
  plotBottom: number,
  plotHeight: number,
  strokeInset: number,
) => {
  const [minValue, maxValue] = valueDomain;
  if (minValue === maxValue) return CHART_PLOT_TOP + plotHeight / 2;

  const normalizedValue =
    (Math.max(minValue, Math.min(maxValue, value)) - minValue) /
    (maxValue - minValue);
  const scaledValue =
    VALUE_SCALE_MARGIN + normalizedValue * (1 - VALUE_SCALE_MARGIN * 2);
  return Math.max(
    CHART_PLOT_TOP + strokeInset,
    Math.min(plotBottom - strokeInset, plotBottom - scaledValue * plotHeight),
  );
};

const separateLabelPositions = (
  positions: readonly number[],
  minY: number,
  maxY: number,
  minSpacing: number,
): number[] => {
  if (positions.length < 2) {
    return positions.map((position) =>
      Math.max(minY, Math.min(maxY, position)),
    );
  }

  const order = positions
    .map((position, index) => ({ index, position }))
    .sort((first, second) => first.position - second.position);
  const spacing = Math.min(
    minSpacing,
    (maxY - minY) / Math.max(1, positions.length - 1),
  );
  const adjusted = order.map((entry) => entry.position);

  adjusted[0] = Math.max(minY, adjusted[0]);
  for (let index = 1; index < adjusted.length; index += 1) {
    adjusted[index] = Math.max(adjusted[index], adjusted[index - 1] + spacing);
  }
  if (adjusted[adjusted.length - 1] > maxY) {
    adjusted[adjusted.length - 1] = maxY;
    for (let index = adjusted.length - 2; index >= 0; index -= 1) {
      adjusted[index] = Math.min(
        adjusted[index],
        adjusted[index + 1] - spacing,
      );
    }
  }

  const result = new Array<number>(positions.length);
  order.forEach((entry, index) => {
    result[entry.index] = adjusted[index];
  });
  return result;
};

const addLabelPositions = (
  endpoints: readonly Omit<ChartEndpoint, 'labelY'>[],
  height: number,
  fontScale: number,
): ChartEndpoint[] => {
  const labelPositions = separateLabelPositions(
    endpoints.map((endpoint) => endpoint.y),
    (LABEL_BLOCK_HEIGHT * fontScale) / 2,
    height -
      (LABEL_VALUE_BASELINE_OFFSET + LABEL_VALUE_BOTTOM_INSET) * fontScale,
    MIN_LABEL_SPACING * fontScale,
  );

  return endpoints.map((endpoint, index) => ({
    ...endpoint,
    labelY: labelPositions[index],
  }));
};

/** Moves endpoint labels to the scrub time without regenerating series paths. */
export const applyChartScrub = (
  model: ChartModel,
  scrub?: { time: number; x: number },
): ChartModel => {
  if (!scrub) {
    return model.displayedSeries === model.series
      ? model
      : { ...model, displayedSeries: model.series };
  }

  const y = (value: number) =>
    scaleValue(
      value,
      model.plot.valueDomain,
      model.plot.plotBottom,
      model.plot.plotHeight,
      model.plot.strokeInset,
    );
  const scrubbed = model.series.flatMap((entry) => {
    const value = sampleAtTime(entry.data, scrub.time);
    return value === undefined
      ? []
      : [{ entry, x: scrub.x, y: y(value), value }];
  });
  const scrubEndpoints = addLabelPositions(
    scrubbed,
    model.plot.height,
    model.plot.fontScale,
  );

  return {
    ...model,
    displayedSeries: scrubbed.map(({ entry }, index) => ({
      ...entry,
      endpoint: scrubEndpoints[index],
    })),
  };
};

/** Rebuilds d3 line/area paths. Keep this off the scrub gesture path. */
export const createChartModel = ({
  series,
  width,
  height,
  labelGutter,
  continuationWidth,
  lineWidth,
  fontScale,
  scrub,
}: CreateChartModelOptions): ChartModel | undefined => {
  if (width <= labelGutter) return undefined;

  const drawableSeries = normalizeChartSeries(series).filter(
    (entry) => entry.data.length >= 2,
  );
  const timeDomain = getTimeDomain(drawableSeries);
  const valueDomain = getValueDomain(drawableSeries);
  if (!timeDomain || !valueDomain) return undefined;

  const [minTime, maxTime] = timeDomain;
  const plotRight = width - labelGutter;
  const plotBottom = height - CHART_PLOT_BOTTOM_INSET;
  const plotHeight = plotBottom - CHART_PLOT_TOP;
  const plotWidth = plotRight + continuationWidth;
  const strokeInset = lineWidth / 2;
  const x = (time: number) =>
    -continuationWidth + ((time - minTime) / (maxTime - minTime)) * plotWidth;
  const y = (value: number) =>
    scaleValue(value, valueDomain, plotBottom, plotHeight, strokeInset);
  const lineGenerator = line<ChartPoint>()
    .x((point) => x(point.time))
    .y((point) => y(point.value))
    .curve(curveBumpX);
  const areaGenerator = area<ChartPoint>()
    .x((point) => x(point.time))
    .y0(plotBottom)
    .y1((point) => y(point.value))
    .curve(curveBumpX);
  const endpoints = addLabelPositions(
    drawableSeries.map((entry) => {
      const value =
        sampleAtTime(entry.data, maxTime) ?? entry.data.at(-1)?.value ?? 0;
      return { x: x(maxTime), y: y(value), value };
    }),
    height,
    fontScale,
  );
  const preparedSeries = drawableSeries.map((entry, index) => {
    const clipped = clipToTimeDomain(entry.data, minTime, maxTime);
    return {
      ...entry,
      linePath: lineGenerator(clipped) ?? '',
      areaPath: areaGenerator(clipped) ?? '',
      endpoint: endpoints[index],
    };
  });

  return applyChartScrub(
    {
      series: preparedSeries,
      displayedSeries: preparedSeries,
      timeDomain,
      plotRight,
      plot: {
        valueDomain,
        plotBottom,
        plotHeight,
        strokeInset,
        height,
        fontScale,
      },
    },
    scrub,
  );
};

export const getScrubAtX = ({
  xCoord,
  plotRight,
  continuationWidth,
  timeDomain,
}: {
  xCoord: number;
  plotRight: number;
  continuationWidth: number;
  timeDomain: readonly [number, number];
}) => {
  const x = Math.max(0, Math.min(plotRight, xCoord));
  const [minTime, maxTime] = timeDomain;
  const time = Math.max(
    minTime,
    Math.min(
      maxTime,
      minTime +
        ((x + continuationWidth) / (plotRight + continuationWidth)) *
          (maxTime - minTime),
    ),
  );
  return { time, x };
};

export const getScrubTimeLabelPosition = ({
  x,
  plotRight,
  text,
  fontSize,
}: {
  x: number;
  plotRight: number;
  text: string;
  fontSize: number;
}): { x: number; textAnchor: 'start' | 'middle' | 'end' } => {
  const halfWidth = estimateTextWidth(text, fontSize, 0.56) / 2;
  if (x < halfWidth) return { x, textAnchor: 'start' };
  if (plotRight - x < halfWidth) return { x, textAnchor: 'end' };
  return { x, textAnchor: 'middle' };
};
