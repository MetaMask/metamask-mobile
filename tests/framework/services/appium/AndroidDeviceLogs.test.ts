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
import {
  ANDROID_DEVICE_LOGS_ATTACHMENT_NAME,
  ANDROID_LOGCAT_MAX_BYTES,
  ANDROID_LOGCAT_MAX_LINES,
  ANDROID_LOGCAT_TAG_FILTERS,
  attachAndroidDeviceLogs,
  buildAndroidDeviceLogsBody,
  buildLogcatClearArgs,
  buildLogcatDumpArgs,
  capAndroidLogBody,
  clearAndroidLogBuffer,
  dumpAndroidLogcat,
  isAndroidDeviceLogCaptureEnabled,
  shouldAttachAndroidDeviceLogs,
} from './AndroidDeviceLogs.ts';
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

const stubAdbSuccess = (stdout: string): void => {
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

const stubAdbFailure = (error: Error): void => {
  execFileMock.mockImplementation(
    (
      _command: string,
      _args: string[],
      _options: object,
      callback: ExecFileCallback,
    ) => {
      callback(error, Buffer.from(''), Buffer.from('adb: device offline'));
    },
  );
};

describe('AndroidDeviceLogs', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  describe('isAndroidDeviceLogCaptureEnabled', () => {
    it('returns true for a local Android device', () => {
      const target = { platform: Platform.ANDROID, udid: 'emulator-5554' };

      const result = isAndroidDeviceLogCaptureEnabled(target);

      expect(result).toBe(true);
    });

    it('returns false for iOS so the capture is a no-op', () => {
      const target = { platform: Platform.IOS, udid: '1A2B3C-DEF' };

      const result = isAndroidDeviceLogCaptureEnabled(target);

      expect(result).toBe(false);
    });

    it('returns false for Android cloud devices without local adb', () => {
      const target = {
        platform: Platform.ANDROID,
        udid: 'cloud-device',
        isRemoteCloud: true,
      };

      const result = isAndroidDeviceLogCaptureEnabled(target);

      expect(result).toBe(false);
    });

    it('returns false when the project has no platform', () => {
      const result = isAndroidDeviceLogCaptureEnabled({});

      expect(result).toBe(false);
    });
  });

  describe('buildLogcatDumpArgs', () => {
    it('targets the adb serial and keeps the line cap plus tag filters', () => {
      const args = buildLogcatDumpArgs('emulator-5554');

      // Listed literally on purpose: changing the allowlist has to be a
      // deliberate edit here too, so a tag cannot be dropped by accident.
      expect(args).toEqual([
        '-s',
        'emulator-5554',
        'logcat',
        '-d',
        '-v',
        'threadtime',
        '-t',
        String(ANDROID_LOGCAT_MAX_LINES),
        '-s',
        'AndroidRuntime:V',
        'DEBUG:V',
        'libc:V',
        'System.err:V',
        'ReactNative:V',
        'ReactNativeJS:V',
        'ActivityManager:I',
        'lowmemorykiller:V',
        'lmkd:V',
        '*:W',
      ]);
    });

    it('ends with a catch-all so unlisted tags still contribute failures', () => {
      // React Native prefix its own tags (`unknown:SurfaceMountingManager`), so
      // naming class names alone would drop the crash we are chasing.
      expect(ANDROID_LOGCAT_TAG_FILTERS.at(-1)).toBe('*:W');
    });

    it('keeps process death at info level', () => {
      // `Process ... has died` and `Force stopping ...` are I, not W.
      expect(ANDROID_LOGCAT_TAG_FILTERS).toContain('ActivityManager:I');
    });

    it('omits the serial so adb falls back to ANDROID_SERIAL', () => {
      const args = buildLogcatDumpArgs();

      expect(args.slice(0, 2)).toEqual(['logcat', '-d']);
    });
  });

  describe('buildLogcatClearArgs', () => {
    it('clears the buffer of the given serial', () => {
      const args = buildLogcatClearArgs('emulator-5554');

      expect(args).toEqual(['-s', 'emulator-5554', 'logcat', '-c']);
    });
  });

  describe('shouldAttachAndroidDeviceLogs', () => {
    it.each(['failed', 'timedOut', 'interrupted'] as const)(
      'returns true for a %s test',
      (status) => {
        expect(shouldAttachAndroidDeviceLogs(status)).toBe(true);
      },
    );

    it.each(['passed', 'skipped', undefined] as const)(
      'returns false for a %s test',
      (status) => {
        expect(shouldAttachAndroidDeviceLogs(status)).toBe(false);
      },
    );
  });

  describe('capAndroidLogBody', () => {
    it('keeps a log under the cap unchanged', () => {
      const log = 'D/ReactNativeJS: app started\n';

      const result = capAndroidLogBody(log, 1024);

      expect(result).toEqual({ body: log, truncated: false });
    });

    it('keeps the tail of a log over the cap', () => {
      const log = `${'x'.repeat(2048)}CRASH AT THE END`;

      const result = capAndroidLogBody(log, 1024);

      expect(result.truncated).toBe(true);
      expect(Buffer.byteLength(result.body, 'utf8')).toBe(1024);
      expect(result.body.endsWith('CRASH AT THE END')).toBe(true);
    });
  });

  describe('buildAndroidDeviceLogsBody', () => {
    it('prefixes the log with a self-describing header', () => {
      const body = buildAndroidDeviceLogsBody('D/ReactNativeJS: app started', {
        titlePath: ['Android', 'accounts'],
        projectName: 'android',
        retry: 1,
        serial: 'emulator-5554',
        truncated: false,
        capturedAt: '2026-01-01T00:00:00.000Z',
      });

      expect(body).toContain('# device: emulator-5554');
      expect(body).toContain('(retry 1)');
      expect(body).toContain('# filters: AndroidRuntime:V');
      expect(body).not.toContain('# truncated');
      expect(body.endsWith('D/ReactNativeJS: app started')).toBe(true);
    });

    it('notes the truncation when the dump was capped', () => {
      const body = buildAndroidDeviceLogsBody('tail', {
        titlePath: ['Android'],
        projectName: 'android',
        retry: 0,
        truncated: true,
      });

      expect(body).toContain(
        `# truncated: kept the last ${ANDROID_LOGCAT_MAX_BYTES} bytes`,
      );
    });
  });

  describe('clearAndroidLogBuffer', () => {
    it('clears the buffer through adb', async () => {
      stubAdbSuccess('');

      const cleared = await clearAndroidLogBuffer('emulator-5554');

      expect(cleared).toBe(true);
      expect(execFileMock).toHaveBeenCalledTimes(1);
      expect(execFileMock.mock.calls[0][0]).toBe('adb');
      expect(execFileMock.mock.calls[0][1]).toEqual([
        '-s',
        'emulator-5554',
        'logcat',
        '-c',
      ]);
    });

    it('returns false when adb exits non-zero', async () => {
      stubAdbFailure(new Error('Command failed: adb logcat -c'));

      const cleared = await clearAndroidLogBuffer('emulator-5554');

      expect(cleared).toBe(false);
    });
  });

  describe('dumpAndroidLogcat', () => {
    it('returns the adb stdout', async () => {
      stubAdbSuccess('01-01 00:00:00.000  1234  1234 I ReactNativeJS: hello\n');

      const log = await dumpAndroidLogcat('emulator-5554');

      expect(log).toBe(
        '01-01 00:00:00.000  1234  1234 I ReactNativeJS: hello\n',
      );
    });

    it('returns undefined when adb is not installed', async () => {
      const enoent = Object.assign(new Error('spawn adb ENOENT'), {
        code: 'ENOENT',
      });
      stubAdbFailure(enoent);

      const log = await dumpAndroidLogcat();

      expect(log).toBeUndefined();
    });

    it('returns undefined when adb exits non-zero', async () => {
      stubAdbFailure(new Error('Command failed: adb logcat -d'));

      const log = await dumpAndroidLogcat();

      expect(log).toBeUndefined();
    });

    it('returns undefined for an empty buffer', async () => {
      stubAdbSuccess('\n');

      const log = await dumpAndroidLogcat();

      expect(log).toBeUndefined();
    });
  });

  describe('attachAndroidDeviceLogs', () => {
    it('attaches the filtered dump to a failed test', async () => {
      stubAdbSuccess('E/AndroidRuntime: FATAL EXCEPTION: main\n');
      const testInfo = createTestInfo();

      const attached = await attachAndroidDeviceLogs(
        testInfo as unknown as TestInfo,
        { serial: 'emulator-5554' },
      );

      expect(attached).toBe(true);
      expect(testInfo.attach).toHaveBeenCalledWith(
        ANDROID_DEVICE_LOGS_ATTACHMENT_NAME,
        {
          body: expect.stringContaining(
            'E/AndroidRuntime: FATAL EXCEPTION: main',
          ),
          contentType: 'text/plain',
        },
      );
    });

    it('does not touch adb for a passing test', async () => {
      const testInfo = createTestInfo({ status: 'passed' });

      const attached = await attachAndroidDeviceLogs(
        testInfo as unknown as TestInfo,
      );

      expect(attached).toBe(false);
      expect(execFileMock).not.toHaveBeenCalled();
      expect(testInfo.attach).not.toHaveBeenCalled();
    });

    it('skips the attachment when adb fails', async () => {
      stubAdbFailure(new Error('Command failed: adb logcat -d'));
      const testInfo = createTestInfo();

      const attached = await attachAndroidDeviceLogs(
        testInfo as unknown as TestInfo,
      );

      expect(attached).toBe(false);
      expect(testInfo.attach).not.toHaveBeenCalled();
    });

    it('caps the attached body and keeps the trailing crash lines', async () => {
      stubAdbSuccess(`${'x'.repeat(ANDROID_LOGCAT_MAX_BYTES)}TAIL_MARKER`);
      const testInfo = createTestInfo();

      await attachAndroidDeviceLogs(testInfo as unknown as TestInfo);

      const attachedBody: string = testInfo.attach.mock.calls[0][1].body;
      expect(attachedBody).toContain('# truncated:');
      expect(attachedBody.endsWith('TAIL_MARKER')).toBe(true);
      expect(Buffer.byteLength(attachedBody, 'utf8')).toBeLessThan(
        ANDROID_LOGCAT_MAX_BYTES + 1024,
      );
    });

    it('returns false when the reporter rejects the attachment', async () => {
      stubAdbSuccess('D/ReactNative: boot\n');
      const testInfo = createTestInfo();
      testInfo.attach.mockRejectedValue(new Error('report write failed'));

      const attached = await attachAndroidDeviceLogs(
        testInfo as unknown as TestInfo,
      );

      expect(attached).toBe(false);
    });
  });
});
