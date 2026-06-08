#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
/**
 * Creates a throwaway Appium/XCUITest session so WDA is launched before Playwright tests.
 * Leaves Appium running (for the test step to reuse) and WDA on the sim (useNewWDA: false).
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const APPIUM_PORT = Number(process.env.APPIUM_PORT ?? 4723);
const APPIUM_HOST = process.env.APPIUM_HOST ?? '127.0.0.1';
const APPIUM_STARTUP_TIMEOUT_MS = 60_000;

async function isAppiumRunning() {
  try {
    const response = await fetch(`http://${APPIUM_HOST}:${APPIUM_PORT}/status`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForAppiumReady(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isAppiumRunning()) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`Appium did not start within ${timeoutMs}ms`);
}

async function startAppiumServer() {
  if (await isAppiumRunning()) {
    console.log(`Appium already running at http://${APPIUM_HOST}:${APPIUM_PORT} — reusing.`);
    return;
  }

  console.log(`Starting Appium on http://${APPIUM_HOST}:${APPIUM_PORT} for WDA warm-up…`);

  // stdio: 'ignore' — do not pipe stdout/stderr into this process. Piped stdio keeps
  // Node's event loop alive after warm-up even when Appium is detached/unref'd, which
  // makes the GHA prepare step hang until job timeout.
  const proc = spawn(
    'yarn',
    [
      'appium',
      '--allow-insecure=chromedriver_autodownload',
      '--port',
      String(APPIUM_PORT),
      '--address',
      APPIUM_HOST,
    ],
    { stdio: 'ignore', detached: true },
  );

  proc.on('error', (error) => {
    console.error('Failed to spawn Appium:', error);
  });

  proc.unref();
  await waitForAppiumReady(APPIUM_STARTUP_TIMEOUT_MS);
}

/**
 * @param {{ udid: string; wdaBundleIdBase: string; simulatorName: string; appBundleId: string }} options
 */
export async function warmUpIosAppiumWda({
  udid,
  wdaBundleIdBase,
  simulatorName,
  appBundleId,
}) {
  await startAppiumServer();

  const { remote } = await import('webdriverio');
  console.log('Creating warm-up Appium session (preinstalled WDA)…');

  const driver = await remote({
    hostname: APPIUM_HOST,
    port: APPIUM_PORT,
    connectionRetryTimeout: 5 * 60 * 1000,
    connectionRetryCount: 0,
    capabilities: {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:udid': udid,
      'appium:deviceName': simulatorName,
      'appium:bundleId': appBundleId,
      'appium:usePreinstalledWDA': true,
      'appium:updatedWDABundleId': wdaBundleIdBase,
      'appium:useNewWDA': false,
      'appium:derivedDataPath': `${process.env.HOME}/appium-wda`,
      'appium:wdaLaunchTimeout': 60_000,
      'appium:wdaConnectionTimeout': 10_000,
      'appium:simulatorStartupTimeout': 120_000,
      'appium:noReset': true,
      'appium:skipLogCapture': true,
    },
  });

  await driver.deleteSession();
  if (typeof driver.close === 'function') {
    await driver.close().catch(() => undefined);
  }
  console.log('WDA warm-up complete — Appium left running for Playwright.');
  await sleep(2000);
}
