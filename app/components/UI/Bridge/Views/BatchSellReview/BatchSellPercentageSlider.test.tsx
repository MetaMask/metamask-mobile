import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import {
  BatchSellPercentageSlider,
  clampToPercentage,
  snapToStep,
  MARKER_POINTS,
} from './BatchSellPercentageSlider';

const SLIDER_TEST_ID = 'batch-sell-percentage-slider';

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({ styles: {} }),
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
    [0.4, 0],
    [0.5, 1],
    [12.4, 12],
    [12.5, 13],
    [24.4, 24],
    [24.5, 25],
    [99.4, 99],
    [99.5, 100],
    [120, 100],
  ])('clamps %s to %s', (value, expectedValue) => {
    const result = clampToPercentage(value);

    expect(result).toBe(expectedValue);
  });

  it.each([
    [-10, 0],
    [0, 0],
    [12, 0],
    [12.4, 0],
    [12.5, 25],
    [24, 25],
    [37.4, 25],
    [37.5, 50],
    [50, 50],
    [62.4, 50],
    [62.5, 75],
    [75, 75],
    [87.4, 75],
    [87.5, 100],
    [100, 100],
    [120, 100],
  ])('snaps %s to the nearest step %s', (value, expectedValue) => {
    expect(snapToStep(value)).toBe(expectedValue);
  });

  it('increments accessibility value to the next step', () => {
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

  it('decrements accessibility value to the previous step', () => {
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

  it('does not decrement below 0%', () => {
    const onValueChange = jest.fn();
    const { getByTestId } = render(
      <BatchSellPercentageSlider
        value={0}
        onValueChange={onValueChange}
        testID={SLIDER_TEST_ID}
      />,
    );

    fireEvent(getByTestId(SLIDER_TEST_ID), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });

    expect(onValueChange).toHaveBeenCalledWith(0);
  });

  it('does not increment above 100%', () => {
    const onValueChange = jest.fn();
    const { getByTestId } = render(
      <BatchSellPercentageSlider
        value={100}
        onValueChange={onValueChange}
        testID={SLIDER_TEST_ID}
      />,
    );

    fireEvent(getByTestId(SLIDER_TEST_ID), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });

    expect(onValueChange).toHaveBeenCalledWith(100);
  });

  it('renders muted marker dots for each marker point', () => {
    const { getByTestId } = render(
      <BatchSellPercentageSlider
        value={50}
        onValueChange={jest.fn()}
        testID={SLIDER_TEST_ID}
      />,
    );

    MARKER_POINTS.forEach((markerPoint) => {
      expect(
        getByTestId(`${SLIDER_TEST_ID}-marker-point-${markerPoint}`),
      ).toBeOnTheScreen();
    });
  });
});
