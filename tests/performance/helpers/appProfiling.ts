/**
 * Collects Hermes CPU profiles produced by the performance-test APKs.
 *
 * The app owns the profiling session end to end: it arms itself as soon as JS
 * runs and dumps a trace whenever it is backgrounded (see
 * `app/core/Performance/appProfiling.ts`). This helper therefore never drives
 * in-app UI. It backgrounds the app, waits for the new segment to land in
 * app-scoped external storage, and retrieves it with `pullFile`.
 *
 * Driving profiling through invisible in-app controls was the previous design
 * and is deliberately gone: those controls sat in the app root, so any screen
 * that drew edge-to-edge put them under the status bar, where Android reports
 * them as not visible to the user and Appium drops them from the accessibility
 * tree entirely.
 */

/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs/promises';
import path from 'path';
import type { TestInfo } from '@playwright/test';
import AppiumGestures from '../../framework/AppiumGestures.ts';
import { getDriver } from '../../framework/AppiumUtilities.ts';
import { createLogger } from '../../framework/logger.ts';

const logger = createLogger({ name: 'Performance - AppProfiling' });

const PROFILE_OUTPUT_DIRECTORY = 'tests/reporters/reports/hermes-cpuprofiles';
const SEGMENT_FILE_PREFIX = 'metamask-performance.segment-';
// The dump is written before the app is allowed to settle in the background,
// so this only has to cover writing and transferring a multi-megabyte trace.
const SEGMENT_WAIT_TIMEOUT_MS = 30_000;
const SEGMENT_POLL_INTERVAL_MS = 1_000;
// Segment indices are assigned by the app and probed until the first gap; this
// only bounds the probing if a device ever returns nonsense.
const MAX_SEGMENTS_PER_TEST = 20;

type PullFileDriver = WebdriverIO.Browser & {
  pullFile: (remotePath: string) => Promise<string>;
};

/**
 * Segments already pulled for the current test. The app numbers segments per
 * device session and this tracks how far the test has consumed them, so each
 * collection picks up exactly what is new.
 */
let collectedSegmentCount = 0;

export function resetAppProfilingSegments(): void {
  collectedSegmentCount = 0;
}

function deviceProfileDirectory(appiumDriver: WebdriverIO.Browser): string {
  const capabilities = (appiumDriver.capabilities ?? {}) as Record<
    string,
    unknown
  >;
  const appPackage =
    capabilities['appium:appPackage'] ?? capabilities.appPackage;
  if (typeof appPackage !== 'string' || appPackage.length === 0) {
    throw new Error(
      'Cannot resolve the app package for the Hermes profile path',
    );
  }
  // App-scoped external storage is inside the app sandbox, so `pullFile` can
  // read it on a non-rooted device, and `fullReset` wipes it between sessions.
  return `/sdcard/Android/data/${appPackage}/files/Documents`;
}

function segmentRemotePath(directory: string, index: number): string {
  return `${directory}/${SEGMENT_FILE_PREFIX}${index}.cpuprofile`;
}

/**
 * Retrieves one segment, or `null` when it is not on the device.
 *
 * The app renames each trace into place only once Hermes has finished writing
 * it, so a segment that pulls and parses is complete.
 */
async function pullSegment(
  appiumDriver: PullFileDriver,
  remotePath: string,
): Promise<Buffer | null> {
  let base64Profile: string;
  try {
    base64Profile = await appiumDriver.pullFile(remotePath);
  } catch {
    return null;
  }

  const buffer = Buffer.from(base64Profile, 'base64');
  if (buffer.length === 0) {
    return null;
  }

  try {
    const parsedProfile: unknown = JSON.parse(buffer.toString('utf8'));
    if (
      !parsedProfile ||
      typeof parsedProfile !== 'object' ||
      Array.isArray(parsedProfile)
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return buffer;
}

async function waitForSegment(
  appiumDriver: PullFileDriver,
  remotePath: string,
): Promise<Buffer | null> {
  const deadline = Date.now() + SEGMENT_WAIT_TIMEOUT_MS;

  for (;;) {
    const buffer = await pullSegment(appiumDriver, remotePath);
    if (buffer) {
      return buffer;
    }
    if (Date.now() >= deadline) {
      return null;
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, SEGMENT_POLL_INTERVAL_MS);
    });
  }
}

function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Names one artifact per segment. Retries are kept apart because a retried
 * test would otherwise overwrite the artifact of the attempt before it, and the
 * first segment keeps the plain name so single-segment specs — most of them —
 * get a predictable artifact.
 */
function profileArtifactName(testInfo: TestInfo, segmentIndex: number): string {
  const base = `${sanitizeFilePart(testInfo.project.name)}-${sanitizeFilePart(testInfo.title)}`;
  const retryPart = testInfo.retry > 0 ? `.retry-${testInfo.retry}` : '';
  const segmentPart = segmentIndex === 1 ? '' : `.segment-${segmentIndex}`;
  return `${base}${retryPart}${segmentPart}.cpuprofile`;
}

async function saveSegment(
  testInfo: TestInfo,
  buffer: Buffer,
  segmentIndex: number,
): Promise<void> {
  await fs.mkdir(PROFILE_OUTPUT_DIRECTORY, { recursive: true });
  const fileName = profileArtifactName(testInfo, segmentIndex);
  const outputPath = path.join(PROFILE_OUTPUT_DIRECTORY, fileName);
  await fs.writeFile(outputPath, buffer);

  await testInfo.attach(fileName, {
    path: outputPath,
    contentType: 'application/json',
  });

  logger.info(
    `Hermes cpuprofile saved (${buffer.length} bytes): ${outputPath}`,
  );
}

/**
 * Backgrounds the app so it dumps its in-flight trace, then saves every segment
 * the test has not collected yet into `tests/reporters/reports/hermes-cpuprofiles/`
 * and attaches it to the Playwright report.
 *
 * Returns the number of segments collected. Specs can background the app on
 * their own (the warm-start specs and the seedless OAuth hand-offs do), so a
 * single collection can pick up more than one segment.
 */
export async function collectAppProfiling(
  testInfo: TestInfo,
  platform: 'android' | 'ios',
): Promise<number> {
  if (platform !== 'android') {
    logger.info(
      'Skipping Hermes cpuprofile collection on iOS (app-scoped export is Android-only)',
    );
    return 0;
  }

  const appiumDriver = getDriver() as PullFileDriver;
  const directory = deviceProfileDirectory(appiumDriver);

  // A negative duration leaves the app in the background instead of restoring
  // it, so the dump is not racing a resume.
  await AppiumGestures.backgroundApp(-1);

  const nextIndex = collectedSegmentCount + 1;
  let buffer = await waitForSegment(
    appiumDriver,
    segmentRemotePath(directory, nextIndex),
  );
  if (!buffer) {
    logger.warn(
      `No Hermes profile segment ${nextIndex} appeared within ${SEGMENT_WAIT_TIMEOUT_MS}ms for "${testInfo.title}"`,
    );
    return 0;
  }

  let collected = 0;
  while (buffer && collectedSegmentCount < MAX_SEGMENTS_PER_TEST) {
    collectedSegmentCount += 1;
    await saveSegment(testInfo, buffer, collectedSegmentCount);
    collected += 1;
    buffer = await pullSegment(
      appiumDriver,
      segmentRemotePath(directory, collectedSegmentCount + 1),
    );
  }

  return collected;
}
