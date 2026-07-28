import { isSafeUrl } from '../../../../../MarketInsights/utils/marketInsightsFormatting';

export const MIN_RESEARCH_CHART_POINTS = 2;
export const MAX_RESEARCH_CHART_POINTS = 8;

export interface ResearchChartPoint {
  label: string;
  value: number;
  sourceUrl: string;
  sourceTitle?: string;
}

const trimTrailingZeroes = (value: string) =>
  value.replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1');

const formatCompactNumber = (value: number): string => {
  const absoluteValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  const compactScales = [
    { minimum: 1_000_000_000_000, suffix: 'T' },
    { minimum: 1_000_000_000, suffix: 'B' },
    { minimum: 1_000_000, suffix: 'M' },
    { minimum: 1_000, suffix: 'K' },
  ];
  const compactScale = compactScales.find(
    ({ minimum }) => absoluteValue >= minimum,
  );

  if (compactScale) {
    const scaledValue = absoluteValue / compactScale.minimum;
    const decimalPlaces = scaledValue >= 100 ? 0 : scaledValue >= 10 ? 1 : 2;
    return `${sign}${trimTrailingZeroes(
      scaledValue.toFixed(decimalPlaces),
    )}${compactScale.suffix}`;
  }

  if (absoluteValue === 0) {
    return '0';
  }

  if (absoluteValue < 0.000001) {
    return value.toExponential(2);
  }

  const decimalPlaces =
    absoluteValue >= 100
      ? 0
      : absoluteValue >= 1
        ? 2
        : absoluteValue >= 0.01
          ? 4
          : 6;

  return `${sign}${trimTrailingZeroes(absoluteValue.toFixed(decimalPlaces))}`;
};

const getCurrencySymbol = (unit: string): string | undefined => {
  const normalizedUnit = unit.trim().toUpperCase();

  if (normalizedUnit === '$' || normalizedUnit === 'USD') {
    return '$';
  }
  if (normalizedUnit === '€' || normalizedUnit === 'EUR') {
    return '€';
  }
  if (normalizedUnit === '£' || normalizedUnit === 'GBP') {
    return '£';
  }

  return undefined;
};

export const formatResearchChartValue = (value: number, unit = ''): string => {
  const normalizedUnit = unit.trim();
  const compactValue = formatCompactNumber(value);
  const currencySymbol = getCurrencySymbol(normalizedUnit);

  if (currencySymbol) {
    const unsignedValue = compactValue.replace(/^-/, '');
    return `${value < 0 ? '-' : ''}${currencySymbol}${unsignedValue}`;
  }

  if (normalizedUnit === '%' || normalizedUnit.toLowerCase() === 'percent') {
    return `${compactValue}%`;
  }

  return normalizedUnit ? `${compactValue} ${normalizedUnit}` : compactValue;
};

export const getValidResearchChartPoints = (
  points: readonly ResearchChartPoint[],
): ResearchChartPoint[] => {
  if (
    points.length < MIN_RESEARCH_CHART_POINTS ||
    points.length > MAX_RESEARCH_CHART_POINTS
  ) {
    return [];
  }

  const validPoints = points.filter(
    (point) =>
      point.label.trim().length > 0 &&
      Number.isFinite(point.value) &&
      isSafeUrl(point.sourceUrl),
  );

  return validPoints.length === points.length ? validPoints : [];
};

export const getResearchChartDomain = (
  points: readonly ResearchChartPoint[],
): { maximum: number; minimum: number } => {
  const values = points.map(({ value }) => value);
  const minimumValue = Math.min(...values, 0);
  const maximumValue = Math.max(...values, 0);
  const range = maximumValue - minimumValue;

  if (range === 0) {
    return { minimum: -1, maximum: 1 };
  }

  const padding = range * 0.08;

  return {
    minimum: minimumValue < 0 ? minimumValue - padding : 0,
    maximum: maximumValue > 0 ? maximumValue + padding : 0,
  };
};

export const buildResearchChartSummary = (
  title: string,
  points: readonly ResearchChartPoint[],
  unit = '',
): string => {
  if (points.length === 0) {
    return '';
  }

  const highestPoint = points.reduce((highest, point) =>
    point.value > highest.value ? point : highest,
  );
  const lowestPoint = points.reduce((lowest, point) =>
    point.value < lowest.value ? point : lowest,
  );
  const pointCountLabel = `${points.length} source-backed ${
    points.length === 1 ? 'point' : 'points'
  }`;
  const rangeLabel =
    highestPoint === lowestPoint
      ? `${highestPoint.label} is ${formatResearchChartValue(
          highestPoint.value,
          unit,
        )}`
      : `Highest: ${highestPoint.label}, ${formatResearchChartValue(
          highestPoint.value,
          unit,
        )}. Lowest: ${lowestPoint.label}, ${formatResearchChartValue(
          lowestPoint.value,
          unit,
        )}`;

  return `${title}. ${pointCountLabel}. ${rangeLabel}.`;
};
