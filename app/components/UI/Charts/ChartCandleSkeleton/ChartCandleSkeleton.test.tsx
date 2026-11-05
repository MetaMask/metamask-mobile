import React from 'react';
import { render, within } from '@testing-library/react-native';
import { mockTheme } from '../../../../util/theme';
import { getHardwareTier } from '../../../../util/deviceCapability';
import ChartCandleSkeleton from './ChartCandleSkeleton';

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'HIGH'),
}));

const mockGetHardwareTier = jest.mocked(getHardwareTier);

const ID = 'chart-candle-skeleton';
const HEIGHT = 350;
const CANDLES = 32;
const Y_PILLS = 6;
const X_PILLS = 6;
const PRICE = 250;
const VOLUME = 68;

const percentOf = (part: number, whole: number): string => {
  const rounded = Math.round((part / whole) * 100 * 1e6) / 1e6;
  return `${rounded}%`;
};

const flatStyle = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (merged, item) => ({ ...merged, ...flatStyle(item) }),
      {},
    );
  }
  if (style && typeof style === 'object') {
    return style as Record<string, unknown>;
  }
  return {};
};

describe('ChartCandleSkeleton', () => {
  const styleOf = (
    getByTestId: ReturnType<typeof render>['getByTestId'],
    suffix: string,
  ) => flatStyle(getByTestId(suffix ? `${ID}-${suffix}` : ID).props.style);

  it('adds no progressbar role or accessibility label', () => {
    const { getByTestId, queryByRole } = render(
      <ChartCandleSkeleton height={HEIGHT} />,
    );

    expect(queryByRole('progressbar')).toBeNull();
    expect(getByTestId(ID).props.accessibilityLabel).toBeUndefined();
  });

  it.each([240, 288, 350])('fills a %ipx chart box', (height) => {
    const { getByTestId } = render(<ChartCandleSkeleton height={height} />);

    expect(flatStyle(getByTestId(ID).props.style)).toEqual(
      expect.objectContaining({
        flexGrow: 1,
        height,
        backgroundColor: mockTheme.colors.background.default,
      }),
    );
  });

  it('splits the chart into panes, a volume band, and a time row', () => {
    const { getByTestId } = render(<ChartCandleSkeleton height={HEIGHT} />);

    expect(styleOf(getByTestId, 'panes')).toEqual(
      expect.objectContaining({ flex: 1 }),
    );
    expect(styleOf(getByTestId, 'price')).toEqual(
      expect.objectContaining({ flex: 1, overflow: 'hidden' }),
    );
    expect(styleOf(getByTestId, 'price').height).toBeUndefined();
    expect(styleOf(getByTestId, 'volume-band')).toEqual(
      expect.objectContaining({ height: '22%', minHeight: 56 }),
    );
    expect(styleOf(getByTestId, 'time-axis').height).toBe(32);
    expect(styleOf(getByTestId, 'y-axis').width).toBe(66);
  });

  it('lays out skinny candles, wicks, volume bars, and axis pills', () => {
    const { getByTestId, queryByTestId } = render(
      <ChartCandleSkeleton height={HEIGHT} />,
    );
    const mark = (suffix: string) => styleOf(getByTestId, suffix);

    expect(queryByTestId(`${ID}-candle-${CANDLES}`)).toBeNull();
    expect(queryByTestId(`${ID}-y-pill-${Y_PILLS}`)).toBeNull();
    expect(queryByTestId(`${ID}-x-pill-${X_PILLS}`)).toBeNull();
    expect(getByTestId(`${ID}-grid-h-0`)).toBeOnTheScreen();
    expect(getByTestId(`${ID}-grid-h-5`)).toBeOnTheScreen();
    expect(getByTestId(`${ID}-grid-v-0`)).toBeOnTheScreen();
    expect(getByTestId(`${ID}-grid-v-3`)).toBeOnTheScreen();
    expect(mark('candle-0')).toEqual(
      expect.objectContaining({
        width: 4,
        height: percentOf(27, PRICE),
        top: percentOf(87, PRICE),
      }),
    );
    expect(mark('candle-31')).toEqual(
      expect.objectContaining({
        width: 4,
        height: percentOf(30, PRICE),
        top: percentOf(108, PRICE),
      }),
    );
    expect(mark('wick-0')).toEqual(
      expect.objectContaining({
        width: 1,
        height: percentOf(35, PRICE),
        top: percentOf(83, PRICE),
      }),
    );
    expect(mark('volume-0')).toEqual(
      expect.objectContaining({ width: 4, height: percentOf(12, VOLUME) }),
    );
    expect(mark('volume-31').height).toBe(percentOf(16, VOLUME));
    expect(mark('y-pill-0')).toEqual(
      expect.objectContaining({
        width: 44,
        height: 10,
        top: percentOf(11, PRICE),
      }),
    );
    expect(mark('y-pill-5').top).toBe(percentOf(231, PRICE));
    expect(mark('x-pill-0')).toEqual(
      expect.objectContaining({ width: 28, height: 8 }),
    );
    expect(getByTestId(`${ID}-x-pill-5`)).toBeOnTheScreen();
    expect(mark('grid-h-0')).toEqual(
      expect.objectContaining({
        top: percentOf(16, PRICE),
        height: 1,
        backgroundColor: mockTheme.colors.border.muted,
      }),
    );
  });

  it('pulses every mark through one wrapper and leaves the grid outside it', () => {
    const { getAllByTestId, getByTestId } = render(
      <ChartCandleSkeleton height={HEIGHT} />,
    );
    const pulse = within(getByTestId(`${ID}-pulse`));

    expect(getAllByTestId(`${ID}-pulse`)).toHaveLength(1);
    expect(flatStyle(getByTestId(`${ID}-pulse`).props.style).opacity).toBe(0.2);
    [
      'candle-0',
      'candle-31',
      'wick-31',
      'volume-31',
      'y-pill-5',
      'x-pill-5',
    ].forEach((suffix) => {
      expect(pulse.getByTestId(`${ID}-${suffix}`)).toBeOnTheScreen();
      expect(styleOf(getByTestId, suffix).backgroundColor).toBe(
        mockTheme.colors.icon.alternative,
      );
    });
    expect(pulse.queryByTestId(`${ID}-grid-h-0`)).toBeNull();
    expect(pulse.queryByTestId(`${ID}-grid-v-0`)).toBeNull();
  });

  it.each([
    ['LOW', 'static', 'pulse'],
    ['MID', 'pulse', 'static'],
    ['HIGH', 'pulse', 'static'],
    [null, 'pulse', 'static'],
  ] as const)(
    'renders the %s hardware tier marks as %s',
    (tier, shown, hidden) => {
      mockGetHardwareTier.mockReturnValueOnce(tier);

      const { getByTestId, queryByTestId } = render(
        <ChartCandleSkeleton height={HEIGHT} />,
      );
      const marks = getByTestId(`${ID}-${shown}`);

      expect(queryByTestId(`${ID}-${hidden}`)).toBeNull();
      expect(flatStyle(marks.props.style).opacity).toBe(0.2);
      expect(within(marks).getByTestId(`${ID}-candle-0`)).toBeOnTheScreen();
    },
  );

  it.each([
    ['perps-market-details-view-chart-skeleton', true],
    ['perps-market-details-view-tradingview-chart-skeleton', false],
  ] as const)('keeps caller test id %s', (testID, checksMarks) => {
    const { getByTestId } = render(
      <ChartCandleSkeleton height={HEIGHT} testID={testID} />,
    );

    expect(getByTestId(testID)).toBeOnTheScreen();
    expect(getByTestId(`${testID}-candle-0`)).toBeOnTheScreen();
    if (!checksMarks) {
      return;
    }
    expect(getByTestId(`${testID}-wick-31`)).toBeOnTheScreen();
    expect(getByTestId(`${testID}-volume-31`)).toBeOnTheScreen();
    expect(getByTestId(`${testID}-y-pill-5`)).toBeOnTheScreen();
    expect(getByTestId(`${testID}-x-pill-5`)).toBeOnTheScreen();
  });
});
