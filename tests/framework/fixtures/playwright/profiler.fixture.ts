import type { Fixtures, TestInfo } from '@playwright/test';
import { copyProfilerResult } from '../../services/appium/Profiler';
import type {
  CurrentDeviceDetails,
  TestLevelFixtures,
  WorkerLevelFixtures,
} from './types.ts';

const PROFILER_OUTPUT_DIRECTORY =
  process.env.APPIUM_PROFILER_OUTPUT_DIRECTORY?.trim() ||
  'tests/test-reports/appium-profiles';
const PROFILER_ENABLED = process.env.APPIUM_CAPTURE_PROFILER === 'true';
const ELEMENT_TIMEOUT_MS = 30_000;

async function startProfiler(driver: WebdriverIO.Browser): Promise<void> {
  const start = await driver.$('~e2e-profiler-start');
  await start.waitForDisplayed({ timeout: ELEMENT_TIMEOUT_MS });
  await start.click();

  const recordingReady = await driver.$('~e2e-profiler-recording-ready');
  await recordingReady.waitForDisplayed({ timeout: ELEMENT_TIMEOUT_MS });
}

async function stopProfiler(driver: WebdriverIO.Browser): Promise<void> {
  const stop = await driver.$('~e2e-profiler-stop');
  await stop.waitForDisplayed({ timeout: ELEMENT_TIMEOUT_MS });
  await stop.click();

  const resultReady = await driver.$('~e2e-profiler-result-ready');
  await resultReady.waitForDisplayed({ timeout: ELEMENT_TIMEOUT_MS });
}

export const profilerFixture: Fixtures<TestLevelFixtures, WorkerLevelFixtures> =
  {
    profiler: [
      async (
        {
          driver,
          currentDeviceDetails,
        }: {
          driver: WebdriverIO.Browser;
          currentDeviceDetails: CurrentDeviceDetails;
        },
        use: (result: null) => Promise<void>,
        testInfo: TestInfo,
      ) => {
        if (!PROFILER_ENABLED) {
          await use(null);
          return;
        }

        await startProfiler(driver);
        try {
          await use(null);
        } finally {
          await stopProfiler(driver);
          await copyProfilerResult({
            outputDirectory: `${PROFILER_OUTPUT_DIRECTORY}/${testInfo.project.name}`,
            testInfo,
            device: currentDeviceDetails,
          });
        }
      },
      { auto: true },
    ],
  };
