import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import IntervalBar from '../IntervalBar';
import { ChartType } from '../AdvancedChart.types';
import { TOKEN_OVERVIEW_CHART_INTERVALS } from '../../../AssetOverview/Price/tokenOverviewChart.constants';

describe('IntervalBar', () => {
  it('renders every interval pill inside the scrollable row', () => {
    const { getByTestId } = render(
      <IntervalBar selectedInterval="15m" onIntervalSelect={jest.fn()} />,
    );

    const scrollRow = within(getByTestId('interval-bar-scroll'));

    TOKEN_OVERVIEW_CHART_INTERVALS.forEach((interval) => {
      expect(scrollRow.getByText(interval)).toBeOnTheScreen();
    });
  });

  // The pills have no flex basis, so before they scrolled they overflowed the row
  // and rendered on top of the chart-type toggle. Keeping the toggle outside the
  // scrollable row is what prevents that overlap.
  it('keeps the chart type toggle outside the scrollable row', () => {
    const { getByTestId, getByLabelText } = render(
      <IntervalBar
        selectedInterval="15m"
        onIntervalSelect={jest.fn()}
        chartType={ChartType.Candles}
        onChartTypeSelect={jest.fn()}
      />,
    );

    expect(getByLabelText('Line chart')).toBeOnTheScreen();

    const scrollRow = within(getByTestId('interval-bar-scroll'));

    expect(scrollRow.queryByLabelText('Line chart')).toBeNull();
    expect(scrollRow.queryByLabelText('Candlestick chart')).toBeNull();
  });

  it('calls onIntervalSelect with the tapped interval', () => {
    const onIntervalSelect = jest.fn();
    const { getByText } = render(
      <IntervalBar
        selectedInterval="15m"
        onIntervalSelect={onIntervalSelect}
      />,
    );

    fireEvent.press(getByText('1h'));

    expect(onIntervalSelect).toHaveBeenCalledWith('1H');
  });
});
