import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import type { SharedValue } from 'react-native-reanimated';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';
import type { PositionSheetMarker } from '../hooks/usePositionSheetData';
import PositionSheetChart from './PositionSheetChart';

const PRICES: TokenPrice[] = [
  ['1', 100],
  ['2', 110],
  ['3', 105],
  ['4', 120],
];

const MARKER: PositionSheetMarker = {
  id: '0xenter-0',
  index: 1,
  intent: 'enter',
  timestampMs: 2,
  actionLabel: 'Opened',
  valueLabel: '+$1,250.00',
  isValuePositive: true,
};

const lineProgress = { value: 1 } as SharedValue<number>;

const renderChart = (
  props: Partial<React.ComponentProps<typeof PositionSheetChart>> = {},
) => {
  const onScrub = jest.fn();
  render(
    <PositionSheetChart
      prices={PRICES}
      isLoading={false}
      isTrendPositive
      markers={[MARKER]}
      timeAxisLabels={['Mon', 'Wed', 'Fri', 'Sun']}
      lineProgress={lineProgress}
      overlayStyle={undefined}
      onScrub={onScrub}
      {...props}
    />,
  );
  fireEvent(
    screen.getByTestId(PositionDetailsSheetSelectorsIDs.CHART),
    'layout',
    {
      nativeEvent: { layout: { width: 300, height: 280 } },
    },
  );
  return { onScrub };
};

describe('PositionSheetChart', () => {
  it('draws the line and a marker per fill', () => {
    renderChart();

    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.CHART_LINE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        `${PositionDetailsSheetSelectorsIDs.CHART_MARKER}-${MARKER.id}`,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Wed')).toBeOnTheScreen();
    expect(
      StyleSheet.flatten(
        screen.getByTestId(
          `${PositionDetailsSheetSelectorsIDs.CHART_MARKER}-${MARKER.id}`,
        ).props.style,
      ).borderWidth,
    ).toBeUndefined();
  });

  it('shows the skeleton while prices load', () => {
    renderChart({ isLoading: true });

    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.CHART_LOADING),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PositionDetailsSheetSelectorsIDs.CHART_LINE),
    ).toBeNull();
  });

  it('draws nothing with fewer than two points', () => {
    renderChart({ prices: [PRICES[0]] });

    expect(
      screen.queryByTestId(PositionDetailsSheetSelectorsIDs.CHART_LINE),
    ).toBeNull();
  });

  it('reports the scrubbed point and clears it on release', () => {
    const { onScrub } = renderChart();

    act(() => {
      fireGestureHandler(
        getByGestureTestId(PositionDetailsSheetSelectorsIDs.CHART_SCRUB),
        [{ x: 100 }, { x: 200 }],
      );
    });

    expect(onScrub).toHaveBeenCalledWith(PRICES[1]);
    expect(onScrub).toHaveBeenCalledWith(PRICES[2]);
    expect(onScrub).toHaveBeenLastCalledWith(null);
  });
});
