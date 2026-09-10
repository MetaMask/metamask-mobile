import {
  __resetAppProfilingForTests,
  getLastAppProfilePath,
  getLastAppProfilingError,
  isAppProfilingRecording,
  isAppProfilingSessionLost,
  isPerformanceProfilingEnabled,
  startAppProfiling,
  stopAppProfiling,
  subscribeAppProfilingStatus,
} from './appProfiling';
import { getHermesProfilerModule } from './hermesProfilerModule';
import { startProfiling, stopProfiling } from 'react-native-release-profiler';

jest.mock('react-native-release-profiler', () => ({
  startProfiling: jest.fn(),
  stopProfiling: jest.fn(),
}));

jest.mock('./hermesProfilerModule', () => ({
  getHermesProfilerModule: jest.fn(),
}));

const ANDROID_PROFILE_PATH =
  '/storage/emulated/0/Android/data/io.metamask/files/Documents/metamask-performance.cpuprofile';

const mockGetHermesProfilerModule = jest.mocked(getHermesProfilerModule);

function mockNativeModule(overrides?: {
  startProfiling?: jest.Mock;
  stopProfilingToAppStorage?: jest.Mock;
}) {
  const nativeModule = {
    startProfiling:
      overrides?.startProfiling ?? jest.fn().mockResolvedValue(true),
    stopProfilingToAppStorage:
      overrides?.stopProfilingToAppStorage ??
      jest.fn().mockResolvedValue(ANDROID_PROFILE_PATH),
  };
  mockGetHermesProfilerModule.mockReturnValue(nativeModule);
  return nativeModule;
}

describe('appProfiling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAppProfilingForTests();
    mockGetHermesProfilerModule.mockReturnValue(null);
  });

  it('reports profiling disabled outside performance APKs in unit tests', () => {
    expect(isPerformanceProfilingEnabled).toBe(false);
  });

  it('no-ops startAppProfiling when disabled', async () => {
    const nativeModule = mockNativeModule();

    const started = await startAppProfiling(false);

    expect(started).toBe(false);
    expect(nativeModule.startProfiling).not.toHaveBeenCalled();
    expect(isAppProfilingRecording()).toBe(false);
  });

  it('no-ops stopAppProfiling when disabled', async () => {
    const nativeModule = mockNativeModule();

    const path = await stopAppProfiling(false);

    expect(path).toBeNull();
    expect(nativeModule.stopProfilingToAppStorage).not.toHaveBeenCalled();
    expect(getLastAppProfilePath()).toBeNull();
  });

  it('starts and stops profiling through the native module', async () => {
    const nativeModule = mockNativeModule();

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
    expect(nativeModule.startProfiling).toHaveBeenCalledTimes(1);
    expect(isAppProfilingRecording()).toBe(true);

    const path = await stopAppProfiling(true);

    expect(nativeModule.stopProfilingToAppStorage).toHaveBeenCalledTimes(1);
    expect(path).toBe(ANDROID_PROFILE_PATH);
    expect(getLastAppProfilePath()).toBe(ANDROID_PROFILE_PATH);
    expect(isAppProfilingRecording()).toBe(false);
    expect(statuses.some((status) => status.isRecording)).toBe(true);
    expect(
      statuses.some(
        (status) => status.lastProfilePath === ANDROID_PROFILE_PATH,
      ),
    ).toBe(true);

    unsubscribe();
  });

  it('falls back to react-native-release-profiler when the native module is absent', async () => {
    (startProfiling as jest.Mock).mockReturnValue(true);
    (stopProfiling as jest.Mock).mockResolvedValue('/tmp/profile.cpuprofile');

    await startAppProfiling(true);
    const path = await stopAppProfiling(true);

    expect(startProfiling).toHaveBeenCalledTimes(1);
    expect(stopProfiling).toHaveBeenCalledTimes(1);
    expect(path).toBe('/tmp/profile.cpuprofile');
  });

  it('reports a lost session when stop runs without an active session', async () => {
    const nativeModule = mockNativeModule();

    const path = await stopAppProfiling(true);

    expect(path).toBeNull();
    expect(isAppProfilingSessionLost()).toBe(true);
    expect(getLastAppProfilingError()).toBeNull();
    // Dumping with no active sampler is what makes the native call hang, so the
    // native module must not be reached at all in this state.
    expect(nativeModule.stopProfilingToAppStorage).not.toHaveBeenCalled();
  });

  it('records an error when the native start reports failure', async () => {
    mockNativeModule({ startProfiling: jest.fn().mockResolvedValue(false) });

    const started = await startAppProfiling(true);

    expect(started).toBe(false);
    expect(isAppProfilingRecording()).toBe(false);
    expect(getLastAppProfilingError()).toContain('returned false');
  });

  it('records an error when the native stop rejects', async () => {
    mockNativeModule({
      stopProfilingToAppStorage: jest
        .fn()
        .mockRejectedValue(new Error('Hermes wrote no trace')),
    });

    await startAppProfiling(true);

    await expect(stopAppProfiling(true)).rejects.toThrow(
      'Hermes wrote no trace',
    );
    expect(isAppProfilingRecording()).toBe(false);
    expect(getLastAppProfilingError()).toContain('Hermes wrote no trace');
  });
});
