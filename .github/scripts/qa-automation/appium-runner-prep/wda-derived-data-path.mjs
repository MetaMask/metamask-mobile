#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
import { homedir } from 'node:os';
import { join } from 'node:path';

function readEnv(name) {
  // `process.env[name]` stays runtime-readable. A direct `process.env.NAME`
  // is inlined by Jest's transform-inline-environment-variables plugin.
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * DerivedData for WebDriverAgent.
 *
 * CI must keep this inside the GitHub workspace. actions/cache archives a
 * home-directory path as `../../../../appium-wda`, and gtar then fails to
 * create that directory on restore (`Permission denied` / `No such file`).
 *
 * @returns {string}
 */
export function getDerivedDataPath() {
  const override = readEnv('WDA_DERIVED_DATA_PATH');
  if (override) {
    return override;
  }

  const workspace = readEnv('GITHUB_WORKSPACE');
  if (workspace) {
    return join(workspace, '.cache', 'appium-wda');
  }

  return join(homedir(), 'appium-wda');
}
