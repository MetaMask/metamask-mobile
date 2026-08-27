import { act, renderHook } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import {
  DIGIT_TICKER_START_DELAY_MS,
  DIGIT_TICKER_TICK_MS,
  buildDigitTickerFrames,
  getDigitIndexes,
  useDigitTicker,
  zeroDigits,
} from './useDigitTicker';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));

const mockUseReducedMotion = jest.mocked(useReducedMotion);

describe('zeroDigits', () => {
  it('replaces digits and keeps currency formatting', () => {
    expect(zeroDigits('$770.12')).toBe('$000.00');
  });
});

describe('getDigitIndexes', () => {
  it('returns only digit character indexes', () => {
    expect(getDigitIndexes('$770.12')).toEqual([1, 2, 3, 5, 6]);
  });
});

describe('buildDigitTickerFrames', () => {
  it('changes one digit place at a time from left to right', () => {
    const frames = buildDigitTickerFrames('$12');

    expect(frames).toEqual(['$00', '$10', '$11', '$12']);
  });

  it('skips counting when a digit target is already zero', () => {
    const frames = buildDigitTickerFrames('$10');

    expect(frames).toEqual(['$00', '$10']);
  });
});

describe('useDigitTicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the final value immediately when reduced motion is enabled', () => {
    mockUseReducedMotion.mockReturnValue(true);

    const { result } = renderHook(() => useDigitTicker('$12'));

    expect(result.current).toBe('$12');
  });

  describe('when animation is enabled', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('starts from zeroed digits', () => {
      const { result } = renderHook(() => useDigitTicker('$12'));

      expect(result.current).toBe('$00');
    });

    it('plays the first frame after the start delay', () => {
      const { result } = renderHook(() => useDigitTicker('$12'));

      act(() => {
        jest.advanceTimersByTime(DIGIT_TICKER_START_DELAY_MS);
      });

      expect(result.current).toBe('$00');
    });

    it('advances one digit frame after each tick', () => {
      const { result } = renderHook(() => useDigitTicker('$12'));

      act(() => {
        jest.advanceTimersByTime(DIGIT_TICKER_START_DELAY_MS);
      });
      act(() => {
        jest.advanceTimersByTime(DIGIT_TICKER_TICK_MS);
      });

      expect(result.current).toBe('$10');
    });

    it('reaches the final value after all digit ticks', () => {
      const { result } = renderHook(() => useDigitTicker('$12'));

      act(() => {
        jest.runAllTimers();
      });

      expect(result.current).toBe('$12');
    });

    it('cleans up timers without throwing when unmounted mid-animation', () => {
      const { unmount } = renderHook(() => useDigitTicker('$12'));

      unmount();
      act(() => {
        jest.runAllTimers();
      });
    });
  });
});
