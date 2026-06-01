/* eslint-disable import-x/no-nodejs-modules */
jest.mock('child_process', () => {
  const actual =
    jest.requireActual<typeof import('child_process')>('child_process');
  return {
    ...actual,
    execFile: jest.fn(),
  };
});
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  rm: jest.fn(),
}));

import { execFile } from 'child_process';
import fs from 'fs/promises';
import type { CurrentDeviceDetails } from '../../fixture';
import { DeviceCommandHandler } from './DeviceCommandHandler';

const execFileMock = execFile as unknown as jest.Mock;
const readdirMock = fs.readdir as unknown as jest.Mock;
const rmMock = fs.rm as unknown as jest.Mock;

type ExecFileCallback = (
  err: Error | null,
  stdout?: Buffer | string,
  stderr?: Buffer | string,
) => void;

/**
 * Builds Android device details for command handler tests.
 */
function androidDevice(
  overrides: Partial<CurrentDeviceDetails> = {},
): CurrentDeviceDetails {
  return {
    platform: 'android',
    deviceName: 'Pixel_5',
    udid: 'emulator-5554',
    packageName: 'io.metamask',
    launchableActivity: 'io.metamask.MainActivity',
    isBrowserstack: false,
    ...overrides,
  };
}

/**
 * Builds iOS device details for command handler tests.
 */
function iosDevice(
  overrides: Partial<CurrentDeviceDetails> = {},
): CurrentDeviceDetails {
  return {
    platform: 'ios',
    deviceName: 'iPhone 15',
    appId: 'io.metamask',
    isBrowserstack: false,
    ...overrides,
  };
}

/**
 * Mocks every `execFile` invocation as a successful command.
 */
function mockExecFileSuccess(stdout = '', stderr = ''): void {
  execFileMock.mockImplementation(
    (_cmd: string, _args: string[], _opts: object, cb: ExecFileCallback) => {
      cb(null, Buffer.from(stdout), Buffer.from(stderr));
    },
  );
}

/**
 * Mocks sequential `execFile` responses for commands that perform multiple steps.
 */
function mockExecFileResponses(
  responses: { error?: Error; stdout?: string; stderr?: string }[],
): void {
  execFileMock.mockImplementation(
    (_cmd: string, _args: string[], _opts: object, cb: ExecFileCallback) => {
      const response = responses.shift();
      cb(
        response?.error ?? null,
        Buffer.from(response?.stdout ?? ''),
        Buffer.from(response?.stderr ?? ''),
      );
    },
  );
}

/**
 * Mocks every `execFile` invocation as a failed command.
 */
function mockExecFileFailure(message: string): void {
  execFileMock.mockImplementation(
    (_cmd: string, _args: string[], _opts: object, cb: ExecFileCallback) => {
      cb(new Error(message));
    },
  );
}

describe('DeviceCommandHandler', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    execFileMock.mockReset();
    readdirMock.mockReset();
    rmMock.mockReset();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('delegates Android uninstall to adb using currentDeviceDetails defaults', async () => {
    mockExecFileSuccess('Success\n');

    await new DeviceCommandHandler({
      currentDeviceDetails: androidDevice(),
    }).uninstallApp();

    expect(execFileMock).toHaveBeenCalledWith(
      'adb',
      ['-s', 'emulator-5554', 'uninstall', 'io.metamask'],
      expect.objectContaining({
        timeout: 120_000,
        maxBuffer: 2 * 1024 * 1024,
      }),
      expect.any(Function),
    );
  });

  it('delegates Android install to adb with an absolute build path', async () => {
    mockExecFileSuccess('Success\n');

    await new DeviceCommandHandler({
      currentDeviceDetails: androidDevice(),
    }).installApp({ buildPath: '/tmp/metamask.apk' });

    expect(execFileMock).toHaveBeenCalledWith(
      'adb',
      ['-s', 'emulator-5554', 'install', '/tmp/metamask.apk'],
      expect.objectContaining({
        timeout: 10 * 60_000,
        maxBuffer: 2 * 1024 * 1024,
      }),
      expect.any(Function),
    );
  });

  it('runs Android reinstall as uninstall then install', async () => {
    mockExecFileSuccess('Success\n');

    await new DeviceCommandHandler({
      currentDeviceDetails: androidDevice(),
    }).reinstallApp({ buildPath: '/tmp/metamask.apk' });

    expect(execFileMock).toHaveBeenNthCalledWith(
      1,
      'adb',
      ['-s', 'emulator-5554', 'uninstall', 'io.metamask'],
      expect.objectContaining({ timeout: 120_000 }),
      expect.any(Function),
    );
    expect(execFileMock).toHaveBeenNthCalledWith(
      2,
      'adb',
      ['-s', 'emulator-5554', 'install', '/tmp/metamask.apk'],
      expect.objectContaining({ timeout: 10 * 60_000 }),
      expect.any(Function),
    );
  });

  it('checks Android package installation with exact package matching', async () => {
    mockExecFileSuccess('package:io.metamask.debug\npackage:io.metamask\n');

    const result = await new DeviceCommandHandler({
      currentDeviceDetails: androidDevice(),
    }).isAppInstalled();

    expect(result).toBe(true);
    expect(execFileMock).toHaveBeenCalledWith(
      'adb',
      ['-s', 'emulator-5554', 'shell', 'pm', 'list', 'packages', 'io.metamask'],
      expect.objectContaining({ timeout: 20_000 }),
      expect.any(Function),
    );
  });

  it('clears Android app data with adb shell pm clear', async () => {
    mockExecFileSuccess('Success\n');

    await new DeviceCommandHandler({
      currentDeviceDetails: androidDevice(),
    }).clearAppData();

    expect(execFileMock).toHaveBeenCalledWith(
      'adb',
      ['-s', 'emulator-5554', 'shell', 'pm', 'clear', 'io.metamask'],
      expect.objectContaining({
        timeout: 120_000,
        maxBuffer: 2 * 1024 * 1024,
      }),
      expect.any(Function),
    );
  });

  it('uses a default logger when one is not provided', async () => {
    mockExecFileSuccess('Success\n');

    await new DeviceCommandHandler({
      currentDeviceDetails: androidDevice(),
    }).clearAppData();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DeviceCommandHandler]'),
    );
  });

  it('delegates iOS uninstall to xcrun simctl using currentDeviceDetails defaults', async () => {
    mockExecFileSuccess('');

    await new DeviceCommandHandler({
      currentDeviceDetails: iosDevice(),
    }).uninstallApp();

    expect(execFileMock).toHaveBeenCalledWith(
      'xcrun',
      ['simctl', 'uninstall', 'iPhone 15', 'io.metamask'],
      expect.objectContaining({
        timeout: 120_000,
        maxBuffer: 2 * 1024 * 1024,
      }),
      expect.any(Function),
    );
  });

  it('runs iOS reinstall as uninstall then install', async () => {
    mockExecFileSuccess('');

    await new DeviceCommandHandler({
      currentDeviceDetails: iosDevice(),
    }).reinstallApp({ buildPath: '/tmp/MetaMask.app' });

    expect(execFileMock).toHaveBeenNthCalledWith(
      1,
      'xcrun',
      ['simctl', 'uninstall', 'iPhone 15', 'io.metamask'],
      expect.objectContaining({ timeout: 120_000 }),
      expect.any(Function),
    );
    expect(execFileMock).toHaveBeenNthCalledWith(
      2,
      'xcrun',
      ['simctl', 'install', 'iPhone 15', '/tmp/MetaMask.app'],
      expect.objectContaining({
        timeout: 10 * 60_000,
        maxBuffer: 2 * 1024 * 1024,
      }),
      expect.any(Function),
    );
  });

  it('checks iOS app installation by reading the app container', async () => {
    mockExecFileSuccess('/Users/me/Containers/Data/Application/abc\n');

    const result = await new DeviceCommandHandler({
      currentDeviceDetails: iosDevice(),
    }).isAppInstalled();

    expect(result).toBe(true);
    expect(execFileMock).toHaveBeenCalledWith(
      'xcrun',
      ['simctl', 'get_app_container', 'iPhone 15', 'io.metamask'],
      expect.objectContaining({ timeout: 20_000 }),
      expect.any(Function),
    );
  });

  it('clears iOS app data by terminating the app, resolving the data container, and removing its contents', async () => {
    const appDataPath = '/Users/me/Containers/Data/Application/abc';
    mockExecFileResponses([{ stdout: '' }, { stdout: `${appDataPath}\n` }]);
    readdirMock.mockResolvedValue(['Documents', 'Library', 'tmp']);
    rmMock.mockResolvedValue(undefined);

    await new DeviceCommandHandler({
      currentDeviceDetails: iosDevice(),
    }).clearAppData();

    expect(execFileMock).toHaveBeenNthCalledWith(
      1,
      'xcrun',
      ['simctl', 'terminate', 'iPhone 15', 'io.metamask'],
      expect.objectContaining({
        timeout: 120_000,
        maxBuffer: 2 * 1024 * 1024,
      }),
      expect.any(Function),
    );
    expect(execFileMock).toHaveBeenNthCalledWith(
      2,
      'xcrun',
      ['simctl', 'get_app_container', 'iPhone 15', 'io.metamask', 'data'],
      expect.objectContaining({ timeout: 20_000 }),
      expect.any(Function),
    );
    expect(readdirMock).toHaveBeenCalledWith(appDataPath);
    expect(rmMock).toHaveBeenCalledTimes(3);
    expect(rmMock).toHaveBeenCalledWith(`${appDataPath}/Documents`, {
      recursive: true,
      force: true,
    });
    expect(rmMock).toHaveBeenCalledWith(`${appDataPath}/Library`, {
      recursive: true,
      force: true,
    });
    expect(rmMock).toHaveBeenCalledWith(`${appDataPath}/tmp`, {
      recursive: true,
      force: true,
    });
  });

  it('rejects empty iOS app data container paths', async () => {
    mockExecFileResponses([{ stdout: '' }, { stdout: '\n' }]);

    await expect(
      new DeviceCommandHandler({
        currentDeviceDetails: iosDevice(),
      }).clearAppData(),
    ).rejects.toThrow('Could not resolve iOS app data container');
    expect(readdirMock).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalled();
  });

  it('throws for BrowserStack devices', () => {
    expect(
      () =>
        new DeviceCommandHandler({
          currentDeviceDetails: androidDevice({ isBrowserstack: true }),
        }),
    ).toThrow('BrowserStack does not expose adb/simctl access');
  });

  it('throws for unsupported platforms', () => {
    const unsupportedDevice = {
      ...androidDevice(),
      platform: 'windows',
    } as unknown as CurrentDeviceDetails;

    expect(
      () =>
        new DeviceCommandHandler({
          currentDeviceDetails: unsupportedDevice,
        }),
    ).toThrow('Unsupported platform');
  });

  it('validates Android udid and package name requirements', async () => {
    await expect(
      new DeviceCommandHandler({
        currentDeviceDetails: androidDevice({ udid: undefined }),
      }).installApp({ buildPath: '/tmp/metamask.apk' }),
    ).rejects.toThrow('currentDeviceDetails.udid');

    await expect(
      new DeviceCommandHandler({
        currentDeviceDetails: androidDevice({ packageName: undefined }),
      }).uninstallApp(),
    ).rejects.toThrow('packageName');
  });

  it('validates iOS device name and app id requirements', async () => {
    await expect(
      new DeviceCommandHandler({
        currentDeviceDetails: iosDevice({ deviceName: '' }),
      }).installApp({ buildPath: '/tmp/MetaMask.app' }),
    ).rejects.toThrow('currentDeviceDetails.deviceName');

    await expect(
      new DeviceCommandHandler({
        currentDeviceDetails: iosDevice({ appId: undefined }),
      }).uninstallApp(),
    ).rejects.toThrow('appId');
  });

  it('suppresses uninstall failures by default and rethrows when requested', async () => {
    mockExecFileFailure('not installed');

    await expect(
      new DeviceCommandHandler({
        currentDeviceDetails: androidDevice(),
      }).uninstallApp(),
    ).resolves.toBeUndefined();

    await expect(
      new DeviceCommandHandler({
        currentDeviceDetails: androidDevice(),
      }).uninstallApp({ ignoreMissing: false }),
    ).rejects.toThrow('not installed');
  });
});
