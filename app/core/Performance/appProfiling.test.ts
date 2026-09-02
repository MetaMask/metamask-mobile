import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import {
  __resetAppProfilingForTests,
  getLastAppProfilePath,
  isAppProfilingRecording,
  isPerformanceProfilingEnabled,
  PERFORMANCE_PROFILE_ANDROID_FILENAME,
  startAppProfiling,
  stopAppProfiling,
} from './appProfiling';
import { startProfiling, stopProfiling } from 'react-native-release-profiler';

jest.mock('react-native-release-profiler', () => ({
  startProfiling: jest.fn(),
  stopProfiling: jest.fn(),
}));

jest.mock('react-native-fs', () => ({
  DownloadDirectoryPath: '/sdcard/Download',
  copyFile: jest.fn(),
}));

describe('appProfiling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAppProfilingForTests();
    Platform.OS = 'ios';
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
    expect(stopProfiling).not.toHaveBeenCalled();
    expect(getLastAppProfilePath()).toBeNull();
  });

  it('starts and stops profiling when enabled on iOS', async () => {
    Platform.OS = 'ios';
    (startProfiling as jest.Mock).mockResolvedValue(undefined);
    (stopProfiling as jest.Mock).mockResolvedValue('/tmp/profile.cpuprofile');

    const started = await startAppProfiling(true);

    expect(started).toBe(true);
    expect(startProfiling).toHaveBeenCalledTimes(1);
    expect(isAppProfilingRecording()).toBe(true);

    const path = await stopAppProfiling(true);

    expect(stopProfiling).toHaveBeenCalledWith(true);
    expect(path).toBe('/tmp/profile.cpuprofile');
    expect(getLastAppProfilePath()).toBe(path);
    expect(RNFS.copyFile).not.toHaveBeenCalled();
    expect(isAppProfilingRecording()).toBe(false);
  });

  it('copies Android profile to the stable Downloads filename for Appium pull', async () => {
    Platform.OS = 'android';
    (startProfiling as jest.Mock).mockResolvedValue(undefined);
    (stopProfiling as jest.Mock).mockResolvedValue(
      '/sdcard/Download/unique-session.cpuprofile',
    );
    (RNFS.copyFile as jest.Mock).mockResolvedValue(undefined);

    await startAppProfiling(true);
    const path = await stopAppProfiling(true);

    expect(RNFS.copyFile).toHaveBeenCalledWith(
      '/sdcard/Download/unique-session.cpuprofile',
      `/sdcard/Download/${PERFORMANCE_PROFILE_ANDROID_FILENAME}`,
    );
    expect(path).toBe(
      `/sdcard/Download/${PERFORMANCE_PROFILE_ANDROID_FILENAME}`,
    );
  });

  it('returns null from stop when no session is recording', async () => {
    const path = await stopAppProfiling(true);

    expect(path).toBeNull();
    expect(stopProfiling).not.toHaveBeenCalled();
  });
});
