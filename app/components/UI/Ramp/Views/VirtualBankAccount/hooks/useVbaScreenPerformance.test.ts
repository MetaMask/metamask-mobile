import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { endTrace, trace, TraceName } from '../../../../../../util/trace';
import {
  VBA_SCREEN_CONTENT_STATE,
  VBA_SCREEN_ID,
  VBA_SCREEN_PERFORMANCE_CONFIG,
  type VbaScreenId,
} from '../vbaScreenPerformance';
import { resetVbaCufLifecycleContextForTests } from '../vbaCufLifecycle';
import { VBA_CUF_LIFECYCLE_CONTEXT } from '../vbaCufTags';
import { useScreenPerformance } from '../../../../../../hooks/useScreenPerformance';

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
const useVbaScreenPerformance = (
  options: Omit<
    Parameters<typeof useScreenPerformance<VbaScreenId>>[0],
    'config'
  >,
) =>
  useScreenPerformance({
    config: VBA_SCREEN_PERFORMANCE_CONFIG,
    ...options,
  });

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
    resetVbaCufLifecycleContextForTests();
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
    resetVbaCufLifecycleContextForTests();
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
          flow: 'vba',
          metric_type: 'screen_load',
          screen_id: VBA_SCREEN_ID.VENDOR_TERMS,
          lifecycle_context: VBA_CUF_LIFECYCLE_CONTEXT.COLD_PROCESS,
        },
      }),
    );
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.VbaScreenLoad,
      id: 'vba-screen-trace-id',
      data: {
        feature: 'vba',
        flow: 'vba',
        metric_type: 'screen_load',
        screen_id: VBA_SCREEN_ID.VENDOR_TERMS,
        lifecycle_context: VBA_CUF_LIFECYCLE_CONTEXT.COLD_PROCESS,
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

  it('ends on background and restarts with resume context after iOS inactive', () => {
    const { rerender } = renderHook(
      ({ contentReady }) =>
        useVbaScreenPerformance({
          screenId: VBA_SCREEN_ID.ACCOUNT_DETAILS,
          contentReady,
        }),
      { initialProps: { contentReady: false } },
    );

    act(() => emitAppState('background'));
    act(() => emitAppState('inactive'));
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
    expect(mockTrace).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tags: expect.objectContaining({
          lifecycle_context: VBA_CUF_LIFECYCLE_CONTEXT.BACKGROUND_RESUME,
        }),
      }),
    );
  });

  it('ends with disabled when tracing turns off before content', () => {
    const { rerender } = renderHook(
      ({ enabled }) =>
        useVbaScreenPerformance({
          screenId: VBA_SCREEN_ID.VENDOR_TERMS,
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

  it('measures new content after the reset key changes', () => {
    const { rerender } = renderHook(
      ({ contentReady, resetKey }) =>
        useVbaScreenPerformance({
          screenId: VBA_SCREEN_ID.ACCOUNT_DETAILS,
          contentReady,
          resetKey,
        }),
      {
        initialProps: {
          contentReady: true,
          resetKey: '0xabc:BRL',
        },
      },
    );

    rerender({ contentReady: false, resetKey: '0xabc:USD' });
    rerender({ contentReady: true, resetKey: '0xabc:USD' });

    expect(mockTrace).toHaveBeenCalledTimes(2);
    expect(mockEndTrace).toHaveBeenCalledTimes(2);
    expect(mockEndTrace).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ success: true }),
      }),
    );
  });
});
