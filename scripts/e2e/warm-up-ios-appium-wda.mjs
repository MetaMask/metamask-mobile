#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
/**
 * Launches WDA on a booted simulator before Playwright tests.
 * Starts a detached Appium server (reused when SKIP_APPIUM_STOP=true) and opens a
 * WDA-only WebDriverIO session (no app bundleId). useNewWDA:false keeps WDA alive
 * after deleteSession so the test step attaches instead of cold-starting.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { ensureIosSimulatorBooted } from './ios-simulator-lib.mjs';

const APPIUM_PORT = Number(process.env.APPIUM_PORT ?? 4723);
const APPIUM_HOST = process.env.APPIUM_HOST ?? '127.0.0.1';
const APPIUM_STARTUP_TIMEOUT_MS = 60_000;
const WARMUP_SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const WARMUP_MAX_ATTEMPTS = 2;
const WARMUP_RETRY_DELAY_MS = 5_000;

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

  // stdio: 'ignore' — piped stdio would keep Node's event loop alive after unref().
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
 * @param {{ udid: string; wdaBundleIdBase: string; simulatorName: string }} options
 */
async function createWarmUpSession({ udid, wdaBundleIdBase, simulatorName }) {
  const { remote } = await import('webdriverio');
  console.log('Creating warm-up Appium session (preinstalled WDA, no app launch)…');

  const driver = await remote({
    hostname: APPIUM_HOST,
    port: APPIUM_PORT,
    connectionRetryTimeout: WARMUP_SESSION_TIMEOUT_MS,
    connectionRetryCount: 0,
    capabilities: {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:udid': udid,
      'appium:deviceName': simulatorName,
      'appium:usePreinstalledWDA': true,
      'appium:updatedWDABundleId': wdaBundleIdBase,
      'appium:useNewWDA': false,
      'appium:derivedDataPath': `${process.env.HOME}/appium-wda`,
      'appium:wdaLaunchTimeout': 120_000,
      'appium:wdaConnectionTimeout': 30_000,
      'appium:simulatorStartupTimeout': 180_000,
      'appium:noReset': true,
      'appium:skipLogCapture': true,
    },
  });

  await driver.deleteSession();
  if (typeof driver.close === 'function') {
    await driver.close().catch(() => undefined);
  }
}

/**
 * @param {{ udid: string; wdaBundleIdBase: string; simulatorName: string }} options
 * @returns {Promise<boolean>} true when warm-up succeeded
 */
export async function warmUpIosAppiumWda({ udid, wdaBundleIdBase, simulatorName }) {
  await startAppiumServer();

  let lastError;

  for (let attempt = 1; attempt <= WARMUP_MAX_ATTEMPTS; attempt += 1) {
    try {
      console.log(
        `WDA warm-up attempt ${attempt}/${WARMUP_MAX_ATTEMPTS} (simulator ${udid})…`,
      );
      await ensureIosSimulatorBooted(udid);
      await createWarmUpSession({ udid, wdaBundleIdBase, simulatorName });
      console.log('WDA warm-up complete — Appium left running for Playwright.');
      await sleep(2000);
      return true;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`WDA warm-up attempt ${attempt} failed: ${message}`);
      if (attempt < WARMUP_MAX_ATTEMPTS) {
        await sleep(WARMUP_RETRY_DELAY_MS);
      }
    }
  }

  throw lastError;
}
