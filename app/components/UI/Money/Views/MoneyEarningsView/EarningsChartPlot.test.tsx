import React from 'react';
import { PanResponder, StyleSheet } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { EarningsPoint } from './earningsHistory';
import EarningsChartPlot from './EarningsChartPlot';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

const createPoint = ({
  start,
  amountUsd,
  available = true,
}: {
  start: string;
  amountUsd: number | null;
  available?: boolean;
}): EarningsPoint => ({
  start,
  periodEndExclusive: '2026-11-16T00:00:00.000Z',
  timestamp: start,
  amountUsd,
  granularity: 'day',
  periodStatus: 'complete',
  availability: {
    earnings: available ? 'available' : 'unavailable',
    usd_pricing: available ? 'available' : 'unavailable',
  },
  unavailableReasons: available ? [] : ['before_user_earnings_inception'],
});

const createPanResponder = (): ReturnType<typeof PanResponder.create> =>
  PanResponder.create({});

const renderPlot = ({
  points = [
    createPoint({
      start: '2026-11-09T00:00:00.000Z',
      amountUsd: 2,
    }),
    createPoint({
      start: '2026-11-10T00:00:00.000Z',
      amountUsd: 0,
    }),
    createPoint({
      start: '2026-11-11T00:00:00.000Z',
      amountUsd: null,
      available: false,
    }),
  ],
  activeIndex = null,
  onPointPressIn = jest.fn(),
  onPointPressOut = jest.fn(),
  onPlotLayout = jest.fn(),
  setScrollEnabled = jest.fn(),
  xAxisLabels = ['Nov 9', 'Nov 10', 'Nov 11'],
  yAxisValuesUsd = [2, 1],
}: {
  points?: EarningsPoint[];
  activeIndex?: number | null;
  onPointPressIn?: (index: number, point: EarningsPoint) => void;
  onPointPressOut?: () => void;
  onPlotLayout?: (width: number) => void;
  setScrollEnabled?: (enabled: boolean) => void;
  xAxisLabels?: string[];
  yAxisValuesUsd?: number[];
} = {}) =>
  renderWithProvider(
    <EarningsChartPlot
      points={points}
      chartAmountsUsd={points.map(({ amountUsd }) => amountUsd)}
      xAxisLabels={xAxisLabels}
      yAxisValuesUsd={yAxisValuesUsd}
      chartMaximumUsd={2}
      activeIndex={activeIndex}
      locale="en-US"
      panResponder={createPanResponder()}
      onPointPressIn={onPointPressIn}
      onPointPressOut={onPointPressOut}
      onPlotLayout={onPlotLayout}
      setScrollEnabled={setScrollEnabled}
    />,
    { state: { engine: { backgroundState: {} } } },
  );

describe('EarningsChartPlot', () => {
  it('renders bars, axis labels, gridlines, and unavailable slots', () => {
    const { getByTestId, queryByTestId } = renderPlot();

    expect(getByTestId(MoneyEarningsViewTestIds.CHART)).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(1)),
    ).toHaveTextContent('Nov 10');
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_Y_LABEL(0)),
    ).toHaveTextContent('$2');
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_GRIDLINE(1)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(2)).props
        .accessibilityState,
    ).toEqual({ selected: false, disabled: true });
    expect(queryByTestId(MoneyEarningsViewTestIds.CHART_FILL(2))).toBeNull();
  });

  it('keeps an available zero-value bar visible at minimum height', () => {
    const { getByTestId } = renderPlot();

    expect(
      StyleSheet.flatten(
        getByTestId(MoneyEarningsViewTestIds.CHART_FILL(1)).props.style,
      ),
    ).toEqual(expect.objectContaining({ height: 2 }));
  });

  it('avoids duplicate key warnings when axis values repeat', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    const { getByTestId } = renderPlot({
      xAxisLabels: ['Same', 'Same', 'Same'],
      yAxisValuesUsd: [2, 2],
    });
    const duplicateKeyWarnings = consoleError.mock.calls.filter(([message]) =>
      String(message).includes('same key'),
    );
    consoleError.mockRestore();

    expect(duplicateKeyWarnings).toHaveLength(0);
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(2)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_Y_LABEL(1)),
    ).toBeOnTheScreen();
  });

  it('dims inactive bars', () => {
    const { getByTestId } = renderPlot({ activeIndex: 0 });

    expect(
      StyleSheet.flatten(
        getByTestId(MoneyEarningsViewTestIds.CHART_FILL(1)).props.style,
      ),
    ).toEqual(expect.objectContaining({ opacity: 0.35 }));
  });

  it('forwards press-in from an unavailable slot', () => {
    const onPointPressIn = jest.fn();
    const { getByTestId } = renderPlot({ onPointPressIn });
    const unavailableSlot = getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(2));

    fireEvent(unavailableSlot, 'pressIn');

    expect(onPointPressIn).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ amountUsd: null }),
    );
  });

  it('forwards point, layout, and touch callbacks', () => {
    const onPointPressIn = jest.fn();
    const onPointPressOut = jest.fn();
    const onPlotLayout = jest.fn();
    const setScrollEnabled = jest.fn();
    const { getByTestId } = renderPlot({
      onPointPressIn,
      onPointPressOut,
      onPlotLayout,
      setScrollEnabled,
    });
    const slot = getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0));
    const plot = getByTestId(MoneyEarningsViewTestIds.CHART_PLOT);

    fireEvent(slot, 'pressIn');
    fireEvent(slot, 'pressOut');
    plot.props.onLayout?.({
      nativeEvent: { layout: { width: 320 } },
    });
    plot.props.onTouchStart?.();
    plot.props.onTouchEnd?.();

    expect(onPointPressIn).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ amountUsd: 2 }),
    );
    expect(onPointPressOut).toHaveBeenCalledTimes(1);
    expect(onPlotLayout).toHaveBeenCalledWith(320);
    expect(setScrollEnabled).toHaveBeenNthCalledWith(1, false);
    expect(setScrollEnabled).toHaveBeenNthCalledWith(2, true);
  });
});
