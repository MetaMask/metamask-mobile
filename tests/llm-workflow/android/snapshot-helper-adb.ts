/* eslint-disable import-x/no-nodejs-modules */
import { execFile } from 'node:child_process';

import type { AndroidAdbExecutor } from 'agent-device/android-snapshot-helper';

const DEFAULT_HELPER_ADB_TIMEOUT_MS = 15_000;
const MAX_ADB_OUTPUT_BYTES = 16 * 1024 * 1024;

export function createAndroidSnapshotAdbExecutor(
  serial: string,
): AndroidAdbExecutor {
  return async (args, options = {}) =>
    await new Promise((resolve, reject) => {
      const child = execFile(
        'adb',
        ['-s', serial, ...args],
        {
          encoding: options.binaryStdout ? 'buffer' : 'utf8',
          maxBuffer: MAX_ADB_OUTPUT_BYTES,
          timeout: options.timeoutMs ?? DEFAULT_HELPER_ADB_TIMEOUT_MS,
          signal: options.signal,
        },
        (error, stdout, stderr) => {
          const stdoutBuffer = Buffer.isBuffer(stdout)
            ? stdout
            : Buffer.from(stdout, 'utf8');
          const stderrText = Buffer.isBuffer(stderr)
            ? stderr.toString('utf8')
            : stderr;
          const exitCode = getExitCode(error);
          const result = {
            exitCode,
            stdout: stdoutBuffer.toString('utf8'),
            stderr: stderrText,
            stdoutBuffer: options.binaryStdout ? stdoutBuffer : undefined,
          };

          if (error && (!options.allowFailure || !isOrdinaryProcessExit(error))) {
            reject(
              new Error(
                `adb -s ${serial} ${args.join(' ')} failed (exit ${exitCode}): ${stderrText.trim() || error.message}`,
                { cause: error },
              ),
            );
            return;
          }
          resolve(result);
        },
      );

      if (options.stdin !== undefined) {
        child.stdin?.end(options.stdin);
      }
    });
}

function getExitCode(error: Error | null): number {
  if (!error) {
    return 0;
  }
  if (hasNumericExitCode(error)) {
    return error.code;
  }
  return 1;
}

function hasNumericExitCode(
  error: Error,
): error is Error & { readonly code: number } {
  return 'code' in error && typeof error.code === 'number';
}

function isOrdinaryProcessExit(error: Error): boolean {
  const wasKilled = 'killed' in error && error.killed === true;
  const wasSignaled = 'signal' in error && error.signal !== null;
  return hasNumericExitCode(error) && !wasKilled && !wasSignaled;
}
