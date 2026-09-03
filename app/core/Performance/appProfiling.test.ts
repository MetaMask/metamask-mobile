import {
  __resetAppProfilingForTests,
  getLastAppProfilePath,
  getLastAppProfilingError,
  isAppProfilingRecording,
  isPerformanceProfilingEnabled,
  startAppProfiling,
  stopAppProfiling,
  subscribeAppProfilingStatus,
} from './appProfiling';
import {
  startProfiling,
  stopProfilingToExternalFiles,
} from 'react-native-release-profiler';

jest.mock('react-native-release-profiler', () => ({
  startProfiling: jest.fn(),
  stopProfilingToExternalFiles: jest.fn(),
}));

describe('appProfiling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAppProfilingForTests();
  });

  it('reports profiling disabled outside performance APKs in unit tests', () => {
    expect(isPerformanceProfilingEnabled).toBe(false);
  });

  it('no-ops startAppProfiling when disabled', async () => {
    const started = await startAppProfiling(false);

    expect(started).toBe(false);
    expect(startProfiling).not.toHaveBeenCalled();
    expect(isAppProfilingRecording()).toBe(false);
  });

  it('no-ops stopAppProfiling when disabled', async () => {
    const path = await stopAppProfiling(false);

    expect(path).toBeNull();
    expect(stopProfilingToExternalFiles).not.toHaveBeenCalled();
    expect(getLastAppProfilePath()).toBeNull();
  });

  it('starts and stops profiling when enabled', async () => {
    (startProfiling as jest.Mock).mockReturnValue(true);
    (stopProfilingToExternalFiles as jest.Mock).mockResolvedValue(
      '/storage/emulated/0/Android/data/io.metamask/files/Documents/profile.cpuprofile',
    );

    const statuses: {
      isRecording: boolean;
      lastProfilePath: string | null;
    }[] = [];
    const unsubscribe = subscribeAppProfilingStatus((status) => {
      statuses.push({
        isRecording: status.isRecording,
        lastProfilePath: status.lastProfilePath,
      });
    });

    const started = await startAppProfiling(true);

    expect(started).toBe(true);
    expect(startProfiling).toHaveBeenCalledTimes(1);
    expect(isAppProfilingRecording()).toBe(true);

    const path = await stopAppProfiling(true);

    expect(stopProfilingToExternalFiles).toHaveBeenCalledTimes(1);
    expect(path).toBe(
      '/storage/emulated/0/Android/data/io.metamask/files/Documents/profile.cpuprofile',
    );
    expect(getLastAppProfilePath()).toBe(path);
    expect(isAppProfilingRecording()).toBe(false);
    expect(statuses.some((status) => status.isRecording)).toBe(true);
    expect(
      statuses.some(
        (status) =>
          status.lastProfilePath ===
          '/storage/emulated/0/Android/data/io.metamask/files/Documents/profile.cpuprofile',
      ),
    ).toBe(true);

    unsubscribe();
  });

  it('records an error when stop is called without an active session', async () => {
    const path = await stopAppProfiling(true);

    expect(path).toBeNull();
    expect(stopProfilingToExternalFiles).not.toHaveBeenCalled();
    expect(getLastAppProfilingError()).toContain('no active profiling session');
  });

  it('records an error when startProfiling returns false', async () => {
    (startProfiling as jest.Mock).mockReturnValue(false);

    const started = await startAppProfiling(true);

    expect(started).toBe(false);
    expect(isAppProfilingRecording()).toBe(false);
    expect(getLastAppProfilingError()).toContain('returned false');
  });
});
