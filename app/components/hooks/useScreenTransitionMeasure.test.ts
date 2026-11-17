import { act, renderHook } from '@testing-library/react-native';

import { endTrace, trace } from '../../util/trace';
import { SCREEN_TRANSITION_FALLBACK_MS } from './subscribeScreenTransition';
import { useScreenTransitionMeasure } from './useScreenTransitionMeasure';

jest.mock('../../util/trace', () => ({
  TraceName: {
    DeferredRenderRelease: 'Deferred Render Release',
    ScreenTransition: 'Screen Transition',
  },
  TraceOperation: {
    DeferredRender: 'deferred_render',
    ScreenTransition: 'screen.transition',
  },
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

const mockTrace = trace as jest.Mock;
const mockEndTrace = endTrace as jest.Mock;

type Listener = (event: { data: { closing: boolean } }) => void;

const listeners: Record<string, Set<Listener>> = {
  focus: new Set(),
  transitionEnd: new Set(),
};

const mockNavigation = {
  addListener: jest.fn((type: string, listener: Listener) => {
    listeners[type].add(listener);
    return () => {
      listeners[type].delete(listener);
    };
  }),
  isFocused: jest.fn(() => true),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

function emit(type: string, closing = false) {
  act(() => {
    [...listeners[type]].forEach((listener) => listener({ data: { closing } }));
  });
}

describe('useScreenTransitionMeasure', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    listeners.focus.clear();
    listeners.transitionEnd.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens the span on mount and closes it on transitionEnd', () => {
    renderHook(() => useScreenTransitionMeasure({ screenId: 'TokenDetails' }));

    expect(mockTrace).toHaveBeenCalledTimes(1);
    expect(mockTrace.mock.calls[0][0]).toMatchObject({
      name: 'Screen Transition',
      op: 'screen.transition',
      tags: { screen_id: 'TokenDetails' },
    });

    emit('transitionEnd');

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace.mock.calls[0][0].data).toMatchObject({
      screen_id: 'TokenDetails',
      content_ready_before_transition_end: true,
    });
  });

  it('records content that lands after the transition', () => {
    const { rerender } = renderHook(
      ({ contentReady }: { contentReady: boolean }) =>
        useScreenTransitionMeasure({ screenId: 'Perps', contentReady }),
      { initialProps: { contentReady: false } },
    );

    act(() => {
      jest.advanceTimersByTime(50);
    });
    emit('transitionEnd');

    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({ contentReady: true });

    const data = mockEndTrace.mock.calls[0][0].data;
    expect(data.content_ready_before_transition_end).toBe(false);
    expect(data.transition_ms).toBe(50);
    expect(data.content_ready_ms).toBe(150);
    expect(data.content_ready_after_transition_ms).toBe(100);
  });

  it('closes the span once when the fallback and a later focus both fire', () => {
    renderHook(() => useScreenTransitionMeasure({ screenId: 'Money' }));

    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });
    emit('focus');
    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', () => {
    renderHook(() =>
      useScreenTransitionMeasure({ screenId: 'Off', enabled: false }),
    );

    expect(mockTrace).not.toHaveBeenCalled();
    expect(mockNavigation.addListener).not.toHaveBeenCalled();
  });
});
