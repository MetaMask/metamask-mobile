import { renderHook } from '@testing-library/react-hooks';
import { Animated } from 'react-native';
import { useTransitionToEmpty } from './useTransitionToEmpty';

// Mock Animated
jest.mock('react-native', () => ({
  Animated: {
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      addListener: jest.fn(),
      removeAllListeners: jest.fn(),
    })),
    timing: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    parallel: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    delay: jest.fn(),
  },
}));

jest.mock('./animationTimings', () => ({
  ANIMATION_TIMINGS: {
    EMPTY_STATE_IDLE_TIME: 500,
    EMPTY_STATE_FADE_DURATION: 200,
    EMPTY_STATE_FOLD_DELAY: 50,
    EMPTY_STATE_FOLD_DURATION: 200,
    EMPTY_STATE_HEIGHT_DURATION: 300,
  },
}));

describe('useTransitionToEmpty', () => {
  const mockAnimations = {
    carouselOpacity: new Animated.Value(1),
    emptyCardOpacity: new Animated.Value(1),
    carouselHeight: new Animated.Value(106),
    carouselScaleY: new Animated.Value(1),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns executeTransition function', () => {
    const { result } = renderHook(() => useTransitionToEmpty());

    expect(result.current.executeTransition).toBeInstanceOf(Function);
  });

  it('executes transition with animations', async () => {
    const { result } = renderHook(() => useTransitionToEmpty(mockAnimations));
    const mockCallback = jest.fn();

    const transitionPromise = result.current.executeTransition(mockCallback);

    expect(Animated.parallel).toHaveBeenCalled();
    expect(Animated.timing).toHaveBeenCalled();

    await expect(transitionPromise).resolves.toBeUndefined();
    expect(mockCallback).toHaveBeenCalled();
  });

  it('falls back to timeout when no animations provided', async () => {
    const { result } = renderHook(() => useTransitionToEmpty());
    const mockCallback = jest.fn();

    const transitionPromise = result.current.executeTransition(mockCallback);

    // Fast-forward timers
    jest.advanceTimersByTime(500);

    await expect(transitionPromise).resolves.toBeUndefined();
    expect(mockCallback).toHaveBeenCalled();
  });

  it('uses correct animation durations', () => {
    const { result } = renderHook(() => useTransitionToEmpty(mockAnimations));
    const mockCallback = jest.fn();

    result.current.executeTransition(mockCallback);

    // Check that animations are called with correct durations
    expect(Animated.timing).toHaveBeenCalledWith(
      mockAnimations.emptyCardOpacity,
      expect.objectContaining({ duration: 200 }),
    );
    expect(Animated.timing).toHaveBeenCalledWith(
      mockAnimations.carouselHeight,
      expect.objectContaining({ duration: 300 }),
    );
  });
});
