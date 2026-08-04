/* eslint-disable import-x/no-nodejs-modules */
import { existsSync } from 'node:fs';
import path from 'node:path';

import type { SessionLaunchInput } from '@metamask/client-mcp-core';

import { AndroidLaunchError } from '../launcher-types';
import { resolveRepoRoot } from '../resolve-repo-root';
import { runAdb, runDeviceAdb, validateAdbAvailable } from './adb';

export const ANDROID_APP_ID = 'io.metamask';
export const ANDROID_MAIN_ACTIVITY = 'io.metamask/io.metamask.MainActivity';

export interface ResolvedAndroidLaunchOptions {
  readonly serial: string;
  readonly appId: typeof ANDROID_APP_ID;
  readonly mainActivity: typeof ANDROID_MAIN_ACTIVITY;
  readonly metroPort?: number;
}

interface AdbDeviceRow {
  readonly serial: string;
  readonly state: string;
}

export function validateAndroidPrerequisites(
  input: SessionLaunchInput,
  metroPort?: number,
): ResolvedAndroidLaunchOptions {
  rejectUnsupportedLifecycleOptions(input);
  validateAdbAvailable();
  const serial = selectAndroidEmulator(parseAdbDevices(runAdb(['devices', '-l'])), input.deviceId);
  validateBootCompleted(serial);
  validatePackageInstalled(serial);
  validateMainActivity(serial);
  return { serial, appId: ANDROID_APP_ID, mainActivity: ANDROID_MAIN_ACTIVITY, metroPort };
}

export function parseAdbDevices(output: string): AdbDeviceRow[] {
  return output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('List of devices attached'))
    .map((line) => {
      const [serial = '', state = ''] = line.split(/\s+/u);
      return { serial, state };
    });
}

export function selectAndroidEmulator(
  devices: readonly AdbDeviceRow[],
  explicitDeviceId?: string,
): string {
  if (explicitDeviceId !== undefined) {
    if (!/^emulator-\d+$/u.test(explicitDeviceId)) {
      throwRunnerError(
        `Android device ID must identify an emulator (emulator-<port>), received ${explicitDeviceId}.`,
      );
    }
    const matches = devices.filter(
      (deviceRow) => deviceRow.serial === explicitDeviceId,
    );
    if (matches.length !== 1) {
      throwRunnerError(
        `Expected ${explicitDeviceId} exactly once in adb devices output, found ${matches.length}.`,
      );
    }
    if (matches[0].state !== 'device') {
      throwRunnerError(
        `Emulator ${explicitDeviceId} is ${matches[0].state || 'in an unknown state'}, not online and authorized.`,
      );
    }
    return explicitDeviceId;
  }

  const eligible = devices.filter(
    (deviceRow) =>
      /^emulator-\d+$/u.test(deviceRow.serial) && deviceRow.state === 'device',
  );
  if (eligible.length !== 1) {
    throwRunnerError(
      eligible.length === 0
        ? 'No online authorized Android emulator was found.'
        : `Multiple online Android emulators were found (${eligible.map(({ serial }) => serial).join(', ')}).`,
    );
  }
  return eligible[0].serial;
}

function rejectUnsupportedLifecycleOptions(input: SessionLaunchInput): void {
  const unsupported = [
    input.extensionPath !== undefined ? 'extensionPath (--extension-path)' : undefined,
    input.reinstall ? 'reinstall' : undefined,
    input.resetAppData ? 'resetAppData' : undefined,
    input.appBundlePath !== undefined ? 'appBundlePath' : undefined,
    input.allowFoxCodeMismatch ? 'allowFoxCodeMismatch' : undefined,
  ].filter((value): value is string => value !== undefined);
  if (unsupported.length > 0) {
    throw new AndroidLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message: `Android reuses the installed io.metamask app. Unsupported APK lifecycle option(s): ${unsupported.join(', ')}.`,
    });
  }
}

function validateBootCompleted(serial: string): void {
  const bootCompleted = runDeviceAdb(serial, [
    'shell',
    'getprop',
    'sys.boot_completed',
  ]);
  if (bootCompleted !== '1') {
    throwRunnerError(`Android emulator ${serial} has not completed booting.`);
  }
}

function validatePackageInstalled(serial: string): void {
  const output = runDeviceAdb(serial, [
    'shell',
    'cmd',
    'package',
    'list',
    'packages',
    '--user',
    'current',
    ANDROID_APP_ID,
  ]);
  const packages = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  if (packages.length !== 1 || packages[0] !== `package:${ANDROID_APP_ID}`) {
    throwRunnerError(
      `${ANDROID_APP_ID} is not installed for the current Android user.`,
    );
  }
}

function validateMainActivity(serial: string): void {
  const output = runDeviceAdb(serial, [
    'shell',
    'cmd',
    'package',
    'resolve-activity',
    '--brief',
    '--user',
    'current',
    '-a',
    'android.intent.action.MAIN',
    '-c',
    'android.intent.category.LAUNCHER',
    ANDROID_APP_ID,
  ]);
  const resolvedComponents = output
    .split(/\r?\n/u)
    .map((line) => normalizeAndroidComponent(line.trim()))
    .filter((component): component is string => component !== null);
  if (!resolvedComponents.includes(ANDROID_MAIN_ACTIVITY)) {
    throwRunnerError(`${ANDROID_MAIN_ACTIVITY} is not a launchable activity.`);
  }
}

export function normalizeAndroidComponent(component: string): string | null {
  const match = /^([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)\/(\.?[a-zA-Z0-9_.$]+)$/u.exec(
    component,
  );
  if (!match) return null;

  const [, packageName, activityName] = match;
  const expandedActivity = activityName.startsWith('.')
    ? `${packageName}${activityName}`
    : activityName;
  return `${packageName}/${expandedActivity}`;
}

export function assertNoDeviceSessionOverride(): void {
  const candidates = new Set([
    path.join(process.cwd(), '.device-session'),
    path.join(resolveRepoRoot(), '.device-session'),
  ]);
  if ([...candidates].some((candidate) => existsSync(candidate))) {
    throw new AndroidLaunchError({
      code: 'MM_ANDROID_BACKEND_INTEGRITY',
      message:
        'A .device-session override is present and could replace the required ADB backend.',
      remediation:
        'Remove or move .device-session before launching the Android emulator workflow.',
    });
  }
}

function throwRunnerError(message: string): never {
  throw new AndroidLaunchError({
    code: 'MM_ANDROID_RUNNER_NOT_READY',
    message,
    remediation:
      'Start one Android emulator, wait for it to boot, authorize it, and verify `adb devices -l` reports state `device`.',
  });
}
