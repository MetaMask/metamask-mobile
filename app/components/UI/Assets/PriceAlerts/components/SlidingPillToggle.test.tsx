import React from 'react';
import { Animated } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { playSelection } from '../../../../../util/haptics';
import SlidingPillToggle from './SlidingPillToggle';

jest.mock('../../../../../util/haptics', () => ({
  playSelection: jest.fn(),
}));

const mockPlaySelection = playSelection as jest.MockedFunction<
  typeof playSelection
>;

const options = [
  { value: 'left', label: 'Left', testID: 'pill-left' },
  { value: 'right', label: 'Right', testID: 'pill-right' },
] as const;

const onChange = jest.fn();

const baseProps = {
  value: 'left' as const,
  options,
  onChange,
  testID: 'pill-toggle',
  inset: 4,
  containerBorderRadius: 999,
  pillBorderRadius: 999,
  sliderBackgroundColor: 'transparent',
  pillPaddingHorizontal: 12,
  pillPaddingVertical: 8,
};

interface LayoutEvent {
  nativeEvent: {
    layout: { x: number; y: number; width: number; height: number };
  };
}

interface SpringConfig {
  toValue: number;
  useNativeDriver: boolean;
  tension: number;
  friction: number;
}

const layoutEvent = (width: number): LayoutEvent => ({
  nativeEvent: { layout: { x: 0, y: 0, width, height: 32 } },
});

const springConfig = (toValue: number): SpringConfig => ({
  toValue,
  useNativeDriver: true,
  tension: 180,
  friction: 20,
});

describe('SlidingPillToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders each option', () => {
    const screen = render(<SlidingPillToggle {...baseProps} />);

    expect(screen.getByTestId('pill-toggle')).toBeOnTheScreen();
    expect(screen.getByTestId('pill-left')).toBeOnTheScreen();
    expect(screen.getByTestId('pill-right')).toBeOnTheScreen();
  });

  it('marks only the selected option in accessibility state', () => {
    const screen = render(<SlidingPillToggle {...baseProps} value="right" />);

    expect(
      screen.getByTestId('pill-left').props.accessibilityState?.selected,
    ).toBe(false);
    expect(
      screen.getByTestId('pill-right').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('pill-right').props.accessibilityState?.disabled,
    ).toBe(false);
  });

  it('calls onChange and plays a haptic when a different option is pressed', () => {
    const screen = render(<SlidingPillToggle {...baseProps} />);

    fireEvent.press(screen.getByTestId('pill-right'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('right');
    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
  });

  it('ignores a press on the selected option', () => {
    const screen = render(<SlidingPillToggle {...baseProps} />);

    fireEvent.press(screen.getByTestId('pill-left'));

    expect(onChange).not.toHaveBeenCalled();
    expect(mockPlaySelection).not.toHaveBeenCalled();
  });

  it('ignores presses while disabled', () => {
    const screen = render(<SlidingPillToggle {...baseProps} isDisabled />);

    fireEvent.press(screen.getByTestId('pill-right'));

    expect(onChange).not.toHaveBeenCalled();
    expect(mockPlaySelection).not.toHaveBeenCalled();
    expect(
      screen.getByTestId('pill-right').props.accessibilityState?.disabled,
    ).toBe(true);
    expect(
      screen.getByTestId('pill-left').props.accessibilityState?.disabled,
    ).toBe(true);
  });

  it('springs one stable animated value to the selected pill width', () => {
    const spring = jest.spyOn(Animated, 'spring').mockImplementation(
      () =>
        ({
          start: jest.fn(),
          stop: jest.fn(),
          reset: jest.fn(),
        }) as unknown as Animated.CompositeAnimation,
    );
    const screen = render(<SlidingPillToggle {...baseProps} />);

    expect(spring).not.toHaveBeenCalled();

    fireEvent(screen.getByTestId('pill-left'), 'layout', layoutEvent(80));
    fireEvent(screen.getByTestId('pill-right'), 'layout', layoutEvent(120));

    const animatedValue = spring.mock.calls[0]?.[0];

    expect(spring.mock.calls.at(-1)?.[0]).toBe(animatedValue);
    expect(spring.mock.calls.at(-1)?.[1]).toStrictEqual(springConfig(0));

    screen.rerender(<SlidingPillToggle {...baseProps} value="right" />);

    expect(spring.mock.calls.at(-1)?.[0]).toBe(animatedValue);
    expect(spring.mock.calls.at(-1)?.[1]).toStrictEqual(springConfig(120));

    spring.mockRestore();
  });
});
