/* eslint-disable import-x/no-nodejs-modules -- the adb calls under test are mocked here. */
jest.mock('child_process', () => {
  const actual =
    jest.requireActual<typeof import('child_process')>('child_process');
  return {
    ...actual,
    execFile: jest.fn(),
  };
});

import { execFile } from 'child_process';
import type { TestInfo } from '@playwright/test';
import { captureAndroidDeviceLogs } from './androidDeviceLogs.fixture.ts';
import type { CurrentDeviceDetails } from './types.ts';
import { Platform } from '../../types.ts';

const execFileMock = execFile as unknown as jest.Mock;

type ExecFileCallback = (
  error: Error | null,
  stdout?: Buffer | string,
  stderr?: Buffer | string,
) => void;

interface FakeTestInfo {
  titlePath: string[];
  project: { name: string };
  retry: number;
  status: TestInfo['status'];
  attach: jest.Mock;
}

const createTestInfo = (
  overrides: Partial<FakeTestInfo> = {},
): FakeTestInfo => ({
  titlePath: ['Android', 'accounts', 'reveal secret recovery phrase'],
  project: { name: 'android' },
  retry: 0,
  status: 'failed',
  attach: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const androidDevice = (): CurrentDeviceDetails => ({
  platform: Platform.ANDROID,
  deviceName: 'Pixel_5_Pro_API_34',
  udid: 'emulator-5554',
  isBrowserstack: false,
  isRemoteCloud: false,
});

const iosDevice = (): CurrentDeviceDetails => ({
  platform: Platform.IOS,
  deviceName: 'iPhone 16 Pro',
  udid: '1A2B3C-DEF',
  isBrowserstack: false,
  isRemoteCloud: false,
});

const stubAdb = (stdout: string): void => {
  execFileMock.mockImplementation(
    (
      _command: string,
      _args: string[],
      _options: object,
      callback: ExecFileCallback,
    ) => {
      callback(null, Buffer.from(stdout));
    },
  );
};

describe('androidDeviceLogs fixture', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  it('captures nothing on iOS', async () => {
    const use = jest.fn().mockResolvedValue(undefined);
    const testInfo = createTestInfo();

    await captureAndroidDeviceLogs(
      { currentDeviceDetails: iosDevice() },
      use,
      testInfo as unknown as TestInfo,
    );

    expect(use).toHaveBeenCalledTimes(1);
    expect(execFileMock).not.toHaveBeenCalled();
    expect(testInfo.attach).not.toHaveBeenCalled();
  });

  it('clears the buffer before the test and attaches the dump on failure', async () => {
    stubAdb('E/ReactNativeJS: Fabric mount failed\n');
    let adbCallsDuringUse = 0;
    const use = jest.fn().mockImplementation(async () => {
      adbCallsDuringUse = execFileMock.mock.calls.length;
    });
    const testInfo = createTestInfo();

    await captureAndroidDeviceLogs(
      { currentDeviceDetails: androidDevice() },
      use,
      testInfo as unknown as TestInfo,
    );

    expect(adbCallsDuringUse).toBe(1);
    expect(execFileMock.mock.calls[0][1]).toEqual([
      '-s',
      'emulator-5554',
      'logcat',
      '-c',
    ]);
    expect(testInfo.attach).toHaveBeenCalledTimes(1);
    expect(testInfo.attach.mock.calls[0][1].body).toContain(
      'E/ReactNativeJS: Fabric mount failed',
    );
  });

  it('does not attach the dump for a passing test', async () => {
    stubAdb('D/ReactNativeJS: app started\n');
    const use = jest.fn().mockResolvedValue(undefined);
    const testInfo = createTestInfo({ status: 'passed' });

    await captureAndroidDeviceLogs(
      { currentDeviceDetails: androidDevice() },
      use,
      testInfo as unknown as TestInfo,
    );

    expect(execFileMock).toHaveBeenCalledTimes(1);
    expect(testInfo.attach).not.toHaveBeenCalled();
  });

  it('leaves the failure under test untouched when adb is unavailable', async () => {
    execFileMock.mockImplementation(
      (
        _command: string,
        _args: string[],
        _options: object,
        callback: ExecFileCallback,
      ) => {
        callback(
          Object.assign(new Error('spawn adb ENOENT'), { code: 'ENOENT' }),
        );
      },
    );
    const use = jest.fn().mockResolvedValue(undefined);
    const testInfo = createTestInfo();

    await expect(
      captureAndroidDeviceLogs(
        { currentDeviceDetails: androidDevice() },
        use,
        testInfo as unknown as TestInfo,
      ),
    ).resolves.toBeUndefined();

    expect(testInfo.attach).not.toHaveBeenCalled();
  });

  it('still dumps the log when the test body throws', async () => {
    stubAdb('E/AndroidRuntime: FATAL EXCEPTION: main\n');
    const use = jest.fn().mockRejectedValue(new Error('element not found'));
    const testInfo = createTestInfo();

    await expect(
      captureAndroidDeviceLogs(
        { currentDeviceDetails: androidDevice() },
        use,
        testInfo as unknown as TestInfo,
      ),
    ).rejects.toThrow('element not found');

    expect(testInfo.attach).toHaveBeenCalledTimes(1);
  });
});
