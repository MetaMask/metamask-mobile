/**
 * Performance-test helpers that invoke in-app `startAppProfiling` /
 * `stopAppProfiling` via deeplink, wait for the result accessibility hook,
 * then pull the Hermes `.cpuprofile` off the device into CI artifacts.
 */

/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs/promises';
import path from 'path';
import type { TestInfo } from '@playwright/test';
import { openE2EUrl } from '../../framework/DeepLink.ts';
import { E2EDeeplinkSchemes } from '../../framework/Constants.ts';
import { getDriver } from '../../framework/AppiumUtilities.ts';
import { createLogger } from '../../framework/logger.ts';

const logger = createLogger({ name: 'Performance - AppProfiling' });

const PROFILE_OUTPUT_DIRECTORY = 'tests/reporters/reports/hermes-cpuprofiles';
const RESULT_READY_TEST_ID = 'performance-profiler-result-ready';
const ERROR_TEST_ID = 'performance-profiler-error';
const RESULT_TIMEOUT_MS = 60_000;

type PullFileDriver = WebdriverIO.Browser & {
  pullFile: (remotePath: string) => Promise<string>;
};

export async function startAppProfilingFromTest(): Promise<void> {
  await openE2EUrl(`${E2EDeeplinkSchemes.PROFILER}start`);
}

export async function stopAppProfilingFromTest(): Promise<void> {
  await openE2EUrl(`${E2EDeeplinkSchemes.PROFILER}stop`);
}

function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function toAndroidPullPath(profilePath: string): string {
  if (profilePath.startsWith('/sdcard/')) {
    return profilePath;
  }
  if (profilePath.startsWith('/storage/emulated/0/')) {
    return profilePath.replace('/storage/emulated/0/', '/sdcard/');
  }
  const fileName = profilePath.split('/').pop();
  if (!fileName) {
    throw new Error(`Invalid profile path from app: ${profilePath}`);
  }
  return `/sdcard/Download/${fileName}`;
}

async function waitForProfilerResultPath(
  appiumDriver: WebdriverIO.Browser,
): Promise<string> {
  const resultReady = await appiumDriver.$(`~${RESULT_READY_TEST_ID}`);
  const profilerError = await appiumDriver.$(`~${ERROR_TEST_ID}`);

  await appiumDriver.waitUntil(
    async () => {
      const [resultDisplayed, errorDisplayed] = await Promise.all([
        resultReady.isDisplayed().catch(() => false),
        profilerError.isDisplayed().catch(() => false),
      ]);
      return resultDisplayed || errorDisplayed;
    },
    {
      timeout: RESULT_TIMEOUT_MS,
      timeoutMsg: `Profiler result not ready after ${RESULT_TIMEOUT_MS}ms`,
    },
  );

  if (await profilerError.isDisplayed().catch(() => false)) {
    const errorLabel =
      (await profilerError.getAttribute('content-desc').catch(() => null)) ||
      (await profilerError.getAttribute('name').catch(() => null)) ||
      'unknown profiler error';
    throw new Error(`Profiler failed on device: ${errorLabel}`);
  }

  const resultLabel =
    (await resultReady.getAttribute('content-desc').catch(() => null)) ||
    (await resultReady.getAttribute('name').catch(() => null));
  const marker = `${RESULT_READY_TEST_ID}:`;
  if (!resultLabel?.startsWith(marker)) {
    throw new Error(
      `Profiler result accessibility label missing path: ${resultLabel}`,
    );
  }
  const profilePath = resultLabel.slice(marker.length);
  if (!profilePath.endsWith('.cpuprofile')) {
    throw new Error(`Profiler result path is not a cpuprofile: ${profilePath}`);
  }
  return profilePath;
}

/**
 * Pulls the on-device profile path exposed by PerformanceProfilerStatus,
 * saves it under `tests/reporters/reports/hermes-cpuprofiles/` (CI upload path),
 * and attaches it to the Playwright report.
 *
 * Returns `null` on iOS — profile export/pull is Android-only for now.
 */
export async function pullAndAttachAppProfiling(
  testInfo: TestInfo,
  platform: 'android' | 'ios',
): Promise<string | null> {
  if (platform !== 'android') {
    logger.info(
      'Skipping Hermes cpuprofile pull on iOS (Android Downloads path only)',
    );
    return null;
  }

  const appiumDriver = getDriver() as PullFileDriver;
  const profilePath = await waitForProfilerResultPath(appiumDriver);
  const remotePath = toAndroidPullPath(profilePath);

  logger.info(`Pulling Hermes profile from ${remotePath}`);
  const base64Profile = await appiumDriver.pullFile(remotePath);
  const buffer = Buffer.from(base64Profile, 'base64');
  if (buffer.length === 0) {
    throw new Error(`Pulled cpuprofile was empty: ${remotePath}`);
  }

  await fs.mkdir(PROFILE_OUTPUT_DIRECTORY, { recursive: true });
  const fileName = `${sanitizeFilePart(testInfo.project.name)}-${sanitizeFilePart(testInfo.title)}.cpuprofile`;
  const outputPath = path.join(PROFILE_OUTPUT_DIRECTORY, fileName);
  await fs.writeFile(outputPath, buffer);

  await testInfo.attach(fileName, {
    path: outputPath,
    contentType: 'application/json',
  });

  logger.info(
    `Hermes cpuprofile saved (${buffer.length} bytes): ${outputPath}`,
  );
  return outputPath;
}

/**
 * Stops in-app profiling and, on Android, pulls the `.cpuprofile` into CI artifacts.
 * On iOS, stops profiling only so specs still complete and record timers.
 */
export async function stopAndCollectAppProfiling(
  testInfo: TestInfo,
  platform: 'android' | 'ios',
): Promise<string | null> {
  await stopAppProfilingFromTest();
  return pullAndAttachAppProfiling(testInfo, platform);
}
