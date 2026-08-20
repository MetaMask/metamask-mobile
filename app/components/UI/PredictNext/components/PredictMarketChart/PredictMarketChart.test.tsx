import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { PredictMarketChart } from './PredictMarketChart';

const testSeries = [
  {
    id: 'home',
    label: 'Vikings',
    color: 'rgb(202, 53, 66)',
    data: [
      { time: 100, value: 0.58 },
      { time: 200, value: 0.61 },
    ],
  },
  {
    id: 'away',
    label: 'Ravens',
    color: 'rgb(68, 89, 255)',
    data: [
      { time: 150, value: 0.41 },
      { time: 175, value: 0.38 },
    ],
  },
];

describe('PredictMarketChart', () => {
  it('uses carry-forward prices over the shared observed interval', () => {
    const view = render(
      <PredictMarketChart series={testSeries} testID="market-chart" />,
    );

    fireEvent(view.getByTestId('market-chart'), 'layout', {
      nativeEvent: { layout: { width: 343, height: 240 } },
    });

    const homePath = view.getByTestId('market-chart-line-home').props.d;
    const awayPath = view.getByTestId('market-chart-line-away').props.d;
    const homeBounds = homePath.match(/^M(-?[\d.]+),.+L([\d.]+),/);
    const awayBounds = awayPath.match(/^M(-?[\d.]+),.+L([\d.]+),/);

    expect(homePath.match(/[MLC]/g)?.length).toBe(2);
    expect(awayPath.match(/[MLC]/g)?.length).toBe(2);
    expect(homeBounds?.slice(1)).toEqual(awayBounds?.slice(1));
    expect(view.getByLabelText(/Vikings 58%, Ravens 38%/)).toBeOnTheScreen();
  });

  it('keeps a low-probability value label inside the chart viewport', () => {
    const view = render(
      <PredictMarketChart
        series={[
          {
            id: 'low',
            label: 'No',
            color: 'rgb(202, 53, 66)',
            data: [
              { time: 100, value: 0.05 },
              { time: 200, value: 0.02 },
            ],
          },
        ]}
        height={170}
        testID="market-chart"
      />,
    );

    fireEvent(view.getByTestId('market-chart'), 'layout', {
      nativeEvent: { layout: { width: 343, height: 170 } },
    });
    const chart = view.getByTestId('market-chart');
    const valueLabelTransform = view.getByTestId('market-chart-value-low').props
      .matrix as readonly number[];
    const baseline = valueLabelTransform[5];
    const chartHeight = StyleSheet.flatten(chart.props.style).height as number;

    expect(baseline).toBeLessThanOrEqual(chartHeight - 10);
  });
});
