/* eslint-disable @metamask/design-tokens/color-no-hex */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { playImpact } from '../../../../../../util/haptics';
import RangeSlider from './RangeSlider';

type PanHandler = (event?: { x: number }) => void;

interface CapturedPanGesture {
  onStart?: PanHandler;
  onUpdate?: PanHandler;
  onEnd?: PanHandler;
  onFinalize?: PanHandler;
}

const createChainableGesture = (): Record<string, unknown> => {
  const api: Record<string, unknown> = {};
  const returnApi = () => api;
  const capture = (name: keyof CapturedPanGesture) => {
    api[name] = jest.fn((handler: PanHandler) => {
      api[name] = handler;
      return api;
    });
  };

  capture('onStart');
  capture('onUpdate');
  capture('onEnd');
  capture('onFinalize');

  [
    'enabled',
    'onBegin',
    'activeOffsetX',
    'failOffsetY',
    'hitSlop',
    'minDistance',
    'maxPointers',
  ].forEach((method) => {
    api[method] = jest.fn(returnApi);
  });

  return api;
};

jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: jest.fn(() => createChainableGesture()),
  },
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return Reanimated;
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

const defaultProps = {
  minimumValue: 0,
  maximumValue: 100,
  value: { min: 0, max: 100 },
  onValueChange: jest.fn(),
};

const layoutSlider = (testID = 'range-slider', width = 200) => {
  fireEvent(screen.getByTestId(testID), 'layout', {
    nativeEvent: { layout: { width, height: 40, x: 0, y: 0 } },
  });
};

const getPanGesture = (): CapturedPanGesture => {
  const panFactory = jest.requireMock('react-native-gesture-handler').Gesture
    .Pan as jest.Mock;
  return panFactory.mock.results[panFactory.mock.results.length - 1]
    .value as CapturedPanGesture;
};

describe('RangeSlider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders both thumbs with the provided testID', () => {
    render(
      <RangeSlider
        {...defaultProps}
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
        {...defaultProps}
        onValueChange={jest.fn()}
        testID="market-cap-slider"
      />,
    );

    expect(screen.getByTestId('market-cap-slider')).toBeOnTheScreen();
  });

  it('accepts a default testID when none is provided', () => {
    render(<RangeSlider {...defaultProps} onValueChange={jest.fn()} />);

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

  it('applies thumb accessibility labels when provided', () => {
    render(
      <RangeSlider
        {...defaultProps}
        onValueChange={jest.fn()}
        minThumbAccessibilityLabel="Minimum market cap"
        maxThumbAccessibilityLabel="Maximum market cap"
      />,
    );

    expect(screen.getByLabelText('Minimum market cap')).toBeOnTheScreen();
    expect(screen.getByLabelText('Maximum market cap')).toBeOnTheScreen();
  });

  it('emits onValueChange when the min thumb is dragged', () => {
    const onValueChange = jest.fn();

    render(<RangeSlider {...defaultProps} onValueChange={onValueChange} />);
    layoutSlider();

    const gesture = getPanGesture();
    gesture.onStart?.({ x: 10 });
    gesture.onUpdate?.({ x: 50 });

    expect(onValueChange).toHaveBeenCalled();
    expect(onValueChange.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ min: expect.any(Number), max: 100 }),
    );
    expect(playImpact).toHaveBeenCalled();
  });

  it('emits onValueChange when the max thumb is dragged', () => {
    const onValueChange = jest.fn();

    render(
      <RangeSlider
        {...defaultProps}
        value={{ min: 0, max: 100 }}
        onValueChange={onValueChange}
      />,
    );
    layoutSlider();

    const gesture = getPanGesture();
    gesture.onStart?.({ x: 190 });
    gesture.onUpdate?.({ x: 150 });

    expect(onValueChange).toHaveBeenCalled();
    expect(onValueChange.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ min: 0, max: expect.any(Number) }),
    );
  });

  it('calls onDragEnd with the final range when the drag ends', () => {
    const onDragEnd = jest.fn();

    render(
      <RangeSlider
        {...defaultProps}
        onValueChange={jest.fn()}
        onDragEnd={onDragEnd}
      />,
    );
    layoutSlider();

    const gesture = getPanGesture();
    gesture.onStart?.({ x: 10 });
    gesture.onUpdate?.({ x: 40 });
    gesture.onEnd?.();
    gesture.onFinalize?.();

    expect(onDragEnd).toHaveBeenCalledWith(
      expect.objectContaining({ min: expect.any(Number), max: 100 }),
    );
  });

  it('ignores drag updates before layout provides a track width', () => {
    const onValueChange = jest.fn();

    render(<RangeSlider {...defaultProps} onValueChange={onValueChange} />);

    const gesture = getPanGesture();
    gesture.onStart?.({ x: 10 });
    gesture.onUpdate?.({ x: 50 });

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('syncs thumb positions when the controlled value prop changes', () => {
    const onValueChange = jest.fn();
    const { rerender } = render(
      <RangeSlider
        {...defaultProps}
        value={{ min: 0, max: 100 }}
        onValueChange={onValueChange}
      />,
    );
    layoutSlider();

    rerender(
      <RangeSlider
        {...defaultProps}
        value={{ min: 25, max: 75 }}
        onValueChange={onValueChange}
      />,
    );

    expect(screen.getByTestId('range-slider-min-thumb')).toBeOnTheScreen();
    expect(screen.getByTestId('range-slider-max-thumb')).toBeOnTheScreen();
  });

  it('rounds emitted values to the configured step', () => {
    const onValueChange = jest.fn();

    render(
      <RangeSlider
        minimumValue={0}
        maximumValue={100}
        step={10}
        value={{ min: 0, max: 100 }}
        onValueChange={onValueChange}
      />,
    );
    layoutSlider();

    const gesture = getPanGesture();
    gesture.onStart?.({ x: 10 });
    gesture.onUpdate?.({ x: 55 });

    const lastCall = onValueChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.min % 10).toBe(0);
  });

  it('keeps the min thumb from crossing above the max thumb', () => {
    const onValueChange = jest.fn();

    render(
      <RangeSlider
        {...defaultProps}
        value={{ min: 20, max: 80 }}
        onValueChange={onValueChange}
      />,
    );
    layoutSlider();

    const gesture = getPanGesture();
    gesture.onStart?.({ x: 40 });
    gesture.onUpdate?.({ x: 190 });

    const lastCall = onValueChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.min).toBeLessThanOrEqual(lastCall?.max);
  });
});
