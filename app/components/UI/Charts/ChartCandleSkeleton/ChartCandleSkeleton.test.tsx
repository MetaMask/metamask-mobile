import React from 'react';
import { render } from '@testing-library/react-native';
import { mockTheme } from '../../../../util/theme';
import { Skeleton } from '../../../../component-library/components-temp/Skeleton';
import ChartCandleSkeleton from './ChartCandleSkeleton';

const SKELETON_TEST_ID = 'chart-candle-skeleton';
const CANDLE_COUNT = 32;
const Y_PILL_COUNT = 6;
const X_PILL_COUNT = 6;

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
  it('leaves accessibility to the design-system Skeleton', () => {
    const { getByTestId, queryByRole } = render(<ChartCandleSkeleton />);

    expect(queryByRole('progressbar')).toBeNull();
    expect(
      getByTestId(SKELETON_TEST_ID).props.accessibilityLabel,
    ).toBeUndefined();
  });

  it('fills the chart height with an opaque background', () => {
    const { getByTestId } = render(<ChartCandleSkeleton height={240} />);

    expect(flatStyle(getByTestId(SKELETON_TEST_ID).props.style)).toEqual(
      expect.objectContaining({
        height: 240,
        backgroundColor: mockTheme.colors.background.default,
      }),
    );
  });

  it('uses the detail-chart height when no height is passed', () => {
    const { getByTestId } = render(<ChartCandleSkeleton />);

    expect(flatStyle(getByTestId(SKELETON_TEST_ID).props.style).height).toBe(
      350,
    );
  });

  it('splits the default height into price, volume, and time panes', () => {
    const { getByTestId } = render(<ChartCandleSkeleton />);

    expect(
      flatStyle(getByTestId(`${SKELETON_TEST_ID}-price`).props.style).height,
    ).toBe(250);
    expect(
      flatStyle(getByTestId(`${SKELETON_TEST_ID}-volume-band`).props.style)
        .height,
    ).toBe(68);
    expect(
      flatStyle(getByTestId(`${SKELETON_TEST_ID}-time-axis`).props.style)
        .height,
    ).toBe(32);
    expect(
      flatStyle(getByTestId(`${SKELETON_TEST_ID}-y-axis`).props.style).width,
    ).toBe(66);
  });

  it('lays out skinny candles, wicks, volume bars, and axis pills', () => {
    const { getByTestId, queryByTestId, UNSAFE_getAllByType } = render(
      <ChartCandleSkeleton />,
    );

    const firstCandle = getByTestId(`${SKELETON_TEST_ID}-candle-0`);
    const lastCandle = getByTestId(
      `${SKELETON_TEST_ID}-candle-${CANDLE_COUNT - 1}`,
    );
    const firstWick = getByTestId(`${SKELETON_TEST_ID}-wick-0`);
    const firstVolume = getByTestId(`${SKELETON_TEST_ID}-volume-0`);
    const lastVolume = getByTestId(
      `${SKELETON_TEST_ID}-volume-${CANDLE_COUNT - 1}`,
    );
    const firstPricePill = getByTestId(`${SKELETON_TEST_ID}-y-pill-0`);
    const lastPricePill = getByTestId(
      `${SKELETON_TEST_ID}-y-pill-${Y_PILL_COUNT - 1}`,
    );
    const firstTimePill = getByTestId(`${SKELETON_TEST_ID}-x-pill-0`);
    const lastTimePill = getByTestId(
      `${SKELETON_TEST_ID}-x-pill-${X_PILL_COUNT - 1}`,
    );

    expect(
      queryByTestId(`${SKELETON_TEST_ID}-candle-${CANDLE_COUNT}`),
    ).toBeNull();
    expect(
      queryByTestId(`${SKELETON_TEST_ID}-y-pill-${Y_PILL_COUNT}`),
    ).toBeNull();
    expect(
      queryByTestId(`${SKELETON_TEST_ID}-x-pill-${X_PILL_COUNT}`),
    ).toBeNull();
    expect(getByTestId(`${SKELETON_TEST_ID}-grid-h-0`)).toBeOnTheScreen();
    expect(getByTestId(`${SKELETON_TEST_ID}-grid-h-5`)).toBeOnTheScreen();
    expect(getByTestId(`${SKELETON_TEST_ID}-grid-v-0`)).toBeOnTheScreen();
    expect(getByTestId(`${SKELETON_TEST_ID}-grid-v-3`)).toBeOnTheScreen();

    expect(flatStyle(firstCandle.props.style)).toEqual(
      expect.objectContaining({
        width: 4,
        height: 27,
        top: 87,
      }),
    );
    expect(flatStyle(lastCandle.props.style)).toEqual(
      expect.objectContaining({
        width: 4,
        height: 30,
        top: 108,
      }),
    );
    expect(flatStyle(firstWick.props.style)).toEqual(
      expect.objectContaining({
        width: 1,
        height: 35,
        top: 83,
      }),
    );
    expect(flatStyle(firstVolume.props.style)).toEqual(
      expect.objectContaining({
        width: 4,
        height: 12,
      }),
    );
    expect(flatStyle(lastVolume.props.style).height).toBe(16);
    expect(flatStyle(firstPricePill.props.style)).toEqual(
      expect.objectContaining({
        width: 44,
        height: 10,
        top: 11,
      }),
    );
    expect(flatStyle(lastPricePill.props.style).top).toBe(231);
    expect(flatStyle(firstTimePill.props.style)).toEqual(
      expect.objectContaining({
        width: 28,
        height: 8,
      }),
    );
    expect(lastTimePill).toBeOnTheScreen();
    expect(
      flatStyle(getByTestId(`${SKELETON_TEST_ID}-grid-h-0`).props.style),
    ).toEqual(
      expect.objectContaining({
        top: 16,
        height: 1,
        backgroundColor: mockTheme.colors.border.muted,
      }),
    );

    const greyMarks = UNSAFE_getAllByType(Skeleton);
    expect(greyMarks).toHaveLength(
      CANDLE_COUNT + CANDLE_COUNT + CANDLE_COUNT + Y_PILL_COUNT + X_PILL_COUNT,
    );
  });

  it('keeps a caller test id on the chart box', () => {
    const { getByTestId } = render(
      <ChartCandleSkeleton testID="perps-market-details-view-chart-skeleton" />,
    );

    expect(
      getByTestId('perps-market-details-view-chart-skeleton'),
    ).toBeOnTheScreen();
    expect(
      getByTestId('perps-market-details-view-chart-skeleton-candle-0'),
    ).toBeOnTheScreen();
    expect(
      getByTestId('perps-market-details-view-chart-skeleton-wick-31'),
    ).toBeOnTheScreen();
    expect(
      getByTestId('perps-market-details-view-chart-skeleton-volume-31'),
    ).toBeOnTheScreen();
    expect(
      getByTestId('perps-market-details-view-chart-skeleton-y-pill-5'),
    ).toBeOnTheScreen();
    expect(
      getByTestId('perps-market-details-view-chart-skeleton-x-pill-5'),
    ).toBeOnTheScreen();
  });

  it('keeps the tradingview skeleton test id prefix', () => {
    const { getByTestId } = render(
      <ChartCandleSkeleton testID="perps-market-details-view-tradingview-chart-skeleton" />,
    );

    expect(
      getByTestId('perps-market-details-view-tradingview-chart-skeleton'),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        'perps-market-details-view-tradingview-chart-skeleton-candle-0',
      ),
    ).toBeOnTheScreen();
  });
});
