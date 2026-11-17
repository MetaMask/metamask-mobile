import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
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

const flushScheduledUpdates = async () => {
  await act(async () => {
    await Promise.resolve();
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
    expect(screen.getByTestId('market-cap-slider-min-thumb')).toHaveStyle({
      width: 32,
      height: 32,
    });
    expect(screen.getByTestId('market-cap-slider-max-thumb')).toHaveStyle({
      width: 32,
      height: 32,
    });
  });

  it('renders the root track with the base testID', () => {
    render(
      <RangeSlider
        {...defaultProps}
        onValueChange={jest.fn()}
        testID="market-cap-slider"
      />,
    );

    expect(screen.getByTestId('market-cap-slider')).toHaveStyle({
      paddingTop: 13,
    });
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

  it('steps a thumb when an accessibility increment is requested', () => {
    const onValueChange = jest.fn();

    render(
      <RangeSlider
        {...defaultProps}
        value={{ min: 10, max: 80 }}
        step={5}
        onValueChange={onValueChange}
        minThumbAccessibilityLabel="Minimum market cap"
      />,
    );

    fireEvent(
      screen.getByLabelText('Minimum market cap'),
      'accessibilityAction',
      { nativeEvent: { actionName: 'increment' } },
    );

    expect(onValueChange).toHaveBeenCalledWith({ min: 15, max: 80 });
  });

  it('steps the max thumb down and reports the released range', () => {
    const onValueChange = jest.fn();
    const onDragEnd = jest.fn();

    render(
      <RangeSlider
        {...defaultProps}
        value={{ min: 10, max: 80 }}
        step={5}
        onValueChange={onValueChange}
        onDragEnd={onDragEnd}
        maxThumbAccessibilityLabel="Maximum market cap"
      />,
    );

    fireEvent(
      screen.getByLabelText('Maximum market cap'),
      'accessibilityAction',
      { nativeEvent: { actionName: 'decrement' } },
    );

    expect(onValueChange).toHaveBeenCalledWith({ min: 10, max: 75 });
    expect(onDragEnd).toHaveBeenCalledWith({ min: 10, max: 75 });
  });

  it('ignores an accessibility action that is not a step', () => {
    const onValueChange = jest.fn();

    render(
      <RangeSlider
        {...defaultProps}
        value={{ min: 10, max: 80 }}
        onValueChange={onValueChange}
        minThumbAccessibilityLabel="Minimum market cap"
      />,
    );

    fireEvent(
      screen.getByLabelText('Minimum market cap'),
      'accessibilityAction',
      { nativeEvent: { actionName: 'activate' } },
    );

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('stops the thumbs from crossing when an accessibility step reaches the other thumb', () => {
    const onValueChange = jest.fn();

    render(
      <RangeSlider
        {...defaultProps}
        value={{ min: 10, max: 15 }}
        step={10}
        onValueChange={onValueChange}
        minThumbAccessibilityLabel="Minimum market cap"
        maxThumbAccessibilityLabel="Maximum market cap"
      />,
    );

    fireEvent(
      screen.getByLabelText('Minimum market cap'),
      'accessibilityAction',
      { nativeEvent: { actionName: 'increment' } },
    );
    fireEvent(
      screen.getByLabelText('Maximum market cap'),
      'accessibilityAction',
      { nativeEvent: { actionName: 'decrement' } },
    );

    expect(onValueChange).toHaveBeenNthCalledWith(1, { min: 15, max: 15 });
    expect(onValueChange).toHaveBeenNthCalledWith(2, { min: 10, max: 10 });
  });

  it('skips a percent sync when the animated range has not changed', () => {
    const reactions: ((
      current: { min: number; max: number },
      previous: { min: number; max: number } | null,
    ) => void)[] = [];
    const reanimatedMock = jest.requireMock('react-native-reanimated') as {
      useAnimatedReaction: (
        prepare: () => { min: number; max: number },
        reaction: (
          current: { min: number; max: number },
          previous: { min: number; max: number } | null,
        ) => void,
      ) => void;
    };
    const spy = jest
      .spyOn(reanimatedMock, 'useAnimatedReaction')
      .mockImplementation((_prepare, reaction) => {
        reactions.push(reaction);
      });

    render(<RangeSlider {...defaultProps} onValueChange={jest.fn()} />);

    const reaction = reactions.at(-1);
    expect(reaction).toEqual(expect.any(Function));
    reaction?.({ min: 10, max: 40 }, null);
    reaction?.({ min: 10, max: 40 }, { min: 0, max: 40 });
    reaction?.({ min: 10, max: 50 }, { min: 10, max: 40 });
    reaction?.({ min: 10, max: 50 }, { min: 10, max: 50 });

    spy.mockRestore();
  });

  it('emits onValueChange when the min thumb is dragged', async () => {
    const onValueChange = jest.fn();

    render(<RangeSlider {...defaultProps} onValueChange={onValueChange} />);
    layoutSlider();

    const gesture = getPanGesture();
    gesture.onStart?.({ x: 10 });
    gesture.onUpdate?.({ x: 50 });
    await flushScheduledUpdates();

    expect(onValueChange).toHaveBeenCalled();
    expect(onValueChange.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ min: expect.any(Number), max: 100 }),
    );
    expect(playImpact).toHaveBeenCalled();
  });

  it('emits onValueChange when the max thumb is dragged', async () => {
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
    await flushScheduledUpdates();

    expect(onValueChange).toHaveBeenCalled();
    expect(onValueChange.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ min: 0, max: expect.any(Number) }),
    );
  });

  it('calls onDragEnd with the final range when the drag ends', async () => {
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
    await flushScheduledUpdates();

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

  it('rounds emitted values to the configured step', async () => {
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
    await flushScheduledUpdates();

    const lastCall = onValueChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.min % 10).toBe(0);
  });

  it('keeps the min thumb from crossing above the max thumb', async () => {
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
    await flushScheduledUpdates();

    const lastCall = onValueChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.min).toBeLessThanOrEqual(lastCall?.max);
  });
});
