// Typed wrapper over lib/build-cache-cli.sh. Stateless ops go through spawnSync;
// the cross-build lock is held by a long-lived lock-hold child whose stdin we
// close to release. See preflight/README.md for why this bridges to bash.

import { type ChildProcess, spawn, spawnSync } from 'child_process';
import { join } from 'path';
import type { Logger } from './log';

export interface CacheLock {
  release(): Promise<void>;
}

// A single input that changed between two fingerprints.
export interface DriftItem {
  op: 'added' | 'changed' | 'removed';
  key: string;
  reasons: string[];
}

export class BuildCache {
  private readonly root: string;
  private readonly cli: string;

  constructor(root: string) {
    this.root = root;
    this.cli = join(root, 'scripts/perps/agentic/lib/build-cache-cli.sh');
  }

  private run(args: string[]): { status: number; out: string } {
    const r = spawnSync('bash', [this.cli, ...args], {
      cwd: this.root,
      encoding: 'utf8',
    });
    return { status: r.status ?? 1, out: (r.stdout ?? '').trim() };
  }

  // Native build fingerprint, or null when it can't be computed.
  fingerprint(): string | null {
    return this.run(['fingerprint']).out || null;
  }

  hasArtifact(plat: string, fp: string): boolean {
    return this.run(['has', plat, fp]).out === 'true';
  }

  artifactPath(plat: string, fp: string): string {
    return this.run(['artifact-path', plat, fp]).out;
  }

  installedFp(plat: string): string {
    return this.run(['installed-fp', plat]).out;
  }

  installedTarget(plat: string): string {
    return this.run(['installed-target', plat]).out;
  }

  recordInstall(plat: string, fp: string, target: string): void {
    this.run(['record-install', plat, fp, target]);
  }

  storeArtifact(plat: string, fp: string, src: string): boolean {
    return this.run(['store', plat, fp, src]).status === 0;
  }

  prune(plat: string, keep = 5): void {
    this.run(['prune', plat, String(keep)]);
  }

  // Persist the current fingerprint sources for `fp` so a later miss can explain
  // what drifted.
  snapshot(plat: string, fp: string): void {
    this.run(['snapshot', plat, fp]);
  }

  // Inputs that changed vs the stored snapshot for `fp` (empty when no snapshot
  // exists — e.g. a build made before snapshots were recorded).
  drift(plat: string, fp: string): DriftItem[] {
    const { out } = this.run(['drift', plat, fp]);
    if (!out) return [];
    try {
      return JSON.parse(out) as DriftItem[];
    } catch {
      return [];
    }
  }

  // Hold the per-fingerprint build lock until release(). Resolves null on lock
  // timeout/failure, so callers can fall back to lockless behaviour.
  acquireLock(plat: string, fp: string): Promise<CacheLock | null> {
    const child = spawn('bash', [this.cli, 'lock-hold', plat, fp], {
      cwd: this.root,
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    return new Promise<CacheLock | null>((resolve) => {
      let buf = '';
      let settled = false;
      const settle = (lock: CacheLock | null): void => {
        if (settled) return;
        settled = true;
        resolve(lock);
      };
      child.stdout.on('data', (d: Buffer) => {
        buf += d.toString();
        if (buf.includes('LOCKED')) settle(makeLock(child));
        else if (buf.includes('LOCK_FAIL')) settle(null);
      });
      child.on('close', () => settle(null));
      child.on('error', () => settle(null));
    });
  }
}

function makeLock(child: ChildProcess): CacheLock {
  return {
    release(): Promise<void> {
      return new Promise<void>((resolve) => {
        if (child.exitCode != null || child.signalCode != null) return resolve();
        const done = (): void => resolve();
        child.once('close', done);
        child.stdin?.end();
        // SIGKILL backstop if the trap-based release stalls.
        const t = setTimeout(() => {
          child.kill('SIGKILL');
        }, 5000);
        if (t.unref) t.unref();
        child.once('close', () => clearTimeout(t));
      });
    },
  };
}

// Print which inputs changed since the installed build — the "why" behind a
// cache miss. Empty when the installed build predates snapshots.
export function reportDrift(
  cache: BuildCache,
  logger: Logger,
  plat: string,
  installedFp: string,
): void {
  if (!installedFp) return;
  const changes = cache.drift(plat, installedFp);
  if (!changes.length) {
    logger.dim('drift: no snapshot for the installed build to compare');
    return;
  }
  const shown = changes.slice(0, 8);
  logger.plain(`  Changed inputs vs the installed build (${changes.length}):`);
  for (const c of shown) {
    const why = c.reasons.length ? ` [${c.reasons.join(', ')}]` : '';
    logger.dim(`${c.op}: ${c.key}${why}`);
  }
  if (changes.length > shown.length) logger.dim(`… and ${changes.length - shown.length} more`);
}
