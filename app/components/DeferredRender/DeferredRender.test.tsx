/**
 * Unit coverage: one state flip, one commit, and the transition subscription it
 * owns. Component-view would still have to drive `transitionEnd` and
 * `requestAnimationFrame`. This gate does not cross a controller seam, and the
 * transition helper keeps its own tests.
 */
import React, { Profiler, type ReactNode } from 'react';
import { View } from 'react-native';
import { act, render, renderHook } from '@testing-library/react-native';

import { SCREEN_TRANSITION_FALLBACK_MS } from '../hooks/subscribeScreenTransition';
import { DeferredRender } from './DeferredRender';
import { useDeferredRender } from './useDeferredRender';

type Listener = (event: { data: { closing: boolean } }) => void;

const listeners: Record<string, Set<Listener>> = {
  focus: new Set(),
  transitionEnd: new Set(),
};
const mockUnsubscribe = jest.fn();
const mockIsFocused = jest.fn(() => true);
const mockAddListener = jest.fn((type: string, listener: Listener) => {
  listeners[type].add(listener);
  return () => {
    listeners[type].delete(listener);
    mockUnsubscribe();
  };
});

// One stable object for every call, as a real navigator returns: a new object
// per render would re-run the subscription effect on every commit.
const mockNavigation = {
  addListener: mockAddListener,
  isFocused: mockIsFocused,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

let queuedFrames: FrameRequestCallback[] = [];
const originalRequestAnimationFrame = global.requestAnimationFrame;
const originalCancelAnimationFrame = global.cancelAnimationFrame;

function emit(type: string, closing = false) {
  act(() => {
    [...listeners[type]].forEach((listener) => listener({ data: { closing } }));
  });
}

function flushFrame() {
  const frame = queuedFrames.shift();
  if (!frame) {
    throw new Error('expected a pending animation frame');
  }
  act(() => {
    frame(0);
  });
}

function gate(children?: ReactNode, enabled?: boolean) {
  return (
    <DeferredRender
      enabled={enabled}
      placeholder={<View testID="deferred-render-placeholder" />}
    >
      {children ?? <View testID="deferred-render-content" />}
    </DeferredRender>
  );
}

describe('DeferredRender', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockIsFocused.mockReturnValue(true);
    listeners.focus.clear();
    listeners.transitionEnd.clear();
    queuedFrames = [];
    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      queuedFrames.push(callback);
      return queuedFrames.length;
    }) as typeof requestAnimationFrame;
    global.cancelAnimationFrame = jest.fn(() => {
      queuedFrames = [];
    }) as typeof cancelAnimationFrame;
  });

  afterEach(() => {
    jest.useRealTimers();
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it('commits twice: the placeholder, then the released children', () => {
    const onRender = jest.fn();
    render(
      <Profiler id="gate" onRender={onRender}>
        {gate()}
      </Profiler>,
    );

    expect(onRender).toHaveBeenCalledTimes(1);

    emit('transitionEnd');
    expect(onRender).toHaveBeenCalledTimes(1);

    flushFrame();
    expect(onRender).toHaveBeenCalledTimes(2);
  });

  it('queues one frame on transitionEnd and shows the children when it runs', () => {
    const view = render(gate());

    expect(view.getByTestId('deferred-render-placeholder')).toBeOnTheScreen();
    expect(global.requestAnimationFrame).not.toHaveBeenCalled();

    emit('transitionEnd');

    expect(global.requestAnimationFrame).toHaveBeenCalledTimes(1);

    flushFrame();

    expect(view.getByTestId('deferred-render-content')).toBeOnTheScreen();
    expect(view.queryByTestId('deferred-render-placeholder')).toBeNull();
  });

  it('ignores the transitionEnd of the screen that is closing', () => {
    const view = render(gate());

    emit('transitionEnd', true);

    expect(global.requestAnimationFrame).not.toHaveBeenCalled();
    expect(view.getByTestId('deferred-render-placeholder')).toBeOnTheScreen();
  });

  it('clears the fallback when transitionEnd arrives, so it releases once', () => {
    render(gate());

    emit('transitionEnd');
    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS * 2);
    });

    expect(global.requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('releases on the fallback only while the screen is focused', () => {
    const { result, unmount } = renderHook(() => useDeferredRender());

    mockIsFocused.mockReturnValue(false);
    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });
    expect(result.current).toBe(false);
    unmount();

    mockIsFocused.mockReturnValue(true);
    const focused = renderHook(() => useDeferredRender());
    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });
    flushFrame();

    expect(focused.result.current).toBe(true);
  });

  it('re-arms the fallback when the screen comes back into focus', () => {
    const { result } = renderHook(() => useDeferredRender());

    mockIsFocused.mockReturnValue(false);
    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });
    expect(result.current).toBe(false);

    mockIsFocused.mockReturnValue(true);
    emit('focus');
    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });
    flushFrame();

    expect(result.current).toBe(true);
  });

  it('renders the children on the first commit when disabled', () => {
    const view = render(gate(undefined, false));

    expect(view.getByTestId('deferred-render-content')).toBeOnTheScreen();
    expect(mockAddListener).not.toHaveBeenCalled();
    expect(global.requestAnimationFrame).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('stays released when enabled flips from false to true', () => {
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useDeferredRender({ enabled }),
      { initialProps: { enabled: false } },
    );

    expect(result.current).toBe(true);

    rerender({ enabled: true });

    expect(result.current).toBe(true);
    expect(global.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('cancels the frame, the timer and both listeners on unmount', () => {
    const { unmount } = renderHook(() => useDeferredRender());

    emit('transitionEnd');
    expect(queuedFrames).toHaveLength(1);

    unmount();

    expect(global.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(queuedFrames).toHaveLength(0);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(0);
  });
});
