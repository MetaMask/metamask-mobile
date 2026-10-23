import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { endTrace, trace, TraceName } from '../../../../../../util/trace';
import {
  VBA_SCREEN_CONTENT_STATE,
  VBA_SCREEN_ID,
} from '../vbaScreenPerformance';
import { useVbaScreenPerformance } from './useVbaScreenPerformance';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'vba-screen-trace-id'),
}));

jest.mock('../../../../../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  getPerformanceTimestamp: jest.fn(() => 100),
  TraceName: { VbaScreenLoad: 'VBA Screen Load' },
  TraceOperation: { VbaOperation: 'vba.operation' },
}));

const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);

describe('useVbaScreenPerformance', () => {
  let appState: AppStateStatus;
  let appStateListeners: ((state: AppStateStatus) => void)[];
  const removeListener = jest.fn();

  const emitAppState = (state: AppStateStatus) => {
    appState = state;
    appStateListeners.forEach((listener) => listener(state));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appState = 'active';
    appStateListeners = [];
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => appState,
    });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, listener) => {
        appStateListeners.push(listener);
        return { remove: removeListener };
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ends with populated content when meaningful content becomes ready', () => {
    const { rerender } = renderHook(
      ({ contentReady }) =>
        useVbaScreenPerformance({
          screenId: VBA_SCREEN_ID.VENDOR_TERMS,
          contentReady,
        }),
      { initialProps: { contentReady: false } },
    );

    rerender({ contentReady: true });

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.VbaScreenLoad,
        op: 'vba.operation',
        forceTransaction: true,
        tags: {
          feature: 'vba',
          screen_id: VBA_SCREEN_ID.VENDOR_TERMS,
        },
      }),
    );
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.VbaScreenLoad,
      id: 'vba-screen-trace-id',
      data: {
        feature: 'vba',
        screen_id: VBA_SCREEN_ID.VENDOR_TERMS,
        content_state: VBA_SCREEN_CONTENT_STATE.POPULATED,
        success: true,
      },
    });
  });

  it('ends with unmounted when the screen leaves before content', () => {
    const { unmount } = renderHook(() =>
      useVbaScreenPerformance({
        screenId: VBA_SCREEN_ID.ACCOUNT_DETAILS,
        contentReady: false,
      }),
    );

    unmount();

    expect(removeListener).toHaveBeenCalled();
    expect(mockEndTrace).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          reason: 'unmounted',
        }),
      }),
    );
  });

  it('ends on background and restarts when the app becomes active', () => {
    const { rerender } = renderHook(
      ({ contentReady }) =>
        useVbaScreenPerformance({
          screenId: VBA_SCREEN_ID.ACCOUNT_DETAILS,
          contentReady,
        }),
      { initialProps: { contentReady: false } },
    );

    act(() => emitAppState('background'));
    rerender({ contentReady: true });
    act(() => emitAppState('active'));

    expect(mockTrace).toHaveBeenCalledTimes(2);
    expect(mockEndTrace).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          reason: 'app_backgrounded',
        }),
      }),
    );
    expect(mockEndTrace).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ success: true }),
      }),
    );
  });

  it('ends with disabled when tracing turns off before content', () => {
    const { rerender } = renderHook(
      ({ enabled }) =>
        useVbaScreenPerformance({
          screenId: VBA_SCREEN_ID.IDENTITY_VERIFICATION_TERMS,
          contentReady: false,
          enabled,
        }),
      { initialProps: { enabled: true } },
    );

    rerender({ enabled: false });

    expect(mockEndTrace).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          reason: 'disabled',
        }),
      }),
    );
  });

  it('keeps measuring through iOS inactive', () => {
    const { rerender } = renderHook(
      ({ contentReady }) =>
        useVbaScreenPerformance({
          screenId: VBA_SCREEN_ID.VENDOR_TERMS,
          contentReady,
        }),
      { initialProps: { contentReady: false } },
    );

    act(() => emitAppState('inactive'));
    rerender({ contentReady: true });

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ success: true }),
      }),
    );
  });

  it('does not remeasure content after the screen succeeds', () => {
    const { rerender } = renderHook(
      ({ contentReady }) =>
        useVbaScreenPerformance({
          screenId: VBA_SCREEN_ID.VENDOR_TERMS,
          contentReady,
        }),
      { initialProps: { contentReady: false } },
    );

    rerender({ contentReady: true });
    act(() => emitAppState('background'));
    act(() => emitAppState('active'));

    expect(mockTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledTimes(1);
  });
});
