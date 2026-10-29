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
 *
 * Feature specs call `enableHermesAppProfiling` at the team-specific entry
 * (the asset row, the Perps header, the Money tab, and the same kind of
 * boundary in every other scenario). That opens `metamask://e2e/profiler/arm`,
 * which the app handles before the unsupported-link UI and uses to drop the
 * setup samples. Launch specs that measure the next process call
 * `skipHermesCollectionUntilRestart` immediately before `terminateApp`.
 */

/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs/promises';
import path from 'path';
import type { TestInfo } from '@playwright/test';
import AppiumGestures from '../../framework/AppiumGestures.ts';
import {
  executeMobileDeepLink,
  getDriver,
} from '../../framework/AppiumUtilities.ts';
import { createLogger } from '../../framework/logger.ts';

const logger = createLogger({ name: 'Performance - AppProfiling' });

const PROFILE_OUTPUT_DIRECTORY = 'tests/reporters/reports/hermes-cpuprofiles';
const SEGMENT_FILE_PREFIX = 'metamask-performance.segment-';
// Must match armMeasuredAppProfilingFromUri and HermesProfilerModule.armProfiling.
const PROFILER_ARM_DEEPLINK = 'metamask://e2e/profiler/arm';
const ARMED_FILE_NAME = 'metamask-performance.armed';
// The dump is written before the app is allowed to settle in the background,
// so this only has to cover writing and transferring a multi-megabyte trace.
// Keep this short on TestMu: a missing path makes `pullFile` fail, and
// WDIO connection retries re-run the same adb failure with backoff — a 30s
// budget routinely burned ~3 full retry chains (~30s) of WARN spam per test.
const SEGMENT_WAIT_TIMEOUT_MS = 12_000;
// Local sleep between our polls. Each failed pull already spends seconds in
// WDIO retries, so a longer interval mainly avoids stacking another chain
// immediately after the previous one finishes.
const SEGMENT_POLL_INTERVAL_MS = 2_500;
const ARM_MARKER_TIMEOUT_MS = 12_000;
const ARM_MARKER_POLL_INTERVAL_MS = 750;
// The app dumps from its `'background'` handler, which finishes asynchronously.
// Left in the background, Android can freeze the process before the trace is
// renamed into place, so the collector brings the app back to let it finish.
const COLLECT_BACKGROUND_SECONDS = 3;

/**
 * Hermes `.cpuprofile` harvest is opt-in. PR performance runs skip it (profiles
 * are only analyzed after schedule/manual runs). Set
 * `COLLECT_HERMES_CPUPROFILES=true` to enable.
 *
 * Bracket access + babel exclude (see babel.config.tests.js /
 * transform-inline-environment-variables) keep this readable at runtime —
 * same pattern as sessionReuse.
 */
export function isHermesCpuProfileCollectionEnabled(): boolean {
  // eslint-disable-next-line dot-notation
  return process.env['COLLECT_HERMES_CPUPROFILES'] === 'true';
}
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
// Artifact names use this counter so the first segment a test keeps is the
// plain `.cpuprofile`, even when setup segments on the device were skipped.
let reportedSegmentCount = 0;
// `skipHermesCollectionUntilRestart` consumes the terminate-hook collection. The relaunched
// process is what the final collection should save.
let collectionsToSkip = 0;

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
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      return null;
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, Math.min(SEGMENT_POLL_INTERVAL_MS, remainingMs));
    });
  }
}

/**
 * Probes contiguous segments starting at `fromIndex`, stopping at the first
 * gap. Segments below `fromIndex` are skipped to avoid re-downloading
 * already-collected multi-MB traces over the TestMu tunnel.
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
  const capabilities = (appiumDriver.capabilities ?? {}) as Record<
    string,
    unknown
  >;

  // fullReset wipes app-scoped storage between sessions, so no leftover
  // segments can exist. Skip the probe to avoid a guaranteed adb-pull failure
  // (and its noisy WARN log) on every fresh TestMu device.
  if (capabilities['appium:fullReset'] === true) {
    collectedSegmentCount = 0;
    reportedSegmentCount = 0;
    return;
  }

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
    reportedSegmentCount = 0;
    return;
  }
  // Segments are contiguous from 1, so size equals the highest index.
  collectedSegmentCount = existing.size;
  reportedSegmentCount = 0;
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

async function saveSegment(testInfo: TestInfo, buffer: Buffer): Promise<void> {
  reportedSegmentCount += 1;
  await fs.mkdir(PROFILE_OUTPUT_DIRECTORY, { recursive: true });
  const fileName = profileArtifactName(testInfo, reportedSegmentCount);
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

function createArmNonce(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

async function pullTextFile(
  appiumDriver: PullFileDriver,
  remotePath: string,
): Promise<string | null> {
  let base64Contents: string;
  try {
    base64Contents = await appiumDriver.pullFile(remotePath);
  } catch {
    return null;
  }

  const text = Buffer.from(base64Contents, 'base64').toString('utf8').trim();
  return text.length > 0 ? text : null;
}

function sessionPlatform(appiumDriver: WebdriverIO.Browser): string {
  const capabilities = (appiumDriver.capabilities ?? {}) as Record<
    string,
    unknown
  >;
  const platformName =
    capabilities.platformName ?? capabilities['appium:platformName'];
  return typeof platformName === 'string' ? platformName.toLowerCase() : '';
}

/**
 * Opens the measured Hermes window in the running app.
 *
 * No-ops unless `COLLECT_HERMES_CPUPROFILES=true`. iOS collection is not
 * implemented, so iOS also no-ops rather than opening a deeplink that can
 * race the next tap.
 *
 * Drops samples already in memory and keeps profiling. Call it immediately
 * before the team-specific action, while the app is in the foreground, and
 * outside `TimerHelper.measure`.
 */
export async function enableHermesAppProfiling(
  options: {
    markerTimeoutMs?: number;
    markerPollIntervalMs?: number;
  } = {},
): Promise<void> {
  if (!isHermesCpuProfileCollectionEnabled()) {
    return;
  }

  const appiumDriver = getDriver();
  const platform = sessionPlatform(appiumDriver);
  if (platform === 'ios') {
    logger.info(
      'Skipping Hermes profiling arm on iOS (app-scoped export is Android-only)',
    );
    return;
  }
  if (platform !== 'android') {
    throw new Error(
      `Cannot arm Hermes profiling without an Android session (platform "${platform}")`,
    );
  }

  const nonce = createArmNonce();
  const url = `${PROFILER_ARM_DEEPLINK}?nonce=${nonce}`;
  const timeoutMs = options.markerTimeoutMs ?? ARM_MARKER_TIMEOUT_MS;
  const pollIntervalMs =
    options.markerPollIntervalMs ?? ARM_MARKER_POLL_INTERVAL_MS;

  await executeMobileDeepLink(url);

  const remotePath = `${deviceProfileDirectory(appiumDriver)}/${ARMED_FILE_NAME}`;
  const deadline = Date.now() + timeoutMs;
  let lastMarker = '';

  for (;;) {
    const marker = await pullTextFile(
      appiumDriver as PullFileDriver,
      remotePath,
    );
    if (marker) {
      const [armedNonce, highestRaw] = marker.split('\n');
      lastMarker = armedNonce ?? '';
      if (armedNonce === nonce) {
        const highest = Number(highestRaw);
        if (Number.isInteger(highest) && highest >= 0) {
          collectedSegmentCount = Math.max(collectedSegmentCount, highest);
        }
        logger.info(
          `Hermes profiling armed at device segment ${collectedSegmentCount}`,
        );
        return;
      }
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0 || pollIntervalMs <= 0) {
      throw new Error(
        `Hermes profiling was not armed within ${timeoutMs}ms (expected nonce ${nonce}, last marker ${lastMarker || 'missing'})`,
      );
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, Math.min(pollIntervalMs, remainingMs));
    });
  }
}

/**
 * Discards the profile of the current app process so the test keeps only the
 * relaunched one, which profiles from JS startup. Call it immediately before
 * `terminateApp`: the terminate-hook collection is skipped, so the app is never
 * backgrounded and its setup trace dies with the process. Segments already on
 * the device are marked as collected.
 */
export async function skipHermesCollectionUntilRestart(): Promise<void> {
  if (!isHermesCpuProfileCollectionEnabled()) {
    return;
  }

  const appiumDriver = getDriver();
  if (sessionPlatform(appiumDriver) !== 'android') {
    return;
  }

  const setupSegments = await probeSegmentsFrom(
    appiumDriver as PullFileDriver,
    deviceProfileDirectory(appiumDriver),
    collectedSegmentCount + 1,
  );
  collectedSegmentCount += setupSegments.size;
  collectionsToSkip += 1;
  logger.info(
    `Skipping Hermes collection until the app restarts (device segment ${collectedSegmentCount})`,
  );
}

/**
 * Test-only reset for the collector counters.
 * @internal
 */
export function __resetAppProfilingCollectorForTests(): void {
  collectedSegmentCount = 0;
  reportedSegmentCount = 0;
  collectionsToSkip = 0;
}

/**
 * Backgrounds the app so it dumps its in-flight trace, brings it back so the
 * dump can finish, then saves every segment
 * the test has not collected yet into `tests/reporters/reports/hermes-cpuprofiles/`
 * and attaches it to the Playwright report.
 *
 * Returns the number of segments collected. Specs can background the app on
 * their own (the warm-start specs and the seedless OAuth hand-offs do), so a
 * single collection can pick up more than one segment.
 *
 * Segments already on the device are probed once and those buffers are reused
 * for catch-up saves — no second download over the TestMu tunnel. The
 * segment triggered by this background is waited for; a single-shot pull would
 * race the dump that just started and silently drop the measured-flow trace.
 */
export async function collectAppProfiling(
  testInfo: TestInfo,
  platform: 'android' | 'ios',
  options: { segmentWaitTimeoutMs?: number } = {},
): Promise<number> {
  if (!isHermesCpuProfileCollectionEnabled()) {
    return 0;
  }

  if (collectionsToSkip > 0) {
    collectionsToSkip -= 1;
    logger.info(
      `Skipping Hermes collection for "${testInfo.title}" until the next app process`,
    );
    return 0;
  }

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
  // multi-MB traces over the TestMu tunnel.
  const newSegments = await probeSegmentsFrom(
    appiumDriver,
    directory,
    collectedSegmentCount + 1,
  );
  // Segments are contiguous, so highest index = already collected + new count.
  const highestBeforeBackground = collectedSegmentCount + newSegments.size;

  await AppiumGestures.backgroundApp(COLLECT_BACKGROUND_SECONDS);

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
    await saveSegment(testInfo, existing);
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
  await saveSegment(testInfo, buffer);
  collected += 1;

  // Further segments (unexpected extras) are single-shot — only the one we
  // triggered needs the wait budget.
  buffer = await pullSegment(
    appiumDriver,
    segmentRemotePath(directory, collectedSegmentCount + 1),
  );
  while (buffer && collectedSegmentCount < MAX_SEGMENTS_PER_TEST) {
    collectedSegmentCount += 1;
    await saveSegment(testInfo, buffer);
    collected += 1;
    buffer = await pullSegment(
      appiumDriver,
      segmentRemotePath(directory, collectedSegmentCount + 1),
    );
  }

  return collected;
}
