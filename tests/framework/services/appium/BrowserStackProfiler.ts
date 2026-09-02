/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs/promises';
import path from 'path';
import type { TestInfo } from '@playwright/test';

type BrowserStackPlatform = 'android' | 'ios';

const PROFILER_TIMEOUT_MS = 30_000;

type BrowserStackFileDriver = WebdriverIO.Browser & {
  pullFile: (remotePath: string) => Promise<string>;
};

type ShakeDriver = WebdriverIO.Browser & {
  shake: () => Promise<void>;
};

export async function shakeBrowserStackDevice(
  driver: WebdriverIO.Browser,
): Promise<void> {
  await (driver as ShakeDriver).shake();
}

export async function startBrowserStackProfiler(
  driver: WebdriverIO.Browser,
  platform: BrowserStackPlatform,
): Promise<void> {
  if (platform === 'ios') {
    // iOS: shake opens the visible panel, then tap the visible start button.
    await shakeBrowserStackDevice(driver);
    const startButton = await driver.$('~profiler-start-button');
    await startButton.waitForDisplayed({ timeout: PROFILER_TIMEOUT_MS });
    await startButton.click();
  } else {
    // Android: profiler-start-button has no accessibilityLabel so the ~
    // strategy (content-desc) cannot find it. Use the hidden e2e button which
    // has both testID and accessibilityLabel set.
    const startButton = await driver.$('~e2e-profiler-start');
    await startButton.waitForDisplayed({ timeout: PROFILER_TIMEOUT_MS });
    await startButton.click();
  }
}

export async function stopBrowserStackProfiler(
  driver: WebdriverIO.Browser,
  platform: BrowserStackPlatform,
): Promise<string> {
  if (platform === 'ios') {
    // iOS: shake to reopen panel, tap visible stop button, wait for the panel
    // to revert to "Start" as confirmation that profiling has stopped.
    await shakeBrowserStackDevice(driver);
    const stopButton = await driver.$('~profiler-stop-button');
    await stopButton.waitForDisplayed({ timeout: PROFILER_TIMEOUT_MS });
    await stopButton.click();
    const startButton = await driver.$('~profiler-start-button');
    await startButton.waitForDisplayed({ timeout: PROFILER_TIMEOUT_MS });
  } else {
    // Android: tap the hidden stop button (has accessibilityLabel).
    const stopButton = await driver.$('~e2e-profiler-stop');
    await stopButton.waitForDisplayed({ timeout: PROFILER_TIMEOUT_MS });
    await stopButton.click();
  }

  // Both platforms: wait for the hidden result-ready or error element.
  const resultReady = await driver.$('~e2e-profiler-result-ready');
  const profilerError = await driver.$('~e2e-profiler-error');
  await driver.waitUntil(
    async () => {
      const [resultDisplayed, errorDisplayed] = await Promise.all([
        resultReady.isDisplayed().catch(() => false),
        profilerError.isDisplayed().catch(() => false),
      ]);
      return resultDisplayed || errorDisplayed;
    },
    {
      timeout: PROFILER_TIMEOUT_MS,
      timeoutMsg: `Profiler result not ready after ${PROFILER_TIMEOUT_MS}ms`,
    },
  );

  if (await profilerError.isDisplayed().catch(() => false)) {
    const errorLabel = await profilerError.getAttribute('content-desc');
    throw new Error(`Profiler failed on device: ${errorLabel}`);
  }

  const resultLabel = await resultReady.getAttribute('content-desc');
  const fullPath = resultLabel?.split(':').pop();
  const fileName = fullPath?.split('/').pop();
  if (!fileName?.endsWith('.cpuprofile')) {
    throw new Error('The app did not expose a valid profiler filename');
  }
  return fileName;
}

export async function pullBrowserStackProfiler(
  driver: WebdriverIO.Browser,
  testInfo: TestInfo,
  platform: BrowserStackPlatform,
  fileName: string,
): Promise<string> {
  const remotePath =
    platform === 'android'
      ? `/sdcard/Download/${fileName}`
      : `@io.metamask.MetaMask:documents/${fileName}`;
  const base64Profile = await (driver as BrowserStackFileDriver).pullFile(
    remotePath,
  );
  const outputDirectory = 'tests/test-reports/performance-profiles';
  await fs.mkdir(outputDirectory, { recursive: true });
  const outputPath = path.join(
    outputDirectory,
    `${testInfo.project.name}-${testInfo.title.replace(
      /[^a-zA-Z0-9._-]/g,
      '_',
    )}${path.extname(fileName)}`,
  );
  await fs.writeFile(outputPath, Buffer.from(base64Profile, 'base64'));
  await testInfo.attach(path.basename(outputPath), {
    path: outputPath,
    contentType: 'application/json',
  });
  return outputPath;
}
