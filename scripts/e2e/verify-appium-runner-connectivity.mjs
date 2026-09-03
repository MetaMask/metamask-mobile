#!/usr/bin/env node
/**
 * CI preflight for iOS Appium smoke jobs.
 *
 * Validates the booted simulator before Playwright starts.
 *
 * Usage:
 *   node scripts/e2e/verify-appium-runner-connectivity.mjs ios
 *
 * Env:
 *   IOS_DEVICE_POOL — optional comma-separated pool UDIDs (N>1 prepare output)
 *   IOS_SIMULATOR_UDID — optional single-simulator target
 *   SKIP_E2E_CONNECTIVITY_VERIFY=true — skip all checks
 */

import { exec } from 'node:child_process';
import { basename } from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const BOOTED_SIMULATOR_UDID_PATTERN =
  /\(([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})\)\s*\(Booted\)\s*$/u;

/**
 * @param {string} line
 * @returns {string | null}
 */
export function parseBootedSimulatorUdid(line) {
  const match = line.trim().match(BOOTED_SIMULATOR_UDID_PATTERN);
  return match?.[1] ?? null;
}

/**
 * @param {string[]} bootedLines
 * @returns {string[]}
 */
export function parseBootedSimulatorUdids(bootedLines) {
  return bootedLines
    .map((line) => parseBootedSimulatorUdid(line))
    .filter((udid) => udid !== null);
}

/**
 * @param {string[]} bootedLines
 * @param {string[]} requiredUdids
 */
export function assertBootedUdids(bootedLines, requiredUdids) {
  const bootedUdids = new Set(parseBootedSimulatorUdids(bootedLines));

  for (const udid of requiredUdids) {
    if (!bootedUdids.has(udid)) {
      throw new Error(
        `Booted simulator ${udid} not found. Booted devices:\n${bootedLines.join('\n')}`,
      );
    }
  }
}

/**
 * @param {{
 *   execImpl?: typeof execAsync;
 *   iosDevicePool?: string;
 *   iosSimulatorUdid?: string;
 * }} [options]
 */
async function verifyIosAppiumRunnerConnectivity(options = {}) {
  const execImpl = options.execImpl ?? execAsync;
  const devicePool = options.iosDevicePool ?? process.env.IOS_DEVICE_POOL?.trim();
  const udid =
    options.iosSimulatorUdid ?? process.env.IOS_SIMULATOR_UDID?.trim();

  const { stdout } = await execImpl('xcrun simctl list devices booted');
  const bootedLines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => parseBootedSimulatorUdid(line) !== null);

  if (bootedLines.length === 0) {
    throw new Error('No booted iOS simulator found');
  }

  if (devicePool) {
    const requiredUdids = devicePool
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    assertBootedUdids(bootedLines, requiredUdids);
  } else if (udid) {
    assertBootedUdids(bootedLines, [udid]);
  }

  return bootedLines;
}

function isDirectScriptExecution() {
  const entry = process.argv[1];
  return (
    entry != null &&
    basename(entry) === 'verify-appium-runner-connectivity.mjs'
  );
}

async function main() {
  const platform = process.argv[2]?.toLowerCase();

  if (platform !== 'ios') {
    console.error(
      'Usage: node scripts/e2e/verify-appium-runner-connectivity.mjs ios',
    );
    process.exit(1);
  }

  if (process.env.SKIP_E2E_CONNECTIVITY_VERIFY === 'true') {
    console.log('Skipping Appium runner connectivity check');
    process.exit(0);
  }

  try {
    const bootedLines = await verifyIosAppiumRunnerConnectivity();
    const devicePool = process.env.IOS_DEVICE_POOL?.trim();

    if (devicePool) {
      const poolSize = devicePool.split(',').filter((entry) => entry.trim()).length;
      console.log(
        `Booted iOS simulator pool detected (${poolSize} devices)`,
      );
    } else {
      console.log(
        `Booted iOS simulator detected: ${bootedLines[0]?.split('(')[0]?.trim()}`,
      );
    }

    console.log('✅ Appium runner connectivity check passed (ios)');
  } catch (error) {
    console.error(
      '❌ Appium runner connectivity check failed (ios):',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

if (isDirectScriptExecution()) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
