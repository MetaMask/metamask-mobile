import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import SparklineChart from './SparklineChart';

jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      testID,
      children,
      ...props
    }: {
      testID?: string;
      children?: React.ReactNode;
      width?: number;
      height?: number;
      viewBox?: string;
    }) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    ),
    Path: ({
      d,
      stroke,
      fill,
    }: {
      d?: string;
      stroke?: string;
      fill?: string;
    }) => (
      <View
        testID="svg-path"
        data-d={d}
        data-stroke={stroke}
        data-fill={fill}
      />
    ),
    Defs: ({ children }: { children?: React.ReactNode }) => (
      <View testID="svg-defs">{children}</View>
    ),
    LinearGradient: ({
      children,
      id,
    }: {
      children?: React.ReactNode;
      id?: string;
    }) => <View testID={`svg-gradient-${id}`}>{children}</View>,
    Stop: () => <View testID="svg-stop" />,
  };
});

jest.mock('d3-shape', () => {
  const makeLineGenerator = () => {
    let xFn: (d: number, i: number) => number = () => 0;
    let yFn: (d: number) => number = () => 0;

    const generator = (data: number[]): string => {
      if (!data || data.length < 2) return '';
      return data.map((d, i) => `${xFn(d, i)},${yFn(d)}`).join(' ');
    };
    generator.x = (fn: (d: number, i: number) => number) => {
      xFn = fn;
      return generator;
    };
    generator.y = (fn: (d: number) => number) => {
      yFn = fn;
      return generator;
    };
    generator.curve = () => generator;
    return generator;
  };

  const makeAreaGenerator = () => {
    let xFn: (d: number, i: number) => number = () => 0;
    let y0Fn: () => number = () => 0;
    let y1Fn: (d: number) => number = () => 0;

    const generator = (data: number[]): string => {
      if (!data || data.length < 2) return '';
      return data.map((d, i) => `${xFn(d, i)},${y0Fn()},${y1Fn(d)}`).join(' ');
    };
    generator.x = (fn: (d: number, i: number) => number) => {
      xFn = fn;
      return generator;
    };
    generator.y0 = (fn: () => number) => {
      y0Fn = fn;
      return generator;
    };
    generator.y1 = (fn: (d: number) => number) => {
      y1Fn = fn;
      return generator;
    };
    generator.curve = () => generator;
    return generator;
  };

  return {
    line: () => makeLineGenerator(),
    area: () => makeAreaGenerator(),
    curveCatmullRom: { alpha: () => 'catmullRomCurve' },
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
        // eslint-disable-next-line @metamask/design-tokens/color-no-hex
        color="#00FF00"
        testID="test-sparkline"
      />,
    );

    expect(screen.getByTestId('test-sparkline')).toBeOnTheScreen();
    const paths = screen.getAllByTestId('svg-path');
    expect(paths.length).toBeGreaterThanOrEqual(1);
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

    expect(screen.getByTestId('svg-defs')).toBeOnTheScreen();
    expect(screen.getByTestId('svg-gradient-test-grad')).toBeOnTheScreen();
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

    expect(screen.queryByTestId('svg-defs')).toBeNull();
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
