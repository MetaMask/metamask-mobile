import { renderHook, act } from '@testing-library/react-native';
import {
  SCREEN_TRANSITION_FALLBACK_MS,
  useScreenTransitionComplete,
} from './useScreenTransitionComplete';

type TransitionEndListener = (event: { data: { closing: boolean } }) => void;

const mockUnsubscribe = jest.fn();
let registeredListener: TransitionEndListener | undefined;

const mockAddListener = jest.fn(
  (eventName: string, listener: TransitionEndListener) => {
    if (eventName === 'transitionEnd') {
      registeredListener = listener;
    }
    return mockUnsubscribe;
  },
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ addListener: mockAddListener }),
}));

describe('useScreenTransitionComplete', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    registeredListener = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns false before the transition ends', () => {
    const { result } = renderHook(() => useScreenTransitionComplete());

    expect(result.current).toBe(false);
  });

  it('returns true when the opening transition ends', () => {
    const { result } = renderHook(() => useScreenTransitionComplete());

    act(() => registeredListener?.({ data: { closing: false } }));

    expect(result.current).toBe(true);
  });

  it('stays false when the transition belongs to the screen closing', () => {
    const { result } = renderHook(() => useScreenTransitionComplete());

    act(() => registeredListener?.({ data: { closing: true } }));

    expect(result.current).toBe(false);
  });

  it('returns true after the fallback delay when no event is emitted', () => {
    const { result } = renderHook(() => useScreenTransitionComplete());

    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });

    expect(result.current).toBe(true);
  });

  it('clears the fallback timer and the listener on unmount', () => {
    const { unmount } = renderHook(() => useScreenTransitionComplete());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    // The pending fallback must not fire a state update on the unmounted hook.
    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });
  });
});
