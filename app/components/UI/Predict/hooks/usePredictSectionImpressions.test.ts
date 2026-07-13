/**
 * Unit tests for usePredictSectionImpressions.
 *
 * Reanimated is mocked (the worklet/shared-value machinery is bypassed) and the
 * scroll updates are fed to the tracker directly via the `handleScrollY`
 * callback that `useAnimatedReaction` would normally call in a worklet context.
 * All dwell timers are controlled with Jest fake timers.
 */

import { act, renderHook } from '@testing-library/react-native';
import { LayoutChangeEvent } from 'react-native';
import { DEFAULT_DWELL_MS } from '../utils/sectionViewTracker';
import { usePredictSectionImpressions } from './usePredictSectionImpressions';

// ---------------------------------------------------------------------------
// Reanimated mock — captures the JS-thread callback registered via runOnJS so
// tests can drive scroll updates without a native worklet environment.
// ---------------------------------------------------------------------------

type AnimatedReactionCallback = (value: number) => void;
let capturedScrollCallback: AnimatedReactionCallback | null = null;

jest.mock('react-native-reanimated', () => ({
  useAnimatedReaction: (
    _getter: () => number,
    callback: AnimatedReactionCallback,
  ) => {
    capturedScrollCallback = callback;
  },
  runOnJS:
    <T extends (...args: unknown[]) => unknown>(fn: T) =>
    (...args: Parameters<T>) =>
      fn(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeLayoutEvent = (y: number, height: number): LayoutChangeEvent =>
  ({
    nativeEvent: { layout: { x: 0, y, width: 100, height } },
  }) as LayoutChangeEvent;

const makeScrollViewLayoutEvent = (height: number): LayoutChangeEvent =>
  ({
    nativeEvent: { layout: { x: 0, y: 0, width: 375, height } },
  }) as LayoutChangeEvent;

const simulateScroll = (scrollY: number) => {
  act(() => {
    capturedScrollCallback?.(scrollY);
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePredictSectionImpressions', () => {
  beforeEach(() => {
    capturedScrollCallback = null;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const setup = (onSectionViewed = jest.fn()) => {
    const scrollY = { value: 0 } as { value: number };
    const { result, unmount } = renderHook(() =>
      usePredictSectionImpressions({
        scrollY: scrollY as never,
        onSectionViewed,
      }),
    );
    return { result, unmount, onSectionViewed, scrollY };
  };

  it('fires onSectionViewed after the dwell period for a visible section', () => {
    const { result, onSectionViewed } = setup();

    act(() => {
      result.current.setViewportHeight(makeScrollViewLayoutEvent(800));
      result.current.registerSection('live_now')(makeLayoutEvent(0, 300));
    });

    act(() => jest.advanceTimersByTime(DEFAULT_DWELL_MS - 1));
    expect(onSectionViewed).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));
    expect(onSectionViewed).toHaveBeenCalledTimes(1);
    expect(onSectionViewed).toHaveBeenCalledWith('live_now');
  });

  it('does not fire for a section that is out of view', () => {
    const { result, onSectionViewed } = setup();

    act(() => {
      result.current.setViewportHeight(makeScrollViewLayoutEvent(800));
      // Section starts far below the viewport.
      result.current.registerSection('trending')(makeLayoutEvent(2000, 400));
    });

    act(() => jest.advanceTimersByTime(DEFAULT_DWELL_MS));
    expect(onSectionViewed).not.toHaveBeenCalled();
  });

  it('fires when the user scrolls a section into view', () => {
    const { result, onSectionViewed } = setup();

    act(() => {
      result.current.setViewportHeight(makeScrollViewLayoutEvent(800));
      result.current.registerSection('trending')(makeLayoutEvent(2000, 400));
    });

    simulateScroll(2000);
    act(() => jest.advanceTimersByTime(DEFAULT_DWELL_MS));

    expect(onSectionViewed).toHaveBeenCalledTimes(1);
    expect(onSectionViewed).toHaveBeenCalledWith('trending');
  });

  it('does not fire twice for the same section in one session', () => {
    const { result, onSectionViewed } = setup();

    act(() => {
      result.current.setViewportHeight(makeScrollViewLayoutEvent(800));
      result.current.registerSection('live_now')(makeLayoutEvent(0, 300));
    });

    act(() => jest.advanceTimersByTime(DEFAULT_DWELL_MS));
    expect(onSectionViewed).toHaveBeenCalledTimes(1);

    // Scroll away and back — should NOT re-fire.
    simulateScroll(2000);
    simulateScroll(0);
    act(() => jest.advanceTimersByTime(DEFAULT_DWELL_MS));
    expect(onSectionViewed).toHaveBeenCalledTimes(1);
  });

  it('re-fires after reset even when scrollY stays at 0 (return navigation)', () => {
    const { result, onSectionViewed } = setup();

    act(() => {
      result.current.setViewportHeight(makeScrollViewLayoutEvent(800));
      result.current.registerSection('live_now')(makeLayoutEvent(0, 300));
    });

    act(() => jest.advanceTimersByTime(DEFAULT_DWELL_MS));
    expect(onSectionViewed).toHaveBeenCalledTimes(1);

    // Simulate returning to the home at scrollY=0 — reset() must trigger
    // evaluate() internally so the dwell timer restarts without a scroll event.
    act(() => result.current.reset());
    act(() => jest.advanceTimersByTime(DEFAULT_DWELL_MS));
    expect(onSectionViewed).toHaveBeenCalledTimes(2);
  });

  it('cancels pending timers on unmount (destroy called)', () => {
    const { result, unmount, onSectionViewed } = setup();

    act(() => {
      result.current.setViewportHeight(makeScrollViewLayoutEvent(800));
      result.current.registerSection('live_now')(makeLayoutEvent(0, 300));
    });

    // Dwell timer starts but hasn't completed.
    act(() => jest.advanceTimersByTime(DEFAULT_DWELL_MS - 100));
    unmount();

    // Timer should be cancelled — onSectionViewed must not fire after unmount.
    act(() => jest.advanceTimersByTime(200));
    expect(onSectionViewed).not.toHaveBeenCalled();
  });

  it('tracks multiple sections independently', () => {
    const { result, onSectionViewed } = setup();

    act(() => {
      result.current.setViewportHeight(makeScrollViewLayoutEvent(800));
      result.current.registerSection('live_now')(makeLayoutEvent(0, 300));
      result.current.registerSection('trending')(makeLayoutEvent(3000, 400));
    });

    act(() => jest.advanceTimersByTime(DEFAULT_DWELL_MS));
    expect(onSectionViewed).toHaveBeenCalledTimes(1);
    expect(onSectionViewed).toHaveBeenCalledWith('live_now');

    simulateScroll(3000);
    act(() => jest.advanceTimersByTime(DEFAULT_DWELL_MS));
    expect(onSectionViewed).toHaveBeenCalledTimes(2);
    expect(onSectionViewed).toHaveBeenLastCalledWith('trending');
  });
});
