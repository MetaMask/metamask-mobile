import { renderHook, act } from '@testing-library/react-native';
import { useBridgeRewardsAnimation } from './useBridgeRewardsAnimation';
import { BridgeRewardAnimationState } from './types';

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return Reanimated;
});

// Mock Rive
jest.mock('rive-react-native', () => ({
  Alignment: { CenterRight: 'CenterRight' },
  Fit: { FitHeight: 'FitHeight' },
}));

// Mock strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    if (key === 'rewards.animation.could_not_load') {
      return "Couldn't Load";
    }
    return key;
  }),
}));

describe('useBridgeRewardsAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('initializes with default values', () => {
      const { result } = renderHook(() =>
        useBridgeRewardsAnimation({
          value: 0,
        }),
      );

      expect(result.current.displayValue).toBe(0);
      expect(result.current.displayText).toBeNull();
      expect(result.current.hideValue).toBe(false);
      expect(result.current.iconPosition).toBe(-20);
      expect(result.current.riveRef).toBeDefined();
    });

    it('initializes with custom value', () => {
      const { result } = renderHook(() =>
        useBridgeRewardsAnimation({
          value: 100,
        }),
      );

      expect(result.current.displayValue).toBe(0);
      expect(result.current.iconPosition).toBe(-20);
    });
  });

  describe('State Prop', () => {
    it('accepts Loading state', () => {
      const { result } = renderHook(() =>
        useBridgeRewardsAnimation({
          value: 100,
          state: BridgeRewardAnimationState.Loading,
        }),
      );

      expect(result.current).toBeDefined();
    });

    it('accepts Idle state', () => {
      const { result } = renderHook(() =>
        useBridgeRewardsAnimation({
          value: 100,
          state: BridgeRewardAnimationState.Idle,
        }),
      );

      expect(result.current).toBeDefined();
    });

    it('accepts ErrorState', () => {
      const { result } = renderHook(() =>
        useBridgeRewardsAnimation({
          value: 100,
          state: BridgeRewardAnimationState.ErrorState,
        }),
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('Return Values', () => {
    it('returns riveRef', () => {
      const { result } = renderHook(() =>
        useBridgeRewardsAnimation({ value: 100 }),
      );

      expect(result.current.riveRef).toBeDefined();
      expect(result.current.riveRef.current).toBeDefined();
    });

    it('returns animatedStyle', () => {
      const { result } = renderHook(() =>
        useBridgeRewardsAnimation({ value: 100 }),
      );

      expect(result.current.animatedStyle).toBeDefined();
    });

    it('returns numeric iconPosition', () => {
      const { result } = renderHook(() =>
        useBridgeRewardsAnimation({ value: 100 }),
      );

      expect(typeof result.current.iconPosition).toBe('number');
    });

    it('returns numeric displayValue', () => {
      const { result } = renderHook(() =>
        useBridgeRewardsAnimation({ value: 100 }),
      );

      expect(typeof result.current.displayValue).toBe('number');
    });

    it('returns displayText as string or null', () => {
      const { result } = renderHook(() =>
        useBridgeRewardsAnimation({ value: 100 }),
      );

      const { displayText } = result.current;
      expect(displayText === null || typeof displayText === 'string').toBe(
        true,
      );
    });

    it('returns hideValue as boolean', () => {
      const { result } = renderHook(() =>
        useBridgeRewardsAnimation({ value: 100 }),
      );

      expect(typeof result.current.hideValue).toBe('boolean');
    });
  });

  describe('Value Changes', () => {
    it('handles value updates', () => {
      const { rerender } = renderHook(
        ({ value }) => useBridgeRewardsAnimation({ value }),
        { initialProps: { value: 50 } },
      );

      act(() => {
        rerender({ value: 100 });
      });

      // No errors thrown
      expect(true).toBe(true);
    });

    it('handles zero value', () => {
      const { result } = renderHook(() =>
        useBridgeRewardsAnimation({
          value: 0,
          state: BridgeRewardAnimationState.Idle,
        }),
      );

      expect(result.current.displayValue).toBe(0);
    });

    it('handles large values', () => {
      const { result } = renderHook(() =>
        useBridgeRewardsAnimation({
          value: 999999,
        }),
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('State Transitions', () => {
    it('handles state changes', () => {
      const { rerender } = renderHook(
        ({ state }) =>
          useBridgeRewardsAnimation({
            value: 100,
            state,
          }),
        {
          initialProps: { state: BridgeRewardAnimationState.Loading },
        },
      );

      act(() => {
        rerender({ state: BridgeRewardAnimationState.Idle });
      });

      // No errors thrown
      expect(true).toBe(true);
    });

    it('handles unmount without errors', () => {
      const { unmount } = renderHook(() =>
        useBridgeRewardsAnimation({
          value: 100,
          state: BridgeRewardAnimationState.Loading,
        }),
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});
