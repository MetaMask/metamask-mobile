/* eslint-disable import-x/no-nodejs-modules -- adb is a host binary; Appium smoke runs on the host. */
import type { TestInfo } from '@playwright/test';
import { Platform } from '../../types.ts';
import { createAppiumLogger } from '../../appiumLogger.ts';
import { runDeviceCommand } from '../device-commands/commandRunner.ts';

const logger = createAppiumLogger('androidDeviceLogs');

/** Playwright attachment name shown in the HTML report for a failed test. */
export const ANDROID_DEVICE_LOGS_ATTACHMENT_NAME = 'android-device-logs.txt';

/*
 * logcat tag filters (`tag:priority`, priority is the minimum level kept).
 *
 * The dump exists to explain a failed test, so it keeps tags that carry
 * failure evidence and drops the rest:
 * - `AndroidRuntime` — fatal Java/Kotlin exceptions plus their stack traces
 *   (this is where a Fabric mount crash lands before the process dies).
 * - `DEBUG`, `libc` — native crash dump and tombstone lines, so a signal
 *   death is not reported as "device disconnected".
 * - `System.err` — exceptions the JVM or the JS bridge writes to stderr.
 * - `ReactNative`, `ReactHost` — RN instance / Fabric surface lifecycle
 *   (`ReactHost` destroyed, surface mount failures, bridge timeouts).
 * - `ReactNativeJS` — `console.error` / redbox output from the app bundle.
 * - `ActivityManager` at `W` — process death, ANR and low-memory kills.
 *
 * logcat tag specs match tag prefixes, so `ReactNative` also covers
 * `ReactNativeJSBatchedBridge` and friends.
 */
export const ANDROID_LOGCAT_TAG_FILTERS = [
  'AndroidRuntime:V',
  'DEBUG:V',
  'libc:V',
  'System.err:V',
  'ReactNative:V',
  'ReactHost:V',
  'ReactNativeJS:V',
  'ActivityManager:W',
] as const;

/**
 * Device-side line cap (`logcat -t`). Keeps the most recent lines, which is
 * where the failure is, and bounds the dump before it reaches the host.
 */
export const ANDROID_LOGCAT_MAX_LINES = 4000;

/**
 * Host-side byte cap. `-t` bounds the line count but not the line length, so a
 * single huge JS stack trace could still bloat the report. The tail is kept
 * for the same reason as above.
 */
export const ANDROID_LOGCAT_MAX_BYTES = 512 * 1024;

const ANDROID_LOGCAT_TIMEOUT_MS = 30_000;
const ANDROID_LOGCAT_MAX_BUFFER_BYTES = 32 * 1024 * 1024;

/** Test outcome that makes the dump worth attaching. */
const FAILURE_STATUSES: readonly TestInfo['status'][] = [
  'failed',
  'timedOut',
  'interrupted',
];

export interface AndroidDeviceLogTarget {
  platform?: Platform | 'android' | 'ios';
  /** adb serial. Falls back to `ANDROID_SERIAL` / the single attached device. */
  udid?: string;
  /** BrowserStack / TestMu: no local adb, so there is nothing to capture. */
  isRemoteCloud?: boolean;
}

export interface AndroidDeviceLogsHeader {
  titlePath: string[];
  projectName: string;
  retry: number;
  serial?: string;
  truncated: boolean;
  capturedAt?: string;
}

export interface AttachAndroidDeviceLogsOptions {
  serial?: string;
  /** Defaults to `testInfo.status`. */
  status?: TestInfo['status'];
}

/**
 * Android device logs are only reachable through local adb, so iOS and cloud
 * devices short-circuit to a no-op.
 */
export function isAndroidDeviceLogCaptureEnabled(
  target: AndroidDeviceLogTarget,
): boolean {
  // `CurrentDeviceDetails.platform` is the plain `'android' | 'ios'` string, so
  // this comparison also covers callers that pass the `Platform` enum.
  return target.platform === Platform.ANDROID && target.isRemoteCloud !== true;
}

/** @internal exported for unit tests */
export function buildLogcatClearArgs(serial?: string): string[] {
  return [...adbSerialArgs(serial), 'logcat', '-c'];
}

/** @internal exported for unit tests */
export function buildLogcatDumpArgs(serial?: string): string[] {
  return [
    ...adbSerialArgs(serial),
    'logcat',
    '-d', // dump the buffer and exit instead of following
    '-v',
    'threadtime', // timestamp + pid + tag on every line
    '-t',
    String(ANDROID_LOGCAT_MAX_LINES),
    '-s', // default all other tags to silent
    ...ANDROID_LOGCAT_TAG_FILTERS,
  ];
}

/** @internal exported for unit tests */
export function shouldAttachAndroidDeviceLogs(
  status: TestInfo['status'] | undefined,
): boolean {
  return status !== undefined && FAILURE_STATUSES.includes(status);
}

/**
 * Keeps the last `maxBytes` of the dump: the crash is at the end, and the
 * attachment has to stay small enough to open in the report.
 *
 * @internal exported for unit tests
 */
export function capAndroidLogBody(
  text: string,
  maxBytes: number = ANDROID_LOGCAT_MAX_BYTES,
): { body: string; truncated: boolean } {
  const buffer = Buffer.from(text, 'utf8');
  if (buffer.length <= maxBytes) {
    return { body: text, truncated: false };
  }

  // Slicing bytes can split the first multi-byte character; the leading
  // replacement character it produces is harmless in a log file.
  return {
    body: buffer.subarray(buffer.length - maxBytes).toString('utf8'),
    truncated: true,
  };
}

/**
 * Builds the attachment text: a short header so the dump is self-describing,
 * then the log itself.
 *
 * @internal exported for unit tests
 */
export function buildAndroidDeviceLogsBody(
  log: string,
  header: AndroidDeviceLogsHeader,
): string {
  const lines = [
    '# Appium smoke Android device logs (adb logcat)',
    `# test: ${header.titlePath.join(' › ')}`,
    `# project: ${header.projectName} (retry ${header.retry})`,
    `# device: ${header.serial ?? 'default adb device'}`,
    `# captured: ${header.capturedAt ?? new Date().toISOString()}`,
    `# filters: ${ANDROID_LOGCAT_TAG_FILTERS.join(' ')}`,
  ];

  if (header.truncated) {
    lines.push(
      `# truncated: kept the last ${ANDROID_LOGCAT_MAX_BYTES} bytes of the dump`,
    );
  }

  return `${lines.join('\n')}\n\n${log}`;
}

function adbSerialArgs(serial?: string): string[] {
  return serial ? ['-s', serial] : [];
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function logDeviceLogsIssue(message: string): void {
  logger.warn(message);
  // Visible in CI step logs without E2E_LOG_LEVEL tuning.
  console.warn(`[AndroidDeviceLogs] ${message}`);
}

async function runAdb(args: string[]): Promise<string> {
  const { stdout } = await runDeviceCommand('adb', args, {
    timeout: ANDROID_LOGCAT_TIMEOUT_MS,
    maxBuffer: ANDROID_LOGCAT_MAX_BUFFER_BYTES,
  });
  return stdout;
}

/**
 * Clears the log buffer so the dump covers this test instead of the whole job.
 * Never throws: a stale buffer is not a test failure.
 *
 * @returns whether the buffer was cleared.
 */
export async function clearAndroidLogBuffer(serial?: string): Promise<boolean> {
  try {
    await runAdb(buildLogcatClearArgs(serial));
    return true;
  } catch (error) {
    logDeviceLogsIssue(
      `Could not clear the Android log buffer: ${formatError(error)}`,
    );
    return false;
  }
}

/**
 * Reads the buffered log through the high-signal filters above.
 * Never throws, so it cannot mask the failure that triggered it.
 *
 * @returns the raw log, or `undefined` when adb failed or the buffer is empty.
 */
export async function dumpAndroidLogcat(
  serial?: string,
): Promise<string | undefined> {
  try {
    const stdout = await runAdb(buildLogcatDumpArgs(serial));
    return stdout.trim().length > 0 ? stdout : undefined;
  } catch (error) {
    logDeviceLogsIssue(
      `Could not read Android device logs: ${formatError(error)}`,
    );
    return undefined;
  }
}

/**
 * Dumps the device log on a failed test and attaches it to the Playwright
 * result, which puts it in the HTML report the Appium workflow uploads.
 * Never throws.
 *
 * @returns whether an attachment was added.
 */
export async function attachAndroidDeviceLogs(
  testInfo: TestInfo,
  options: AttachAndroidDeviceLogsOptions = {},
): Promise<boolean> {
  const status = options.status ?? testInfo.status;

  if (!shouldAttachAndroidDeviceLogs(status)) {
    logger.debug(
      `Skipping Android device logs (status=${status ?? 'unknown'})`,
    );
    return false;
  }

  const log = await dumpAndroidLogcat(options.serial);
  if (!log) {
    logDeviceLogsIssue(
      `No Android device logs to attach (status=${status ?? 'unknown'})`,
    );
    return false;
  }

  const { body, truncated } = capAndroidLogBody(log);

  try {
    await testInfo.attach(ANDROID_DEVICE_LOGS_ATTACHMENT_NAME, {
      body: buildAndroidDeviceLogsBody(body, {
        titlePath: testInfo.titlePath,
        projectName: testInfo.project.name,
        retry: testInfo.retry,
        serial: options.serial,
        truncated,
      }),
      contentType: 'text/plain',
    });
    return true;
  } catch (error) {
    logDeviceLogsIssue(
      `Could not attach Android device logs to the report: ${formatError(error)}`,
    );
    return false;
  }
}
