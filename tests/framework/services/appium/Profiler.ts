/* eslint-disable import-x/no-nodejs-modules */
import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import type { TestInfo } from '@playwright/test';

const execFileAsync = promisify(execFile);
const COMMAND_TIMEOUT_MS = 30_000;
const PROFILE_EXTENSION = '.cpuprofile';

export interface ProfilerDeviceDetails {
  platform: 'android' | 'ios';
  udid?: string;
  appId?: string;
}

export interface ProfilerOptions {
  outputDirectory: string;
  testInfo: TestInfo;
  device: ProfilerDeviceDetails;
}

interface CommandOptions {
  timeout?: number;
  maxBuffer?: number;
}

async function runCommand(
  command: string,
  args: string[],
  options: CommandOptions = {},
): Promise<string> {
  const result = await execFileAsync(command, args, {
    timeout: options.timeout ?? COMMAND_TIMEOUT_MS,
    maxBuffer: options.maxBuffer ?? 2 * 1024 * 1024,
  });
  return result.stdout.trim();
}

function ensureDeviceId(device: ProfilerDeviceDetails): string {
  if (!device.udid?.trim()) {
    throw new Error(
      `${device.platform} profiler extraction requires a device id`,
    );
  }
  return device.udid.trim();
}

function ensureAppId(device: ProfilerDeviceDetails): string {
  if (!device.appId?.trim()) {
    throw new Error('iOS profiler extraction requires an app id');
  }
  return device.appId.trim();
}

function getOutputPath(options: ProfilerOptions): string {
  const project = options.testInfo.project.name.replace(
    /[^a-zA-Z0-9._-]/g,
    '_',
  );
  const title = options.testInfo.titlePath
    .join('-')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(
    options.outputDirectory,
    `${project}-${title}-retry-${options.testInfo.retry}${PROFILE_EXTENSION}`,
  );
}

async function getAndroidProfile(
  device: ProfilerDeviceDetails,
): Promise<string> {
  const serial = ensureDeviceId(device);
  const output = await runCommand('adb', [
    '-s',
    serial,
    'shell',
    'ls',
    '-t',
    `/sdcard/Download/*${PROFILE_EXTENSION}`,
  ]);
  const profile = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!profile) {
    throw new Error('No Android cpuprofile was found in /sdcard/Download');
  }
  return profile;
}

async function getIOSProfile(device: ProfilerDeviceDetails): Promise<string> {
  const simulator = ensureDeviceId(device);
  const appId = ensureAppId(device);
  const container = await runCommand('xcrun', [
    'simctl',
    'get_app_container',
    simulator,
    appId,
    'data',
  ]);
  const profiles = await runCommand('find', [
    container,
    '-type',
    'f',
    '-name',
    `*${PROFILE_EXTENSION}`,
    '-print',
  ]);
  const profile = profiles
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!profile) {
    throw new Error(`No iOS cpuprofile was found in ${container}`);
  }
  return profile;
}

export async function copyProfilerResult(
  options: ProfilerOptions,
): Promise<string> {
  await fs.mkdir(options.outputDirectory, { recursive: true });
  const source =
    options.device.platform === 'android'
      ? await getAndroidProfile(options.device)
      : await getIOSProfile(options.device);
  const destination = getOutputPath(options);

  if (options.device.platform === 'android') {
    await runCommand('adb', [
      '-s',
      ensureDeviceId(options.device),
      'pull',
      source,
      destination,
    ]);
  } else {
    await fs.copyFile(source, destination);
  }

  await options.testInfo.attach(path.basename(destination), {
    path: destination,
    contentType: 'application/json',
  });
  return destination;
}
