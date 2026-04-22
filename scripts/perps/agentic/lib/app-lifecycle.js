'use strict';

const { spawnSync } = require('node:child_process');

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

function detectPlatform() {
  if (process.env.ADB_SERIAL || process.env.ANDROID_SERIAL) {
    return 'android';
  }
  if (process.platform === 'darwin') {
    return 'ios';
  }
  throw new Error(
    'Cannot detect simulator platform. Set ADB_SERIAL for Android or run on macOS for iOS.',
  );
}

// ---------------------------------------------------------------------------
// iOS helpers
// ---------------------------------------------------------------------------

function resolveBootedSimulatorUdid() {
  const result = spawnSync(
    'xcrun',
    ['simctl', 'list', 'devices', 'booted', '-j'],
    { encoding: 'utf8' },
  );
  const parsed = JSON.parse(result.stdout || '{}');
  for (const devices of Object.values(parsed.devices || {})) {
    for (const d of devices) {
      if (d.state === 'Booted') {
        return d.udid;
      }
    }
  }
  throw new Error('No booted iOS simulator found');
}

function resolveIosBundleId(udid) {
  const result = spawnSync('xcrun', ['simctl', 'listapps', udid], {
    encoding: 'utf8',
  });
  const match = (result.stdout || '').match(
    /CFBundleIdentifier\s*=\s*"(io\.metamask\.[^"]+)"/,
  );
  return match ? match[1] : 'io.metamask.MetaMask';
}

function iosBackground() {
  spawnSync(
    'osascript',
    [
      '-e', 'tell application "Simulator" to activate',
      '-e', 'delay 0.3',
      '-e', 'tell application "System Events" to keystroke "h" using {command down, shift down}',
    ],
    { encoding: 'utf8' },
  );
}

function iosForeground(udid, bundleId) {
  spawnSync('xcrun', ['simctl', 'launch', udid, bundleId], {
    encoding: 'utf8',
  });
}

function iosTerminate(udid, bundleId) {
  spawnSync('xcrun', ['simctl', 'terminate', udid, bundleId], {
    encoding: 'utf8',
  });
}

// ---------------------------------------------------------------------------
// Android helpers
// ---------------------------------------------------------------------------

function resolveAdbSerial() {
  return process.env.ADB_SERIAL || process.env.ANDROID_SERIAL || '';
}

function resolveAndroidPackage() {
  // Check for running MetaMask activity
  const serial = resolveAdbSerial();
  const args = serial ? ['-s', serial] : [];
  const result = spawnSync(
    'adb',
    [...args, 'shell', 'dumpsys', 'activity', 'activities'],
    { encoding: 'utf8' },
  );
  const match = (result.stdout || '').match(
    /(io\.metamask[.\w]*)\/.+Activity/,
  );
  return match ? match[1] : 'io.metamask';
}

function adbShell(...shellArgs) {
  const serial = resolveAdbSerial();
  const args = serial ? ['-s', serial] : [];
  return spawnSync('adb', [...args, 'shell', ...shellArgs], {
    encoding: 'utf8',
  });
}

function androidBackground() {
  adbShell('input', 'keyevent', 'KEYCODE_HOME');
}

function androidForeground(packageName) {
  adbShell(
    'monkey',
    '-p', packageName,
    '-c', 'android.intent.category.LAUNCHER',
    '1',
  );
}

function androidTerminate(packageName) {
  adbShell('am', 'force-stop', packageName);
}

// ---------------------------------------------------------------------------
// Public API — platform-agnostic
// ---------------------------------------------------------------------------

/**
 * Send the app to the OS home screen.
 * @returns {{ bundleId: string }} Resolved app identifier
 */
function backgroundApp() {
  const platform = detectPlatform();
  if (platform === 'ios') {
    const udid = resolveBootedSimulatorUdid();
    const bundleId = resolveIosBundleId(udid);
    iosBackground();
    return { bundleId };
  }
  const packageName = resolveAndroidPackage();
  androidBackground();
  return { bundleId: packageName };
}

/**
 * Bring the app back to the foreground.
 * @returns {{ bundleId: string }}
 */
function foregroundApp() {
  const platform = detectPlatform();
  if (platform === 'ios') {
    const udid = resolveBootedSimulatorUdid();
    const bundleId = resolveIosBundleId(udid);
    iosForeground(udid, bundleId);
    return { bundleId };
  }
  const packageName = resolveAndroidPackage();
  androidForeground(packageName);
  return { bundleId: packageName };
}

/**
 * Terminate and relaunch the app.
 * @returns {{ bundleId: string }}
 */
function restartApp() {
  const platform = detectPlatform();
  if (platform === 'ios') {
    const udid = resolveBootedSimulatorUdid();
    const bundleId = resolveIosBundleId(udid);
    iosTerminate(udid, bundleId);
    iosForeground(udid, bundleId);
    return { bundleId };
  }
  const packageName = resolveAndroidPackage();
  androidTerminate(packageName);
  androidForeground(packageName);
  return { bundleId: packageName };
}

module.exports = {
  backgroundApp,
  detectPlatform,
  foregroundApp,
  restartApp,
};
