import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { mockTheme } from '../../../../../util/theme';
import { PERPS_CHART_CONFIG } from '../../constants/chartConfig';
import { PerpsCandlestickChartSelectorsIDs } from '../../Perps.testIds';
import {
  CHART_SKELETON_BODY_SLOT_RATIO,
  CHART_SKELETON_CANDLE_COUNT,
  CHART_SKELETON_HORIZONTAL_GRID_COUNT,
  CHART_SKELETON_VOLUME_HEIGHT_RATIOS,
  CHART_SKELETON_X_AXIS_LABEL_COUNT,
  CHART_SKELETON_Y_AXIS_WIDTH,
  getChartSkeletonCandleGeometry,
  getChartSkeletonPaneHeights,
} from './PerpsChartSkeleton.constants';
import PerpsChartSkeleton from './PerpsChartSkeleton';

const SKELETON_TEST_ID = PerpsCandlestickChartSelectorsIDs.SKELETON;
const HIDDEN = { includeHiddenElements: true };
const LAYOUT_WIDTH = 372;

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

describe('getChartSkeletonCandleGeometry', () => {
  it('swings candle bodies up and down instead of a straight trend', () => {
    const tops = Array.from(
      { length: CHART_SKELETON_CANDLE_COUNT },
      (_, index) => getChartSkeletonCandleGeometry(index).bodyTopRatio,
    );
    const deltas = tops.slice(1).map((top, index) => top - tops[index]);

    expect(deltas.some((delta) => delta > 0)).toBe(true);
    expect(deltas.some((delta) => delta < 0)).toBe(true);
    expect(CHART_SKELETON_VOLUME_HEIGHT_RATIOS).toHaveLength(
      CHART_SKELETON_CANDLE_COUNT,
    );
  });

  it('splits the chart height into price, volume, and axis panes', () => {
    const height = PERPS_CHART_CONFIG.LAYOUT.DETAIL_VIEW_HEIGHT;

    const panes = getChartSkeletonPaneHeights(height);

    expect(
      panes.priceHeight +
        panes.volumeHeight +
        panes.axisHeight +
        panes.separator,
    ).toBe(height);
    expect(panes.priceHeight).toBeGreaterThan(panes.volumeHeight);
  });
});

describe('PerpsChartSkeleton', () => {
  it('exposes a progressbar labelled Loading chart', () => {
    const { getByRole, getByLabelText } = render(<PerpsChartSkeleton />);

    expect(getByRole('progressbar')).toBeOnTheScreen();
    expect(getByLabelText(strings('perps.chart.loading'))).toBeOnTheScreen();
  });

  it('paints theme-token candles, grid, and an opaque chart background', () => {
    const { getByTestId } = render(<PerpsChartSkeleton />);

    fireEvent(getByTestId(SKELETON_TEST_ID), 'layout', {
      nativeEvent: { layout: { width: LAYOUT_WIDTH, height: 350, x: 0, y: 0 } },
    });

    expect(flatStyle(getByTestId(SKELETON_TEST_ID).props.style)).toEqual(
      expect.objectContaining({
        height: PERPS_CHART_CONFIG.LAYOUT.DETAIL_VIEW_HEIGHT,
        backgroundColor: mockTheme.colors.background.default,
      }),
    );
    expect(
      flatStyle(getByTestId(`${SKELETON_TEST_ID}-candle-0`, HIDDEN).props.style)
        .backgroundColor,
    ).toBe(mockTheme.colors.icon.alternative);
    expect(
      flatStyle(getByTestId(`${SKELETON_TEST_ID}-shapes`, HIDDEN).props.style)
        .backgroundColor,
    ).toBeUndefined();
  });

  it('renders 32 candles, volume bars, and axis pills after layout', () => {
    const { getByTestId } = render(<PerpsChartSkeleton />);
    const plotWidth = LAYOUT_WIDTH - CHART_SKELETON_Y_AXIS_WIDTH;
    const bodyWidth =
      (plotWidth / CHART_SKELETON_CANDLE_COUNT) *
      CHART_SKELETON_BODY_SLOT_RATIO;

    fireEvent(getByTestId(SKELETON_TEST_ID), 'layout', {
      nativeEvent: { layout: { width: LAYOUT_WIDTH, height: 350, x: 0, y: 0 } },
    });

    expect(
      getByTestId(`${SKELETON_TEST_ID}-candle-31`, HIDDEN),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${SKELETON_TEST_ID}-wick-31`, HIDDEN),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${SKELETON_TEST_ID}-volume-31`, HIDDEN),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${SKELETON_TEST_ID}-y-pill-${CHART_SKELETON_HORIZONTAL_GRID_COUNT - 1}`,
        HIDDEN,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${SKELETON_TEST_ID}-x-pill-${CHART_SKELETON_X_AXIS_LABEL_COUNT - 1}`,
        HIDDEN,
      ),
    ).toBeOnTheScreen();
    expect(
      flatStyle(getByTestId(`${SKELETON_TEST_ID}-candle-0`, HIDDEN).props.style)
        .width,
    ).toBeCloseTo(bodyWidth);
  });
});
