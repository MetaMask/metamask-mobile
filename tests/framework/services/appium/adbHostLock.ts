/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Cross-process lock for host-side `adb reverse` / related adb client calls.
 *
 * Playwright N=2 Android workers share one adb server. Concurrent
 * `adb reverse --remove` from one worker races the sibling's UiAutomator2
 * transport and surfaces as:
 * - adb: protocol fault / daemon restart / device offline
 * - WebDriver: socket hang up → instrumentation process is not running
 *
 * An in-memory mutex cannot coordinate separate worker processes, so we use
 * an exclusive lock file under the OS temp directory.
 */

const DEFAULT_LOCK_PATH = path.join(os.tmpdir(), 'mm-e2e-adb-host.lock');
const DEFAULT_STALE_MS = 60_000;
const DEFAULT_MAX_WAIT_MS = 30_000;
const DEFAULT_POLL_MS = 50;

export interface AdbHostLockOptions {
  lockPath?: string;
  staleMs?: number;
  maxWaitMs?: number;
  pollMs?: number;
  /** Test seam — override Date.now / sleep. */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  });

function tryAcquireExclusive(lockPath: string): number | undefined {
  try {
    return fs.openSync(lockPath, 'wx');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EEXIST') {
      return undefined;
    }
    throw error;
  }
}

function releaseLock(lockPath: string, fd: number): void {
  try {
    fs.closeSync(fd);
  } catch {
    // Best-effort — another process may have cleaned up a stale lock.
  }
  try {
    fs.unlinkSync(lockPath);
  } catch {
    // Best-effort.
  }
}

function maybeClearStaleLock(
  lockPath: string,
  staleMs: number,
  now: () => number,
): void {
  try {
    const { mtimeMs } = fs.statSync(lockPath);
    if (now() - mtimeMs > staleMs) {
      fs.unlinkSync(lockPath);
    }
  } catch {
    // Gone or unreadable — next acquire will retry.
  }
}

/**
 * Run `fn` while holding the host-wide adb lock.
 * Workers queue briefly rather than racing `adb reverse`.
 */
export async function withAdbHostLock<T>(
  fn: () => Promise<T>,
  options: AdbHostLockOptions = {},
): Promise<T> {
  const lockPath = options.lockPath ?? DEFAULT_LOCK_PATH;
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;

  const startedAt = now();
  let fd: number | undefined;

  while (fd === undefined) {
    fd = tryAcquireExclusive(lockPath);
    if (fd !== undefined) {
      break;
    }

    maybeClearStaleLock(lockPath, staleMs, now);

    if (now() - startedAt > maxWaitMs) {
      throw new Error(
        `Timed out after ${maxWaitMs}ms waiting for adb host lock at ${lockPath}`,
      );
    }

    // Jitter reduces thundering-herd retries across workers.
    await sleep(pollMs + Math.floor(Math.random() * pollMs));
  }

  try {
    return await fn();
  } finally {
    releaseLock(lockPath, fd);
  }
}

/**
 * Synchronous variant for `execSync`-based Metro reverse setup.
 */
export function withAdbHostLockSync<T>(
  fn: () => T,
  options: Omit<AdbHostLockOptions, 'sleep'> = {},
): T {
  const lockPath = options.lockPath ?? DEFAULT_LOCK_PATH;
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const now = options.now ?? Date.now;

  const startedAt = now();
  let fd: number | undefined;

  while (fd === undefined) {
    fd = tryAcquireExclusive(lockPath);
    if (fd !== undefined) {
      break;
    }

    maybeClearStaleLock(lockPath, staleMs, now);

    if (now() - startedAt > maxWaitMs) {
      throw new Error(
        `Timed out after ${maxWaitMs}ms waiting for adb host lock at ${lockPath}`,
      );
    }

    const waitMs = pollMs + Math.floor(Math.random() * pollMs);
    // Atomics.wait is the standard sync sleep without spinning the CPU.
    const sab = new SharedArrayBuffer(4);
    Atomics.wait(new Int32Array(sab), 0, 0, waitMs);
  }

  try {
    return fn();
  } finally {
    releaseLock(lockPath, fd);
  }
}

/** True when adb client output indicates a shared-server transport fault. */
export function isAdbTransportFault(message: string): boolean {
  return (
    message.includes('protocol fault') ||
    message.includes('daemon not running') ||
    message.includes('device offline') ||
    message.includes('cannot connect to daemon')
  );
}
