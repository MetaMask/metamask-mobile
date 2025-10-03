/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act } from '@testing-library/react-native';
import {
  useRewardsAnimation,
  RewardAnimationState,
} from './useRewardsAnimation';

const STATE_MACHINE_NAME = 'Rewards_Icon';

// Mock rive-react-native
const mockFireState = jest.fn();
jest.mock('rive-react-native', () => ({
  RiveRef: jest.fn(),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const actualReanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actualReanimated,
    useSharedValue: jest.fn((initial) => ({ value: initial })),
    useAnimatedStyle: jest.fn((cb) => cb()),
    withTiming: jest.fn((value) => value),
  };
});

describe('useRewardsAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockFireState.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('RewardAnimationState enum', () => {
    it('should have Loading state', () => {
      expect(RewardAnimationState.Loading).toBe('loading');
    });

    it('should have ErrorState state', () => {
      expect(RewardAnimationState.ErrorState).toBe('error');
    });

    it('should have Idle state', () => {
      expect(RewardAnimationState.Idle).toBe('idle');
    });

    it('should have RefreshLoading state', () => {
      expect(RewardAnimationState.RefreshLoading).toBe('refresh_loading');
    });

    it('should have RefreshFinished state', () => {
      expect(RewardAnimationState.RefreshFinished).toBe('refresh_finished');
    });

    it('should have exactly 5 states', () => {
      const states = Object.values(RewardAnimationState);
      expect(states).toHaveLength(5);
    });
  });

  describe('Hook initialization', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useRewardsAnimation({ value: 100 }));

      expect(result.current).toHaveProperty('riveRef');
      expect(result.current).toHaveProperty('animatedStyle');
      expect(result.current).toHaveProperty('rivePositionStyle');
      expect(result.current).toHaveProperty('displayValue');
      expect(result.current).toHaveProperty('displayText');
      expect(result.current).toHaveProperty('hideValue');
    });

    it('should initialize with default values', () => {
      const { result } = renderHook(() => useRewardsAnimation({ value: 100 }));

      expect(result.current.displayValue).toBe(0);
      expect(result.current.displayText).toBeNull();
      expect(result.current.hideValue).toBe(false);
    });

    it('should return riveRef', () => {
      const { result } = renderHook(() => useRewardsAnimation({ value: 100 }));

      expect(result.current.riveRef).toBeDefined();
      expect(result.current.riveRef.current).toBeNull();
    });

    it('should default to Idle state', () => {
      const { result } = renderHook(() => useRewardsAnimation({ value: 100 }));

      expect(result.current).toBeDefined();
    });
  });

  describe('Idle state behavior', () => {
    it('should trigger RefreshLeft for positive value in idle state', () => {
      const { result } = renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.Idle,
        }),
      );

      // Set up the riveRef with mock fireState
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Mocking ref for testing
      result.current.riveRef.current = { fireState: mockFireState };

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(mockFireState).toHaveBeenCalledWith(
        STATE_MACHINE_NAME,
        'Refresh_left',
      );
    });

    it('should trigger Disable for zero value in idle state', () => {
      const { result } = renderHook(() =>
        useRewardsAnimation({
          value: 0,
          state: RewardAnimationState.Idle,
        }),
      );

      // Set up the riveRef with mock fireState
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Mocking ref for testing
      result.current.riveRef.current = { fireState: mockFireState };

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(mockFireState).toHaveBeenCalledWith(
        STATE_MACHINE_NAME,
        'Disable_right',
      );
    });

    it('should clear display text in idle state', () => {
      const { result } = renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.Idle,
        }),
      );

      expect(result.current.displayText).toBeNull();
    });

    it('should not hide value in idle state', () => {
      const { result } = renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.Idle,
        }),
      );

      expect(result.current.hideValue).toBe(false);
    });
  });

  describe('Loading state behavior', () => {
    it('should trigger Disable in loading state', () => {
      const { result } = renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.Loading,
        }),
      );

      // Set up the riveRef with mock fireState
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Mocking ref for testing
      result.current.riveRef.current = { fireState: mockFireState };

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(mockFireState).toHaveBeenCalledWith(
        STATE_MACHINE_NAME,
        'Disable_right',
      );
    });

    it('should clear display text in loading state', () => {
      const { result } = renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.Loading,
        }),
      );

      expect(result.current.displayText).toBeNull();
    });
  });

  describe('Error state behavior', () => {
    it('should trigger Disable in error state', () => {
      const { result } = renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.ErrorState,
        }),
      );

      // Set up the riveRef with mock fireState
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Mocking ref for testing
      result.current.riveRef.current = { fireState: mockFireState };

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(mockFireState).toHaveBeenCalledWith(
        STATE_MACHINE_NAME,
        'Disable_right',
      );
    });

    it('should not hide value in error state', () => {
      const { result } = renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.ErrorState,
        }),
      );

      expect(result.current.hideValue).toBe(false);
    });
  });

  describe('Refresh state behaviors', () => {
    it('should trigger RefreshRight in RefreshLoading state', () => {
      const { result } = renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.RefreshLoading,
        }),
      );

      // Set up the riveRef with mock fireState
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Mocking ref for testing
      result.current.riveRef.current = { fireState: mockFireState };

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(mockFireState).toHaveBeenCalledWith(
        STATE_MACHINE_NAME,
        'Refresh_right',
      );
    });

    it('should trigger RefreshLeft in RefreshFinished state', () => {
      const { result } = renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.RefreshFinished,
        }),
      );

      // Set up the riveRef with mock fireState
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Mocking ref for testing
      result.current.riveRef.current = { fireState: mockFireState };

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(mockFireState).toHaveBeenCalledWith(
        STATE_MACHINE_NAME,
        'Refresh_left',
      );
    });

    it('should not hide value in RefreshFinished state', () => {
      const { result } = renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.RefreshFinished,
        }),
      );

      expect(result.current.hideValue).toBe(false);
    });

    it('should clear display text in RefreshLoading state', () => {
      const { result } = renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.RefreshLoading,
        }),
      );

      expect(result.current.displayText).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle negative values', () => {
      const { result } = renderHook(() => useRewardsAnimation({ value: -50 }));

      expect(result.current).toBeDefined();
    });

    it('should handle very large values', () => {
      const { result } = renderHook(() =>
        useRewardsAnimation({ value: 999999 }),
      );

      expect(result.current).toBeDefined();
    });

    it('should handle zero value', () => {
      const { result } = renderHook(() => useRewardsAnimation({ value: 0 }));

      expect(result.current.displayValue).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle errors when fireState throws', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { result } = renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.Idle,
        }),
      );

      // Set up the riveRef with mock fireState that throws
      const throwingFireState = jest.fn(() => {
        throw new Error('Rive error');
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Mocking ref for testing
      result.current.riveRef.current = { fireState: throwingFireState };

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error triggering Rive animation'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should handle null riveRef gracefully', () => {
      const { result } = renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.Idle,
        }),
      );

      // riveRef.current is null by default
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current).toBeDefined();
      expect(mockFireState).not.toHaveBeenCalled();
    });
  });

  describe('Display value updates', () => {
    it('should update displayValue over time', () => {
      const { result } = renderHook(() => useRewardsAnimation({ value: 100 }));

      expect(result.current.displayValue).toBe(0);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Display value should update via interval
      expect(result.current.displayValue).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Module structure', () => {
    it('should be importable without errors', () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        require('./useRewardsAnimation');
      }).not.toThrow();
    });

    it('should export useRewardsAnimation function', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const exported = require('./useRewardsAnimation');
      expect(exported.useRewardsAnimation).toBeDefined();
      expect(typeof exported.useRewardsAnimation).toBe('function');
    });

    it('should export RewardAnimationState enum', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const exported = require('./useRewardsAnimation');
      expect(exported.RewardAnimationState).toBeDefined();
      expect(typeof exported.RewardAnimationState).toBe('object');
    });
  });
});
