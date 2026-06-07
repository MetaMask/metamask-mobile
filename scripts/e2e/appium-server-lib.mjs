#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
/**
 * Shared Appium server helpers for CI prepare scripts.
 * Keeps Appium warm before Playwright tests so getDriver() skips cold start.
 */
import { spawn } from 'node:child_process';

const DEFAULT_HOST = process.env.APPIUM_HOST ?? '127.0.0.1';
const DEFAULT_PORT = Number(process.env.APPIUM_PORT ?? 4723);
const STARTUP_TIMEOUT_MS = 60_000;

/**
 * @param {string} [host]
 * @param {number} [port]
 * @returns {Promise<boolean>}
 */
export async function isAppiumServerRunning(
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
) {
  try {
    const response = await fetch(`http://${host}:${port}/status`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * @param {string} host
 * @param {number} port
 * @param {number} timeoutMs
 */
export async function waitForAppiumServerReady(
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  timeoutMs = STARTUP_TIMEOUT_MS,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isAppiumServerRunning(host, port)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `Appium server did not become ready at http://${host}:${port} within ${timeoutMs}ms`,
  );
}

/**
 * Start Appium in a detached background process if not already listening.
 * Safe to call from prepare scripts that run before Playwright.
 *
 * @param {{ host?: string; port?: number; timeoutMs?: number }} [options]
 */
export async function ensureAppiumServerRunning(options = {}) {
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? DEFAULT_PORT;
  const timeoutMs = options.timeoutMs ?? STARTUP_TIMEOUT_MS;

  if (await isAppiumServerRunning(host, port)) {
    console.log(`Appium already running at http://${host}:${port}`);
    return;
  }

  console.log(`Starting Appium server at http://${host}:${port}…`);

  const appiumProcess = spawn(
    'yarn',
    ['appium', '--allow-insecure=chromedriver_autodownload', '--port', String(port), '--address', host],
    {
      stdio: 'pipe',
      detached: true,
    },
  );

  appiumProcess.unref();

  let settled = false;

  const settleFailure = (error) => {
    if (settled) return;
    settled = true;
    try {
      if (appiumProcess.pid !== undefined) {
        process.kill(-appiumProcess.pid, 'SIGTERM');
      }
    } catch {
      appiumProcess.kill('SIGTERM');
    }
    throw error;
  };

  appiumProcess.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    if (output.includes('Appium REST http interface listener started')) {
      settled = true;
    }
  });

  appiumProcess.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });

  appiumProcess.on('error', (error) => {
    settleFailure(error);
  });

  appiumProcess.on('close', (code) => {
    if (!settled) {
      settleFailure(
        new Error(
          `Appium server exited with code ${code} before becoming ready`,
        ),
      );
    }
  });

  await waitForAppiumServerReady(host, port, timeoutMs);
  settled = true;
  console.log(`Appium server ready at http://${host}:${port}`);
}
