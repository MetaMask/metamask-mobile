import React from 'react';
import { render } from '@testing-library/react-native';
import { mockTheme } from '../../../../util/theme';
import { Skeleton } from '../../../../component-library/components-temp/Skeleton';
import ChartCandleSkeleton from './ChartCandleSkeleton';

const SKELETON_TEST_ID = 'chart-candle-skeleton';
const CANDLE_COUNT = 12;

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

  it('lays out a fixed row of candle bars', () => {
    const { getByTestId, UNSAFE_getAllByType } = render(
      <ChartCandleSkeleton />,
    );

    const firstCandle = getByTestId(`${SKELETON_TEST_ID}-candle-0`);
    const lastCandle = getByTestId(
      `${SKELETON_TEST_ID}-candle-${CANDLE_COUNT - 1}`,
    );

    expect(flatStyle(firstCandle.props.style)).toEqual(
      expect.objectContaining({
        width: 8,
        height: 72,
        marginBottom: 36,
      }),
    );
    expect(flatStyle(lastCandle.props.style)).toEqual(
      expect.objectContaining({
        height: 76,
        marginBottom: 36,
      }),
    );
    expect(UNSAFE_getAllByType(Skeleton)).toHaveLength(CANDLE_COUNT);
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
  });
});
