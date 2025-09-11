import { renderHook } from '@testing-library/react-hooks';
import { Animated } from 'react-native';
import { useTransitionToNextCard } from './useTransitionToNextCard';

// Mock Animated and Easing
jest.mock('react-native', () => {
  const MockEasing = {
    out: jest.fn((fn) => fn),
    cubic: jest.fn(),
    bezier: jest.fn(() => jest.fn()),
  };

  return {
    Animated: {
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeAllListeners: jest.fn(),
      })),
      timing: jest.fn(() => ({
        start: jest.fn((callback) => callback?.()),
      })),
      parallel: jest.fn(() => ({
        start: jest.fn((callback) => callback?.()),
      })),
      sequence: jest.fn(() => ({
        start: jest.fn((callback) => callback?.()),
      })),
      delay: jest.fn(),
    },
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
    const { result } = renderHook(() =>
      useTransitionToNextCard(mockAnimationParams),
    );

    const transitionPromise = result.current.executeTransition('nextCard');

    expect(Animated.parallel).toHaveBeenCalled();
    expect(Animated.timing).toHaveBeenCalled();

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

    const transitionPromise = result.current.executeTransition('emptyCard');

    expect(Animated.parallel).toHaveBeenCalled();
    await expect(transitionPromise).resolves.toBeUndefined();
  });

  it('handles animation completion', async () => {
    const mockStart = jest.fn((callback) => {
      setTimeout(callback, 0);
    });

    (Animated.parallel as jest.Mock).mockReturnValue({
      start: mockStart,
    });

    const { result } = renderHook(() =>
      useTransitionToNextCard(mockAnimationParams),
    );

    const transitionPromise = result.current.executeTransition('nextCard');

    await expect(transitionPromise).resolves.toBeUndefined();
    expect(mockStart).toHaveBeenCalled();
  });
});
