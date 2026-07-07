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
 *   IOS_SIMULATOR_UDID — optional simulator target
 *   SKIP_E2E_CONNECTIVITY_VERIFY=true — skip all checks
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

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

const udid = process.env.IOS_SIMULATOR_UDID?.trim();

try {
  const { stdout } = await execAsync('xcrun simctl list devices booted');
  const bootedLines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('(Booted)'));

  if (bootedLines.length === 0) {
    throw new Error('No booted iOS simulator found');
  }

  if (udid && !bootedLines.some((line) => line.includes(udid))) {
    throw new Error(
      `Booted simulator ${udid} not found. Booted devices:\n${bootedLines.join('\n')}`,
    );
  }

  console.log(
    `Booted iOS simulator detected: ${bootedLines[0]?.split('(')[0]?.trim()}`,
  );
  console.log('✅ Appium runner connectivity check passed (ios)');
} catch (error) {
  console.error(
    '❌ Appium runner connectivity check failed (ios):',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}
