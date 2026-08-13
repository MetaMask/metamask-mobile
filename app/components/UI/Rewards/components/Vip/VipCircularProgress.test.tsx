import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import VipCircularProgress from './VipCircularProgress';

const mockTwColor = jest.fn(
  (name: string) =>
    (name === 'success-default' ? 'rgb(0,200,80)' : 'rgb(220,220,220)') as
      | string
      | undefined,
);

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...args: unknown[]) => args,
    color: (name: string) => mockTwColor(name),
  }),
}));

jest.mock('react-native-svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View: ReactNativeView } = jest.requireActual('react-native');
  const Stub = (props: { testID?: string }) =>
    ReactActual.createElement(ReactNativeView, props);
  return {
    __esModule: true,
    default: Stub,
    Svg: Stub,
    Circle: Stub,
  };
});

const RADIAL_SIZE = 96;
const STROKE_WIDTH = 8;
const RADIUS = (RADIAL_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

describe('VipCircularProgress', () => {
  beforeEach(() => {
    mockTwColor.mockImplementation((name: string) =>
      name === 'success-default' ? 'rgb(0,200,80)' : 'rgb(220,220,220)',
    );
  });

  it('clamps progress to a full circle when percent exceeds 100', () => {
    const { getByTestId } = render(
      <VipCircularProgress
        percent={128.6}
        progressTestID="vip-radial-progress"
      />,
    );

    expect(getByTestId('vip-radial-progress').props.strokeDashoffset).toBe(0);
  });

  it('clamps progress to an empty circle when percent is below 0', () => {
    const { getByTestId } = render(
      <VipCircularProgress
        percent={-10}
        progressTestID="vip-radial-progress"
      />,
    );

    expect(getByTestId('vip-radial-progress').props.strokeDashoffset).toBe(
      CIRCUMFERENCE,
    );
  });

  it('renders children in the label wrapper', () => {
    const { getByTestId, getByText } = render(
      <VipCircularProgress percent={50} labelTestID="vip-radial-label">
        <Text>5.56M</Text>
        <Text>/7.78M</Text>
      </VipCircularProgress>,
    );

    const radialLabel = getByTestId('vip-radial-label');
    expect(radialLabel).toBeOnTheScreen();
    expect(getByText('5.56M')).toBeOnTheScreen();
    expect(getByText('/7.78M')).toBeOnTheScreen();
  });
});
