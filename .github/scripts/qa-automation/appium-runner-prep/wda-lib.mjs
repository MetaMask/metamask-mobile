#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
import { execFile, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

export function getDerivedDataPath() {
  return process.env.WDA_DERIVED_DATA_PATH ?? join(homedir(), 'appium-wda');
}

export function getSimulatorName() {
  return process.env.IOS_SIMULATOR_NAME ?? 'iPhone 16 Pro';
}

function runWdaXcodebuild(wdaProject, derivedDataPath, destinations) {
  const args = [
    'build-for-testing',
    '-project',
    wdaProject,
    '-scheme',
    'WebDriverAgentRunner',
    '-derivedDataPath',
    derivedDataPath,
    'CODE_SIGNING_ALLOWED=NO',
  ];

  let lastStatus = 1;
  for (const destination of destinations) {
    console.log(`  destination: ${destination}`);
    const build = spawnSync(
      'xcodebuild',
      [...args, '-destination', destination],
      { stdio: 'inherit' },
    );
    if (build.status === 0) {
      return;
    }
    lastStatus = build.status ?? 1;
    console.warn(
      `WDA prebuild failed for destination "${destination}" (exit ${lastStatus}) — trying next destination…`,
    );
  }

  process.exit(lastStatus);
}

/**
 * @param {string} dir
 * @param {(entryPath: string, name: string, isDirectory: boolean) => boolean | 'stop'} predicate
 * @param {number} [maxDepth]
 * @returns {string | undefined}
 */
export function findInTree(dir, predicate, maxDepth = 20) {
  if (!existsSync(dir) || maxDepth < 0) {
    return undefined;
  }

  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === '.yarn') {
      continue;
    }

    const entryPath = join(dir, name);
    let stat;
    try {
      stat = statSync(entryPath);
    } catch {
      continue;
    }

    const isDirectory = stat.isDirectory();
    const result = predicate(entryPath, name, isDirectory);
    if (result === true) {
      return entryPath;
    }
    if (result === 'stop') {
      return undefined;
    }

    if (isDirectory) {
      const nested = findInTree(entryPath, predicate, maxDepth - 1);
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
}

export function findWdaProject() {
  const nodeModules = join(repoRoot, 'node_modules');
  if (!existsSync(nodeModules)) {
    return undefined;
  }

  return findInTree(
    nodeModules,
    (entryPath, name, isDirectory) => {
      if (
        isDirectory &&
        name === 'WebDriverAgent.xcodeproj' &&
        entryPath.includes(
          `${join('appium-webdriveragent', 'WebDriverAgent.xcodeproj')}`,
        )
      ) {
        return true;
      }
      return false;
    },
    12,
  );
}

/**
 * @param {string} derivedDataPath
 * @returns {{ wdaApp?: string; xctestrun?: string }}
 */
export function findWdaArtifacts(derivedDataPath) {
  const productsDir = join(derivedDataPath, 'Build', 'Products');
  if (!existsSync(productsDir)) {
    return {};
  }

  let wdaApp;
  let xctestrun;

  findInTree(
    productsDir,
    (entryPath, name, isDirectory) => {
      if (!wdaApp && isDirectory && name === 'WebDriverAgentRunner-Runner.app') {
        wdaApp = entryPath;
      }
      if (!xctestrun && !isDirectory && name.endsWith('.xctestrun')) {
        xctestrun = entryPath;
      }
      if (wdaApp && xctestrun) {
        return 'stop';
      }
      return false;
    },
    8,
  );

  return { wdaApp, xctestrun };
}

export function hasUsableWdaArtifacts(derivedDataPath = getDerivedDataPath()) {
  const artifacts = findWdaArtifacts(derivedDataPath);
  return Boolean(artifacts.wdaApp && artifacts.xctestrun);
}

/**
 * @param {string} appPath Path to .app bundle
 * @returns {string} CFBundleIdentifier from Info.plist
 */
export function readAppBundleId(appPath) {
  const plistPath = join(appPath, 'Info.plist');
  const result = spawnSync(
    '/usr/libexec/PlistBuddy',
    ['-c', 'Print CFBundleIdentifier', plistPath],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(
      `Could not read CFBundleIdentifier from ${plistPath}: ${result.stderr?.trim() ?? 'unknown error'}`,
    );
  }
  return result.stdout.trim();
}

/**
 * Appium `updatedWDABundleId` expects the base id; the driver adds `.xctrunner`.
 * @param {string} bundleId
 */
export function toWdaBundleIdBase(bundleId) {
  return bundleId.replace(/\.xctrunner$/, '');
}

/**
 * Installs prebuilt WebDriverAgentRunner onto a booted simulator.
 * @param {{ udid: string; wdaApp: string }} options
 * @returns {Promise<string>} installed bundle id (may include `.xctrunner`)
 */
export async function installWdaOnSimulator({ udid, wdaApp }) {
  if (!existsSync(wdaApp)) {
    throw new Error(`WDA app not found: ${wdaApp}`);
  }

  console.log(`Installing WebDriverAgent on simulator ${udid}…`);
  console.log(`  app: ${wdaApp}`);
  await execFileAsync('xcrun', ['simctl', 'install', udid, wdaApp]);

  const bundleId = readAppBundleId(wdaApp);
  console.log(`WebDriverAgent installed (bundleId=${bundleId}).`);
  return bundleId;
}

function logArtifacts(label, derivedDataPath, { wdaApp, xctestrun }) {
  console.log(`${label} ${derivedDataPath}`);
  if (wdaApp) {
    console.log(`  app: ${wdaApp}`);
  }
  if (xctestrun) {
    console.log(`  xctestrun: ${xctestrun}`);
  }
}

/**
 * Ensures WDA is prebuilt. No-op when artifacts already exist.
 * @param {{ udid?: string; simulatorName?: string }} [options]
 * @returns {Promise<{ wdaApp: string; xctestrun: string }>}
 */
export async function ensureWdaPrebuilt(options = {}) {
  const derivedDataPath = getDerivedDataPath();
  const simulatorName = options.simulatorName ?? getSimulatorName();
  const productsDir = join(derivedDataPath, 'Build', 'Products');

  let artifacts = findWdaArtifacts(derivedDataPath);
  if (artifacts.wdaApp && artifacts.xctestrun) {
    logArtifacts('WDA already prebuilt at', derivedDataPath, artifacts);
    return { wdaApp: artifacts.wdaApp, xctestrun: artifacts.xctestrun };
  }

  const wdaProject = findWdaProject();
  if (!wdaProject) {
    throw new Error(
      'Could not find appium-webdriveragent/WebDriverAgent.xcodeproj under node_modules. Run yarn install first.',
    );
  }

  const destinations = [
    ...(options.udid?.trim()
      ? [`platform=iOS Simulator,id=${options.udid.trim()}`]
      : []),
    'generic/platform=iOS Simulator',
    `platform=iOS Simulator,name=${simulatorName}`,
  ];

  console.log(`Prebuilding WebDriverAgent for simulator "${simulatorName}"…`);
  console.log(`  project: ${wdaProject}`);
  console.log(`  derivedDataPath: ${derivedDataPath}`);

  runWdaXcodebuild(wdaProject, derivedDataPath, destinations);

  artifacts = findWdaArtifacts(derivedDataPath);
  if (!artifacts.wdaApp || !artifacts.xctestrun) {
    console.error(
      `WDA prebuild finished but expected artifacts were not found under ${productsDir}`,
    );
    process.exit(1);
  }

  logArtifacts('WDA prebuild complete', derivedDataPath, artifacts);
  return { wdaApp: artifacts.wdaApp, xctestrun: artifacts.xctestrun };
}
