import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import PerformanceProfilerStatus, {
  PERFORMANCE_PROFILER_STATUS_TEST_IDS,
} from './PerformanceProfilerStatus';

interface MockProfilingStatus {
  isRecording: boolean;
  isSessionLost: boolean;
  lastProfilePath: string | null;
  lastError: string | null;
}

const IDLE_STATUS: MockProfilingStatus = {
  isRecording: false,
  isSessionLost: false,
  lastProfilePath: null,
  lastError: null,
};

const mockStartAppProfiling = jest.fn().mockResolvedValue(true);
const mockStopAppProfiling = jest
  .fn()
  .mockResolvedValue('/tmp/profile.cpuprofile');
let statusListener: ((status: MockProfilingStatus) => void) | null = null;

jest.mock('../../../core/Performance/appProfiling', () => ({
  isPerformanceProfilingEnabled: true,
  startAppProfiling: (...args: unknown[]) => mockStartAppProfiling(...args),
  stopAppProfiling: (...args: unknown[]) => mockStopAppProfiling(...args),
  subscribeAppProfilingStatus: (
    listener: (status: MockProfilingStatus) => void,
  ) => {
    statusListener = listener;
    listener(IDLE_STATUS);
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
    ).toBeOnTheScreen();
    expect(
      getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.stop),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.startAck),
    ).toBeNull();

    fireEvent.press(getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.start));

    expect(mockStartAppProfiling).toHaveBeenCalledTimes(1);
    expect(
      getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.startAck),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.stop));

    expect(mockStopAppProfiling).toHaveBeenCalledTimes(1);
    expect(
      getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.stopAck),
    ).toBeOnTheScreen();
  });

  it('stops profiling without forcing a dump', () => {
    const { getByTestId } = render(<PerformanceProfilerStatus />);

    fireEvent.press(getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.stop));

    expect(mockStopAppProfiling).toHaveBeenCalledWith();
  });

  it('exposes recording and result hooks from profiling status', () => {
    const { getByTestId, queryByTestId } = render(
      <PerformanceProfilerStatus />,
    );

    expect(
      queryByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.recordingReady),
    ).toBeNull();

    act(() => {
      statusListener?.({ ...IDLE_STATUS, isRecording: true });
    });

    expect(
      getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.recordingReady),
    ).toBeOnTheScreen();

    act(() => {
      statusListener?.({
        ...IDLE_STATUS,
        lastProfilePath:
          '/sdcard/Android/data/io.metamask/files/Documents/metamask-performance.cpuprofile',
      });
    });

    expect(
      getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.resultReady),
    ).toBeOnTheScreen();
  });

  it('exposes a session-lost hook when the app process was terminated', () => {
    const { getByTestId, queryByTestId } = render(
      <PerformanceProfilerStatus />,
    );

    expect(
      queryByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.sessionLost),
    ).toBeNull();

    act(() => {
      statusListener?.({ ...IDLE_STATUS, isSessionLost: true });
    });

    expect(
      getByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.sessionLost),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(PERFORMANCE_PROFILER_STATUS_TEST_IDS.resultReady),
    ).toBeNull();
  });
});
