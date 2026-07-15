import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import {
  BatchSellPercentageSlider,
  clampToPercentage,
  MARKER_POINTS,
} from './BatchSellPercentageSlider';

const SLIDER_TEST_ID = 'batch-sell-percentage-slider';
const GESTURE_AREA_TEST_ID = `${SLIDER_TEST_ID}-gesture-area`;
const SLIDER_WIDTH = 200;

let tapOnEnd: ((event: { x: number }) => void) | undefined;
let panOnUpdate: ((event: { x: number }) => void) | undefined;
let panOnEnd: ((event: { x: number }) => void) | undefined;

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({ styles: {} }),
}));

jest.mock('react-native-gesture-handler', () => {
  const { View } = jest.requireActual('react-native');

  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: {
      Tap: () => ({
        onEnd: (callback: (event: { x: number }) => void) => {
          tapOnEnd = callback;
          return { onEnd: jest.fn() };
        },
      }),
      Pan: () => {
        const panBuilder = {
          onUpdate: (callback: (event: { x: number }) => void) => {
            panOnUpdate = callback;
            return panBuilder;
          },
          onEnd: (callback: (event: { x: number }) => void) => {
            panOnEnd = callback;
            return panBuilder;
          },
        };

        return panBuilder;
      },
      Simultaneous: jest.fn(),
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const ActualReact = jest.requireActual('react') as typeof import('react');
  const Reanimated = jest.requireActual(
    'react-native-reanimated/mock',
  ) as Record<string, unknown>;

  return {
    ...Reanimated,
    runOnJS:
      <Args extends unknown[], Ret>(fn: (...args: Args) => Ret) =>
      (...args: Args) =>
        fn(...args),
    useSharedValue: (initial: number) =>
      ActualReact.useRef({ value: initial }).current,
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
  };
});

function triggerLayout() {
  fireEvent(screen.getByTestId(GESTURE_AREA_TEST_ID), 'layout', {
    nativeEvent: { layout: { width: SLIDER_WIDTH, height: 32, x: 0, y: 0 } },
  });
}

describe('BatchSellPercentageSlider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tapOnEnd = undefined;
    panOnUpdate = undefined;
    panOnEnd = undefined;
  });

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

  it('reports value changes while dragging', () => {
    const onValueChange = jest.fn();
    render(
      <BatchSellPercentageSlider
        value={50}
        onValueChange={onValueChange}
        testID={SLIDER_TEST_ID}
      />,
    );

    triggerLayout();

    act(() => {
      panOnUpdate?.({ x: 150 });
    });

    expect(onValueChange).toHaveBeenCalledWith(75);
  });

  it('commits the final value on drag end', () => {
    const onDragEnd = jest.fn();
    render(
      <BatchSellPercentageSlider
        value={50}
        onValueChange={jest.fn()}
        onDragEnd={onDragEnd}
        testID={SLIDER_TEST_ID}
      />,
    );

    triggerLayout();

    act(() => {
      panOnEnd?.({ x: 150 });
    });

    expect(onDragEnd).toHaveBeenCalledWith(75);
  });

  it('updates and commits on tap', () => {
    const onValueChange = jest.fn();
    const onDragEnd = jest.fn();
    render(
      <BatchSellPercentageSlider
        value={50}
        onValueChange={onValueChange}
        onDragEnd={onDragEnd}
        testID={SLIDER_TEST_ID}
      />,
    );

    triggerLayout();

    act(() => {
      tapOnEnd?.({ x: 150 });
    });

    expect(onValueChange).toHaveBeenCalledWith(75);
    expect(onDragEnd).toHaveBeenCalledWith(75);
  });

  it('increments accessibility value by one percentage point', () => {
    const onValueChange = jest.fn();
    const onDragEnd = jest.fn();
    const { getByTestId } = render(
      <BatchSellPercentageSlider
        value={50}
        onValueChange={onValueChange}
        onDragEnd={onDragEnd}
        testID={SLIDER_TEST_ID}
      />,
    );

    fireEvent(getByTestId(SLIDER_TEST_ID), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });

    expect(onValueChange).toHaveBeenCalledWith(51);
    expect(onDragEnd).toHaveBeenCalledWith(51);
  });

  it('decrements accessibility value by one percentage point', () => {
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

    expect(onValueChange).toHaveBeenCalledWith(49);
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

    expect(onValueChange).not.toHaveBeenCalled();
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
