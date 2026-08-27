import { renderHook } from '@testing-library/react-hooks';
import { Animated } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import {
  useTransitionToEmpty,
  type TransitionToEmptyAnimations,
} from './useTransitionToEmpty';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    default: {
      ...Reanimated.default,
    },
  };
});

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
        if (callback) callback();
      }),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    parallel: jest.fn(() => ({
      start: jest.fn((callback) => {
        if (callback) callback();
      }),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn((callback) => {
        if (callback) callback();
      }),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    delay: jest.fn(() => ({
      start: jest.fn((callback) => {
        if (callback) callback();
      }),
    })),
  };

  return {
    ...originalRN,
    Animated: MockAnimated,
    Easing: MockEasing,
  };
});

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

  const createSharedValue = (initial: number) =>
    ({ value: initial }) as unknown as SharedValue<number>;

  const carouselHeight = createSharedValue(106);
  const mockAnimations: TransitionToEmptyAnimations = {
    carouselOpacity: new Animated.Value(1),
    emptyCardOpacity: new Animated.Value(1),
    carouselHeight,
    carouselScaleY: new Animated.Value(1),
  };

  it('returns executeTransition function', () => {
    const { result } = renderHook(() => useTransitionToEmpty());

    expect(result.current.executeTransition).toBeInstanceOf(Function);
  });

  it('executes transition with animations', async () => {
    const { result } = renderHook(() => useTransitionToEmpty(mockAnimations));
    const mockCallback = jest.fn();

    const transitionPromise = result.current.executeTransition(mockCallback);

    jest.runAllTimers();
    await Promise.resolve();

    await expect(transitionPromise).resolves.toBeUndefined();
    expect(mockCallback).toHaveBeenCalled();
  });

  it('animates carousel height on the UI thread via Reanimated', async () => {
    const { result } = renderHook(() => useTransitionToEmpty(mockAnimations));
    const mockCallback = jest.fn();

    const transitionPromise = result.current.executeTransition(mockCallback);

    jest.runAllTimers();
    await transitionPromise;

    expect(carouselHeight.value).toBe(0);
    expect(mockCallback).toHaveBeenCalled();
  });

  it('completes transition when height animation is interrupted', async () => {
    const reanimated = jest.requireMock('react-native-reanimated');
    const withTimingSpy = jest
      .spyOn(reanimated, 'withTiming')
      .mockImplementation(((
        toValue: unknown,
        _config: unknown,
        callback?: (finished: boolean) => void,
      ) => {
        callback?.(false);
        return toValue;
      }) as typeof reanimated.withTiming);

    const { result } = renderHook(() => useTransitionToEmpty(mockAnimations));
    const mockCallback = jest.fn();

    const transitionPromise = result.current.executeTransition(mockCallback);

    jest.runAllTimers();
    await transitionPromise;

    expect(mockCallback).toHaveBeenCalled();
    withTimingSpy.mockRestore();
  });

  it('falls back to timeout when no animations provided', async () => {
    const { result } = renderHook(() => useTransitionToEmpty());
    const mockCallback = jest.fn();

    const transitionPromise = result.current.executeTransition(mockCallback);

    // Fast-forward timers to complete the idle timeout
    jest.runAllTimers();

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
