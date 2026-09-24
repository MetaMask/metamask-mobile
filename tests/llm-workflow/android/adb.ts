/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from 'node:child_process';

import { AndroidLaunchError } from '../launcher-types';

// A hung emulator must not block beyond the readiness and daemon watchdogs.
const ADB_COMMAND_TIMEOUT_MS = 10_000;

const ADB_OPTIONS: ExecFileSyncOptionsWithStringEncoding = {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: ADB_COMMAND_TIMEOUT_MS,
};

export function runAdb(args: string[]): string {
  return runAdbCommand(args, 'MM_DEVICE_NOT_AVAILABLE');
}

export function runDeviceAdb(serial: string, args: string[]): string {
  return runAdbCommand(['-s', serial, ...args], 'MM_DEVICE_NOT_AVAILABLE');
}

export function validateAdbAvailable(): void {
  try {
    execFileSync('adb', ['version'], ADB_OPTIONS);
  } catch (error) {
    throw new AndroidLaunchError({
      code: 'MM_DEPENDENCIES_MISSING',
      message: `adb is unavailable: ${commandErrorMessage(error)}`,
      remediation:
        'Install Android SDK Platform-Tools and ensure `adb` is available on PATH.',
    });
  }
}

function runAdbCommand(
  args: string[],
  code: 'MM_DEVICE_NOT_AVAILABLE',
): string {
  try {
    return execFileSync('adb', args, ADB_OPTIONS).trim();
  } catch (error) {
    throw new AndroidLaunchError({
      code,
      message: `adb ${args.join(' ')} failed: ${commandErrorMessage(error)}`,
      remediation:
        'Verify the emulator is running and authorized with `adb devices -l`.',
    });
  }
}

export function commandErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'stderr' in error) {
    const stderr = (error as { stderr?: Buffer | string }).stderr;
    const text = Buffer.isBuffer(stderr) ? stderr.toString('utf8') : stderr;
    if (text?.trim()) return text.trim();
  }
  return error instanceof Error ? error.message : 'Unknown error';
}
