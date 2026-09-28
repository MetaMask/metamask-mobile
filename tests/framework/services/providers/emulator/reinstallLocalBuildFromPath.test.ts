/* eslint-disable import-x/no-nodejs-modules */
import { execFile } from 'node:child_process';
import { Platform, ProviderName } from '../../../types.ts';
import type { ProjectConfig } from '../../common/types.ts';
import {
  reinstallFromBuildPathForProject,
  shouldSkipAppReinstallFromEnv,
} from './reinstallLocalBuildFromPath';

jest.mock('node:child_process', () => ({
  execFile: jest.fn(
    (
      _command: string,
      _args: string[],
      _options: object,
      callback: (
        error: null,
        result: { stdout: string; stderr: string },
      ) => void,
    ) => callback(null, { stdout: '', stderr: '' }),
  ),
}));

jest.mock('./android/resolveAndroidAdbUdid', () => ({
  resolveAndroidAdbUdidForDevice: jest.fn().mockResolvedValue('emulator-5554'),
}));

jest.mock('../../appium/EmulatorHelpers', () => ({
  getIosSimulatorUdid: jest.fn(),
}));

describe('shouldSkipAppReinstallFromEnv', () => {
  const key = 'SKIP_APP_REINSTALL';
  let previous: string | undefined;

  beforeEach(() => {
    previous = process.env[key];
  });

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  });

  it('returns false when the variable is unset', () => {
    delete process.env[key];

    expect(shouldSkipAppReinstallFromEnv()).toBe(false);
  });

  it('returns true for true, 1, and yes (case-insensitive)', () => {
    process.env[key] = 'true';
    expect(shouldSkipAppReinstallFromEnv()).toBe(true);

    process.env[key] = 'TRUE';
    expect(shouldSkipAppReinstallFromEnv()).toBe(true);

    process.env[key] = '1';
    expect(shouldSkipAppReinstallFromEnv()).toBe(true);

    process.env[key] = 'yes';
    expect(shouldSkipAppReinstallFromEnv()).toBe(true);
  });

  it('returns false for false, 0, no, and other values', () => {
    process.env[key] = 'false';
    expect(shouldSkipAppReinstallFromEnv()).toBe(false);

    process.env[key] = '0';
    expect(shouldSkipAppReinstallFromEnv()).toBe(false);

    process.env[key] = 'no';
    expect(shouldSkipAppReinstallFromEnv()).toBe(false);

    process.env[key] = 'maybe';
    expect(shouldSkipAppReinstallFromEnv()).toBe(false);
  });
});

describe('reinstallFromBuildPathForProject', () => {
  const mockedExecFile = jest.mocked(execFile);
  const previousPool = process.env.ANDROID_DEVICE_POOL;
  const previousPoolSize = process.env.ANDROID_DEVICE_POOL_SIZE;

  afterEach(() => {
    mockedExecFile.mockClear();
    if (previousPool === undefined) {
      delete process.env.ANDROID_DEVICE_POOL;
    } else {
      process.env.ANDROID_DEVICE_POOL = previousPool;
    }
    if (previousPoolSize === undefined) {
      delete process.env.ANDROID_DEVICE_POOL_SIZE;
    } else {
      process.env.ANDROID_DEVICE_POOL_SIZE = previousPoolSize;
    }
  });

  it('installs the APK on every device derived from pool size', async () => {
    delete process.env.ANDROID_DEVICE_POOL;
    process.env.ANDROID_DEVICE_POOL_SIZE = '2';
    const logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    };

    await reinstallFromBuildPathForProject(
      {
        use: {
          platform: Platform.ANDROID,
          device: {
            provider: ProviderName.EMULATOR,
            name: 'appium_smoke_avd',
          },
          app: {
            packageName: 'io.metamask',
          },
        },
      } as unknown as ProjectConfig,
      'build/app.apk',
      logger,
    );

    const installSerials = mockedExecFile.mock.calls
      .filter(([, args]) => (args as string[]).includes('install'))
      .map(([, args]) => (args as string[])[1]);
    expect(installSerials).toEqual(['emulator-5554', 'emulator-5556']);
  });
});
