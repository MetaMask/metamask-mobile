import { ReduceMotion } from 'react-native-reanimated';

import {
  springboardEnter,
  springboardExit,
} from './TradeWalletActions.animations';

const mockWithSpring = jest.fn<number, [value: number, config?: unknown]>(
  (value) => value,
);
const mockWithTiming = jest.fn<number, [value: number, config?: unknown]>(
  (value) => value,
);
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  withSpring: (value: number, config?: unknown) =>
    mockWithSpring(value, config),
  withTiming: (value: number, config?: unknown) =>
    mockWithTiming(value, config),
}));

describe('springboardEnter', () => {
  beforeEach(() => {
    mockWithSpring.mockClear();
    mockWithTiming.mockClear();
  });

  it('starts the menu small and transparent', () => {
    const animation = springboardEnter();

    expect(animation.initialValues).toEqual({
      opacity: 0,
      transform: [{ scale: 0.78 }],
    });
  });

  it('springs the menu to full size while it fades in', () => {
    springboardEnter();

    expect(mockWithSpring).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        mass: 1,
        stiffness: 322,
        damping: 26,
        overshootClamping: false,
        energyThreshold: 0.001,
      }),
    );
    expect(mockWithTiming).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: 120 }),
    );
  });

  it('drops the zoom but keeps the fade under Reduce Motion', () => {
    springboardEnter();

    expect(mockWithSpring).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ reduceMotion: ReduceMotion.System }),
    );
    expect(mockWithTiming).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ reduceMotion: ReduceMotion.Never }),
    );
  });
});

describe('springboardExit', () => {
  beforeEach(() => {
    mockWithTiming.mockClear();
  });

  it('starts the exit at full size and opacity', () => {
    const animation = springboardExit();

    expect(animation.initialValues).toEqual({
      opacity: 1,
      transform: [{ scale: 1 }],
    });
  });

  it('shrinks and fades the menu with short timings', () => {
    springboardExit();

    expect(mockWithTiming).toHaveBeenCalledWith(
      0,
      expect.objectContaining({
        duration: 110,
        reduceMotion: ReduceMotion.Never,
      }),
    );
    expect(mockWithTiming).toHaveBeenCalledWith(
      0.9,
      expect.objectContaining({
        duration: 120,
        reduceMotion: ReduceMotion.System,
      }),
    );
  });
});
