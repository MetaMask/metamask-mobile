import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { mockTheme } from '../../../../util/theme';
import { Skeleton } from '../../../../component-library/components-temp/Skeleton';
import {
  CHART_CANDLE_SKELETON_BODY_SLOT_RATIO,
  CHART_CANDLE_SKELETON_CANDLES,
  CHART_CANDLE_SKELETON_DEFAULT_HEIGHT,
  CHART_CANDLE_SKELETON_HORIZONTAL_GRID_COUNT,
  CHART_CANDLE_SKELETON_PANE_SEPARATOR_HEIGHT,
  CHART_CANDLE_SKELETON_PRICE_PANE_RATIO,
  CHART_CANDLE_SKELETON_VOLUME_PANE_RATIO,
  CHART_CANDLE_SKELETON_X_AXIS_LABEL_COUNT,
  CHART_CANDLE_SKELETON_Y_AXIS_WIDTH,
} from './ChartCandleSkeleton.constants';
import ChartCandleSkeleton from './ChartCandleSkeleton';

const SKELETON_TEST_ID = 'chart-candle-skeleton';
const LAYOUT_WIDTH = 372;
const LAST_CANDLE_INDEX = CHART_CANDLE_SKELETON_CANDLES.length - 1;

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

const pricePaneHeight = Math.round(
  (CHART_CANDLE_SKELETON_DEFAULT_HEIGHT -
    CHART_CANDLE_SKELETON_PANE_SEPARATOR_HEIGHT) *
    CHART_CANDLE_SKELETON_PRICE_PANE_RATIO,
);
const volumePaneHeight = Math.round(
  (CHART_CANDLE_SKELETON_DEFAULT_HEIGHT -
    CHART_CANDLE_SKELETON_PANE_SEPARATOR_HEIGHT) *
    CHART_CANDLE_SKELETON_VOLUME_PANE_RATIO,
);

describe('CHART_CANDLE_SKELETON_CANDLES', () => {
  it('keeps each authored candle inside its pane', () => {
    expect(CHART_CANDLE_SKELETON_CANDLES).toHaveLength(20);

    CHART_CANDLE_SKELETON_CANDLES.forEach((candle) => {
      expect(candle.wickTop).toBeGreaterThanOrEqual(0);
      expect(candle.wickTop).toBeLessThanOrEqual(candle.bodyTop);
      expect(candle.bodyTop + candle.bodyHeight).toBeLessThanOrEqual(
        candle.wickTop + candle.wickHeight,
      );
      expect(candle.wickTop + candle.wickHeight).toBeLessThanOrEqual(1);
      expect(candle.volume).toBeGreaterThan(0);
      expect(candle.volume).toBeLessThanOrEqual(1);
    });
  });
});

describe('ChartCandleSkeleton', () => {
  it('leaves accessibility to the design-system Skeleton', () => {
    const { getByTestId, queryByRole } = render(<ChartCandleSkeleton />);

    expect(queryByRole('progressbar')).toBeNull();
    expect(
      getByTestId(SKELETON_TEST_ID).props.accessibilityLabel,
    ).toBeUndefined();
  });

  it('paints an opaque chart background', () => {
    const { getByTestId } = render(<ChartCandleSkeleton />);

    expect(flatStyle(getByTestId(SKELETON_TEST_ID).props.style)).toEqual(
      expect.objectContaining({
        height: CHART_CANDLE_SKELETON_DEFAULT_HEIGHT,
        backgroundColor: mockTheme.colors.background.default,
      }),
    );
  });

  it('scales candle, wick, and volume fractions by the pane size', () => {
    const { getByTestId, UNSAFE_getAllByType } = render(
      <ChartCandleSkeleton />,
    );
    const plotWidth = LAYOUT_WIDTH - CHART_CANDLE_SKELETON_Y_AXIS_WIDTH;
    const bodyWidth =
      (plotWidth / CHART_CANDLE_SKELETON_CANDLES.length) *
      CHART_CANDLE_SKELETON_BODY_SLOT_RATIO;
    const firstCandle = CHART_CANDLE_SKELETON_CANDLES[0];

    fireEvent(getByTestId(SKELETON_TEST_ID), 'layout', {
      nativeEvent: { layout: { width: LAYOUT_WIDTH, height: 350, x: 0, y: 0 } },
    });

    const candleStyle = flatStyle(
      getByTestId(`${SKELETON_TEST_ID}-candle-0`).props.style,
    );
    const wickStyle = flatStyle(
      getByTestId(`${SKELETON_TEST_ID}-wick-0`).props.style,
    );
    const volumeStyle = flatStyle(
      getByTestId(`${SKELETON_TEST_ID}-volume-0`).props.style,
    );

    expect(candleStyle.width).toBeCloseTo(bodyWidth);
    expect(candleStyle.height).toBeCloseTo(
      firstCandle.bodyHeight * pricePaneHeight,
    );
    expect(wickStyle.height).toBeCloseTo(
      firstCandle.wickHeight * pricePaneHeight,
    );
    expect(volumeStyle.height).toBeCloseTo(
      firstCandle.volume * volumePaneHeight,
    );
    expect(
      getByTestId(`${SKELETON_TEST_ID}-candle-${LAST_CANDLE_INDEX}`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${SKELETON_TEST_ID}-wick-${LAST_CANDLE_INDEX}`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${SKELETON_TEST_ID}-volume-${LAST_CANDLE_INDEX}`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${SKELETON_TEST_ID}-y-pill-${CHART_CANDLE_SKELETON_HORIZONTAL_GRID_COUNT - 1}`,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${SKELETON_TEST_ID}-x-pill-${CHART_CANDLE_SKELETON_X_AXIS_LABEL_COUNT - 1}`,
      ),
    ).toBeOnTheScreen();
    expect(getByTestId(`${SKELETON_TEST_ID}-volume-pill`)).toBeOnTheScreen();
    expect(UNSAFE_getAllByType(Skeleton).length).toBeGreaterThan(0);
  });
});
