/* eslint-disable import-x/no-namespace */
/* eslint-disable import-x/no-nodejs-modules */
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { resolveRepoRoot } from './resolve-repo-root';

let cachedLogFilePath: string | undefined;

/**
 * Appends a timestamped line to the daemon log file.
 *
 * @param message - The log message to append.
 * @param fatal - Whether to also write to stderr.
 */
export function appendLog(message: string, fatal = false): void {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  if (fatal) {
    process.stderr.write(line);
  }

  if (!cachedLogFilePath) {
    cachedLogFilePath = path.join(resolveRepoRoot(), '.mm-daemon.log');
  }

  fs.appendFile(cachedLogFilePath, line, 'utf-8').catch((error) => {
    process.stderr.write(`Failed to write log: ${error.message}\n`);
  });
}
