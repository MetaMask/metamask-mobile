import { renderHook, act } from '@testing-library/react-native';
import { SCREEN_TRANSITION_FALLBACK_MS } from '../../../hooks/useScreenTransitionComplete';
import { useDeferHeavyContentUntilTransition } from './useDeferHeavyContentUntilTransition';

type TransitionListener = (event: { data: { closing: boolean } }) => void;

const mockUnsubscribe = jest.fn();
let mockTransitionListener: TransitionListener | undefined;
let mockHasListener = true;

const mockAddListener = jest.fn(
  (eventName: string, listener: TransitionListener) => {
    if (eventName === 'transitionEnd') {
      mockTransitionListener = listener;
    }
    return mockUnsubscribe;
  },
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () =>
    mockHasListener ? { addListener: mockAddListener } : {},
}));

describe('useDeferHeavyContentUntilTransition', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation(
        (callback: FrameRequestCallback) =>
          setTimeout(() => callback(Date.now()), 0) as unknown as number,
      );
    jest
      .spyOn(global, 'cancelAnimationFrame')
      .mockImplementation((handle: number | null | undefined) => {
        if (handle != null) {
          clearTimeout(handle);
        }
      });
    jest.clearAllMocks();
    mockTransitionListener = undefined;
    mockHasListener = true;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('starts ready when the screen is a bottom tab', () => {
    const { result } = renderHook(() =>
      useDeferHeavyContentUntilTransition(false),
    );

    expect(result.current).toBe(true);
    expect(mockAddListener).not.toHaveBeenCalled();
  });

  it('stays deferred until the opening transition ends, then the next frame', () => {
    const { result } = renderHook(() =>
      useDeferHeavyContentUntilTransition(true),
    );

    expect(result.current).toBe(false);

    act(() => {
      mockTransitionListener?.({ data: { closing: true } });
    });
    expect(result.current).toBe(false);

    act(() => {
      mockTransitionListener?.({ data: { closing: false } });
    });
    expect(result.current).toBe(false);

    act(() => {
      jest.runAllTimers();
    });
    expect(result.current).toBe(true);
  });

  it('reveals after the fallback when transitionEnd never fires', () => {
    const { result } = renderHook(() =>
      useDeferHeavyContentUntilTransition(true),
    );

    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
      jest.runAllTimers();
    });

    expect(result.current).toBe(true);
  });

  it('starts ready on the first layout when the navigator has no listener', () => {
    mockHasListener = false;
    const { result } = renderHook(() =>
      useDeferHeavyContentUntilTransition(true),
    );

    expect(result.current).toBe(true);
  });
});
