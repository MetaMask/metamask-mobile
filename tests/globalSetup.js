/* eslint-disable import/no-commonjs, import/no-nodejs-modules */
const detoxGlobalSetup = require('detox/runners/jest/globalSetup');
const { execSync } = require('child_process');

/**
 * Wraps Detox's globalSetup to pre-root the Android emulator.
 *
 * After Detox boots the emulator (in globalSetup), we run `adb root` so that
 * adbd restarts as root BEFORE Detox's testEnvironment creates the device
 * connection. This way, any subsequent `adb root` calls inside tests
 * (e.g. from installCACertAndroid) are no-ops — adbd responds with
 * "already running as root" and does NOT restart, keeping Detox's
 * WebSocket connection intact.
 */
module.exports = async function (globalConfig) {
  await detoxGlobalSetup(globalConfig);

  try {
    execSync('adb root', { timeout: 15000 });
    execSync('adb wait-for-device', { timeout: 30000 });
  } catch {
    // Ignore — may be running iOS-only or adb not available
  }
};
