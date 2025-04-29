import React from 'react';
import { fireEvent, render, RenderResult } from '@testing-library/react-native';
import { StakingEarningsHistoryChart } from './StakingEarningsHistoryChart';
import { fireLayoutEvent } from '../../../../../../../util/testUtils/react-native-svg-charts';
import { lightTheme } from '@metamask/design-tokens';

jest.mock('react-native-svg-charts', () => {
  const reactNativeSvgCharts = jest.requireActual('react-native-svg-charts'); // Get the actual Grid component
  return {
    ...reactNativeSvgCharts,
    Grid: () => <></>,
  };
});

const mockEarningsData = {
  earnings: [
    { value: 1.0, label: 'Day 1' },
    { value: 3.0, label: 'Day 2' },
    { value: 2.0, label: 'Day 3' },
  ],
  earningsTotal: '6.00000',
  ticker: 'ETH',
};

const barChartComponent = (
  <StakingEarningsHistoryChart
    earnings={mockEarningsData.earnings}
    earningsTotal={mockEarningsData.earningsTotal}
    ticker={mockEarningsData.ticker}
  ></StakingEarningsHistoryChart>
);

const renderChart = () => {
  const chartContainer = render(barChartComponent);
  fireLayoutEvent(chartContainer.root, { width: 500, height: 200 });
  const chart = chartContainer.getByTestId('earnings-history-chart-container')
    .props.children.props.children[1].props.children.props;
  return {
    chartContainer,
    chart,
  };
};

describe('StakingEarningsHistoryChart', () => {
  let chartContainer: RenderResult;
  let chart: RenderResult['root'];

  beforeEach(() => {
    jest.clearAllMocks();
    ({ chartContainer, chart } = renderChart());
  });

  it('renders correct initial state', async () => {
    expect(chartContainer.getByText('Lifetime earnings')).toBeTruthy();
    expect(chartContainer.getByText('6.00000 ETH')).toBeTruthy();
    expect(
      chartContainer.getByTestId('earning-history-chart-bar-0'),
    ).toBeTruthy();
    expect(
      chartContainer.getByTestId('earning-history-chart-bar-1'),
    ).toBeTruthy();
    expect(
      chartContainer.getByTestId('earning-history-chart-bar-2'),
    ).toBeTruthy();
    expect(
      chartContainer.getByTestId('earning-history-chart-line-0'),
    ).toBeTruthy();
    expect(
      chartContainer.getByTestId('earning-history-chart-line-1'),
    ).toBeTruthy();
    expect(
      chartContainer.getByTestId('earning-history-chart-line-2'),
    ).toBeTruthy();
    expect(chart.data.length).toBe(mockEarningsData.earnings.length);
  });

  it('updates chart state when bar 1 is clicked', () => {
    // click bar 1
    fireEvent(
      chartContainer.getByTestId('earnings-history-chart'),
      'onTouchStart',
      {
        nativeEvent: { locationX: 50 },
      },
    );
    // expect bar 1 to be selected and highlighted on touch
    expect(chartContainer.getByText('Day 1')).toBeTruthy();
    expect(chartContainer.getByText('1.00000 ETH')).toBeTruthy();
    expect(chart.data[0].svg.fill).toBe(lightTheme.colors.success.default);
    // end touch bar 1
    fireEvent(
      chartContainer.getByTestId('earnings-history-chart'),
      'onTouchEnd',
      {
        nativeEvent: { pageX: 50, pageY: 50 },
      },
    );
    // expect bar 1 to be selected and highlighted after touch end
    expect(chartContainer.getByText('Day 1')).toBeTruthy();
    expect(chartContainer.getByText('1.00000 ETH')).toBeTruthy();
    expect(chart.data[0].svg.fill).toBe(lightTheme.colors.success.default);
  });

  it('updates chart state when bar 2 is clicked', async () => {
    // click bar 2
    fireEvent(
      chartContainer.getByTestId('earnings-history-chart'),
      'onTouchStart',
      {
        nativeEvent: { locationX: 250 },
      },
    );
    // expect bar 2 to be selected and highlighted on touch
    expect(chartContainer.getByText('Day 2')).toBeTruthy();
    expect(chartContainer.getByText('3.00000 ETH')).toBeTruthy();
    expect(chart.data[1].svg.fill).toBe(lightTheme.colors.success.default);
    // end touch bar 2
    fireEvent(
      chartContainer.getByTestId('earnings-history-chart'),
      'onTouchEnd',
      {
        nativeEvent: { locationX: 250 },
      },
    );
    // expect bar 2 to be selected and highlighted after touch end
    expect(chartContainer.getByText('Day 2')).toBeTruthy();
    expect(chartContainer.getByText('3.00000 ETH')).toBeTruthy();
    expect(chart.data[1].svg.fill).toBe(lightTheme.colors.success.default);
  });

  it('updates chart state when bar 3 is clicked', async () => {
    // click bar 3
    fireEvent(
      chartContainer.getByTestId('earnings-history-chart'),
      'onTouchStart',
      {
        nativeEvent: { locationX: 450 },
      },
    );
    expect(chartContainer.getByText('Day 3')).toBeTruthy();
    expect(chartContainer.getByText('2.00000 ETH')).toBeTruthy();
    expect(chart.data[2].svg.fill).toBe(lightTheme.colors.success.default);
    // end touch bar 3
    fireEvent(
      chartContainer.getByTestId('earnings-history-chart'),
      'onTouchEnd',
      {
        nativeEvent: { locationX: 450 },
      },
    );
    expect(chartContainer.getByText('Day 3')).toBeTruthy();
    expect(chartContainer.getByText('2.00000 ETH')).toBeTruthy();
    expect(chart.data[2].svg.fill).toBe(lightTheme.colors.success.default);
  });

  it('updates chart to initial state when selected bar is set unselected', async () => {
    // click bar 3
    fireEvent(
      chartContainer.getByTestId('earnings-history-chart'),
      'onTouchStart',
      {
        nativeEvent: { locationX: 450 },
      },
    );
    // end touch bar 3
    fireEvent(
      chartContainer.getByTestId('earnings-history-chart'),
      'onTouchEnd',
      {
        nativeEvent: { locationX: 450 },
      },
    );
    // expect bar 3 to be selected and highlighted
    expect(chart.data[2].svg.fill).toBe(lightTheme.colors.success.default);
    // click again
    fireEvent(
      chartContainer.getByTestId('earnings-history-chart'),
      'onTouchStart',
      {
        nativeEvent: { locationX: 450 },
      },
    );
    // end touch bar 3
    fireEvent(
      chartContainer.getByTestId('earnings-history-chart'),
      'onTouchEnd',
      {
        nativeEvent: { locationX: 450 },
      },
    );
    // expect bar 3 to be unselected and not highlighted
    expect(chart.data[0].svg.fill).toBe('url(#bar-gradient)');
    expect(chart.data[1].svg.fill).toBe('url(#bar-gradient)');
    expect(chart.data[2].svg.fill).toBe('url(#bar-gradient)');
    // expect chart to be in initial state
    expect(chartContainer.getByText('Lifetime earnings')).toBeTruthy();
    expect(chartContainer.getByText('6.00000 ETH')).toBeTruthy();
  });

  it('renders to match snapshot', () => {
    expect(chartContainer.toJSON()).toMatchSnapshot();
  });
});
