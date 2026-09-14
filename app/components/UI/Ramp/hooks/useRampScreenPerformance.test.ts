import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { endTrace, trace, TraceName } from '../../../../util/trace';
import {
  RAMP_SCREEN_CONTENT_STATE,
  RAMP_V2_SCREEN_ID,
} from '../constants/rampScreenPerformance';
import { getRampsBuyCufParentContext } from '../utils/rampsBuyCufTrace';
import { useRampScreenPerformance } from './useRampScreenPerformance';

jest.mock('uuid', () => ({
  v4: jest
    .fn()
    .mockReturnValueOnce('screen-trace-1')
    .mockReturnValueOnce('screen-trace-2')
    .mockReturnValue('screen-trace-next'),
}));

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  getPerformanceTimestamp: jest.fn(() => 100),
  TraceName: { RampScreenLoad: 'Ramp Screen Load' },
  TraceOperation: { RampOperation: 'ramp.operation' },
}));

jest.mock('../utils/rampsBuyCufTrace', () => ({
  getRampsBuyCufParentContext: jest.fn(() => ({ mocked: 'parent' })),
}));

const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);
const mockGetParentContext = jest.mocked(getRampsBuyCufParentContext);

describe('useRampScreenPerformance', () => {
  let appState: AppStateStatus;
  let appStateListener: (state: AppStateStatus) => void;
  const removeListener = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    appState = 'active';
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => appState,
    });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, listener) => {
        appStateListener = listener;
        return { remove: removeListener };
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ends when meaningful content becomes ready', () => {
    const { rerender } = renderHook(
      ({ contentReady }) =>
        useRampScreenPerformance({
          screenId: RAMP_V2_SCREEN_ID.TOKEN_SELECTION,
          contentReady,
        }),
      { initialProps: { contentReady: false } },
    );

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampScreenLoad,
        parentContext: { mocked: 'parent' },
        forceTransaction: true,
        tags: {
          screen_id: RAMP_V2_SCREEN_ID.TOKEN_SELECTION,
          ramp_type: 'UNIFIED_BUY_2',
        },
      }),
    );

    rerender({ contentReady: true });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampScreenLoad,
        data: expect.objectContaining({
          success: true,
          content_state: RAMP_SCREEN_CONTENT_STATE.POPULATED,
        }),
      }),
    );
  });

  it('cancels on background and restarts on foreground', () => {
    const { rerender } = renderHook(
      ({ contentReady }) =>
        useRampScreenPerformance({
          screenId: RAMP_V2_SCREEN_ID.AMOUNT_INPUT,
          contentReady,
        }),
      { initialProps: { contentReady: false } },
    );

    act(() => {
      appState = 'background';
      appStateListener('background');
    });

    expect(mockEndTrace).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          reason: 'app_backgrounded',
        }),
      }),
    );

    act(() => {
      appState = 'active';
      appStateListener('active');
    });
    rerender({ contentReady: true });

    expect(mockTrace).toHaveBeenCalledTimes(2);
    expect(mockEndTrace).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ success: true }),
      }),
    );
  });

  it('does not remeasure a screen that already reached content', () => {
    renderHook(() =>
      useRampScreenPerformance({
        screenId: RAMP_V2_SCREEN_ID.AMOUNT_INPUT,
        contentReady: true,
      }),
    );

    expect(mockTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledTimes(1);

    act(() => {
      appState = 'background';
      appStateListener('background');
    });
    act(() => {
      appState = 'active';
      appStateListener('active');
    });

    expect(mockTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledTimes(1);
  });

  it('cancels an unfinished span on unmount', () => {
    const { unmount } = renderHook(() =>
      useRampScreenPerformance({
        screenId: RAMP_V2_SCREEN_ID.CHECKOUT,
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

  it('stays a transaction while linked to an active Buy CUF', () => {
    renderHook(() =>
      useRampScreenPerformance({
        screenId: RAMP_V2_SCREEN_ID.CHECKOUT,
        contentReady: false,
      }),
    );

    // A child span would only reach Sentry once the journey ends, so screen
    // timings must never depend on the journey closing.
    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        parentContext: { mocked: 'parent' },
        forceTransaction: true,
      }),
    );
  });

  it('starts its own transaction when no Buy CUF is active', () => {
    mockGetParentContext.mockReturnValueOnce(undefined);

    renderHook(() =>
      useRampScreenPerformance({
        screenId: RAMP_V2_SCREEN_ID.ERROR_DETAILS_MODAL,
        contentReady: true,
        contentState: RAMP_SCREEN_CONTENT_STATE.ERROR,
      }),
    );

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        parentContext: undefined,
        forceTransaction: true,
      }),
    );
  });
});
