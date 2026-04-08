'use strict';

const fs = require('node:fs');
const path = require('node:path');

/** Read a value from .js.env */
function loadEnvValue(key) {
  try {
    const envPath = path.resolve(__dirname, '../../../../.js.env');
    const content = fs.readFileSync(envPath, 'utf8');
    // .js.env uses `export KEY="value"` (shell-sourceable format),
    // so we handle the optional `export` prefix and strip surrounding quotes.
    const match = content.match(new RegExp(String.raw`^(?:export\s+)?${key}=(.+)$`, 'm'));
    if (match) return match[1].trim().replace(/^["']/, '').replace(/["']$/, '');
  } catch {
    // .js.env may not exist — fall through to undefined
  }
  return undefined;
}

/** Read WATCHER_PORT from .js.env or env (default: 8081) */
function loadPort() {
  return Number.parseInt(process.env.WATCHER_PORT || loadEnvValue('WATCHER_PORT') || '8081', 10);
}

/** Read IOS_SIMULATOR name from .js.env or env (default: none — accept any device) */
function loadSimulatorName() {
  return process.env.IOS_SIMULATOR || loadEnvValue('IOS_SIMULATOR') || '';
}

/** Read ANDROID_DEVICE serial from .js.env or env (default: none — accept any device) */
function loadAndroidDevice() {
  return process.env.ANDROID_DEVICE || loadEnvValue('ANDROID_DEVICE') || '';
}

module.exports = { loadEnvValue, loadPort, loadSimulatorName, loadAndroidDevice };
