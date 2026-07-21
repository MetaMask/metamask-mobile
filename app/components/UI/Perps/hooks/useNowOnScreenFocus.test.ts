import { renderHook, act } from '@testing-library/react-hooks';
import { AppState, type AppStateStatus } from 'react-native';
import { useNowOnScreenFocus } from './useNowOnScreenFocus';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import-x/no-commonjs
const { useFocusEffect } = require('@react-navigation/native') as {
  useFocusEffect: jest.Mock;
};

describe('useNowOnScreenFocus', () => {
  let mockAppStateListener: ((state: AppStateStatus) => void) | null = null;
  let mockSubscriptionRemove: jest.Mock;
  let addEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    // `restoreAllMocks` (global afterEach) doesn't clear call history on this
    // jest.mock factory's `jest.fn()`, so without this, `.mock.calls[0][0]`
    // below would read a stale callback from a previous test's unmounted hook.
    useFocusEffect.mockClear();

    mockSubscriptionRemove = jest.fn();
    addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((event, handler) => {
        if (event === 'change') {
          mockAppStateListener = handler as (state: AppStateStatus) => void;
        }
        return { remove: mockSubscriptionRemove };
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockAppStateListener = null;
  });

  it('returns the current time at mount', () => {
    const mountTime = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(mountTime);

    const { result } = renderHook(() => useNowOnScreenFocus());

    expect(result.current).toBe(mountTime);
  });

  it('refreshes the returned time when the screen regains focus', () => {
    const mountTime = 1_700_000_000_000;
    const focusTime = mountTime + 45 * 24 * 60 * 60 * 1000;
    jest.spyOn(Date, 'now').mockReturnValue(mountTime);

    const { result } = renderHook(() => useNowOnScreenFocus());
    expect(result.current).toBe(mountTime);

    jest.spyOn(Date, 'now').mockReturnValue(focusTime);
    const focusCallback = useFocusEffect.mock.calls[0][0];
    act(() => {
      focusCallback();
    });

    expect(result.current).toBe(focusTime);
  });

  it('does not change the returned time without a focus event', () => {
    const mountTime = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(mountTime);

    const { result, rerender } = renderHook(() => useNowOnScreenFocus());
    expect(result.current).toBe(mountTime);

    jest.spyOn(Date, 'now').mockReturnValue(mountTime + 60 * 60 * 1000);
    rerender();

    expect(result.current).toBe(mountTime);
  });

  it('refreshes the returned time when AppState becomes active', () => {
    // Regression test: navigation focus alone misses the app
    // background/resume case because the route never blurs while the app is
    // backgrounded — this must be driven by the AppState listener instead.
    const mountTime = 1_700_000_000_000;
    const resumeTime = mountTime + 45 * 24 * 60 * 60 * 1000;
    jest.spyOn(Date, 'now').mockReturnValue(mountTime);

    const { result } = renderHook(() => useNowOnScreenFocus());
    expect(result.current).toBe(mountTime);

    jest.spyOn(Date, 'now').mockReturnValue(resumeTime);
    act(() => {
      mockAppStateListener?.('active');
    });

    expect(result.current).toBe(resumeTime);
  });

  it('does not refresh the returned time on background/inactive AppState transitions', () => {
    const mountTime = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(mountTime);

    const { result } = renderHook(() => useNowOnScreenFocus());
    expect(result.current).toBe(mountTime);

    jest
      .spyOn(Date, 'now')
      .mockReturnValue(mountTime + 45 * 24 * 60 * 60 * 1000);
    act(() => {
      mockAppStateListener?.('background');
    });
    act(() => {
      mockAppStateListener?.('inactive');
    });

    expect(result.current).toBe(mountTime);
  });

  it('removes the AppState subscription on unmount', () => {
    const { unmount } = renderHook(() => useNowOnScreenFocus());

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
    expect(mockSubscriptionRemove).not.toHaveBeenCalled();

    unmount();

    expect(mockSubscriptionRemove).toHaveBeenCalledTimes(1);
  });
});
