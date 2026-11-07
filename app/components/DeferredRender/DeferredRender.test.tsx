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

let queuedFrames: Record<number, FrameRequestCallback> = {};
let nextFrameId = 0;
const originalRequestAnimationFrame = global.requestAnimationFrame;
const originalCancelAnimationFrame = global.cancelAnimationFrame;

function emit(type: string, closing = false) {
  act(() => {
    [...listeners[type]].forEach((listener) => listener({ data: { closing } }));
  });
}

function queuedFrameIds() {
  return Object.keys(queuedFrames).map(Number);
}

function flushFrame(frameId = queuedFrameIds()[0]) {
  const frame = queuedFrames[frameId];
  if (!frame) {
    throw new Error('expected a pending animation frame');
  }
  delete queuedFrames[frameId];
  act(() => {
    frame(0);
  });
}

function release() {
  emit('transitionEnd');
  flushFrame();
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

function HookProbe() {
  useDeferredRender();
  return null;
}

describe('DeferredRender', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockIsFocused.mockReturnValue(true);
    listeners.focus.clear();
    listeners.transitionEnd.clear();
    queuedFrames = {};
    nextFrameId = 0;
    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      nextFrameId += 1;
      queuedFrames[nextFrameId] = callback;
      return nextFrameId;
    }) as typeof requestAnimationFrame;
    global.cancelAnimationFrame = jest.fn((frameId: number) => {
      delete queuedFrames[frameId];
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
    expect(jest.getTimerCount()).toBe(0);

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

  describe('nested gates', () => {
    const devGlobal = global as unknown as { __DEV__: boolean };
    let warnSpy: jest.SpyInstance;
    let wasDev: boolean;

    beforeEach(() => {
      wasDev = devGlobal.__DEV__;
      devGlobal.__DEV__ = true;
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
      devGlobal.__DEV__ = wasDev;
      warnSpy.mockRestore();
    });

    it.each<[string, ReactNode]>([
      ['a gate inside a gate', gate()],
      ['a bare hook inside a gate', <HookProbe key="probe" />],
    ])('warns once for %s', (_name, inner) => {
      const view = render(gate(inner));

      release();

      expect(warnSpy).toHaveBeenCalledTimes(1);

      view.rerender(gate(inner));

      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('stays silent for a gate inside a disabled gate', () => {
      render(gate(gate(), false));

      release();

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('releases a placeholder gate on transitionEnd without warning', () => {
      const view = render(
        <DeferredRender
          placeholder={
            <DeferredRender placeholder={<View testID="inner-placeholder" />}>
              <View testID="inner-content" />
            </DeferredRender>
          }
        >
          <View testID="outer-content" />
        </DeferredRender>,
      );

      expect(view.getByTestId('inner-placeholder')).toBeOnTheScreen();
      expect(warnSpy).not.toHaveBeenCalled();

      emit('transitionEnd');

      // Child effects subscribe first, so frame 1 is the placeholder gate.
      expect(queuedFrameIds()).toStrictEqual([1, 2]);
      flushFrame(1);

      expect(view.getByTestId('inner-content')).toBeOnTheScreen();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('releases a nested gate on its own 450 ms fallback plus a frame', () => {
      const view = render(
        gate(
          <DeferredRender placeholder={<View testID="inner-placeholder" />}>
            <View testID="inner-content" />
          </DeferredRender>,
        ),
      );

      release();
      expect(view.getByTestId('inner-placeholder')).toBeOnTheScreen();

      act(() => {
        jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS - 1);
      });
      expect(queuedFrameIds()).toStrictEqual([]);
      expect(view.getByTestId('inner-placeholder')).toBeOnTheScreen();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(queuedFrameIds()).toHaveLength(1);

      flushFrame();

      expect(view.getByTestId('inner-content')).toBeOnTheScreen();
    });

    it('stays silent outside development', () => {
      devGlobal.__DEV__ = false;

      render(gate(<HookProbe />));
      release();

      expect(warnSpy).not.toHaveBeenCalled();
    });
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

  it('clears the fallback and both listeners when it unmounts before the transition ends', () => {
    const { unmount } = renderHook(() => useDeferredRender());

    expect(jest.getTimerCount()).toBe(1);

    unmount();

    expect(jest.getTimerCount()).toBe(0);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
    expect(global.requestAnimationFrame).not.toHaveBeenCalled();
    expect(global.cancelAnimationFrame).not.toHaveBeenCalled();
  });

  it('cancels only its own frame when one of two mounted hooks unmounts', () => {
    const first = renderHook(() => useDeferredRender());
    const second = renderHook(() => useDeferredRender());

    emit('transitionEnd');
    expect(queuedFrameIds()).toStrictEqual([1, 2]);

    first.unmount();

    expect(global.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(global.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(queuedFrameIds()).toStrictEqual([2]);

    flushFrame(2);

    expect(second.result.current).toBe(true);
  });
});
