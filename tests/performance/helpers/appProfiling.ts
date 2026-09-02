/**
 * Performance-test helpers that invoke in-app `startAppProfiling` /
 * `stopAppProfiling` via deeplink, then pull the Hermes `.cpuprofile` off the
 * device so CI artifacts include it.
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

/**
 * Must match `PERFORMANCE_PROFILE_ANDROID_REMOTE_PATH` in
 * `app/core/Performance/appProfiling.ts`.
 */
export const PERFORMANCE_PROFILE_ANDROID_REMOTE_PATH =
  '/sdcard/Download/metamask-performance-latest.cpuprofile';

const PROFILE_OUTPUT_DIRECTORY = 'tests/reporters/reports/hermes-cpuprofiles';

const PULL_RETRY_ATTEMPTS = 5;
const PULL_RETRY_DELAY_MS = 2_000;

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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Pulls the stable Android Downloads profile written by `stopAppProfiling`,
 * saves it under `tests/reporters/reports/hermes-cpuprofiles/` (CI upload path),
 * and attaches it to the Playwright report.
 *
 * Returns `null` on iOS — profile export/pull is Android-only for now so iOS
 * performance specs can still stop profiling and record timers.
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
  let lastError: unknown;

  for (let attempt = 1; attempt <= PULL_RETRY_ATTEMPTS; attempt++) {
    try {
      logger.info(
        `Pulling Hermes profile from ${PERFORMANCE_PROFILE_ANDROID_REMOTE_PATH} (attempt ${attempt}/${PULL_RETRY_ATTEMPTS})`,
      );
      const base64Profile = await appiumDriver.pullFile(
        PERFORMANCE_PROFILE_ANDROID_REMOTE_PATH,
      );
      const buffer = Buffer.from(base64Profile, 'base64');
      if (buffer.length === 0) {
        throw new Error('Pulled cpuprofile was empty');
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
    } catch (error) {
      lastError = error;
      logger.warn(
        `Failed to pull Hermes profile (attempt ${attempt}/${PULL_RETRY_ATTEMPTS}): ${String(error)}`,
      );
      if (attempt < PULL_RETRY_ATTEMPTS) {
        await sleep(PULL_RETRY_DELAY_MS);
      }
    }
  }

  throw new Error(
    `Unable to pull Hermes cpuprofile from ${PERFORMANCE_PROFILE_ANDROID_REMOTE_PATH}: ${String(lastError)}`,
  );
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
