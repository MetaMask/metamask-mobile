import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  IOSLaunchError,
  type IOSAppBundleMetadata,
  type ResolvedIOSLaunchOptions,
} from '../launcher-types';
import { resolveRepoRoot } from '../resolve-repo-root';

type SimctlDevice = {
  udid: string;
  state?: string;
};

type SimctlDevicesResponse = {
  devices?: Record<string, SimctlDevice[]>;
};

type ResolveAppBundleInput = {
  appBundlePath?: string;
  simulatorDeviceId: string;
  context: 'prod' | 'e2e';
  reinstall?: boolean;
  resetAppData?: boolean;
  allowFoxCodeMismatch?: boolean;
};

type ResolveAppBundleResult = {
  appBundlePath: string;
  appAlreadyInstalled: boolean;
  selectedAppMetadata: IOSAppBundleMetadata;
  installedAppMetadata: IOSAppBundleMetadata | null;
  installAction: ResolvedIOSLaunchOptions['installAction'];
};

export async function validateIOSPrerequisites(input: {
  simulatorDeviceId?: string;
  appBundlePath?: string;
  metroPort?: number;
  context?: 'prod' | 'e2e';
  reinstall?: boolean;
  resetAppData?: boolean;
  allowFoxCodeMismatch?: boolean;
}): Promise<ResolvedIOSLaunchOptions> {
  validateSimctlAvailable();

  const simulatorDeviceId = input.simulatorDeviceId
    ? validateSimulatorDevice(input.simulatorDeviceId)
    : resolveBootedSimulatorDevice();
  const context = input.context ?? 'prod';
  const { appBundlePath, appAlreadyInstalled, selectedAppMetadata, installedAppMetadata, installAction } = resolveAppBundlePath({
    appBundlePath: input.appBundlePath,
    simulatorDeviceId,
    context,
    reinstall: input.reinstall,
    resetAppData: input.resetAppData,
    allowFoxCodeMismatch: input.allowFoxCodeMismatch,
  });

  if (input.metroPort !== undefined) {
    await validateMetroPort(input.metroPort);
  }

  return {
    simulatorDeviceId,
    appBundlePath,
    appBundleId: selectedAppMetadata.bundleId,
    metroPort: input.metroPort,
    destination: `platform=iOS Simulator,id=${simulatorDeviceId}`,
    appAlreadyInstalled,
    selectedAppMetadata,
    installedAppMetadata,
    installAction,
  };
}

function validateSimctlAvailable(): void {
  try {
    execFileSync('xcrun', ['simctl', 'help'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new IOSLaunchError({
      code: 'MM_IOS_RUNNER_NOT_READY',
      message: '`xcrun simctl` not available. Is Xcode installed?',
      remediation:
        'Install Xcode from the Mac App Store and run `xcode-select --install`.',
    });
  }
}

function validateSimulatorDevice(simulatorDeviceId: string): string {
  const devices = listSimctlDevices(['list', 'devices', '--json']);
  const found = Object.values(devices.devices ?? {})
    .flat()
    .some((device) => device.udid === simulatorDeviceId);

  if (!found) {
    throw new IOSLaunchError({
      code: 'MM_IOS_RUNNER_NOT_READY',
      message: `Simulator UDID ${simulatorDeviceId} not found`,
      remediation: 'Run `xcrun simctl list devices` to find an available UDID.',
    });
  }

  return simulatorDeviceId;
}

function resolveBootedSimulatorDevice(): string {
  const devices = listSimctlDevices(['list', 'devices', 'booted', '--json']);
  const booted = Object.values(devices.devices ?? {})
    .flat()
    .find((device) => device.state === 'Booted');

  if (!booted) {
    throw new IOSLaunchError({
      code: 'MM_IOS_RUNNER_NOT_READY',
      message: 'No simulator is booted',
      remediation:
        'Boot a simulator: `xcrun simctl boot <UDID>` (or open Xcode > Window > Devices and Simulators).',
    });
  }

  return booted.udid;
}

function listSimctlDevices(args: string[]): SimctlDevicesResponse {
  try {
    const output = execFileSync('xcrun', ['simctl', ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(output) as SimctlDevicesResponse;
  } catch {
    throw new IOSLaunchError({
      code: 'MM_IOS_RUNNER_NOT_READY',
      message: 'Unable to list iOS simulator devices',
      remediation: 'Run `xcrun simctl list devices --json` to verify simctl works.',
    });
  }
}

function resolveAppBundlePath(input: ResolveAppBundleInput): ResolveAppBundleResult {
  if (input.context === 'prod') {
    return resolveProdAppBundle(input);
  }
  return resolveE2EAppBundle(input);
}

function resolveProdAppBundle(input: ResolveAppBundleInput): ResolveAppBundleResult {
  const installedMeta = readInstalledAppMetadata(input.simulatorDeviceId);

  // Guard: destructive flags without an explicit bundle would uninstall the only
  // copy of the app (the simulator-internal path) and then fail to reinstall.
  if (installedMeta && !input.appBundlePath && (input.reinstall || input.resetAppData)) {
    throw new IOSLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message:
        'Cannot use --reinstall or --reset-app-data without --app-bundle in prod context. ' +
        'The installed app is the only copy and would be destroyed by the uninstall step.',
      remediation:
        'Provide --app-bundle <path> pointing to a local .app build, ' +
        'or switch to e2e context where local build candidates are searched automatically.',
    });
  }

  if (installedMeta && !input.appBundlePath) {
    return {
      appBundlePath: installedMeta.appBundlePath,
      appAlreadyInstalled: true,
      selectedAppMetadata: installedMeta,
      installedAppMetadata: installedMeta,
      installAction: 'reuse-installed',
    };
  }

  if (installedMeta && input.appBundlePath) {
    const resolvedExplicitPath = path.resolve(resolveRepoRoot(), input.appBundlePath);
    assertValidAppBundle(resolvedExplicitPath);
    const requestedMeta = readAppBundleMetadata(resolvedExplicitPath);

    if (!installedMeta.foxCode || !requestedMeta.foxCode) {
      process.stderr.write(
        `[mm-mobile] WARNING: Cannot verify fox_code compatibility ` +
        `(installed=${installedMeta.foxCode ?? 'missing'}, requested=${requestedMeta.foxCode ?? 'missing'}). ` +
        `Proceeding with install.\n`,
      );
    }

    if (
      installedMeta.foxCode &&
      requestedMeta.foxCode &&
      installedMeta.foxCode !== requestedMeta.foxCode &&
      !input.allowFoxCodeMismatch &&
      !input.reinstall
    ) {
      throw new IOSLaunchError({
        code: 'MM_IOS_APP_IDENTITY_MISMATCH',
        message: [
          `Refusing to install app with different fox_code in prod context.`,
          `  Installed fox_code: ${installedMeta.foxCode}`,
          `  Requested fox_code: ${requestedMeta.foxCode}`,
          `Installing this bundle may make existing wallet/keychain data unreadable.`,
        ].join('\n'),
        remediation: [
          'Options:',
          '  1. Use the already-installed app (omit --app-bundle)',
          '  2. Pass a matching --app-bundle',
          '  3. Use --reinstall to replace the installed app (DESTRUCTIVE)',
          '  4. Use --allow-fox-code-mismatch to bypass this guard (DANGEROUS)',
        ].join('\n'),
      });
    }

    return {
      appBundlePath: requestedMeta.appBundlePath,
      appAlreadyInstalled: true,
      selectedAppMetadata: requestedMeta,
      installedAppMetadata: installedMeta,
      installAction: resolveDestructiveInstallAction(input, 'install-explicit'),
    };
  }

  if (!installedMeta && !input.appBundlePath) {
    throw new IOSLaunchError({
      code: 'MM_IOS_RUNNER_NOT_READY',
      message: 'No MetaMask app installed on the simulator and no --app-bundle provided.',
      remediation: [
        'Options:',
        '  1. Install an app first: yarn install:ios:runway',
        '  2. Provide an explicit bundle: --app-bundle build/MetaMask.app',
      ].join('\n'),
    });
  }

  const resolvedExplicitPath = path.resolve(resolveRepoRoot(), input.appBundlePath!);
  assertValidAppBundle(resolvedExplicitPath);
  const requestedMeta = readAppBundleMetadata(resolvedExplicitPath);
  return {
    appBundlePath: requestedMeta.appBundlePath,
    appAlreadyInstalled: false,
    selectedAppMetadata: requestedMeta,
    installedAppMetadata: null,
    installAction: 'install-new',
  };
}

function resolveE2EAppBundle(input: ResolveAppBundleInput): ResolveAppBundleResult {
  if (input.appBundlePath) {
    const resolved = path.resolve(resolveRepoRoot(), input.appBundlePath);
    assertValidAppBundle(resolved);
    const selectedMeta = readAppBundleMetadata(resolved);
    const installedMeta = readInstalledAppMetadata(input.simulatorDeviceId);
    return {
      appBundlePath: resolved,
      appAlreadyInstalled: installedMeta !== null,
      selectedAppMetadata: selectedMeta,
      installedAppMetadata: installedMeta,
      installAction: resolveDestructiveInstallAction(input, 'install-explicit'),
    };
  }

  const repoRoot = resolveRepoRoot();
  const localCandidates = [
    path.join(repoRoot, 'build/MetaMask.app'),
    path.join(repoRoot, 'ios/build/Build/Products/Debug-iphonesimulator/MetaMask.app'),
    path.join(repoRoot, 'ios/build/Build/Products/Release-iphonesimulator/MetaMask.app'),
    ...findDerivedDataAppBundles(),
  ];
  const simulatorCandidates = findSimulatorInstalledApp(input.simulatorDeviceId);
  const allCandidates = [...localCandidates, ...simulatorCandidates];

  const match = allCandidates.find((candidate) => existsSync(candidate));

  if (!match) {
    throwAppBundleNotFound(allCandidates[0], input.simulatorDeviceId);
  }

  assertValidAppBundle(match);
  const appAlreadyInstalled = simulatorCandidates.includes(match);
  const selectedMeta = readAppBundleMetadata(match);
  const installedMeta = appAlreadyInstalled ? selectedMeta : readInstalledAppMetadata(input.simulatorDeviceId);

  // Guard: destructive flags without a local build candidate would uninstall the
  // simulator-internal copy — the only one available — and then fail to reinstall
  // because the .app path inside the simulator container is deleted by uninstall.
  if (appAlreadyInstalled && (input.reinstall || input.resetAppData)) {
    throw new IOSLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message:
        'Cannot use --reinstall or --reset-app-data in e2e context when the only discovered app ' +
        'is installed on the simulator. The uninstall step would destroy the only copy.',
      remediation:
        'Provide --app-bundle <path> pointing to a local .app build, ' +
        'or build the app first with `yarn start:ios`.',
    });
  }

  const defaultAction = appAlreadyInstalled ? 'reuse-installed' : 'install-new';

  return {
    appBundlePath: match,
    appAlreadyInstalled,
    selectedAppMetadata: selectedMeta,
    installedAppMetadata: installedMeta,
    installAction: resolveDestructiveInstallAction(input, defaultAction),
  };
}

function resolveDestructiveInstallAction(
  input: ResolveAppBundleInput,
  defaultAction: ResolveAppBundleResult['installAction'],
): ResolveAppBundleResult['installAction'] {
  if (input.resetAppData) return 'reset-and-install';
  if (input.reinstall) return 'reinstall';
  return defaultAction;
}

function findDerivedDataAppBundles(): string[] {
  const derivedDataRoot = path.join(os.homedir(), 'Library/Developer/Xcode/DerivedData');

  try {
    const output = execFileSync(
      'find',
      [
        derivedDataRoot,
        '-path',
        '*/MetaMask-*/Build/Products/Debug-iphonesimulator/MetaMask.app',
        '-type',
        'd',
        '-maxdepth',
        '6',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );

    return output
      .split('\n')
      .map((candidate) => candidate.trim())
      .filter((candidate) => candidate.length > 0);
  } catch {
    return [];
  }
}

const METAMASK_BUNDLE_ID = 'io.metamask.MetaMask';

function getInstalledAppPath(simulatorDeviceId: string, bundleId: string = METAMASK_BUNDLE_ID): string | null {
  try {
    const output = execFileSync(
      'xcrun',
      ['simctl', 'get_app_container', simulatorDeviceId, bundleId, 'app'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    return output.endsWith('.app') && existsSync(output) ? output : null;
  } catch {
    return null;
  }
}

function findSimulatorInstalledApp(simulatorDeviceId: string): string[] {
  const appPath = getInstalledAppPath(simulatorDeviceId);
  return appPath ? [appPath] : [];
}

export function readInstalledAppMetadata(
  simulatorDeviceId: string,
  bundleId: string = METAMASK_BUNDLE_ID,
): IOSAppBundleMetadata | null {
  const appPath = getInstalledAppPath(simulatorDeviceId, bundleId);
  if (!appPath) return null;
  return readAppBundleMetadata(appPath);
}

function assertValidAppBundle(appBundlePath: string): void {
  if (!appBundlePath.endsWith('.app') || !existsSync(appBundlePath)) {
    throwAppBundleNotFound(appBundlePath);
  }
}

function throwAppBundleNotFound(
  appBundlePath: string,
  simulatorDeviceId?: string,
): never {
  const message = simulatorDeviceId
    ? `MetaMask.app not found. Searched: local build outputs (ios/build/), Xcode DerivedData, and installed apps on simulator ${simulatorDeviceId}.`
    : `MetaMask.app not found at ${appBundlePath}`;
  const remediation = simulatorDeviceId
    ? 'Build the app with `yarn start:ios`, or install a prebuilt .app into the simulator.'
    : 'Build and run the iOS app first, for example with `yarn start:ios`.';

  throw new IOSLaunchError({
    code: 'MM_IOS_RUNNER_NOT_READY',
    message,
    remediation,
  });
}

async function validateMetroPort(metroPort: number): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);

  try {
    const response = await fetch(`http://localhost:${metroPort}/status`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch {
    throw new IOSLaunchError({
      code: 'MM_IOS_RUNNER_NOT_READY',
      message: `Metro bundler not reachable on port ${metroPort}`,
      remediation: 'Run `yarn watch:clean` in another terminal.',
    });
  } finally {
    clearTimeout(timeout);
  }
}

function readPlistKey(appBundlePath: string, key: string): string | null {
  try {
    return execFileSync(
      'defaults',
      ['read', path.join(appBundlePath, 'Info'), key],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim() || null;
  } catch {
    return null;
  }
}

export function readAppBundleMetadata(appBundlePath: string): IOSAppBundleMetadata {
  return {
    appBundlePath,
    bundleId: readPlistKey(appBundlePath, 'CFBundleIdentifier') ?? 'io.metamask.MetaMask',
    foxCode: readPlistKey(appBundlePath, 'fox_code'),
    shortVersion: readPlistKey(appBundlePath, 'CFBundleShortVersionString'),
    buildVersion: readPlistKey(appBundlePath, 'CFBundleVersion'),
  };
}


