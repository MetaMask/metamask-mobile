import React from 'react';
import { NavigationContext } from '@react-navigation/native';
import { renderHook, act } from '@testing-library/react-native';
import {
  SCREEN_TRANSITION_FALLBACK_MS,
  useScreenTransitionComplete,
} from './useScreenTransitionComplete';

type TransitionEndListener = (event: { data: { closing: boolean } }) => void;
type FocusListener = () => void;

const mockUnsubscribe = jest.fn();
const mockIsFocused = jest.fn(() => true);
let transitionListener: TransitionEndListener | undefined;
let focusListener: FocusListener | undefined;

const mockAddListener = jest.fn(
  (eventName: string, listener: TransitionEndListener & FocusListener) => {
    if (eventName === 'transitionEnd') {
      transitionListener = listener;
    }
    if (eventName === 'focus') {
      focusListener = listener;
    }
    return mockUnsubscribe;
  },
);

jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react');

  const navigation = {
    addListener: (
      eventName: string,
      listener: TransitionEndListener & FocusListener,
    ) => mockAddListener(eventName, listener),
    isFocused: () => mockIsFocused(),
  };

  return {
    NavigationContext: ReactActual.createContext(navigation),
    useNavigation: () => navigation,
  };
});

describe('useScreenTransitionComplete', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockIsFocused.mockReturnValue(true);
    transitionListener = undefined;
    focusListener = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('becomes true after the fallback delay when no navigator is mounted', () => {
    const { result } = renderHook(() => useScreenTransitionComplete(), {
      wrapper: ({ children }) =>
        React.createElement(
          NavigationContext.Provider,
          { value: undefined },
          children,
        ),
    });

    expect(result.current).toBe(false);
    expect(mockAddListener).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });

    expect(result.current).toBe(true);
  });

  it('returns false before the transition ends', () => {
    const { result } = renderHook(() => useScreenTransitionComplete());

    expect(result.current).toBe(false);
  });

  it('returns true when the opening transition ends', () => {
    const { result } = renderHook(() => useScreenTransitionComplete());

    act(() => transitionListener?.({ data: { closing: false } }));

    expect(result.current).toBe(true);
  });

  it('stays false when the transition belongs to the screen closing', () => {
    const { result } = renderHook(() => useScreenTransitionComplete());

    act(() => transitionListener?.({ data: { closing: true } }));

    expect(result.current).toBe(false);
  });

  it('returns true after the fallback delay when no event is emitted', () => {
    const { result } = renderHook(() => useScreenTransitionComplete());

    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });

    expect(result.current).toBe(true);
  });

  it('stays false when the fallback fires after the screen lost focus', () => {
    const { result } = renderHook(() => useScreenTransitionComplete());

    // The screen is dismissed before its opening transition ever ends, so it is
    // animating out while still mounted.
    mockIsFocused.mockReturnValue(false);
    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });

    expect(result.current).toBe(false);
  });

  it('re-arms the fallback when the screen comes back into focus', () => {
    const { result } = renderHook(() => useScreenTransitionComplete());

    mockIsFocused.mockReturnValue(false);
    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });
    expect(result.current).toBe(false);

    mockIsFocused.mockReturnValue(true);
    act(() => focusListener?.());
    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });

    expect(result.current).toBe(true);
  });

  it('clears the fallback timer and both listeners on unmount', () => {
    const { unmount } = renderHook(() => useScreenTransitionComplete());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
    // The pending fallback must not fire a state update on the unmounted hook.
    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });
  });
});
