/* eslint-disable import-x/no-nodejs-modules */
import type { TestInfo } from '@playwright/test';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import { copyProfilerResult } from './Profiler';

jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  copyFile: jest.fn(),
  writeFile: jest.fn(),
}));

const execFileMock = execFile as unknown as jest.Mock;
const mkdirMock = fs.mkdir as jest.Mock;
const copyFileMock = fs.copyFile as jest.Mock;
const writeFileMock = fs.writeFile as jest.Mock;

function createTestInfo(): TestInfo {
  return {
    project: { name: 'android-smoke' },
    title: 'captures profile',
    titlePath: ['suite', 'captures profile'],
    retry: 0,
    attach: jest.fn(),
  } as unknown as TestInfo;
}

function mockCommandOutputs(...outputs: string[]): void {
  execFileMock.mockImplementation(
    (
      _command: string,
      _args: string[],
      _options: unknown,
      callback: (
        error: Error | null,
        result: { stdout: string; stderr: string },
      ) => void,
    ) => {
      callback(null, {
        stdout: outputs.shift() ?? '',
        stderr: '',
      });
    },
  );
}

describe('copyProfilerResult', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mkdirMock.mockResolvedValue(undefined);
    copyFileMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
  });

  it('extracts the newest Android profile from the app cache', async () => {
    mockCommandOutputs('profile.cpuprofile', 'profile contents');
    const testInfo = createTestInfo();

    const result = await copyProfilerResult({
      outputDirectory: 'tests/test-reports/appium-profiles/android',
      testInfo,
      device: {
        platform: 'android',
        udid: 'emulator-5554',
        packageName: 'io.metamask',
      },
    });

    expect(result).toMatch(
      /android-smoke-suite-captures_profile-retry-0\.cpuprofile$/,
    );
    expect(execFileMock).toHaveBeenNthCalledWith(
      1,
      'adb',
      [
        '-s',
        'emulator-5554',
        'shell',
        'run-as',
        'io.metamask',
        'ls',
        '-t',
        '-p',
        'cache/',
      ],
      expect.any(Object),
      expect.any(Function),
    );
    expect(execFileMock).toHaveBeenNthCalledWith(
      2,
      'adb',
      [
        '-s',
        'emulator-5554',
        'exec-out',
        'run-as',
        'io.metamask',
        'cat',
        'cache/profile.cpuprofile',
      ],
      expect.any(Object),
      expect.any(Function),
    );
    expect(writeFileMock).toHaveBeenCalledWith(result, 'profile contents');
    expect(testInfo.attach).toHaveBeenCalledWith(
      expect.stringContaining('.cpuprofile'),
      expect.objectContaining({
        path: result,
        contentType: 'application/json',
      }),
    );
  });

  it('copies an iOS profile from the simulator data container', async () => {
    mockCommandOutputs(
      '/simulator/Containers/Data/Application/profile-data',
      '/simulator/Containers/Data/Application/profile-data/Library/Caches/profile.cpuprofile',
    );
    const testInfo = createTestInfo();

    const result = await copyProfilerResult({
      outputDirectory: 'tests/test-reports/appium-profiles/ios',
      testInfo,
      device: {
        platform: 'ios',
        udid: 'SIMULATOR-UDID',
        appId: 'io.metamask.MetaMask',
      },
    });

    expect(copyFileMock).toHaveBeenCalledWith(
      '/simulator/Containers/Data/Application/profile-data/Library/Caches/profile.cpuprofile',
      result,
    );
    expect(execFileMock).toHaveBeenNthCalledWith(
      1,
      'xcrun',
      [
        'simctl',
        'get_app_container',
        'SIMULATOR-UDID',
        'io.metamask.MetaMask',
        'data',
      ],
      expect.any(Object),
      expect.any(Function),
    );
    expect(execFileMock).toHaveBeenNthCalledWith(
      2,
      'find',
      [
        '/simulator/Containers/Data/Application/profile-data',
        '-type',
        'f',
        '-name',
        '*.cpuprofile',
        '-print',
      ],
      expect.any(Object),
      expect.any(Function),
    );
  });
});
