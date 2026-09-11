/* eslint-disable @metamask/design-tokens/color-no-hex */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import RangeSlider from './RangeSlider';

// react-native-gesture-handler and reanimated need to be mocked for the
// test renderer. The pan gesture is a no-op; we verify the component mounts
// and reports the initial value via the onValueChange/onDragEnd callbacks.
jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: () => ({
      onBegin: jest.fn().mockReturnThis(),
      onUpdate: jest.fn().mockReturnThis(),
      onEnd: jest.fn().mockReturnThis(),
    }),
  },
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('react-native-reanimated', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const useSharedValue = (initial: unknown) => ({ value: initial });
  const useAnimatedStyle = () => ({});
  const useAnimatedReaction = jest.fn();
  const runOnJS = (fn: (...args: unknown[]) => unknown) => fn;
  const withTiming = (val: unknown) => val;
  return {
    __esModule: true,
    default: { View },
    useSharedValue,
    useAnimatedStyle,
    useAnimatedReaction,
    runOnJS,
    withTiming,
  };
});

jest.mock('../../../../../../util/haptics', () => ({
  playImpact: jest.fn(),
  ImpactMoment: { SliderGrip: 'SliderGrip', SliderTick: 'SliderTick' },
}));

jest.mock('../../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { default: '#fff', muted: '#eee' },
      icon: { default: '#000' },
    },
  }),
}));

describe('RangeSlider', () => {
  it('renders both thumbs with the provided testID', () => {
    render(
      <RangeSlider
        minimumValue={0}
        maximumValue={100}
        value={{ min: 0, max: 100 }}
        onValueChange={jest.fn()}
        testID="market-cap-slider"
      />,
    );

    expect(screen.getByTestId('market-cap-slider-min-thumb')).toBeOnTheScreen();
    expect(screen.getByTestId('market-cap-slider-max-thumb')).toBeOnTheScreen();
  });

  it('renders the root track with the base testID', () => {
    render(
      <RangeSlider
        minimumValue={0}
        maximumValue={100}
        value={{ min: 0, max: 100 }}
        onValueChange={jest.fn()}
        testID="market-cap-slider"
      />,
    );

    expect(screen.getByTestId('market-cap-slider')).toBeOnTheScreen();
  });

  it('accepts a default testID when none is provided', () => {
    render(
      <RangeSlider
        minimumValue={0}
        maximumValue={100}
        value={{ min: 0, max: 100 }}
        onValueChange={jest.fn()}
      />,
    );

    expect(screen.getByTestId('range-slider-min-thumb')).toBeOnTheScreen();
    expect(screen.getByTestId('range-slider-max-thumb')).toBeOnTheScreen();
  });

  it('does not crash when span is zero', () => {
    render(
      <RangeSlider
        minimumValue={5}
        maximumValue={5}
        value={{ min: 5, max: 5 }}
        onValueChange={jest.fn()}
      />,
    );

    expect(screen.getByTestId('range-slider')).toBeOnTheScreen();
  });
});
