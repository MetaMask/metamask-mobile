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

const createResponderEvent = (locationX: number, locationY: number) => {
  const timestamp = 1_736_761_237_983;
  return {
    nativeEvent: {
      locationX,
      locationY,
      pageX: locationX,
      pageY: locationY,
      identifier: 1,
      target: 0,
      timestamp,
    },
    touchHistory: {
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: timestamp,
      numberActiveTouches: 1,
      touchBank: [
        {
          touchActive: true,
          startPageX: locationX,
          startPageY: locationY,
          startTimeStamp: timestamp,
          currentPageX: locationX,
          currentPageY: locationY,
          currentTimeStamp: timestamp,
          previousPageX: locationX,
          previousPageY: locationY,
          previousTimeStamp: timestamp,
        },
      ],
    },
  };
};

describe('PredictMarketChart', () => {
  it('plots each series over its full observed interval', () => {
    const view = render(
      <PredictMarketChart series={testSeries} testID="market-chart" />,
    );

    fireEvent(view.getByTestId('market-chart'), 'layout', {
      nativeEvent: { layout: { width: 343, height: 240 } },
    });

    const homePath = view.getByTestId('market-chart-line-home').props.d;
    const awayPath = view.getByTestId('market-chart-line-away').props.d;
    const homeStart = Number(homePath.match(/^M(-?[\d.]+),/)?.[1]);
    const awayStart = Number(awayPath.match(/^M(-?[\d.]+),/)?.[1]);
    const homeEnd = Number(homePath.match(/L([\d.]+),[^L]+$/)?.[1]);
    const awayEnd = Number(awayPath.match(/L([\d.]+),[^L]+$/)?.[1]);

    expect(homePath).not.toContain('C');
    expect(awayPath).not.toContain('C');
    expect(homeStart).toBeCloseTo(0);
    expect(awayStart).toBeGreaterThan(homeStart);
    expect(awayEnd).toBeCloseTo(homeEnd);
    expect(view.getByLabelText(/Vikings 61%, Ravens 38%/)).toBeOnTheScreen();
    expect(
      view.getByTestId('market-chart-endpoint-home-pulse'),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId('market-chart-endpoint-away-pulse'),
    ).toBeOnTheScreen();
  });

  it('holds each observed price until the next observation', () => {
    const view = render(
      <PredictMarketChart
        series={[
          {
            id: 'price',
            label: 'Yes',
            color: 'rgb(68, 89, 255)',
            data: [
              { time: 100, value: 0.57 },
              { time: 200, value: 0.48 },
              { time: 300, value: 0.47 },
            ],
          },
        ]}
        testID="market-chart"
      />,
    );

    fireEvent(view.getByTestId('market-chart'), 'layout', {
      nativeEvent: { layout: { width: 343, height: 150 } },
    });

    const path = view.getByTestId('market-chart-line-price').props.d as string;

    expect(path).not.toContain('C');
    expect(path.match(/L/g)).toHaveLength(4);
  });

  it('uses Kalshi-style nice bounds for the visible value range', () => {
    const view = render(
      <PredictMarketChart
        series={[
          {
            id: 'lower',
            label: 'Lower',
            color: 'rgb(202, 53, 66)',
            data: [
              { time: 100, value: 0.47 },
              { time: 200, value: 0.47 },
            ],
          },
          {
            id: 'upper',
            label: 'Upper',
            color: 'rgb(68, 89, 255)',
            data: [
              { time: 100, value: 0.53 },
              { time: 200, value: 0.53 },
            ],
          },
        ]}
        testID="market-chart"
      />,
    );

    fireEvent(view.getByTestId('market-chart'), 'layout', {
      nativeEvent: { layout: { width: 343, height: 150 } },
    });

    const lowerPath = view.getByTestId('market-chart-line-lower').props
      .d as string;
    const upperPath = view.getByTestId('market-chart-line-upper').props
      .d as string;
    const lowerY = Number(lowerPath.match(/^M-?[\d.]+,([\d.]+)/)?.[1]);
    const upperY = Number(upperPath.match(/^M-?[\d.]+,([\d.]+)/)?.[1]);

    expect(lowerY).toBeCloseTo(146.4);
    expect(upperY).toBeCloseTo(45.6);
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

  it('keeps a 100% line fully inside the plot', () => {
    const view = render(
      <PredictMarketChart
        series={[
          {
            id: 'top',
            label: 'Yes',
            color: 'rgb(68, 89, 255)',
            data: [
              { time: 100, value: 1 },
              { time: 200, value: 1 },
            ],
          },
        ]}
        lineWidth={2}
        testID="market-chart"
      />,
    );

    fireEvent(view.getByTestId('market-chart'), 'layout', {
      nativeEvent: { layout: { width: 343, height: 150 } },
    });

    const path = view.getByTestId('market-chart-line-top').props.d as string;
    const firstY = Number(path.match(/^M-?[\d.]+,([\d.]+)/)?.[1]);

    expect(firstY).toBeGreaterThanOrEqual(13);
  });

  it('shows the timestamp and carry-forward prices while scrubbing', () => {
    const view = render(
      <PredictMarketChart
        series={testSeries}
        formatTime={(time) => `Time ${Math.round(time)}`}
        testID="market-chart"
      />,
    );
    const chart = view.getByTestId('market-chart');
    fireEvent(chart, 'layout', {
      nativeEvent: { layout: { width: 343, height: 240 } },
    });

    fireEvent(chart, 'responderGrant', createResponderEvent(90.8, 80));

    expect(
      view.queryByTestId('market-chart-endpoint-home-pulse'),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId('market-chart-endpoint-away-pulse'),
    ).not.toBeOnTheScreen();
    expect(
      view.getByLabelText(
        /Market probability history at Time 1[34][0-9]\. Vikings 58%/,
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByLabelText(/Time 1[34][0-9]/).props.accessibilityLabel,
    ).not.toContain('Ravens');
    const scrubTime = view.getByTestId('market-chart-scrub-time');
    expect(scrubTime).toBeOnTheScreen();
    expect(scrubTime.props.matrix[5]).toBeGreaterThan(140);
    expect(view.getByTestId('market-chart-scrub-future').props.opacity).toBe(
      0.3,
    );

    fireEvent(chart, 'responderMove', createResponderEvent(154.4, 80));

    expect(
      view.getByLabelText(
        /Market probability history at Time 1[67][0-9]\. Vikings 58%, Ravens 41%/,
      ),
    ).toBeOnTheScreen();

    fireEvent(chart, 'responderRelease', createResponderEvent(154.4, 80));

    expect(view.queryByTestId('market-chart-scrub-future')).toBeNull();
    expect(
      view.getByTestId('market-chart-endpoint-home-pulse'),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId('market-chart-endpoint-away-pulse'),
    ).toBeOnTheScreen();
    expect(
      view.getByLabelText(
        'Market probability history. Vikings 61%, Ravens 38%',
      ),
    ).toBeOnTheScreen();
  });
});
