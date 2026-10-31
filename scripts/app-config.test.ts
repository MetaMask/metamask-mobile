/**
 * Guards the Expo config that @expo/repack-app reads when it reuses a native build.
 *
 * Repack writes the resolved `name` into CFBundleDisplayName / CFBundleName (iOS) and
 * `app_name` (Android), and the resolved bundle ID / package into the app. A root-level
 * `expo` key in app.config.js makes @expo/config drop every sibling key, so these values
 * must resolve from what Expo actually reads rather than from app.config.js's exports.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { ExpoConfig } from '@expo/config';

const projectRoot = path.resolve(__dirname, '..');

const RESOLVE_SCRIPT = `
const { getConfig } = require('@expo/config');
const { exp } = getConfig(process.cwd(), {
  isPublicConfig: true,
  skipSDKVersionRequirement: true,
});
process.stdout.write(JSON.stringify(exp));
`;

// A fresh process per build type: app.config.js reads METAMASK_BUILD_TYPE at load time
// and @expo/config caches the evaluated file, mirroring how repack resolves it in CI.
const resolveExpoConfig = (buildType?: string): ExpoConfig => {
  const env = { ...process.env };
  delete env.METAMASK_BUILD_TYPE;
  if (buildType !== undefined) {
    env.METAMASK_BUILD_TYPE = buildType;
  }
  const output = execFileSync(process.execPath, ['-e', RESOLVE_SCRIPT], {
    cwd: projectRoot,
    env,
    encoding: 'utf8',
  });
  return JSON.parse(output);
};

describe('app.config.js', () => {
  it('resolves the app name as "MetaMask" instead of the package.json name', () => {
    const exp = resolveExpoConfig();

    expect(exp.name).toBe('MetaMask');
  });

  it('resolves the main bundle identifiers for the main build type', () => {
    const exp = resolveExpoConfig('main');

    expect(exp.ios?.bundleIdentifier).toBe('io.metamask.MetaMask');
    expect(exp.android?.package).toBe('io.metamask');
  });

  it('resolves the Flask bundle identifiers for the flask build type', () => {
    const exp = resolveExpoConfig('flask');

    expect(exp.ios?.bundleIdentifier).toBe('io.metamask.MetaMask-Flask');
    expect(exp.android?.package).toBe('io.metamask.flask');
  });
});
