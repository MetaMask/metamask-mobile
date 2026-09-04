/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'node:child_process';

import { runAdb, runDeviceAdb } from '../android/adb';
import { AndroidLaunchError } from '../launcher-types';

jest.mock('node:child_process', () => ({ execFileSync: jest.fn() }));

const mockExecFileSync = jest.mocked(execFileSync);

describe('Android ADB commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecFileSync.mockReturnValue('');
  });

  it('bounds general ADB commands', () => {
    // Arrange
    const args = ['devices', '-l'];

    // Act
    runAdb(args);

    // Assert
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'adb',
      args,
      expect.objectContaining({ timeout: 10_000 }),
    );
  });

  it('bounds device-targeted ADB commands', () => {
    // Arrange
    const serial = 'emulator-5554';
    const args = ['shell', 'echo', 'hi'];

    // Act
    runDeviceAdb(serial, args);

    // Assert
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'adb',
      ['-s', serial, ...args],
      expect.objectContaining({ timeout: 10_000 }),
    );
  });

  it('converts timed out device commands to AndroidLaunchError', () => {
    // Arrange
    mockExecFileSync.mockImplementation(() => {
      throw Object.assign(new Error('Command failed'), { code: 'ETIMEDOUT' });
    });

    // Act
    const runCommand = () =>
      runDeviceAdb('emulator-5554', ['shell', 'echo', 'hi']);

    // Assert
    expect(runCommand).toThrow(AndroidLaunchError);
    expect(runCommand).toThrow(
      expect.objectContaining({ code: 'MM_DEVICE_NOT_AVAILABLE' }),
    );
  });
});
