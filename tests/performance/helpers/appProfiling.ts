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
 * Highest segment index already attributed to the current test. The app numbers
 * segments per device session; this tracks how far the test has consumed them
 * so each collection picks up exactly what is new.
 *
 * Initialized by probing the device at fixture start, not assumed to be 0,
 * because leftovers survive whenever `fullReset` is off.
 */
let collectedSegmentCount = 0;

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
  // Preferred over shared Downloads for deterministic names and segment
  // numbering — not because Downloads is unreadable to Appium.
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
  timeoutMs: number = SEGMENT_WAIT_TIMEOUT_MS,
): Promise<Buffer | null> {
  const deadline = Date.now() + timeoutMs;

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

/**
 * Probes contiguous segments starting at `fromIndex`, stopping at the first
 * gap. Segments below `fromIndex` are skipped to avoid re-downloading
 * already-collected multi-MB traces over the BrowserStack tunnel.
 */
async function probeSegmentsFrom(
  appiumDriver: PullFileDriver,
  directory: string,
  fromIndex: number,
): Promise<Map<number, Buffer>> {
  const segments = new Map<number, Buffer>();
  for (let index = fromIndex; index <= MAX_SEGMENTS_PER_TEST; index += 1) {
    const buffer = await pullSegment(
      appiumDriver,
      segmentRemotePath(directory, index),
    );
    if (!buffer) {
      break;
    }
    segments.set(index, buffer);
  }
  return segments;
}

/**
 * Aligns the collector with whatever segments are already on the device.
 * Must run at fixture start so leftover files are not treated as new.
 */
export async function resetAppProfilingSegments(
  appiumDriver: WebdriverIO.Browser = getDriver(),
): Promise<void> {
  const directory = deviceProfileDirectory(appiumDriver);
  let existing: Map<number, Buffer>;
  try {
    existing = await probeSegmentsFrom(
      appiumDriver as PullFileDriver,
      directory,
      1,
    );
  } catch (error) {
    logger.warn(
      `Could not probe existing segments at fixture start; leftover segments may be misattributed: ${String(error)}`,
    );
    collectedSegmentCount = 0;
    return;
  }
  // Segments are contiguous from 1, so size equals the highest index.
  collectedSegmentCount = existing.size;
  if (collectedSegmentCount > 0) {
    logger.info(
      `Hermes profile baseline on device is segment-${collectedSegmentCount}; new segments start at ${collectedSegmentCount + 1}`,
    );
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
 *
 * Segments already on the device are probed once and those buffers are reused
 * for catch-up saves — no second download over the BrowserStack tunnel. The
 * segment triggered by this background is waited for; a single-shot pull would
 * race the dump that just started and silently drop the measured-flow trace.
 */
export async function collectAppProfiling(
  testInfo: TestInfo,
  platform: 'android' | 'ios',
  options: { segmentWaitTimeoutMs?: number } = {},
): Promise<number> {
  if (platform !== 'android') {
    logger.info(
      'Skipping Hermes cpuprofile collection on iOS (app-scoped export is Android-only)',
    );
    return 0;
  }

  const appiumDriver = getDriver() as PullFileDriver;
  const directory = deviceProfileDirectory(appiumDriver);
  const segmentWaitTimeoutMs =
    options.segmentWaitTimeoutMs ?? SEGMENT_WAIT_TIMEOUT_MS;

  // Only probe segments not yet collected — avoids re-downloading already-saved
  // multi-MB traces over the BrowserStack tunnel.
  const newSegments = await probeSegmentsFrom(
    appiumDriver,
    directory,
    collectedSegmentCount + 1,
  );
  // Segments are contiguous, so highest index = already collected + new count.
  const highestBeforeBackground = collectedSegmentCount + newSegments.size;

  // A negative duration leaves the app in the background instead of restoring
  // it, so the dump is not racing a resume.
  await AppiumGestures.backgroundApp(-1);

  const triggeredIndex = highestBeforeBackground + 1;
  let collected = 0;

  // Catch up on segments that landed before this collection (e.g. mid-test
  // backgrounding by the warm-start specs) using the buffers we already
  // pulled — do not re-download them.
  while (
    collectedSegmentCount < highestBeforeBackground &&
    collectedSegmentCount < MAX_SEGMENTS_PER_TEST
  ) {
    const nextIndex = collectedSegmentCount + 1;
    const existing = newSegments.get(nextIndex);
    if (!existing) {
      logger.warn(
        `Expected Hermes profile segment ${nextIndex} to already be on device for "${testInfo.title}", but probe missed`,
      );
      // Keep the device index aligned even when a mid-range pull is missing so
      // the triggered segment is not saved under the wrong `.segment-N` name.
      collectedSegmentCount = highestBeforeBackground;
      break;
    }
    collectedSegmentCount = nextIndex;
    await saveSegment(testInfo, existing, collectedSegmentCount);
    collected += 1;
  }

  // The dump we just triggered is the one covering the measured flow. Wait for
  // it; do not single-shot, or a still-pending rename loses the segment.
  let buffer = await waitForSegment(
    appiumDriver,
    segmentRemotePath(directory, triggeredIndex),
    segmentWaitTimeoutMs,
  );
  if (!buffer) {
    logger.warn(
      `No Hermes profile segment ${triggeredIndex} appeared within ${segmentWaitTimeoutMs}ms for "${testInfo.title}"`,
    );
    return collected;
  }

  // Pin the counter to the device index before saving so a broken catch-up
  // path cannot renumber the triggered segment.
  collectedSegmentCount = triggeredIndex;
  await saveSegment(testInfo, buffer, collectedSegmentCount);
  collected += 1;

  // Further segments (unexpected extras) are single-shot — only the one we
  // triggered needs the wait budget.
  buffer = await pullSegment(
    appiumDriver,
    segmentRemotePath(directory, collectedSegmentCount + 1),
  );
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
