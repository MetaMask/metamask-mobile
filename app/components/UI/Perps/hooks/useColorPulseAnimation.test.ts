import { renderHook } from '@testing-library/react-hooks';
import {
  useColorPulseAnimation,
  type PulseColor,
} from './useColorPulseAnimation.test';

// Mock dependencies
jest.mock('../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    theme: {
      colors: {
        success: { default: '#00ff00' },
        error: { default: '#ff0000' },
      },
    },
  })),
}));

// Complete React Native mock to prevent animation system from running
jest.mock('react-native', () => {
  const mockAnimatedValue = () => ({
    setValue: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    stopAnimation: jest.fn(),
    interpolate: jest.fn((config) => ({
      ...config,
      __interpolated: true,
    })),
    _value: 1,
  });

  const mockAnimation = () => ({
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
  });

  return {
    Animated: {
      Value: jest.fn(mockAnimatedValue),
      timing: jest.fn(mockAnimation),
      parallel: jest.fn(mockAnimation),
      sequence: jest.fn(mockAnimation),
      spring: jest.fn(mockAnimation),
      decay: jest.fn(mockAnimation),
      loop: jest.fn(mockAnimation),
      delay: jest.fn(mockAnimation),
    },
    // Mock other RN components that might be used
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
  };
});

describe('useColorPulseAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  describe('Hook Interface', () => {
    it('should return all required properties and methods', () => {
      const { result } = renderHook(() => useColorPulseAnimation());

      expect(result.current).toHaveProperty('pulseAnim');
      expect(result.current).toHaveProperty('colorAnim');
      expect(result.current).toHaveProperty('startPulseAnimation');
      expect(result.current).toHaveProperty('getAnimatedStyle');
      expect(result.current).toHaveProperty('stopAnimation');
      expect(typeof result.current.startPulseAnimation).toBe('function');
      expect(typeof result.current.getAnimatedStyle).toBe('function');
      expect(typeof result.current.stopAnimation).toBe('function');
    });

    it('should initialize without errors', () => {
      expect(() => {
        renderHook(() => useColorPulseAnimation());
      }).not.toThrow();
    });

    it('should accept custom options', () => {
      const customOptions = {
        pulseDuration: 500,
        colorDuration: 300,
        minOpacity: 0.3,
        colors: {
          increase: '#custom-green',
          decrease: '#custom-red',
          same: '#custom-gray',
        },
      };

      expect(() => {
        renderHook(() => useColorPulseAnimation(customOptions));
      }).not.toThrow();
    });

    it('should work with partial options', () => {
      expect(() => {
        renderHook(() => useColorPulseAnimation({ pulseDuration: 500 }));
      }).not.toThrow();
    });

    it('should work with empty options', () => {
      expect(() => {
        renderHook(() => useColorPulseAnimation({}));
      }).not.toThrow();
    });
  });

  describe('Animation Functions', () => {
    it('should not throw when calling startPulseAnimation', () => {
      const { result } = renderHook(() => useColorPulseAnimation());

      expect(() => {
        result.current.startPulseAnimation('increase');
      }).not.toThrow();

      expect(() => {
        result.current.startPulseAnimation('decrease');
      }).not.toThrow();

      expect(() => {
        result.current.startPulseAnimation('same');
      }).not.toThrow();
    });

    it('should accept all valid PulseColor values', () => {
      const { result } = renderHook(() => useColorPulseAnimation());
      const validColors: PulseColor[] = ['increase', 'decrease', 'same'];

      validColors.forEach((color) => {
        expect(() => {
          result.current.startPulseAnimation(color);
        }).not.toThrow();
      });
    });

    it('should not throw when calling stopAnimation', () => {
      const { result } = renderHook(() => useColorPulseAnimation());

      expect(() => {
        result.current.stopAnimation();
      }).not.toThrow();
    });

    it('should not throw when stopping animation that was never started', () => {
      const { result } = renderHook(() => useColorPulseAnimation());

      expect(() => {
        result.current.stopAnimation();
      }).not.toThrow();
    });
  });

  describe('getAnimatedStyle', () => {
    it('should return animated style object with required properties', () => {
      const { result } = renderHook(() => useColorPulseAnimation());

      const style = result.current.getAnimatedStyle();

      expect(style).toHaveProperty('opacity');
      expect(style).toHaveProperty('backgroundColor');
      expect(style.opacity).toBeDefined();
      expect(style.backgroundColor).toBeDefined();
    });

    it('should work with custom colors', () => {
      const customOptions = {
        colors: {
          increase: '#custom-success',
          decrease: '#custom-error',
          same: '#custom-neutral',
        },
      };

      const { result } = renderHook(() =>
        useColorPulseAnimation(customOptions),
      );

      expect(() => {
        result.current.getAnimatedStyle();
      }).not.toThrow();
    });

    it('should work with default colors', () => {
      const { result } = renderHook(() => useColorPulseAnimation());

      expect(() => {
        result.current.getAnimatedStyle();
      }).not.toThrow();
    });
  });

  describe('Hook Stability', () => {
    it('should maintain stable references for animation values', () => {
      const { result, rerender } = renderHook(() => useColorPulseAnimation());

      const firstPulseAnim = result.current.pulseAnim;
      const firstColorAnim = result.current.colorAnim;

      rerender();

      expect(result.current.pulseAnim).toBe(firstPulseAnim);
      expect(result.current.colorAnim).toBe(firstColorAnim);
    });

    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useColorPulseAnimation());

      const firstStartPulse = result.current.startPulseAnimation;
      const firstStopAnimation = result.current.stopAnimation;

      rerender();

      expect(result.current.startPulseAnimation).toBe(firstStartPulse);
      expect(result.current.stopAnimation).toBe(firstStopAnimation);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive animation calls', () => {
      const { result } = renderHook(() => useColorPulseAnimation());

      expect(() => {
        result.current.startPulseAnimation('increase');
        result.current.startPulseAnimation('decrease');
        result.current.startPulseAnimation('same');
        result.current.startPulseAnimation('increase');
      }).not.toThrow();
    });

    it('should handle extreme option values', () => {
      const extremeOptions = {
        pulseDuration: 0,
        colorDuration: 10000,
        minOpacity: 0,
      };

      expect(() => {
        const { result } = renderHook(() =>
          useColorPulseAnimation(extremeOptions),
        );
        result.current.startPulseAnimation('increase');
      }).not.toThrow();
    });

    it('should handle partial color configuration', () => {
      const partialColors = {
        colors: {
          increase: '#custom-green',
          // missing decrease and same
        },
      };

      expect(() => {
        const { result } = renderHook(() =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          useColorPulseAnimation(partialColors as any),
        );
        result.current.getAnimatedStyle();
      }).not.toThrow();
    });

    it('should handle start and stop in sequence', () => {
      const { result } = renderHook(() => useColorPulseAnimation());

      expect(() => {
        result.current.startPulseAnimation('increase');
        result.current.stopAnimation();
        result.current.startPulseAnimation('decrease');
        result.current.stopAnimation();
      }).not.toThrow();
    });
  });

  describe('Options Validation', () => {
    it('should work with valid duration values', () => {
      expect(() => {
        renderHook(() =>
          useColorPulseAnimation({
            pulseDuration: 100,
            colorDuration: 200,
          }),
        );
      }).not.toThrow();
    });

    it('should work with valid opacity values', () => {
      expect(() => {
        renderHook(() =>
          useColorPulseAnimation({
            minOpacity: 0.5,
          }),
        );
      }).not.toThrow();

      expect(() => {
        renderHook(() =>
          useColorPulseAnimation({
            minOpacity: 1.0,
          }),
        );
      }).not.toThrow();
    });

    it('should work with complete color configuration', () => {
      expect(() => {
        renderHook(() =>
          useColorPulseAnimation({
            colors: {
              increase: 'green',
              decrease: 'red',
              same: 'transparent',
            },
          }),
        );
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should integrate all hook features without errors', () => {
      const { result } = renderHook(() =>
        useColorPulseAnimation({
          pulseDuration: 300,
          colorDuration: 200,
          minOpacity: 0.6,
          colors: {
            increase: '#00ff00',
            decrease: '#ff0000',
            same: 'transparent',
          },
        }),
      );

      expect(() => {
        // Test complete workflow
        const style = result.current.getAnimatedStyle();
        expect(style).toHaveProperty('opacity');
        expect(style).toHaveProperty('backgroundColor');

        result.current.startPulseAnimation('increase');
        result.current.stopAnimation();
      }).not.toThrow();
    });

    it('should work with theme colors', () => {
      // This tests that the useStyles hook integration works
      expect(() => {
        const { result } = renderHook(() => useColorPulseAnimation());
        result.current.getAnimatedStyle();
      }).not.toThrow();
    });
  });
});
