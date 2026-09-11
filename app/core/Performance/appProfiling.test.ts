import { AppState, type AppStateStatus } from 'react-native';
import {
  __resetAppProfilingForTests,
  getLastAppProfilePath,
  getLastAppProfilingError,
  initializeAppProfiling,
  isAppProfilingRecording,
  isPerformanceProfilingEnabled,
  startAppProfiling,
  stopAppProfiling,
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
  '/storage/emulated/0/Android/data/io.metamask/files/Documents/metamask-performance.segment-1.cpuprofile';

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

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

/**
 * Captures the listener `initializeAppProfiling` registers so tests can drive
 * app lifecycle transitions directly.
 */
function captureAppStateListener(): () => (state: AppStateStatus) => void {
  let listener: ((state: AppStateStatus) => void) | undefined;
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, handler) => {
      listener = handler as (state: AppStateStatus) => void;
      return { remove: jest.fn() } as unknown as ReturnType<
        typeof AppState.addEventListener
      >;
    });
  return () => {
    if (!listener) {
      throw new Error('initializeAppProfiling did not register a listener');
    }
    return listener;
  };
}

describe('appProfiling', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
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

    const started = await startAppProfiling(true);

    expect(started).toBe(true);
    expect(nativeModule.startProfiling).toHaveBeenCalledTimes(1);
    expect(isAppProfilingRecording()).toBe(true);

    const path = await stopAppProfiling(true);

    expect(nativeModule.stopProfilingToAppStorage).toHaveBeenCalledTimes(1);
    expect(path).toBe(ANDROID_PROFILE_PATH);
    expect(getLastAppProfilePath()).toBe(ANDROID_PROFILE_PATH);
    expect(isAppProfilingRecording()).toBe(false);
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

  it('leaves Hermes alone when stop runs without an active session', async () => {
    const nativeModule = mockNativeModule();

    const path = await stopAppProfiling(true);

    expect(path).toBeNull();
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

  describe('initializeAppProfiling', () => {
    it('does nothing when profiling is disabled', () => {
      const nativeModule = mockNativeModule();
      const addEventListener = jest.spyOn(AppState, 'addEventListener');

      initializeAppProfiling(false);

      expect(nativeModule.startProfiling).not.toHaveBeenCalled();
      expect(addEventListener).not.toHaveBeenCalled();
    });

    it('arms profiling for the app process on startup', async () => {
      const nativeModule = mockNativeModule();
      captureAppStateListener();

      initializeAppProfiling(true);
      await flushPromises();

      expect(nativeModule.startProfiling).toHaveBeenCalledTimes(1);
      expect(isAppProfilingRecording()).toBe(true);
    });

    it('dumps and re-arms when the app is backgrounded', async () => {
      const nativeModule = mockNativeModule();
      const getListener = captureAppStateListener();

      initializeAppProfiling(true);
      await flushPromises();

      getListener()('background');
      await flushPromises();

      expect(nativeModule.stopProfilingToAppStorage).toHaveBeenCalledTimes(1);
      // Specs background the app mid-test, so the rest of the run still needs
      // to be profiled.
      expect(nativeModule.startProfiling).toHaveBeenCalledTimes(2);
      expect(isAppProfilingRecording()).toBe(true);
    });

    it('ignores transitions other than background', async () => {
      const nativeModule = mockNativeModule();
      const getListener = captureAppStateListener();

      initializeAppProfiling(true);
      await flushPromises();

      getListener()('active');
      await flushPromises();

      expect(nativeModule.stopProfilingToAppStorage).not.toHaveBeenCalled();
      expect(nativeModule.startProfiling).toHaveBeenCalledTimes(1);
    });

    it('registers a single listener even if called twice', async () => {
      mockNativeModule();
      const getListener = captureAppStateListener();

      initializeAppProfiling(true);
      initializeAppProfiling(true);
      await flushPromises();

      expect(getListener()).toBeDefined();
      expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
    });
  });
});
