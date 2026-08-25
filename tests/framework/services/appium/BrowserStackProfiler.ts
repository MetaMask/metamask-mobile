/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs/promises';
import path from 'path';
import type { TestInfo } from '@playwright/test';

type BrowserStackPlatform = 'android' | 'ios';

const BROWSERSTACK_SHAKE_COMMAND =
  'browserstack_executor: {"action":"customGesture","arguments":{"deviceShake":"true"}}';
const PROFILER_TIMEOUT_MS = 30_000;

type BrowserStackFileDriver = WebdriverIO.Browser & {
  pullFile: (remotePath: string) => Promise<string>;
};

export async function shakeBrowserStackDevice(
  driver: WebdriverIO.Browser,
): Promise<void> {
  await driver.execute(BROWSERSTACK_SHAKE_COMMAND);
}

export async function startBrowserStackProfiler(
  driver: WebdriverIO.Browser,
): Promise<void> {
  await shakeBrowserStackDevice(driver);
  const startButton = await driver.$('~profiler-start-button');
  await startButton.waitForDisplayed({ timeout: PROFILER_TIMEOUT_MS });
  await startButton.click();
}

export async function stopBrowserStackProfiler(
  driver: WebdriverIO.Browser,
  platform: BrowserStackPlatform,
): Promise<string> {
  await shakeBrowserStackDevice(driver);
  const stopButton = await driver.$('~profiler-stop-button');
  await stopButton.waitForDisplayed({ timeout: PROFILER_TIMEOUT_MS });
  await stopButton.click();

  const startButton = await driver.$('~profiler-start-button');
  await startButton.waitForDisplayed({ timeout: PROFILER_TIMEOUT_MS });

  const resultReady = await driver.$('~e2e-profiler-result-ready');
  const resultLabel = await resultReady.getAttribute('content-desc');
  const fileName = resultLabel?.split(':').pop();
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
