import React from 'react';
import { Text, type LayoutChangeEvent } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import TextShimmer from './TextShimmer';

jest.mock('@react-native-masked-view/masked-view', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockMaskedView({
    children,
    maskElement,
    testID,
  }: {
    children?: React.ReactNode;
    maskElement?: React.ReactNode;
    testID?: string;
  }) {
    return ReactActual.createElement(View, { testID }, maskElement, children);
  };
});

jest.mock('react-native-linear-gradient', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockLinearGradient({
    children,
  }: {
    children?: React.ReactNode;
  }) {
    return ReactActual.createElement(View, null, children);
  };
});

const OVERLAY_TEST_ID = 'apy-shimmer';

const layoutEvent = (width: number) =>
  ({
    nativeEvent: { layout: { width, height: 20, x: 0, y: 0 } },
  }) as LayoutChangeEvent;

type TestInstance = Parameters<typeof fireEvent>[0];

// Fires a `layout` event on the shimmer wrapper (the parent of the text node),
// narrowing away the nullable `parent` without naming a deprecated type.
const fireLayout = (node: TestInstance, width: number) => {
  const wrapper = node.parent;
  if (!wrapper) {
    throw new Error('TextShimmer wrapper not found');
  }
  fireEvent(wrapper, 'layout', layoutEvent(width));
};

describe('TextShimmer', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <TextShimmer>
        <Text>4% APY</Text>
      </TextShimmer>,
    );

    expect(getByText('4% APY')).toBeOnTheScreen();
  });

  it('does not render the shimmer overlay before layout is measured', () => {
    const { queryByTestId } = render(
      <TextShimmer testID={OVERLAY_TEST_ID}>
        <Text testID="label">4% APY</Text>
      </TextShimmer>,
    );

    expect(queryByTestId(OVERLAY_TEST_ID)).toBeNull();
  });

  it('renders the masked shimmer overlay once a non-zero width is measured', () => {
    const { getByTestId, queryByTestId } = render(
      <TextShimmer testID={OVERLAY_TEST_ID}>
        <Text testID="label">4% APY</Text>
      </TextShimmer>,
    );

    fireLayout(getByTestId('label'), 200);

    expect(queryByTestId(OVERLAY_TEST_ID)).toBeOnTheScreen();
  });

  it('keeps the overlay hidden when the measured width is zero', () => {
    const { getByText, queryByTestId } = render(
      <TextShimmer testID={OVERLAY_TEST_ID}>
        <Text>4% APY</Text>
      </TextShimmer>,
    );

    fireLayout(getByText('4% APY'), 0);

    expect(queryByTestId(OVERLAY_TEST_ID)).toBeNull();
  });

  it('accepts custom timing and appearance props without error', () => {
    const { getByTestId, queryByTestId } = render(
      <TextShimmer
        testID={OVERLAY_TEST_ID}
        sweepDurationMs={800}
        pauseDurationMs={6000}
        widthFraction={0.3}
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']}
      >
        <Text testID="label">4% APY</Text>
      </TextShimmer>,
    );

    fireLayout(getByTestId('label'), 120);

    expect(queryByTestId(OVERLAY_TEST_ID)).toBeOnTheScreen();
  });
});
