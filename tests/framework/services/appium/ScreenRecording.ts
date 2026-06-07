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
  driver: WebdriverIO.Browser,
  platform?: Platform,
): boolean {
  if (platform === Platform.ANDROID) {
    return true;
  }
  if (platform === Platform.IOS) {
    return false;
  }
  if (driver.isAndroid) {
    return true;
  }
  if (driver.isIOS) {
    return false;
  }
  return isAndroidPlatform(resolvePlatformName(driver));
}

function resolvePlatformName(driver: WebdriverIO.Browser): string | undefined {
  const capabilities = driver.capabilities as Record<string, unknown>;
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
  driver: WebdriverIO.Browser,
): Promise<ScreenRecordingBackend | undefined> {
  const appiumDriver = driver as AppiumScreenRecorder;
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
    const started = await driver.execute(
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
  driver: WebdriverIO.Browser,
  backend: ScreenRecordingBackend,
): Promise<string | undefined> {
  const appiumDriver = driver as AppiumScreenRecorder;
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
          : await driver.execute('mobile: stopMediaProjectionRecording');
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
  driver: WebdriverIO.Browser,
): Promise<ScreenRecordingBackend | undefined> {
  const appiumDriver = driver as AppiumScreenRecorder;
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
  driver: WebdriverIO.Browser,
): Promise<string | undefined> {
  const appiumDriver = driver as AppiumScreenRecorder;
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
  driver: WebdriverIO.Browser,
  platform?: Platform,
): Promise<ScreenRecordingBackend | undefined> {
  try {
    if (resolveIsAndroid(driver, platform)) {
      return await startAndroidScreenRecord(driver);
    }

    return await startIosRecording(driver);
  } catch (error) {
    logRecordingIssue(
      `Could not start screen recording: ${formatRecordingError(error)}`,
    );
    return undefined;
  }
}

function buildRecordingBaseName(testInfo: TestInfo): string {
  const project = testInfo.project.name;
  const retrySuffix = testInfo.retry > 0 ? `-retry${testInfo.retry}` : '';
  return `${project}-${sanitizeRecordingFileName(testInfo.title)}${retrySuffix}`;
}

/**
 * Temporary CI toggle: persist recordings for every test (not only failures).
 * Remove APPIUM_RECORD_VIDEO_ALWAYS once video capture is validated.
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
  driver: WebdriverIO.Browser,
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
      resolveIsAndroid(driver, platform)
    ) {
      payload = await stopAndroidRecording(driver, recordingBackend);
    } else {
      payload = await stopIosRecording(driver);
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
    await testInfo.attach('failure-recording', {
      body: videoBuffer,
      contentType: 'video/mp4',
    });
  } catch (error) {
    logRecordingIssue(
      `Could not attach recording to Playwright report: ${formatRecordingError(error)}`,
    );
  }
}
