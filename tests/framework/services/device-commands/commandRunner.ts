/* eslint-disable import-x/no-nodejs-modules */
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Normalized output from a child process command.
 */
export interface DeviceCommandOutput {
  stdout: string;
  stderr: string;
}

/**
 * Common child process execution options used by device commands.
 */
export interface RunDeviceCommandOptions {
  timeout?: number;
  maxBuffer?: number;
}

/**
 * Converts stdout/stderr values from real or mocked `execFile` calls to strings.
 */
function outputToString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (Buffer.isBuffer(value)) {
    return value.toString();
  }
  return String(value);
}

/**
 * Normalizes the different shapes returned by promisified real and mocked `execFile`.
 */
export function normalizeExecFileOutput(raw: unknown): DeviceCommandOutput {
  if (
    raw !== null &&
    typeof raw === 'object' &&
    !Buffer.isBuffer(raw) &&
    ('stdout' in raw || 'stderr' in raw)
  ) {
    const output = raw as { stdout?: unknown; stderr?: unknown };
    return {
      stdout: outputToString(output.stdout),
      stderr: outputToString(output.stderr),
    };
  }

  return {
    stdout: outputToString(raw),
    stderr: '',
  };
}

/**
 * Runs a local device command via `execFile` and returns normalized output.
 */
export async function runDeviceCommand(
  command: string,
  args: string[],
  options: RunDeviceCommandOptions = {},
): Promise<DeviceCommandOutput> {
  const raw = await execFileAsync(command, args, options);
  return normalizeExecFileOutput(raw);
}

/**
 * Formats command output for log messages.
 */
export function formatCommandOutput(output: DeviceCommandOutput): string {
  return `${output.stdout}${output.stderr}`.trim();
}
