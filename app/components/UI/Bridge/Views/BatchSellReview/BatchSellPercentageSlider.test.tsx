import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import {
  BatchSellPercentageSlider,
  SNAP_POINTS,
  snapToPercentageStep,
} from './BatchSellPercentageSlider';

const SLIDER_TEST_ID = 'batch-sell-percentage-slider';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: () => ({}),
  }),
}));

jest.mock('react-native-gesture-handler', () => {
  const { View } = jest.requireActual('react-native');
  const gesture = {
    onEnd: jest.fn().mockReturnThis(),
    onUpdate: jest.fn().mockReturnThis(),
  };

  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: {
      Pan: jest.fn(() => gesture),
      Tap: jest.fn(() => gesture),
      Simultaneous: jest.fn((...gestures) => gestures),
    },
  };
});

describe('BatchSellPercentageSlider', () => {
  it.each([
    [-10, 0],
    [0, 0],
    [12, 0],
    [13, 25],
    [37, 25],
    [38, 50],
    [62, 50],
    [63, 75],
    [87, 75],
    [88, 100],
    [120, 100],
  ])('snaps %s to %s', (value, expectedValue) => {
    const result = snapToPercentageStep(value);

    expect(result).toBe(expectedValue);
  });

  it('increments accessibility value by one snap point', () => {
    const onValueChange = jest.fn();
    const { getByTestId } = render(
      <BatchSellPercentageSlider
        value={50}
        onValueChange={onValueChange}
        testID={SLIDER_TEST_ID}
      />,
    );

    fireEvent(getByTestId(SLIDER_TEST_ID), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });

    expect(onValueChange).toHaveBeenCalledWith(75);
  });

  it('decrements accessibility value by one snap point', () => {
    const onValueChange = jest.fn();
    const { getByTestId } = render(
      <BatchSellPercentageSlider
        value={50}
        onValueChange={onValueChange}
        testID={SLIDER_TEST_ID}
      />,
    );

    fireEvent(getByTestId(SLIDER_TEST_ID), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });

    expect(onValueChange).toHaveBeenCalledWith(25);
  });

  it('renders muted marker dots for each snap point', () => {
    const { getByTestId } = render(
      <BatchSellPercentageSlider
        value={50}
        onValueChange={jest.fn()}
        testID={SLIDER_TEST_ID}
      />,
    );

    SNAP_POINTS.forEach((snapPoint) => {
      expect(
        getByTestId(`${SLIDER_TEST_ID}-snap-point-${snapPoint}`),
      ).toBeOnTheScreen();
    });
  });
});
