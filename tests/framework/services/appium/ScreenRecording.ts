/* eslint-disable import-x/no-nodejs-modules */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TestInfo } from '@playwright/test';
import type { ProviderName } from '../../types.ts';
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
    for (const key of ['payload', 'value', 'video'] as const) {
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

function resolvePlatformName(driver: WebdriverIO.Browser): string | undefined {
  const capabilities = driver.capabilities as Record<string, unknown>;
  const raw = capabilities.platformName ?? capabilities['appium:platformName'];
  return typeof raw === 'string' ? raw : undefined;
}

/**
 * Starts Appium device screen recording for the active session.
 * Android UIAutomator2 uses Media Projection; iOS XCUITest uses startRecordingScreen.
 */
export async function startFailureRecording(
  driver: WebdriverIO.Browser,
): Promise<boolean> {
  try {
    const platformName = resolvePlatformName(driver);
    if (isAndroidPlatform(platformName)) {
      const started = await driver.execute(
        'mobile: startMediaProjectionRecording',
        {
          maxDurationSec: recordingTimeLimitSec(),
          resolution: '1280x720',
        },
      );
      if (started === false) {
        logger.debug('Android media projection recording already running');
      } else {
        logger.debug('Android media projection recording started');
      }
      return true;
    }

    await driver.execute('mobile: startRecordingScreen', {
      timeLimit: recordingTimeLimitSec(),
      videoQuality: 'medium',
    });
    logger.debug('iOS screen recording started');
    return true;
  } catch (error) {
    logger.warn(
      `Could not start screen recording: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
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
  recordingStarted: boolean,
): Promise<void> {
  if (!recordingStarted) {
    return;
  }

  let payload: string | undefined;
  try {
    const platformName = resolvePlatformName(driver);
    const result = isAndroidPlatform(platformName)
      ? await driver.execute('mobile: stopMediaProjectionRecording')
      : await driver.execute('mobile: stopRecordingScreen');
    payload = extractRecordingPayload(result);
  } catch (error) {
    logger.warn(
      `Could not stop screen recording: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return;
  }

  if (!payload || !shouldPersistRecording(testInfo)) {
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
    logger.info(`Saved failure recording: ${filePath}`);
  } catch (error) {
    logger.warn(
      `Could not write failure recording to disk: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  try {
    await testInfo.attach('failure-recording', {
      body: videoBuffer,
      contentType: 'video/mp4',
    });
  } catch (error) {
    logger.warn(
      `Could not attach failure recording to Playwright report: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
