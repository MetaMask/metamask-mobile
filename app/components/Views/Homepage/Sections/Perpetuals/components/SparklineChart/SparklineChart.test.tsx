import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import SparklineChart from './SparklineChart';
import { mockTheme } from '../../../../../../../util/theme';

jest.mock('react-native-graph', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    __esModule: true,
    LineGraph: ({
      testID,
      points,
      color,
      lineThickness,
      gradientFillColors,
    }: {
      testID?: string;
      points?: Array<{ value: number; date: Date }>;
      color?: string;
      lineThickness?: number;
      gradientFillColors?: string[];
    }) => (
      <View
        testID={testID ?? 'line-graph'}
        data-points={points?.length}
        data-color={color}
        data-line-thickness={lineThickness}
        data-gradient={Boolean(gradientFillColors)}
      />
    ),
  };
});

describe('SparklineChart', () => {
  it('renders nothing when data has fewer than 2 points', () => {
    const { toJSON } = renderWithProvider(
      <SparklineChart data={[100]} width={120} height={48} color="green" />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders nothing when data is empty', () => {
    const { toJSON } = renderWithProvider(
      <SparklineChart data={[]} width={120} height={48} color="green" />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders SVG with line path when given valid data', () => {
    renderWithProvider(
      <SparklineChart
        data={[10, 20, 15, 25, 30]}
        width={120}
        height={48}
        color={mockTheme.colors.success.default}
        testID="test-sparkline"
      />,
    );

    expect(screen.getByTestId('test-sparkline')).toBeOnTheScreen();
    expect(screen.getByTestId('test-sparkline-line-graph')).toBeOnTheScreen();
  });

  it('renders gradient fill by default', () => {
    renderWithProvider(
      <SparklineChart
        data={[10, 20, 15]}
        width={120}
        height={48}
        color="green"
        gradientId="test-grad"
      />,
    );

    const graph = screen.getByTestId('sparkline-chart-line-graph');
    expect(graph.props['data-gradient']).toBe(true);
  });

  it('does not render gradient when showGradient is false', () => {
    renderWithProvider(
      <SparklineChart
        data={[10, 20, 15]}
        width={120}
        height={48}
        color="green"
        showGradient={false}
        gradientId="no-grad"
        animated={false}
      />,
    );

    const graph = screen.getByTestId('sparkline-chart-line-graph');
    expect(graph.props['data-gradient']).toBe(false);
  });

  it('renders without animation wrapper when animated is false', () => {
    const { toJSON } = renderWithProvider(
      <SparklineChart
        data={[10, 20, 15]}
        width={120}
        height={48}
        color="green"
        animated={false}
        testID="no-anim"
      />,
    );

    expect(screen.getByTestId('no-anim')).toBeOnTheScreen();
    expect(toJSON()).not.toBeNull();
  });

  it('is memoized via React.memo', () => {
    const SparklineModule = jest.requireActual('./SparklineChart');
    expect(SparklineModule.default.$$typeof).toBe(Symbol.for('react.memo'));
  });
});
