import { renderHook } from '@testing-library/react-hooks';
import { Animated } from 'react-native';
import { useTransitionToEmpty } from './useTransitionToEmpty';

// Use fake timers to prevent environment teardown issues
jest.useFakeTimers();

// Mock Animated and Easing to prevent teardown issues
jest.mock('react-native', () => {
  const originalRN = jest.requireActual('react-native');

  const MockEasing = {
    out: jest.fn((fn) => fn),
    cubic: jest.fn(),
    bezier: jest.fn(() => jest.fn()),
    linear: jest.fn(),
    ease: jest.fn(),
    quad: jest.fn(),
    circle: jest.fn(),
  };

  const MockAnimated = {
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      addListener: jest.fn(() => 'listener-id'),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      stopAnimation: jest.fn(),
      resetAnimation: jest.fn(),
    })),
    timing: jest.fn(() => ({
      start: jest.fn((callback) => {
        // Use process.nextTick for immediate completion
        if (callback) process.nextTick(callback);
      }),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    parallel: jest.fn(() => ({
      start: jest.fn((callback) => {
        // Simulate parallel completion
        if (callback) process.nextTick(callback);
      }),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn((callback) => {
        // Simulate sequence completion
        if (callback) process.nextTick(callback);
      }),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    delay: jest.fn(() => ({
      start: jest.fn((callback) => {
        if (callback) process.nextTick(callback);
      }),
    })),
  };

  return {
    ...originalRN,
    Animated: MockAnimated,
    Easing: MockEasing,
  };
});

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
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  const mockAnimations = {
    carouselOpacity: new Animated.Value(1),
    emptyCardOpacity: new Animated.Value(1),
    carouselHeight: new Animated.Value(106),
    carouselScaleY: new Animated.Value(1),
  };

  it('returns executeTransition function', () => {
    const { result } = renderHook(() => useTransitionToEmpty());

    expect(result.current.executeTransition).toBeInstanceOf(Function);
  });

  it('executes transition with animations', async () => {
    // Given - animations and callback are provided
    const { result } = renderHook(() => useTransitionToEmpty(mockAnimations));
    const mockCallback = jest.fn();

    // When - transition is executed
    const transitionPromise = result.current.executeTransition(mockCallback);

    // Run all pending timers to complete animations
    jest.runAllTimers();

    // Then - transition completes and callback is called
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

  it('provides executeTransition function that accepts callback', () => {
    // Given - hook is initialized with animations
    const { result } = renderHook(() => useTransitionToEmpty(mockAnimations));

    // When - executeTransition is called
    const mockCallback = jest.fn();
    const transitionResult = result.current.executeTransition(mockCallback);

    // Then - it returns a promise
    expect(transitionResult).toBeInstanceOf(Promise);
  });
});
