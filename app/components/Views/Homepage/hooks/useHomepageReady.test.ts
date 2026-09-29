import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import {
  cancelHomepageReadyTrace,
  endHomepageReadyTrace,
  getActiveHomepageReadyTraceToken,
  startHomepageReadyTrace,
} from '../../../../core/Performance/HomepageReady';
import { markHomepageReadyHomeFocused } from '../../../../core/Performance/homepageReadyStages';
import { useHomepageReady } from './useHomepageReady';

let mockIsFocused = true;

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockIsFocused,
}));

jest.mock('../../../../core/Performance/HomepageReady', () => ({
  startHomepageReadyTrace: jest.fn(),
  endHomepageReadyTrace: jest.fn(),
  cancelHomepageReadyTrace: jest.fn(),
  getActiveHomepageReadyTraceToken: jest.fn(),
}));

jest.mock('../../../../core/Performance/homepageReadyStages', () => ({
  markHomepageReadyHomeFocused: jest.fn(),
}));

const mockStartHomepageReadyTrace = jest.mocked(startHomepageReadyTrace);
const mockEndHomepageReadyTrace = jest.mocked(endHomepageReadyTrace);
const mockCancelHomepageReadyTrace = jest.mocked(cancelHomepageReadyTrace);
const mockGetActiveHomepageReadyTraceToken = jest.mocked(
  getActiveHomepageReadyTraceToken,
);
const mockMarkHomeFocused = jest.mocked(markHomepageReadyHomeFocused);

describe('useHomepageReady', () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;
  const removeAppStateListener = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFocused = true;
    mockGetActiveHomepageReadyTraceToken.mockReturnValue(null);
    mockStartHomepageReadyTrace.mockReturnValue(null);
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

  it('marks the focused homepage for the unlock stages before ending the trace', () => {
    renderHook(() =>
      useHomepageReady({ contentReady: true, contentState: 'filled' }),
    );

    expect(mockMarkHomeFocused).toHaveBeenCalledTimes(1);
    expect(mockMarkHomeFocused.mock.invocationCallOrder[0]).toBeLessThan(
      mockEndHomepageReadyTrace.mock.invocationCallOrder[0],
    );
  });

  it('does not mark the homepage while Home is unfocused', () => {
    mockIsFocused = false;

    renderHook(() =>
      useHomepageReady({ contentReady: true, contentState: 'filled' }),
    );

    expect(mockMarkHomeFocused).not.toHaveBeenCalled();
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

  it('cancels the trace it saw while focused when Home loses focus', () => {
    mockGetActiveHomepageReadyTraceToken.mockReturnValue(7);
    const { rerender } = renderHook(() =>
      useHomepageReady({ contentReady: false, contentState: 'filled' }),
    );

    mockIsFocused = false;
    rerender({});

    expect(mockCancelHomepageReadyTrace).toHaveBeenCalledWith({
      reason: 'navigated_away',
      traceToken: 7,
    });
  });

  it('cancels the trace it saw while focused when Home unmounts', () => {
    mockGetActiveHomepageReadyTraceToken.mockReturnValue(7);
    const { unmount } = renderHook(() =>
      useHomepageReady({ contentReady: false, contentState: 'filled' }),
    );

    unmount();

    expect(mockCancelHomepageReadyTrace).toHaveBeenCalledWith({
      reason: 'navigated_away',
      traceToken: 7,
    });
  });

  it('cancels a warm app-open trace when Home loses focus before it ends', () => {
    mockStartHomepageReadyTrace.mockReturnValue(3);
    const { rerender } = renderHook(() =>
      useHomepageReady({ contentReady: false, contentState: 'filled' }),
    );
    act(() => {
      appStateListener?.('background');
      appStateListener?.('active');
    });

    mockIsFocused = false;
    rerender({});

    expect(mockCancelHomepageReadyTrace).toHaveBeenCalledWith({
      reason: 'navigated_away',
      traceToken: 3,
    });
  });

  it('keeps a trace that started after Home was last focused', () => {
    const { rerender } = renderHook(() =>
      useHomepageReady({ contentReady: false, contentState: 'filled' }),
    );
    mockGetActiveHomepageReadyTraceToken.mockReturnValue(9);

    mockIsFocused = false;
    rerender({});

    expect(mockCancelHomepageReadyTrace).not.toHaveBeenCalled();
  });

  it('does not cancel when Home mounts unfocused', () => {
    mockIsFocused = false;
    mockGetActiveHomepageReadyTraceToken.mockReturnValue(7);
    const { unmount } = renderHook(() =>
      useHomepageReady({ contentReady: false, contentState: 'filled' }),
    );

    unmount();

    expect(mockCancelHomepageReadyTrace).not.toHaveBeenCalled();
  });

  it('removes the app-state listener on unmount', () => {
    const { unmount } = renderHook(() =>
      useHomepageReady({ contentReady: false, contentState: 'empty' }),
    );

    unmount();

    expect(removeAppStateListener).toHaveBeenCalledTimes(1);
  });
});
