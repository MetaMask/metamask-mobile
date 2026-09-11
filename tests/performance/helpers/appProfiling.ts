/**
 * Performance-test helpers that start/stop in-app Hermes profiling by tapping
 * invisible Pressables (`performance-profiler-start|stop`), wait for result
 * hooks, then pull the `.cpuprofile` from app-scoped external storage into CI
 * artifacts.
 *
 * Does not use deeplinks — MetaMask's router shows the unsupported-link UI for
 * unknown `metamask://e2e/profiler/*` paths.
 *
 * A Hermes profiling session cannot outlive the app process that opened it.
 * Specs that call `terminateApp` therefore surface the `session-lost` hook on
 * stop, and collection is skipped for them instead of asking Hermes to dump a
 * sampler it no longer has running.
 */

/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs/promises';
import path from 'path';
import type { TestInfo } from '@playwright/test';
import type { ChainablePromiseElement } from 'webdriverio';
import { getDriver } from '../../framework/AppiumUtilities.ts';
import { createLogger } from '../../framework/logger.ts';

const logger = createLogger({ name: 'Performance - AppProfiling' });

const PROFILE_OUTPUT_DIRECTORY = 'tests/reporters/reports/hermes-cpuprofiles';
const START_TEST_ID = 'performance-profiler-start';
const STOP_TEST_ID = 'performance-profiler-stop';
const START_ACK_TEST_ID = 'performance-profiler-start-ack';
const STOP_ACK_TEST_ID = 'performance-profiler-stop-ack';
const RECORDING_READY_TEST_ID = 'performance-profiler-recording-ready';
const RESULT_READY_TEST_ID = 'performance-profiler-result-ready';
const SESSION_LOST_TEST_ID = 'performance-profiler-session-lost';
const ERROR_TEST_ID = 'performance-profiler-error';
const RECORDING_TIMEOUT_MS = 60_000;
const RESULT_TIMEOUT_MS = 60_000;
// The native stop resolves only after Hermes has written a non-empty trace, so
// this budget only covers `pullFile` transfer flakiness on BrowserStack.
const PROFILE_FILE_TIMEOUT_MS = 30_000;
const PROFILE_FILE_POLL_INTERVAL_MS = 2_000;

type PullFileDriver = WebdriverIO.Browser & {
  pullFile: (remotePath: string) => Promise<string>;
};

function profilerSelector(
  appiumDriver: WebdriverIO.Browser,
  testId: string,
): string {
  if (testId === RESULT_READY_TEST_ID || testId === ERROR_TEST_ID) {
    return `android=new UiSelector().descriptionStartsWith("${testId}:")`;
  }
  const platformName = String(
    (appiumDriver.capabilities as Record<string, unknown>)?.platformName ?? '',
  ).toLowerCase();
  if (platformName === 'android') {
    return `android=new UiSelector().resourceIdMatches(".*${testId}.*")`;
  }
  return `~${testId}`;
}

async function elementExists(
  appiumDriver: WebdriverIO.Browser,
  testId: string,
): Promise<boolean> {
  const el = await appiumDriver.$(profilerSelector(appiumDriver, testId));
  return el.isExisting().catch(() => false);
}

async function tapProfilerControl(testId: string): Promise<void> {
  const appiumDriver = getDriver();
  if (!appiumDriver) {
    throw new Error('Appium driver is not available');
  }
  const capabilities = (appiumDriver.capabilities ?? {}) as Record<
    string,
    unknown
  >;
  const packageCandidate =
    capabilities['appium:appPackage'] ?? capabilities.appPackage;
  if (typeof packageCandidate === 'string') {
    await appiumDriver.activateApp(packageCandidate).catch((error) => {
      logger.warn(
        `Could not activate profiler app before ${testId}: ${String(error)}`,
      );
    });
  }
  let control: ChainablePromiseElement | undefined;
  let lastRecoveryAt = 0;
  await appiumDriver.waitUntil(
    async () => {
      control = await appiumDriver.$(profilerSelector(appiumDriver, testId));
      if (await control.isExisting().catch(() => false)) {
        return true;
      }

      // Foreground the app again if it drifted to the background. Never
      // relaunch here: killing the process would discard the Hermes session
      // this helper is trying to control.
      if (
        typeof packageCandidate === 'string' &&
        Date.now() - lastRecoveryAt >= 10_000
      ) {
        lastRecoveryAt = Date.now();
        await appiumDriver.activateApp(packageCandidate).catch((error) => {
          logger.warn(
            `Could not reactivate profiler app while waiting for ${testId}: ${String(error)}`,
          );
        });
      }
      return false;
    },
    {
      timeout: RECORDING_TIMEOUT_MS,
      timeoutMsg: `Profiler control not found: ${testId}`,
    },
  );
  const resolvedControl = control;
  if (!resolvedControl) {
    throw new Error(`Profiler control was not resolved: ${testId}`);
  }
  // Prefer a11y click; fall back to coordinate tap if RN onPress is not delivered.
  try {
    await resolvedControl.click();
  } catch (error) {
    logger.warn(
      `Profiler control click failed for ${testId}, retrying via coordinates: ${String(error)}`,
    );
    const location = await resolvedControl.getLocation();
    const size = await resolvedControl.getSize();
    await appiumDriver.execute('mobile: clickGesture', {
      x: Math.round(location.x + size.width / 2),
      y: Math.round(location.y + size.height / 2),
    });
  }
}

/**
 * Waits until one of `readyTestIds` appears, or the profiler publishes an error.
 * Resolves with the id that appeared so callers can branch on it.
 */
async function waitForProfilerSignal(
  appiumDriver: WebdriverIO.Browser,
  {
    readyTestIds,
    timeoutMs,
    timeoutMsg,
  }: {
    readyTestIds: string[];
    timeoutMs: number;
    timeoutMsg: string;
  },
): Promise<string> {
  let observedTestId: string | undefined;

  await appiumDriver.waitUntil(
    async () => {
      const [readyFlags, error] = await Promise.all([
        Promise.all(
          readyTestIds.map((testId) => elementExists(appiumDriver, testId)),
        ),
        elementExists(appiumDriver, ERROR_TEST_ID),
      ]);

      const readyIndex = readyFlags.findIndex(Boolean);
      if (readyIndex !== -1) {
        observedTestId = readyTestIds[readyIndex];
        return true;
      }
      return error;
    },
    { timeout: timeoutMs, timeoutMsg },
  );

  if (!observedTestId) {
    const profilerError = await appiumDriver.$(
      profilerSelector(appiumDriver, ERROR_TEST_ID),
    );
    const errorLabel =
      (await profilerError.getAttribute('content-desc').catch(() => null)) ||
      (await profilerError.getAttribute('name').catch(() => null)) ||
      'unknown profiler error';
    throw new Error(`Profiler failed on device: ${errorLabel}`);
  }

  return observedTestId;
}

export async function startAppProfilingFromTest(): Promise<void> {
  const appiumDriver = getDriver();
  if (!appiumDriver) {
    throw new Error('Appium driver is not available');
  }

  await tapProfilerControl(START_TEST_ID);

  await waitForProfilerSignal(appiumDriver, {
    readyTestIds: [START_ACK_TEST_ID],
    timeoutMs: RECORDING_TIMEOUT_MS,
    timeoutMsg: `Profiler start onPress was not delivered within ${RECORDING_TIMEOUT_MS}ms (start-ack missing)`,
  });

  await waitForProfilerSignal(appiumDriver, {
    readyTestIds: [RECORDING_READY_TEST_ID],
    timeoutMs: RECORDING_TIMEOUT_MS,
    timeoutMsg: `Profiler did not start within ${RECORDING_TIMEOUT_MS}ms`,
  });
}

export async function stopAppProfilingFromTest(): Promise<void> {
  const appiumDriver = getDriver();
  if (!appiumDriver) {
    throw new Error('Appium driver is not available');
  }

  await tapProfilerControl(STOP_TEST_ID);

  await waitForProfilerSignal(appiumDriver, {
    readyTestIds: [STOP_ACK_TEST_ID],
    timeoutMs: RECORDING_TIMEOUT_MS,
    timeoutMsg: `Profiler stop onPress was not delivered within ${RECORDING_TIMEOUT_MS}ms (stop-ack missing)`,
  });
}

function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * A test produces one profiling segment per app process it profiles. Specs that
 * restart the app therefore produce several, and each needs its own artifact
 * name. The first keeps the plain name so single-segment specs (almost all of
 * them) get a predictable artifact.
 */
let collectedSegmentCount = 0;

export function resetAppProfilingSegments(): void {
  collectedSegmentCount = 0;
}

function nextProfileFileName(testInfo: TestInfo): string {
  collectedSegmentCount += 1;
  const base = `${sanitizeFilePart(testInfo.project.name)}-${sanitizeFilePart(testInfo.title)}`;
  return collectedSegmentCount === 1
    ? `${base}.cpuprofile`
    : `${base}.segment-${collectedSegmentCount}.cpuprofile`;
}

function toAndroidPullPath(profilePath: string): string {
  if (profilePath.startsWith('/sdcard/Android/data/')) {
    return profilePath;
  }
  if (profilePath.startsWith('/storage/emulated/0/Android/data/')) {
    return profilePath.replace('/storage/emulated/0/', '/sdcard/');
  }
  throw new Error(
    `Profiler returned a non-pullable app-scoped path: ${profilePath}`,
  );
}

/**
 * Resolves the on-device `.cpuprofile` path, or `null` when the app process
 * that owned the profiling session was killed during the test.
 */
async function waitForProfilerResultPath(
  appiumDriver: WebdriverIO.Browser,
): Promise<string | null> {
  const observedTestId = await waitForProfilerSignal(appiumDriver, {
    readyTestIds: [RESULT_READY_TEST_ID, SESSION_LOST_TEST_ID],
    timeoutMs: RESULT_TIMEOUT_MS,
    timeoutMsg: `Profiler result not ready after ${RESULT_TIMEOUT_MS}ms`,
  });

  if (observedTestId === SESSION_LOST_TEST_ID) {
    return null;
  }

  const resultReady = await appiumDriver.$(
    profilerSelector(appiumDriver, RESULT_READY_TEST_ID),
  );
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

async function pullValidProfilerFile(
  appiumDriver: PullFileDriver,
  remotePath: string,
): Promise<Buffer> {
  const deadline = Date.now() + PROFILE_FILE_TIMEOUT_MS;
  let lastError = 'profile file is not available yet';

  while (Date.now() < deadline) {
    try {
      const base64Profile = await appiumDriver.pullFile(remotePath);
      const buffer = Buffer.from(base64Profile, 'base64');
      if (buffer.length > 0) {
        const parsedProfile: unknown = JSON.parse(buffer.toString('utf8'));
        if (
          parsedProfile &&
          typeof parsedProfile === 'object' &&
          !Array.isArray(parsedProfile)
        ) {
          return buffer;
        }
        lastError = 'profile JSON root is not an object';
      } else {
        lastError = 'profile file is empty';
      }
    } catch (error) {
      lastError = String(error);
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, PROFILE_FILE_POLL_INTERVAL_MS);
    });
  }

  throw new Error(
    `Profiler file was not valid after ${PROFILE_FILE_TIMEOUT_MS}ms: ${remotePath}; last error: ${lastError}`,
  );
}

/**
 * Pulls the on-device profile path exposed by PerformanceProfilerStatus,
 * saves it under `tests/reporters/reports/hermes-cpuprofiles/` (CI upload path),
 * and attaches it to the Playwright report.
 *
 * Returns `null` on iOS (export/pull is Android-only for now) and when the
 * profiling session did not survive to the end of the test.
 */
export async function pullAndAttachAppProfiling(
  testInfo: TestInfo,
  platform: 'android' | 'ios',
): Promise<string | null> {
  if (platform !== 'android') {
    logger.info(
      'Skipping Hermes cpuprofile pull on iOS (app-scoped export is Android-only)',
    );
    return null;
  }

  const appiumDriver = getDriver() as PullFileDriver;
  const profilePath = await waitForProfilerResultPath(appiumDriver);
  if (!profilePath) {
    logger.info(
      'Skipping Hermes cpuprofile pull: the app process that started profiling was terminated during this test',
    );
    return null;
  }
  const remotePath = toAndroidPullPath(profilePath);

  logger.info(`Polling Hermes profile from ${remotePath}`);
  const buffer = await pullValidProfilerFile(appiumDriver, remotePath);

  await fs.mkdir(PROFILE_OUTPUT_DIRECTORY, { recursive: true });
  const fileName = nextProfileFileName(testInfo);
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

/**
 * Collects the in-flight profiling segment before the app process is killed,
 * and reports whether a session was stopped.
 *
 * Hermes cannot dump a trace from a process that no longer exists, so a spec
 * that restarts the app has to flush its profile first. Profiling is not
 * restarted afterwards on purpose: tapping the in-app start control costs an
 * Appium round trip, and the launch-time specs begin measuring immediately
 * after the relaunch, so re-arming there would inflate the very timer they
 * exist to record.
 */
export async function collectAppProfilingBeforeAppTerminate(
  testInfo: TestInfo,
  platform: 'android' | 'ios',
): Promise<boolean> {
  const appiumDriver = getDriver();
  if (!appiumDriver) {
    return false;
  }
  // The spec was just driving the app, so it is in the foreground here and a
  // direct lookup is reliable without reactivating it.
  if (!(await elementExists(appiumDriver, RECORDING_READY_TEST_ID))) {
    return false;
  }

  logger.info(
    `Flushing Hermes profile for "${testInfo.title}" before the app is terminated`,
  );
  await stopAndCollectAppProfiling(testInfo, platform);
  return true;
}
