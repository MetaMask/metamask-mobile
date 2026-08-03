import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import {
  IOSLaunchError,
  type IOSAppBundleMetadata,
  type ResolvedIOSLaunchOptions,
} from '../launcher-types';
import { resolveRepoRoot } from '../resolve-repo-root';
import {
  validateIdbAvailable,
  validateSimctlAvailable,
} from './environment-checks';

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
  reinstall?: boolean;
  resetAppData?: boolean;
  allowFoxCodeMismatch?: boolean;
}): Promise<ResolvedIOSLaunchOptions> {
  validateSimctlAvailable();
  validateIdbAvailable();

  const simulatorDeviceId = input.simulatorDeviceId
    ? validateSimulatorDevice(input.simulatorDeviceId)
    : resolveBootedSimulatorDevice();
  const { appBundlePath, appAlreadyInstalled, selectedAppMetadata, installedAppMetadata, installAction } = resolveAppBundlePath({
    appBundlePath: input.appBundlePath,
    simulatorDeviceId,
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

function validateSimulatorDevice(simulatorDeviceId: string): string {
  const devices = listSimctlDevices(['list', 'devices', '--json']);
  const found = Object.values(devices.devices ?? {})
    .flat()
    .some((device) => device.udid === simulatorDeviceId);

  if (!found) {
    throw new IOSLaunchError({
      code: 'MM_DEVICE_NOT_AVAILABLE',
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
      code: 'MM_DEVICE_NOT_AVAILABLE',
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
      code: 'MM_DEVICE_NOT_AVAILABLE',
      message: 'Unable to list iOS simulator devices',
      remediation: 'Run `xcrun simctl list devices --json` to verify simctl works.',
    });
  }
}

function resolveAppBundlePath(input: ResolveAppBundleInput): ResolveAppBundleResult {
  const installedMeta = readInstalledAppMetadata(input.simulatorDeviceId);

  // Guard: destructive flags without an explicit bundle would uninstall the only
  // copy of the app (the simulator-internal path) and then fail to reinstall.
  if (installedMeta && !input.appBundlePath && (input.reinstall || input.resetAppData)) {
    throw new IOSLaunchError({
      code: 'MM_INVALID_CONFIG',
      message:
        'Cannot use --reinstall or --reset-app-data without --app-bundle in prod context. ' +
        'The installed app is the only copy and would be destroyed by the uninstall step.',
      remediation:
        'Provide --app-bundle <path> pointing to a local .app build.',
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
        code: 'MM_INVALID_CONFIG',
        message: [
          `Refusing to install app with different fox_code.`,
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
      code: 'MM_INVALID_CONFIG',
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

function resolveDestructiveInstallAction(
  input: ResolveAppBundleInput,
  defaultAction: ResolveAppBundleResult['installAction'],
): ResolveAppBundleResult['installAction'] {
  if (input.resetAppData) return 'reset-and-install';
  if (input.reinstall) return 'reinstall';
  return defaultAction;
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
): never {
  throw new IOSLaunchError({
    code: 'MM_INVALID_CONFIG',
    message: `MetaMask.app not found at ${appBundlePath}`,
    remediation: 'Build and run the iOS app first, for example with `yarn start:ios`.',
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
      code: 'MM_INVALID_CONFIG',
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
  const bundleId = readPlistKey(appBundlePath, 'CFBundleIdentifier');
  if (!bundleId) {
    throw new IOSLaunchError({
      code: 'MM_INVALID_CONFIG',
      message: `Cannot read CFBundleIdentifier from ${appBundlePath}/Info.plist. The .app bundle may be corrupt.`,
      remediation: 'Rebuild the app or provide a valid .app bundle path.',
    });
  }
  return {
    appBundlePath,
    bundleId,
    foxCode: readPlistKey(appBundlePath, 'fox_code'),
    shortVersion: readPlistKey(appBundlePath, 'CFBundleShortVersionString'),
    buildVersion: readPlistKey(appBundlePath, 'CFBundleVersion'),
  };
}
