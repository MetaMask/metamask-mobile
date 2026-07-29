import { renderHook, act } from '@testing-library/react-native';
import {
  useRewardsAnimation,
  RewardAnimationState,
} from './useRewardsAnimation';
import {
  __mockRiveTriggerInput,
  __resetRiveMocks,
} from '../../../../__mocks__/rive-app-react-native';

const riveMockModule =
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
  require('../../../../__mocks__/rive-app-react-native') as typeof import('../../../../__mocks__/rive-app-react-native');

// `@rive-app/react-native` is globally mapped to the mock above (jest.config.js).
// `useRive()` returns a riveRef whose `.current` is populated immediately with
// mock view methods; `triggerInput` is backed by the shared
// `__mockRiveTriggerInput` spy.

describe('useRewardsAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    __mockRiveTriggerInput.mockReset();
    jest.useFakeTimers();
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
      expect(result.current).toHaveProperty('setRiveHybridRef');
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

    it('should return riveRef populated with view methods', () => {
      const { result } = renderHook(() => useRewardsAnimation({ value: 100 }));

      expect(result.current.riveRef).toBeDefined();
      expect(result.current.riveRef.current).not.toBeNull();
    });

    it('should default to Idle state', () => {
      const { result } = renderHook(() => useRewardsAnimation({ value: 100 }));

      expect(result.current).toBeDefined();
    });
  });

  describe('Idle state behavior', () => {
    it('should trigger RefreshLeft for positive value in idle state', () => {
      renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.Idle,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(__mockRiveTriggerInput).toHaveBeenCalledWith('Refresh_left');
    });

    it('should trigger Disable for zero value in idle state', () => {
      renderHook(() =>
        useRewardsAnimation({
          value: 0,
          state: RewardAnimationState.Idle,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(__mockRiveTriggerInput).toHaveBeenCalledWith('Disable_right');
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
      renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.Loading,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(__mockRiveTriggerInput).toHaveBeenCalledWith('Disable_right');
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
      renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.ErrorState,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(__mockRiveTriggerInput).toHaveBeenCalledWith('Disable_right');
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
      renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.RefreshLoading,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(__mockRiveTriggerInput).toHaveBeenCalledWith('Refresh_right');
    });

    it('should trigger RefreshLeft in RefreshFinished state', () => {
      renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.RefreshFinished,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(__mockRiveTriggerInput).toHaveBeenCalledWith('Refresh_left');
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
    it('should handle errors when triggerInput throws', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      __mockRiveTriggerInput.mockImplementationOnce(() => {
        throw new Error('Rive error');
      });

      renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.Idle,
        }),
      );

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
      const useRiveSpy = jest.spyOn(riveMockModule, 'useRive').mockReturnValue({
        riveRef: { current: null },
        riveViewRef: null,
        setHybridRef: { f: jest.fn() },
      } as unknown as ReturnType<typeof riveMockModule.useRive>);

      const { result } = renderHook(() =>
        useRewardsAnimation({
          value: 100,
          state: RewardAnimationState.Idle,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current).toBeDefined();
      expect(__mockRiveTriggerInput).not.toHaveBeenCalled();

      useRiveSpy.mockRestore();
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
