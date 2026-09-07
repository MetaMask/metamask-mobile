/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

import {
  assertNoDeviceSessionOverride,
  normalizeAndroidComponent,
  parseAdbDevices,
  selectAndroidEmulator,
  validateAndroidPrerequisites,
} from '../android/prerequisites';
import { AndroidLaunchError } from '../launcher-types';

jest.mock('node:child_process', () => ({ execFileSync: jest.fn() }));
jest.mock('node:fs', () => ({ existsSync: jest.fn() }));
jest.mock('../resolve-repo-root', () => ({ resolveRepoRoot: () => '/repo' }));

const mockExecFileSync = jest.mocked(execFileSync);
const mockExistsSync = jest.mocked(existsSync);

function mockAdb(devices = 'emulator-5554 device product:sdk\n'): void {
  mockExecFileSync.mockImplementation((_file, args) => {
    const command = (args as string[]).join(' ');
    if (command === 'version') return 'Android Debug Bridge version 1.0.41';
    if (command === 'devices -l') return `List of devices attached\n${devices}`;
    if (command.includes('getprop sys.boot_completed')) return '1\n';
    if (command.includes('list packages')) return 'package:io.metamask\n';
    if (command.includes('resolve-activity'))
      return 'io.metamask/io.metamask.MainActivity\n';
    throw new Error(`Unexpected adb command: ${command}`);
  });
}

describe('Android prerequisites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  it('parses duplicate rows without deduplicating', () => {
    expect(
      parseAdbDevices(
        'List of devices attached\nemulator-5554 device\nemulator-5554 device\n',
      ),
    ).toHaveLength(2);
  });

  it('selects exactly one online emulator and ignores physical devices', () => {
    const devices = parseAdbDevices(
      'List of devices attached\nR58 device\nemulator-5554 device\n',
    );

    expect(selectAndroidEmulator(devices)).toBe('emulator-5554');
  });

  it.each([
    ['', 'No online'],
    ['R58 device\n', 'No online'],
    ['emulator-5554 device\nemulator-5556 device\n', 'Multiple'],
    ['emulator-5554 offline\n', 'No online'],
    ['emulator-5554 unauthorized\n', 'No online'],
  ])('fails closed for automatic selection: %s', (rows, message) => {
    expect(() =>
      selectAndroidEmulator(
        parseAdbDevices(`List of devices attached\n${rows}`),
      ),
    ).toThrow(message);
  });

  it.each([
    ['physical-1', 'must identify an emulator'],
    ['emulator-5554', 'exactly once'],
  ])('rejects invalid explicit selection %s', (deviceId, message) => {
    expect(() => selectAndroidEmulator([], deviceId)).toThrow(message);
  });

  it('rejects duplicate explicit selection', () => {
    const devices = parseAdbDevices(
      'emulator-5554 device\nemulator-5554 device',
    );
    expect(() => selectAndroidEmulator(devices, 'emulator-5554')).toThrow(
      'found 2',
    );
  });

  it.each(['offline', 'unauthorized'])(
    'rejects explicit emulator in %s state',
    (state) => {
      expect(() =>
        selectAndroidEmulator(
          [{ serial: 'emulator-5554', state }],
          'emulator-5554',
        ),
      ).toThrow(state);
    },
  );

  it('validates boot, exact package, and launch activity with serial-targeted adb', () => {
    mockAdb();

    expect(validateAndroidPrerequisites({ platform: 'android' })).toMatchObject(
      { serial: 'emulator-5554', appId: 'io.metamask' },
    );
    expect(
      mockExecFileSync.mock.calls
        .slice(2)
        .every(
          (call) =>
            (call[1] as string[]).slice(0, 2).join(' ') === '-s emulator-5554',
        ),
    ).toBe(true);
  });

  it.each([
    [
      'priority=0 preferredOrder=0 match=0x108000 specificIndex=-1 isDefault=true\n' +
        'io.metamask/.MainActivity\n',
      'real shorthand output with metadata',
    ],
    ['io.metamask/io.metamask.MainActivity\n', 'fully expanded output'],
  ])('accepts %s activity resolution form: %s', (activityOutput) => {
    mockAdb();
    mockExecFileSync.mockImplementation((_file, args) => {
      const command = (args as string[]).join(' ');
      if (command === 'version') return '';
      if (command === 'devices -l')
        return 'List of devices attached\nemulator-5554 device\n';
      if (command.includes('getprop')) return '1';
      if (command.includes('list packages')) return 'package:io.metamask';
      if (command.includes('resolve-activity')) return activityOutput;
      return '';
    });

    expect(() =>
      validateAndroidPrerequisites({ platform: 'android' }),
    ).not.toThrow();
  });

  it.each([
    ['io.metamask.flask/.MainActivity', 'wrong package'],
    ['io.metamask/.OtherActivity', 'wrong activity'],
    ['prefix io.metamask/.MainActivity suffix', 'substring'],
  ])('rejects %s component: %s', (activityOutput) => {
    mockAdb();
    mockExecFileSync.mockImplementation((_file, args) => {
      const command = (args as string[]).join(' ');
      if (command === 'version') return '';
      if (command === 'devices -l')
        return 'List of devices attached\nemulator-5554 device\n';
      if (command.includes('getprop')) return '1';
      if (command.includes('list packages')) return 'package:io.metamask';
      if (command.includes('resolve-activity')) return activityOutput;
      return '';
    });

    expect(() => validateAndroidPrerequisites({ platform: 'android' })).toThrow(
      'not a launchable activity',
    );
  });

  it('normalizes only exact Android component syntax', () => {
    expect(normalizeAndroidComponent('io.metamask/.MainActivity')).toBe(
      'io.metamask/io.metamask.MainActivity',
    );
    expect(
      normalizeAndroidComponent('io.metamask/io.metamask.MainActivity'),
    ).toBe('io.metamask/io.metamask.MainActivity');
    expect(
      normalizeAndroidComponent('io.metamask/.MainActivity extra'),
    ).toBeNull();
  });

  it.each([
    ['getprop sys.boot_completed', '0\n', 'completed booting'],
    ['list packages', 'package:io.metamask.flask\n', 'not installed'],
    [
      'resolve-activity',
      'io.metamask/.OtherActivity\n',
      'not a launchable activity',
    ],
  ])('rejects failed verification for %s', (needle, output, message) => {
    mockAdb();
    mockExecFileSync.mockImplementation((_file, args) => {
      const command = (args as string[]).join(' ');
      if (command === 'version') return '';
      if (command === 'devices -l')
        return 'List of devices attached\nemulator-5554 device\n';
      if (command.includes(needle)) return output;
      if (command.includes('getprop')) return '1';
      if (command.includes('list packages')) return 'package:io.metamask';
      if (command.includes('resolve-activity'))
        return 'io.metamask/io.metamask.MainActivity';
      return '';
    });

    expect(() => validateAndroidPrerequisites({ platform: 'android' })).toThrow(
      message,
    );
  });

  it.each([
    'reinstall',
    'resetAppData',
    'appBundlePath',
    'allowFoxCodeMismatch',
  ] as const)(
    'rejects Android lifecycle option %s without a destructive warning',
    (option) => {
      const stderrSpy = jest
        .spyOn(process.stderr, 'write')
        .mockImplementation(() => true);
      const value = option === 'appBundlePath' ? '/tmp/app.apk' : true;
      expect(() =>
        validateAndroidPrerequisites({ platform: 'android', [option]: value }),
      ).toThrow(option);
      expect(stderrSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('destructive'),
      );
      stderrSpy.mockRestore();
    },
  );

  it('rejects the core --extension-path APK input', () => {
    expect(() =>
      validateAndroidPrerequisites({
        platform: 'android',
        extensionPath: '/tmp/metamask.apk',
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'MM_INVALID_CONFIG',
        message:
          'Android reuses the installed io.metamask app. Unsupported APK lifecycle option(s): extensionPath (--extension-path).',
      }),
    );
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('fails closed when .device-session is present', () => {
    mockExistsSync.mockImplementation(
      (candidate) => candidate === '/repo/.device-session',
    );
    expect(() => assertNoDeviceSessionOverride()).toThrow(
      expect.objectContaining({
        code: 'MM_INVALID_CONFIG',
        message: expect.stringContaining(
          'Remediation: Remove or move .device-session',
        ),
      }),
    );
  });

  it('classifies unavailable emulators as device failures', () => {
    try {
      selectAndroidEmulator([]);
      throw new Error('Expected selectAndroidEmulator to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AndroidLaunchError);
      expect(error).toMatchObject({ code: 'MM_DEVICE_NOT_AVAILABLE' });
    }
  });
});
