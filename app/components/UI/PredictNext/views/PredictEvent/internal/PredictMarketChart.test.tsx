import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ReduceMotion, withRepeat, withTiming } from 'react-native-reanimated';
import { PredictMarketChart } from './PredictMarketChart';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    width: 375,
    height: 812,
    scale: 2,
    fontScale: 1,
  })),
}));

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  withRepeat: jest.fn((animation) => animation),
  withTiming: jest.fn((value) => value),
}));

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
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    });
  });

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
    const homeEnd = Number(homePath.match(/(-?[\d.]+),-?[\d.]+$/)?.[1]);
    const awayEnd = Number(awayPath.match(/(-?[\d.]+),-?[\d.]+$/)?.[1]);

    expect(homePath).toContain('C');
    expect(awayPath).toContain('C');
    expect(homeStart).toBeCloseTo(0);
    expect(awayStart).toBeCloseTo(homeStart);
    expect(awayEnd).toBeCloseTo(homeEnd);
    expect(view.getByLabelText(/Vikings 61%, Ravens 38%/)).toBeOnTheScreen();
    expect(
      view.getByTestId('market-chart-endpoint-home-pulse'),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId('market-chart-endpoint-away-pulse'),
    ).toBeOnTheScreen();
  });

  it('smooths every observed price movement with horizontal bumps', () => {
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

    expect(path.match(/C/g)).toHaveLength(2);
    expect(path).not.toContain('L');
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

    expect(lowerY).toBeCloseTo(108.736);
    expect(upperY).toBeCloseTo(49.264);
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

    expect(firstY).toBeGreaterThanOrEqual(21);
  });

  it('reserves scaled space for endpoint labels at large font sizes', () => {
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 430,
      height: 932,
      scale: 3,
      fontScale: 2,
    });
    const view = render(
      <PredictMarketChart
        series={[
          {
            id: 'home',
            label: 'Minnesota Vikings',
            color: 'rgb(202, 53, 66)',
            data: [
              { time: 100, value: 0.05 },
              { time: 200, value: 0.02 },
            ],
          },
        ]}
        formatValue={() => '100%'}
        labelGutter={116}
        testID="market-chart"
      />,
    );

    fireEvent(view.getByTestId('market-chart'), 'layout', {
      nativeEvent: { layout: { width: 430, height: 206 } },
    });

    const chartHeight = StyleSheet.flatten(
      view.getByTestId('market-chart').props.style,
    ).height as number;
    const name = view.getByTestId('market-chart-label-home');
    const value = view.getByTestId('market-chart-value-home');
    const estimatedNameRight = name.props.matrix[4] + 17 * 28 * 0.56;

    expect(chartHeight).toBeGreaterThanOrEqual(211);
    expect(name.props.matrix[5]).toBeGreaterThan(0);
    expect(estimatedNameRight).toBeLessThanOrEqual(430);
    expect(value.props.matrix[5]).toBeLessThanOrEqual(chartHeight - 20);
  });

  it('reserves scaled width for the percentage label', () => {
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 343,
      height: 812,
      scale: 3,
      fontScale: 2,
    });
    const view = render(
      <PredictMarketChart
        series={[
          {
            id: 'yes',
            label: 'Yes',
            color: 'rgb(68, 89, 255)',
            data: [
              { time: 100, value: 1 },
              { time: 200, value: 1 },
            ],
          },
        ]}
        formatValue={() => '100%'}
        testID="market-chart"
      />,
    );

    fireEvent(view.getByTestId('market-chart'), 'layout', {
      nativeEvent: { layout: { width: 343, height: 192 } },
    });

    const value = view.getByTestId('market-chart-value-yes');
    const estimatedValueRight = value.props.matrix[4] + 4 * 56 * 0.62;

    expect(estimatedValueRight).toBeLessThanOrEqual(343);
  });

  it('uses a 3200 ms endpoint pulse', () => {
    const view = render(
      <PredictMarketChart series={testSeries} testID="market-chart" />,
    );

    fireEvent(view.getByTestId('market-chart'), 'layout', {
      nativeEvent: { layout: { width: 343, height: 150 } },
    });

    expect(withTiming).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: 3200 }),
    );
  });

  it('delegates reduced-motion behavior to the system setting', () => {
    const view = render(
      <PredictMarketChart series={testSeries} testID="market-chart" />,
    );

    fireEvent(view.getByTestId('market-chart'), 'layout', {
      nativeEvent: { layout: { width: 343, height: 150 } },
    });

    expect(withRepeat).toHaveBeenCalledWith(
      expect.anything(),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    );
  });

  it('renders a radius-six solid endpoint with a background stroke', () => {
    const view = render(
      <PredictMarketChart series={testSeries} testID="market-chart" />,
    );

    fireEvent(view.getByTestId('market-chart'), 'layout', {
      nativeEvent: { layout: { width: 343, height: 150 } },
    });

    const endpoint = view.getByTestId('market-chart-endpoint-home');
    expect(endpoint.props.r).toBe(6);
    expect(endpoint.props.fill).toBeDefined();
    expect(endpoint.props.stroke).not.toEqual(endpoint.props.fill);
    expect(endpoint.props.strokeWidth).toBe(2);
  });

  it('removes the endpoint pulse while scrubbing and restores it on release', () => {
    const view = render(
      <PredictMarketChart series={testSeries} testID="market-chart" />,
    );
    const chart = view.getByTestId('market-chart');
    fireEvent(chart, 'layout', {
      nativeEvent: { layout: { width: 343, height: 150 } },
    });

    fireEvent(chart, 'responderGrant', createResponderEvent(90, 80));

    expect(
      view.queryByTestId('market-chart-endpoint-home-pulse'),
    ).not.toBeOnTheScreen();

    fireEvent(chart, 'responderRelease', createResponderEvent(90, 80));

    expect(
      view.getByTestId('market-chart-endpoint-home-pulse'),
    ).toBeOnTheScreen();
  });

  it.each([
    { x: 0, edge: 'left' },
    { x: 260, edge: 'right' },
  ] as const)('keeps the scrub timestamp inside the $edge edge', ({ x }) => {
    const view = render(
      <PredictMarketChart
        series={testSeries}
        formatTime={() => 'Aug 24, 12:00 PM'}
        testID="market-chart"
      />,
    );
    const chart = view.getByTestId('market-chart');
    fireEvent(chart, 'layout', {
      nativeEvent: { layout: { width: 343, height: 150 } },
    });

    fireEvent(chart, 'responderGrant', createResponderEvent(x, 80));

    expect(view.getByTestId('market-chart-scrub-time').props.matrix[4]).toBe(x);
  });

  it('shows the timestamp and interpolated prices while scrubbing', () => {
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

    fireEvent(chart, 'responderGrant', createResponderEvent(104, 80));

    expect(
      view.getByLabelText(
        /Market probability history at Time 1[34][0-9]\. Vikings 59%/,
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

    fireEvent(chart, 'responderMove', createResponderEvent(176.9, 80));

    expect(
      view.getByLabelText(
        /Market probability history at Time 1[67][0-9]\. Vikings 60%, Ravens 39%/,
      ),
    ).toBeOnTheScreen();

    fireEvent(chart, 'responderRelease', createResponderEvent(176.9, 80));

    expect(view.queryByTestId('market-chart-scrub-future')).toBeNull();
    expect(
      view.getByLabelText(
        'Market probability history. Vikings 61%, Ravens 38%',
      ),
    ).toBeOnTheScreen();
  });
});
