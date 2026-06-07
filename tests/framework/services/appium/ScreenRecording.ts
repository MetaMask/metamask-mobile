/* eslint-disable import-x/no-nodejs-modules */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TestInfo } from '@playwright/test';
import { Platform, type ProviderName } from '../../types.ts';
import { createLogger } from '../../logger.ts';

const logger = createLogger({ name: 'ScreenRecording' });

const RECORD_VIDEO_ON_FAILURE_ENV_KEY = 'APPIUM_RECORD_VIDEO_ON_FAILURE';
const RECORD_VIDEO_ALWAYS_ENV_KEY = 'APPIUM_RECORD_VIDEO_ALWAYS';
const RECORD_VIDEO_TIME_LIMIT_ENV_KEY = 'APPIUM_RECORD_VIDEO_TIME_LIMIT_SEC';
const CI_ENV_KEY = 'CI';

/** Playwright Appium smoke tests are invoked from the repo root (`yarn appium-smoke:*`). */
export const APPIUM_SMOKE_VIDEOS_DIR = join(
  process.cwd(),
  'tests/test-reports/appium-smoke-videos',
  process.env.APPIUM_SMOKE_SUITE_NAME?.trim() ?? '',
);

const DEFAULT_TIME_LIMIT_SEC = 600;

/** Which Appium recording API was started for the active session. */
export type ScreenRecordingBackend =
  | 'ios'
  | 'android-screenrecord'
  | 'android-media-projection';

/**
 * Local emulator/simulator runs only — BrowserStack records server-side.
 */
export function isLocalEmulatorProvider(
  provider: ProviderName | undefined,
): boolean {
  return provider === 'emulator' || provider === 'simulator';
}

/**
 * - `APPIUM_RECORD_VIDEO_ON_FAILURE=false` — disabled
 * - unset / `true` — enabled on CI; enabled locally only when explicitly `true`
 */
export function isVideoRecordingOnFailureEnabled(
  provider: ProviderName | undefined,
): boolean {
  if (!isLocalEmulatorProvider(provider)) {
    return false;
  }

  const raw =
    process.env[RECORD_VIDEO_ON_FAILURE_ENV_KEY]?.trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'no') {
    return false;
  }
  if (raw === 'true' || raw === '1' || raw === 'yes') {
    return true;
  }

  return process.env[CI_ENV_KEY] === 'true';
}

export function sanitizeRecordingFileName(title: string): string {
  return title
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 120);
}

/** @internal exported for unit tests */
export function buildRecordingFileBaseName(options: {
  projectName: string;
  titlePath: string[];
  retry?: number;
}): string {
  const scenarioName = options.titlePath
    .map((segment) => sanitizeRecordingFileName(segment))
    .filter(Boolean)
    .join('__');

  const retrySuffix =
    options.retry && options.retry > 0 ? `-retry${options.retry}` : '';

  if (!scenarioName) {
    return `${options.projectName}-unknown-test${retrySuffix}`;
  }

  return `${options.projectName}-${scenarioName}${retrySuffix}`;
}

function buildRecordingBaseName(testInfo: TestInfo): string {
  return buildRecordingFileBaseName({
    projectName: testInfo.project.name,
    titlePath: testInfo.titlePath,
    retry: testInfo.retry,
  });
}

/** @internal exported for unit tests */
export function extractRecordingPayload(result: unknown): string | undefined {
  if (typeof result === 'string' && result.length > 0) {
    return result;
  }
  if (result && typeof result === 'object') {
    const record = result as Record<string, unknown>;
    for (const key of ['payload', 'value', 'video', 'media'] as const) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }
  }
  return undefined;
}

function recordingTimeLimitSec(): number {
  const raw = process.env[RECORD_VIDEO_TIME_LIMIT_ENV_KEY];
  if (!raw) {
    return DEFAULT_TIME_LIMIT_SEC;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_TIME_LIMIT_SEC;
}

/** @internal exported for unit tests */
export function isAndroidPlatform(platformName: string | undefined): boolean {
  return platformName?.trim().toLowerCase() === 'android';
}

function resolveIsAndroid(
  browser: WebdriverIO.Browser,
  platform?: Platform,
): boolean {
  if (platform === Platform.ANDROID) {
    return true;
  }
  if (platform === Platform.IOS) {
    return false;
  }
  if (browser.isAndroid) {
    return true;
  }
  if (browser.isIOS) {
    return false;
  }
  return isAndroidPlatform(resolvePlatformName(browser));
}

function resolvePlatformName(browser: WebdriverIO.Browser): string | undefined {
  const capabilities = browser.capabilities as Record<string, unknown>;
  const raw = capabilities.platformName ?? capabilities['appium:platformName'];
  return typeof raw === 'string' ? raw : undefined;
}

function formatRecordingError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function logRecordingIssue(message: string): void {
  logger.warn(message);
  // Visible in CI step logs without logger level tuning.
  console.warn(`[ScreenRecording] ${message}`);
}

type AppiumScreenRecorder = WebdriverIO.Browser & {
  startRecordingScreen?: (
    options?: Record<string, string | number>,
  ) => Promise<string>;
  stopRecordingScreen?: (options?: Record<string, unknown>) => Promise<string>;
};

async function startAndroidScreenRecord(
  browser: WebdriverIO.Browser,
): Promise<ScreenRecordingBackend | undefined> {
  const appiumDriver = browser as AppiumScreenRecorder;
  if (typeof appiumDriver.startRecordingScreen === 'function') {
    try {
      await appiumDriver.startRecordingScreen({
        timeLimit: String(recordingTimeLimitSec()),
      });
      logRecordingIssue('Android adb screenrecord started');
      return 'android-screenrecord';
    } catch (error) {
      logRecordingIssue(
        `adb screenrecord failed, trying media projection: ${formatRecordingError(error)}`,
      );
    }
  }

  try {
    const started = await browser.execute(
      'mobile: startMediaProjectionRecording',
      {
        maxDurationSec: recordingTimeLimitSec(),
        resolution: '1280x720',
      },
    );
    logRecordingIssue(
      started === false
        ? 'Android media projection already running'
        : 'Android media projection recording started',
    );
    return 'android-media-projection';
  } catch (error) {
    logRecordingIssue(
      `Could not start Android recording: ${formatRecordingError(error)}`,
    );
    return undefined;
  }
}

async function stopAndroidRecording(
  browser: WebdriverIO.Browser,
  backend: ScreenRecordingBackend,
): Promise<string | undefined> {
  const appiumDriver = browser as AppiumScreenRecorder;
  const attempts: ScreenRecordingBackend[] =
    backend === 'android-screenrecord'
      ? ['android-screenrecord', 'android-media-projection']
      : ['android-media-projection', 'android-screenrecord'];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const result =
        attempt === 'android-screenrecord' &&
        typeof appiumDriver.stopRecordingScreen === 'function'
          ? await appiumDriver.stopRecordingScreen()
          : await browser.execute('mobile: stopMediaProjectionRecording');
      const payload = extractRecordingPayload(result);
      if (payload) {
        return payload;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }
  return undefined;
}

async function startIosRecording(
  browser: WebdriverIO.Browser,
): Promise<ScreenRecordingBackend | undefined> {
  const appiumDriver = browser as AppiumScreenRecorder;
  if (typeof appiumDriver.startRecordingScreen !== 'function') {
    logRecordingIssue(
      'startRecordingScreen is not available on this WebDriver session',
    );
    return undefined;
  }

  try {
    await appiumDriver.startRecordingScreen({
      timeLimit: String(recordingTimeLimitSec()),
      videoQuality: 'medium',
    });
    logRecordingIssue('iOS screen recording started');
    return 'ios';
  } catch (error) {
    logRecordingIssue(
      `Could not start iOS recording: ${formatRecordingError(error)}`,
    );
    return undefined;
  }
}

async function stopIosRecording(
  browser: WebdriverIO.Browser,
): Promise<string | undefined> {
  const appiumDriver = browser as AppiumScreenRecorder;
  if (typeof appiumDriver.stopRecordingScreen !== 'function') {
    throw new Error(
      'stopRecordingScreen is not available on this WebDriver session',
    );
  }

  const result = await appiumDriver.stopRecordingScreen();
  return extractRecordingPayload(result);
}

/**
 * Starts Appium device screen recording for the active session.
 * Android tries adb screenrecord first (reliable on emulators), then media projection.
 */
export async function startFailureRecording(
  browser: WebdriverIO.Browser,
  platform?: Platform,
): Promise<ScreenRecordingBackend | undefined> {
  try {
    if (resolveIsAndroid(browser, platform)) {
      return await startAndroidScreenRecord(browser);
    }

    return await startIosRecording(browser);
  } catch (error) {
    logRecordingIssue(
      `Could not start screen recording: ${formatRecordingError(error)}`,
    );
    return undefined;
  }
}

/**
 * Optional override: set APPIUM_RECORD_VIDEO_ALWAYS=true to persist every recording
 * (useful for local debugging). CI defaults to failure-only via shouldPersistRecording.
 */
export function shouldPersistRecordingAlways(): boolean {
  const raw = process.env[RECORD_VIDEO_ALWAYS_ENV_KEY]?.trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

function shouldPersistRecording(testInfo: TestInfo): boolean {
  if (shouldPersistRecordingAlways()) {
    return true;
  }

  return (
    testInfo.status === 'failed' ||
    testInfo.status === 'timedOut' ||
    testInfo.status === 'interrupted'
  );
}

/**
 * Stops recording. On failure, attaches MP4 to the Playwright report and writes
 * a copy under {@link APPIUM_SMOKE_VIDEOS_DIR} for CI artifact upload.
 * Always attempts stop when recording was started (even on pass) to free resources.
 */
export async function stopFailureRecordingAndAttach(
  browser: WebdriverIO.Browser,
  testInfo: TestInfo,
  recordingBackend: ScreenRecordingBackend | undefined,
  platform?: Platform,
): Promise<void> {
  if (!recordingBackend) {
    return;
  }

  let payload: string | undefined;
  try {
    if (
      recordingBackend === 'android-screenrecord' ||
      recordingBackend === 'android-media-projection' ||
      resolveIsAndroid(browser, platform)
    ) {
      payload = await stopAndroidRecording(browser, recordingBackend);
    } else {
      payload = await stopIosRecording(browser);
    }
  } catch (error) {
    logRecordingIssue(
      `Could not stop screen recording: ${formatRecordingError(error)}`,
    );
    return;
  }

  if (!payload) {
    logRecordingIssue(
      `Screen recording stopped but returned no payload (status=${testInfo.status ?? 'unknown'})`,
    );
    return;
  }

  if (!shouldPersistRecording(testInfo)) {
    logger.debug(
      `Discarding screen recording (status=${testInfo.status ?? 'unknown'})`,
    );
    return;
  }

  const videoBuffer = Buffer.from(payload, 'base64');
  const fileName = `${buildRecordingBaseName(testInfo)}.mp4`;
  const filePath = join(APPIUM_SMOKE_VIDEOS_DIR, fileName);

  try {
    mkdirSync(APPIUM_SMOKE_VIDEOS_DIR, { recursive: true });
    writeFileSync(filePath, videoBuffer);
    logRecordingIssue(
      `Saved recording (${videoBuffer.length} bytes): ${filePath}`,
    );
  } catch (error) {
    logRecordingIssue(
      `Could not write recording to disk: ${formatRecordingError(error)}`,
    );
  }

  try {
    await testInfo.attach(buildRecordingBaseName(testInfo), {
      body: videoBuffer,
      contentType: 'video/mp4',
    });
  } catch (error) {
    logRecordingIssue(
      `Could not attach recording to Playwright report: ${formatRecordingError(error)}`,
    );
  }
}
