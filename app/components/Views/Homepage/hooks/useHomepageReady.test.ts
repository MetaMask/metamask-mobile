import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import {
  endHomepageReadyTrace,
  resolveColdHomepageReadyTrace,
  startHomepageReadyTrace,
} from '../../../../core/Performance/HomepageReady';
import {
  dropUnlockToHomepageReady,
  finishUnlockToHomepageReady,
  markUnlockHomeFocused,
} from '../../../../core/Performance/unlockToHomepageReady';
import { useHomepageReady } from './useHomepageReady';

let mockIsFocused = true;

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockIsFocused,
}));

jest.mock('../../../../core/Performance/HomepageReady', () => ({
  startHomepageReadyTrace: jest.fn(),
  endHomepageReadyTrace: jest.fn(),
  resolveColdHomepageReadyTrace: jest.fn(),
}));

jest.mock('../../../../core/Performance/unlockToHomepageReady', () => ({
  dropUnlockToHomepageReady: jest.fn(),
  finishUnlockToHomepageReady: jest.fn(),
  markUnlockHomeFocused: jest.fn(),
}));

const mockStartHomepageReadyTrace = jest.mocked(startHomepageReadyTrace);
const mockEndHomepageReadyTrace = jest.mocked(endHomepageReadyTrace);
const mockResolveColdHomepageReadyTrace = jest.mocked(
  resolveColdHomepageReadyTrace,
);
const mockDropUnlockToHomepageReady = jest.mocked(dropUnlockToHomepageReady);
const mockFinishUnlockToHomepageReady = jest.mocked(
  finishUnlockToHomepageReady,
);
const mockMarkUnlockHomeFocused = jest.mocked(markUnlockHomeFocused);

describe('useHomepageReady', () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;
  const removeAppStateListener = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFocused = true;
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
      writable: true,
    });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListener = listener;
        return { remove: removeAppStateListener };
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    appStateListener = undefined;
  });

  it('ends the trace when focused token content is ready', () => {
    renderHook(() =>
      useHomepageReady({ contentReady: true, contentState: 'filled' }),
    );

    expect(mockEndHomepageReadyTrace).toHaveBeenCalledWith({
      contentState: 'filled',
    });
  });

  it('resolves the queued cold trace for a focused homepage', () => {
    renderHook(() =>
      useHomepageReady({ contentReady: false, contentState: 'filled' }),
    );

    expect(mockResolveColdHomepageReadyTrace).toHaveBeenCalledWith({
      isHomepageFocused: true,
    });
  });

  it('discards the queued cold trace for an unfocused homepage', () => {
    mockIsFocused = false;

    renderHook(() =>
      useHomepageReady({ contentReady: false, contentState: 'filled' }),
    );

    expect(mockResolveColdHomepageReadyTrace).toHaveBeenCalledWith({
      isHomepageFocused: false,
    });
  });

  it('waits for token content before ending the trace', () => {
    const { rerender } = renderHook(
      ({ contentReady }) =>
        useHomepageReady({ contentReady, contentState: 'filled' }),
      { initialProps: { contentReady: false } },
    );

    rerender({ contentReady: true });

    expect(mockEndHomepageReadyTrace).toHaveBeenCalledWith({
      contentState: 'filled',
    });
  });

  it('starts a warm app-open trace when Home returns to foreground', () => {
    renderHook(() =>
      useHomepageReady({ contentReady: false, contentState: 'filled' }),
    );

    act(() => {
      appStateListener?.('background');
      appStateListener?.('active');
    });

    expect(mockStartHomepageReadyTrace).toHaveBeenCalledWith({
      source: 'app_open',
      appStartType: 'warm',
    });
  });

  it('does not start a warm app-open trace when Home is unfocused', () => {
    mockIsFocused = false;
    renderHook(() =>
      useHomepageReady({ contentReady: true, contentState: 'filled' }),
    );

    act(() => {
      appStateListener?.('background');
      appStateListener?.('active');
    });

    expect(mockStartHomepageReadyTrace).not.toHaveBeenCalled();
  });

  it('removes the app-state listener on unmount', () => {
    const { unmount } = renderHook(() =>
      useHomepageReady({ contentReady: false, contentState: 'empty' }),
    );

    unmount();

    expect(removeAppStateListener).toHaveBeenCalledTimes(1);
  });

  describe('Unlock To Homepage Ready', () => {
    const UNLOCK_TOKEN = 7;

    beforeEach(() => {
      mockMarkUnlockHomeFocused.mockReturnValue(UNLOCK_TOKEN);
    });

    it('marks the focused homepage, then sends the unlock after Homepage Ready ends', () => {
      renderHook(() =>
        useHomepageReady({ contentReady: true, contentState: 'empty' }),
      );

      expect(mockFinishUnlockToHomepageReady).toHaveBeenCalledWith({
        contentState: 'empty',
      });
      const [focusedOrder] = mockMarkUnlockHomeFocused.mock.invocationCallOrder;
      const [endedOrder] = mockEndHomepageReadyTrace.mock.invocationCallOrder;
      const [finishedOrder] =
        mockFinishUnlockToHomepageReady.mock.invocationCallOrder;
      expect(focusedOrder).toBeLessThan(endedOrder);
      expect(endedOrder).toBeLessThan(finishedOrder);
    });

    it('waits for token content before sending the unlock', () => {
      const { rerender } = renderHook(
        ({ contentReady }) =>
          useHomepageReady({ contentReady, contentState: 'filled' }),
        { initialProps: { contentReady: false } },
      );

      expect(mockMarkUnlockHomeFocused).toHaveBeenCalledTimes(1);
      expect(mockFinishUnlockToHomepageReady).not.toHaveBeenCalled();

      rerender({ contentReady: true });

      expect(mockFinishUnlockToHomepageReady).toHaveBeenCalledWith({
        contentState: 'filled',
      });
    });

    it('neither marks nor sends the unlock for an unfocused homepage', () => {
      mockIsFocused = false;

      renderHook(() =>
        useHomepageReady({ contentReady: true, contentState: 'filled' }),
      );

      expect(mockMarkUnlockHomeFocused).not.toHaveBeenCalled();
      expect(mockFinishUnlockToHomepageReady).not.toHaveBeenCalled();
    });

    it('drops the unlock it counted for when the homepage loses focus', () => {
      const { rerender } = renderHook(() =>
        useHomepageReady({ contentReady: false, contentState: 'filled' }),
      );

      mockIsFocused = false;
      rerender({});

      expect(mockDropUnlockToHomepageReady).toHaveBeenCalledWith(
        'navigated_away',
        UNLOCK_TOKEN,
      );
    });

    it('drops the unlock it counted for when the homepage unmounts', () => {
      const { unmount } = renderHook(() =>
        useHomepageReady({ contentReady: false, contentState: 'filled' }),
      );

      unmount();

      expect(mockDropUnlockToHomepageReady).toHaveBeenCalledWith(
        'navigated_away',
        UNLOCK_TOKEN,
      );
    });
  });
});
