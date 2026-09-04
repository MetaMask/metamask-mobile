/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'node:child_process';

import type { SessionLaunchInput } from '@metamask/client-mcp-core';

import {
  IOSLaunchError,
  type ResolvedIOSLaunchOptions,
} from '../launcher-types';
import type {
  LaunchedMobileSession,
  MobilePlatformAdapter,
  ResolvedMobileLaunchOptions,
} from '../platform-adapter';
import { appendLog } from '../utils';
import { ensureAccessibilityBridgeEnabled } from './accessibility-bridge';
import { probeHermesHealthy } from './hermes-health';
import { attachToMetroWatchMode } from './metro-watch-attach';
import {
  createIOSPlatformDriver,
  type CreatedIOSDriver,
} from './platform-driver-factory';
import { validateIOSPrerequisites } from './prerequisites';

const PURE_ATTACH_PROBE_INTERVAL_MS = 500;
const PURE_ATTACH_PROBE_CEILING_MS = 3_000;

interface ResolvedIOSAdapterOptions extends ResolvedMobileLaunchOptions {
  readonly platform: 'ios';
  readonly ios: ResolvedIOSLaunchOptions;
}

function isNewBinaryAction(
  action: ResolvedIOSLaunchOptions['installAction'],
): boolean {
  return (
    action === 'install-explicit' ||
    action === 'install-new' ||
    action === 'reinstall' ||
    action === 'reset-and-install'
  );
}

export class IOSPlatformAdapter implements MobilePlatformAdapter {
  private resolved: ResolvedIOSLaunchOptions | undefined;

  private createdDriver: CreatedIOSDriver | undefined;

  async resolve(
    input: SessionLaunchInput,
    metroPort?: number,
  ): Promise<ResolvedIOSAdapterOptions> {
    if (input.reinstall || input.resetAppData) {
      process.stderr.write(
        '[mm-mobile] WARNING: Using destructive flags (--reinstall/--reset-app-data) in prod context. Wallet state will be lost.\n',
      );
    }

    const ios = await validateIOSPrerequisites({
      simulatorDeviceId: input.deviceId,
      appBundlePath: input.appBundlePath,
      metroPort,
      reinstall: input.reinstall,
      resetAppData: input.resetAppData,
      allowFoxCodeMismatch: input.allowFoxCodeMismatch,
    });
    this.resolved = ios;

    return {
      platform: 'ios',
      deviceId: ios.simulatorDeviceId,
      appId: ios.appBundleId,
      appPath: ios.appBundlePath,
      metroPort: ios.metroPort,
      metadataLines: buildMetadataLines(ios),
      ios,
    };
  }

  async launch(
    resolved: ResolvedMobileLaunchOptions,
  ): Promise<LaunchedMobileSession> {
    const ios = assertIOSOptions(resolved).ios;

    if (!isSimulatorBooted(ios.simulatorDeviceId)) {
      appendLog('Booting device');
      bootSimulator(ios.simulatorDeviceId);
    }

    const { wasAlreadyOn: bridgeWasAlreadyOn } = ensureAccessibilityBridgeEnabled(
      ios.simulatorDeviceId,
    );
    appendLog(`Accessibility bridge: wasAlreadyOn=${bridgeWasAlreadyOn}`);

    executeInstallAction(ios);

    appendLog('Creating iOS platform driver');
    const createdDriver = await createIOSPlatformDriver(ios);
    this.createdDriver = createdDriver;

    const newBinaryInstalled = isNewBinaryAction(ios.installAction);
    let appIsRunning: boolean;

    if (newBinaryInstalled) {
      if (ios.installAction === 'install-explicit') {
        terminateSimulatorApp(ios);
      }
      appIsRunning = false;
    } else {
      const rawState = await createdDriver.backend.getAppState(ios.appBundleId);
      if (rawState.state === 'Not Installed') {
        throw new IOSLaunchError({
          code: 'MM_INVALID_CONFIG',
          message: 'MetaMask app is not installed on the target simulator.',
          remediation: 'Install the app first or pass --app-bundle <path>.',
        });
      }
      appIsRunning = rawState.state === 'Running';
    }

    if (ios.metroPort !== undefined) {
      if (appIsRunning && bridgeWasAlreadyOn) {
        appendLog(
          'Metro branch: app running with bridge already on — pure attach candidate',
        );
        const healthResult = await probeHermesHealthy({
          port: ios.metroPort,
          appId: ios.appBundleId,
          intervalMs: PURE_ATTACH_PROBE_INTERVAL_MS,
          ceilingMs: PURE_ATTACH_PROBE_CEILING_MS,
        });

        if (healthResult.healthy) {
          appendLog(
            'Pure attach: app healthily attached to Metro, skipping relaunch',
          );
        } else {
          appendLog(
            `Pure attach failed (${healthResult.reason}) — terminating and deep-linking`,
          );
          terminateSimulatorApp(ios);
          await attachToMetroWatchMode({
            simulatorUdid: ios.simulatorDeviceId,
            metroPort: ios.metroPort,
            appBundleId: ios.appBundleId,
          });
        }
      } else if (appIsRunning && !bridgeWasAlreadyOn) {
        appendLog(
          'Metro branch: app running but bridge just flipped — relaunching for a11y',
        );
        terminateSimulatorApp(ios);
        await attachToMetroWatchMode({
          simulatorUdid: ios.simulatorDeviceId,
          metroPort: ios.metroPort,
          appBundleId: ios.appBundleId,
        });
      } else {
        appendLog('Metro branch: app not running — deep-linking to launch');
        await attachToMetroWatchMode({
          simulatorUdid: ios.simulatorDeviceId,
          metroPort: ios.metroPort,
          appBundleId: ios.appBundleId,
        });
      }
    } else if (appIsRunning && !bridgeWasAlreadyOn) {
      appendLog(
        'Prod branch: app running but bridge just flipped — relaunching for a11y',
      );
      terminateSimulatorApp(ios);
      await createdDriver.backend.openApp(ios.appBundleId);
    } else if (!appIsRunning) {
      appendLog('Prod branch: app not running — launching');
      await createdDriver.backend.openApp(ios.appBundleId);
    } else {
      appendLog('Prod branch: app running with bridge already on — pure attach');
    }

    return {
      driver: createdDriver.driver,
      state: await createdDriver.driver.getAppState(),
    };
  }

  async cleanup(): Promise<void> {
    const resolved = this.resolved;
    const createdDriver = this.createdDriver;
    this.resolved = undefined;
    this.createdDriver = undefined;

    if (!resolved) {
      return;
    }

    await createdDriver?.backend
      .closeApp(resolved.appBundleId)
      .catch(() => undefined);
    terminateSimulatorApp(resolved);
  }
}

function assertIOSOptions(
  resolved: ResolvedMobileLaunchOptions,
): ResolvedIOSAdapterOptions {
  if (resolved.platform !== 'ios' || !('ios' in resolved)) {
    throw new IOSLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message: 'Invalid resolved iOS launch options.',
    });
  }
  return resolved as ResolvedIOSAdapterOptions;
}

function executeInstallAction(resolved: ResolvedIOSLaunchOptions): void {
  switch (resolved.installAction) {
    case 'reuse-installed':
      appendLog(`Reusing installed app at ${resolved.appBundlePath}`);
      return;
    case 'reinstall':
      appendLog('Reinstalling: uninstalling existing app');
      uninstallApp(resolved);
      installApp(resolved);
      return;
    case 'reset-and-install':
      appendLog('Resetting app data: terminating and uninstalling');
      terminateSimulatorApp(resolved);
      uninstallApp(resolved);
      installApp(resolved);
      return;
    case 'install-new':
    case 'install-explicit':
      appendLog('Installing App');
      installApp(resolved);
  }
}

function installApp(resolved: ResolvedIOSLaunchOptions): void {
  runRequiredSimctl(
    ['install', resolved.simulatorDeviceId, resolved.appBundlePath],
    `Failed to install ${resolved.appBundleId}`,
  );
}

function uninstallApp(resolved: ResolvedIOSLaunchOptions): void {
  runRequiredSimctl(
    ['uninstall', resolved.simulatorDeviceId, resolved.appBundleId],
    `Failed to uninstall ${resolved.appBundleId}`,
  );
}

function runRequiredSimctl(args: string[], message: string): void {
  try {
    execFileSync('xcrun', ['simctl', ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new IOSLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message: `${message}: ${errorMessage(error)}`,
    });
  }
}

function terminateSimulatorApp(resolved: ResolvedIOSLaunchOptions): void {
  try {
    execFileSync(
      'xcrun',
      ['simctl', 'terminate', resolved.simulatorDeviceId, resolved.appBundleId],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch {
    // best-effort: the app may already be stopped.
  }
}

function isSimulatorBooted(udid: string): boolean {
  try {
    const raw = execFileSync('xcrun', ['simctl', 'list', 'devices', '-j'], {
      encoding: 'utf-8',
    });
    const parsed = JSON.parse(raw) as {
      devices?: Record<string, { udid: string; state?: string }[]>;
    };
    return Object.values(parsed.devices ?? {})
      .flat()
      .some(
        (simulator) => simulator.udid === udid && simulator.state === 'Booted',
      );
  } catch {
    return false;
  }
}

function bootSimulator(udid: string): void {
  try {
    execFileSync('xcrun', ['simctl', 'boot', udid], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new IOSLaunchError({
      code: 'MM_DEVICE_NOT_AVAILABLE',
      message: `Failed to boot simulator ${udid}: ${errorMessage(error)}`,
      remediation:
        'Run `xcrun simctl list devices` to verify the UDID and simulator state.',
    });
  }
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'stderr' in error) {
    const stderr = (error as { stderr?: Buffer | string }).stderr;
    const text = Buffer.isBuffer(stderr) ? stderr.toString('utf8') : stderr;
    if (text?.trim()) {
      return text.trim();
    }
  }
  return error instanceof Error ? error.message : 'Unknown error';
}

function buildMetadataLines(resolved: ResolvedIOSLaunchOptions): string[] {
  const lines = [
    `[mm-mobile] simulator=${resolved.simulatorDeviceId}`,
    `[mm-mobile] selectedApp=${resolved.appBundlePath}`,
    `[mm-mobile] bundleId=${resolved.appBundleId}`,
    `[mm-mobile] version=${resolved.selectedAppMetadata.shortVersion ?? 'unknown'}`,
    `[mm-mobile] build=${resolved.selectedAppMetadata.buildVersion ?? 'unknown'}`,
    `[mm-mobile] fox_code=${resolved.selectedAppMetadata.foxCode ?? 'unknown'}`,
    `[mm-mobile] appAlreadyInstalled=${resolved.appAlreadyInstalled}`,
    `[mm-mobile] installAction=${resolved.installAction}`,
  ];
  if (resolved.installedAppMetadata) {
    lines.push(
      `[mm-mobile] installedApp=${resolved.installedAppMetadata.appBundlePath}`,
      `[mm-mobile] installedFoxCode=${resolved.installedAppMetadata.foxCode ?? 'unknown'}`,
    );
  }
  return lines;
}
