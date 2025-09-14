import { renderHook } from '@testing-library/react-hooks';
import { Animated } from 'react-native';
import { useTransitionToNextCard } from './useTransitionToNextCard';

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
    CARD_EXIT_DURATION: 300,
    CARD_ENTER_DELAY: 100,
    CARD_ENTER_DURATION: 250,
  },
}));

describe('useTransitionToNextCard', () => {
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
  const mockAnimationParams = {
    currentCardOpacity: new Animated.Value(1),
    currentCardScale: new Animated.Value(1),
    currentCardTranslateY: new Animated.Value(0),
    nextCardOpacity: new Animated.Value(0.7),
    nextCardScale: new Animated.Value(0.96),
    nextCardTranslateY: new Animated.Value(8),
    nextCardBgOpacity: new Animated.Value(1),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns executeTransition function', () => {
    const { result } = renderHook(() =>
      useTransitionToNextCard(mockAnimationParams),
    );

    expect(result.current.executeTransition).toBeInstanceOf(Function);
  });

  it('executes transition to next card', async () => {
    // Given - hook is initialized with animation parameters
    const { result } = renderHook(() =>
      useTransitionToNextCard(mockAnimationParams),
    );

    // When - transition to next card is executed
    const transitionPromise = result.current.executeTransition('nextCard');

    // Run all pending timers to complete animations
    jest.runAllTimers();

    // Then - transition completes successfully
    await expect(transitionPromise).resolves.toBeUndefined();
  });

  it('executes transition to empty card', async () => {
    const mockEmptyAnimations = {
      emptyStateOpacity: new Animated.Value(0.7),
      emptyStateScale: new Animated.Value(0.96),
      emptyStateTranslateY: new Animated.Value(8),
    };

    const { result } = renderHook(() =>
      useTransitionToNextCard({
        ...mockAnimationParams,
        ...mockEmptyAnimations,
      }),
    );

    // When - transition to empty card is executed
    const transitionPromise = result.current.executeTransition('emptyCard');

    // Run all pending timers to complete animations
    jest.runAllTimers();

    // Then - transition completes successfully
    await expect(transitionPromise).resolves.toBeUndefined();
  });

  it('provides executeTransition function that accepts target type', () => {
    // Given - hook is initialized with animation parameters
    const { result } = renderHook(() =>
      useTransitionToNextCard(mockAnimationParams),
    );

    // When - executeTransition is called with target type
    const transitionResult = result.current.executeTransition('nextCard');

    // Then - it returns a promise
    expect(transitionResult).toBeInstanceOf(Promise);
  });
});
