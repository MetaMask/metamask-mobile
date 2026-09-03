import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import PerformanceProfilerStatus, {
  PERFORMANCE_PROFILER_STATUS_TEST_IDS,
} from './PerformanceProfilerStatus';

const mockStartAppProfiling = jest.fn().mockResolvedValue(true);
const mockStopAppProfiling = jest
  .fn()
  .mockResolvedValue('/tmp/profile.cpuprofile');
let statusListener:
  | ((status: {
      isRecording: boolean;
      lastProfilePath: string | null;
      lastError: string | null;
    }) => void)
  | null = null;

jest.mock('../../../core/Performance/appProfiling', () => ({
  isPerformanceProfilingEnabled: true,
  startAppProfiling: (...args: unknown[]) => mockStartAppProfiling(...args),
  stopAppProfiling: (...args: unknown[]) => mockStopAppProfiling(...args),
  subscribeAppProfilingStatus: (
    listener: (status: {
      isRecording: boolean;
      lastProfilePath: string | null;
      lastError: string | null;
    }) => void,
  ) => {
    statusListener = listener;
    listener({
      isRecording: false,
      lastProfilePath: null,
      lastError: null,
    });
    return () => {
      statusListener = null;
    };
  },
}));

describe('PerformanceProfilerStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    statusListener = null;
  });

  it('renders start/stop controls and acks presses', () => {
    const { getByTestId, queryByTestId } = render(
      <PerformanceProfilerStatus />,
    );

    expect(
      getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.start),
    ).toBeTruthy();
    expect(getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.stop)).toBeTruthy();
    expect(
      queryByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.startAck),
    ).toBeNull();

    fireEvent.press(getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.start));

    expect(mockStartAppProfiling).toHaveBeenCalledTimes(1);
    expect(
      getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.startAck),
    ).toBeTruthy();

    fireEvent.press(getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.stop));

    expect(mockStopAppProfiling).toHaveBeenCalledTimes(1);
    expect(
      getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.stopAck),
    ).toBeTruthy();
  });

  it('exposes recording and result hooks from profiling status', () => {
    const { getByTestId, queryByTestId } = render(
      <PerformanceProfilerStatus />,
    );

    expect(
      queryByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.recordingReady),
    ).toBeNull();

    act(() => {
      statusListener?.({
        isRecording: true,
        lastProfilePath: null,
        lastError: null,
      });
    });

    expect(
      getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.recordingReady),
    ).toBeTruthy();

    act(() => {
      statusListener?.({
        isRecording: false,
        lastProfilePath: '/sdcard/Download/profile.cpuprofile',
        lastError: null,
      });
    });

    expect(
      getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.resultReady),
    ).toBeTruthy();
  });
});
