import {
  __resetAppProfilingForTests,
  getLastAppProfilePath,
  isAppProfilingRecording,
  isPerformanceProfilingEnabled,
  startAppProfiling,
  stopAppProfiling,
} from './appProfiling';
import { startProfiling, stopProfiling } from 'react-native-release-profiler';

jest.mock('react-native-release-profiler', () => ({
  startProfiling: jest.fn(),
  stopProfiling: jest.fn(),
}));

describe('appProfiling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAppProfilingForTests();
  });

  it('reports profiling disabled outside performance APKs in unit tests', () => {
    // Babel inlines IS_PERFORMANCE_TEST at transform time; Jest runs without
    // that flag, so the default gate stays off.
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
    expect(stopProfiling).not.toHaveBeenCalled();
    expect(getLastAppProfilePath()).toBeNull();
  });

  it('starts and stops profiling when enabled', async () => {
    (startProfiling as jest.Mock).mockResolvedValue(undefined);
    (stopProfiling as jest.Mock).mockResolvedValue(
      '/sdcard/Download/profile.cpuprofile',
    );

    const started = await startAppProfiling(true);

    expect(started).toBe(true);
    expect(startProfiling).toHaveBeenCalledTimes(1);
    expect(isAppProfilingRecording()).toBe(true);

    const path = await stopAppProfiling(true);

    expect(stopProfiling).toHaveBeenCalledWith(true);
    expect(path).toBe('/sdcard/Download/profile.cpuprofile');
    expect(getLastAppProfilePath()).toBe(path);
    expect(isAppProfilingRecording()).toBe(false);
  });

  it('returns null from stop when no session is recording', async () => {
    const path = await stopAppProfiling(true);

    expect(path).toBeNull();
    expect(stopProfiling).not.toHaveBeenCalled();
  });
});
