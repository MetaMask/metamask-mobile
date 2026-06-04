// Process-tree teardown + port sweeping.

import { execFileSync, spawnSync } from 'child_process';
import type { Logger } from './log';

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

function pgrepChildren(parent: number): number[] {
  try {
    const out = execFileSync('pgrep', ['-P', String(parent)], {
      encoding: 'utf8',
    });
    return out
      .split('\n')
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n) && n > 0);
  } catch {
    return [];
  }
}

// Collect a PID and all of its descendants (depth-first).
export function collectTree(parent: number): number[] {
  const acc: number[] = [];
  for (const child of pgrepChildren(parent)) acc.push(...collectTree(child));
  acc.push(parent);
  return acc;
}

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const signal = (pid: number, sig: NodeJS.Signals): void => {
  try {
    process.kill(pid, sig);
  } catch {
    // already gone
  }
};

// SIGTERM the whole tree, wait up to 2s, then SIGKILL survivors. Scoped strictly
// to descendants of `root` — safe for parallel worktrees.
export async function killTree(root: number): Promise<void> {
  // A pid of 0 (or negative) makes process.kill signal the entire process group
  // — including this orchestrator. A missing child pid must never reach here.
  if (root <= 0) return;
  const pids = collectTree(root);
  for (const p of pids) signal(p, 'SIGTERM');
  for (let t = 0; t < 20; t += 1) {
    if (!pids.some(isAlive)) return;
    await sleep(100);
  }
  for (const p of pids) signal(p, 'SIGKILL');
}

export function listenHolderPid(port: number): number | null {
  try {
    const out = execFileSync(
      'lsof',
      ['-iTCP:' + port, '-sTCP:LISTEN', '-t'],
      { encoding: 'utf8' },
    );
    const first = out.split('\n').map((s) => s.trim()).find(Boolean);
    const pid = first ? Number.parseInt(first, 10) : NaN;
    return Number.isInteger(pid) ? pid : null;
  } catch {
    return null;
  }
}

// True if Metro answers /status on this port (reusable regardless of holder).
export function metroAlive(port: number, maxMs = 1000): boolean {
  const r = spawnSync(
    'curl',
    ['-sf', '--max-time', String(Math.ceil(maxMs / 1000)), `http://localhost:${port}/status`],
    { encoding: 'utf8' },
  );
  return (r.stdout ?? '').includes('packager-status:running');
}

export function holderCmd(pid: number): string {
  const r = spawnSync('ps', ['-p', String(pid), '-o', 'command='], {
    encoding: 'utf8',
  });
  return (r.stdout ?? '').trim() || 'unknown';
}

export function isMetroLikeProcess(cmd: string): boolean {
  return /\b(expo|react-native|metro)\b/i.test(cmd);
}

// Detect + clean orphaned expo/metro processes on `port`. Reuses a healthy
// Metro; sweeps a stale RN/expo holder; fails loud on a foreign holder.
export async function sweepPort(
  port: number,
  label: string,
  logger: Logger,
  checkOnly: boolean,
): Promise<void> {
  const pid = listenHolderPid(port);
  if (pid == null) return;

  if (metroAlive(port)) {
    logger.ok(`Port ${port} (${label}) — Metro already running (PID ${pid}), reusing`);
    return;
  }

  const cmd = holderCmd(pid);
  if (isMetroLikeProcess(cmd)) {
    if (checkOnly) {
      logger.fail(
        `Port ${port} (${label}) held by stale ${cmd} (PID ${pid}) — run without --check-only to sweep`,
      );
    }
    logger.warn(`Port ${port} (${label}) held by stale process (PID ${pid})`);
    logger.dim(cmd.slice(0, 100));
    await killTree(pid);
    await sleep(1000);
    if (listenHolderPid(port) != null) {
      logger.fail(`Failed to free port ${port} — manual cleanup required`);
    }
    logger.ok(`Port ${port} freed`);
  } else {
    logger.fail(
      `Port ${port} (${label}) held by foreign process (PID ${pid}): ${cmd.slice(0, 80)}`,
    );
  }
}
