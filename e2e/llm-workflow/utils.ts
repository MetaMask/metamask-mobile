/* eslint-disable import-x/no-namespace */
/* eslint-disable import-x/no-nodejs-modules */
import * as fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { resolveRepoRoot } from './resolve-repo-root';

/**
 * Appends a timestamped line to the daemon log file.
 *
 * @param logFilePath - Path to the log file, or undefined to skip file logging.
 * @param message - The log message to append.
 * @param fatal - Whether to also write to stderr.
 */
export function appendLog(message: string, fatal = false): void {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  if (fatal) {
    process.stderr.write(line);
  }

  fs.appendFile(
    path.join(resolveRepoRoot(), '.mm-daemon.log'),
    line,
    'utf-8',
  ).catch((error) => {
    process.stderr.write(`Failed to write log: ${error.message}\n`);
  });
}

/**
 * Verify a TCP port is available on 127.0.0.1.
 * Resolves if available, rejects with a descriptive error if occupied.
 */
export function checkPortAvailable(
  port: number,
  label?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        const name = label ? ` (${label})` : '';
        reject(
          new Error(
            `Port ${port}${name} is already in use. ` +
              `Another worktree daemon or external service may be occupying it. ` +
              `Stop the conflicting process before starting the daemon.`,
          ),
        );
      } else {
        reject(err);
      }
    });
    server.once('listening', () => {
      server.close(() => resolve());
    });
    server.listen(port, '127.0.0.1');
  });
}
