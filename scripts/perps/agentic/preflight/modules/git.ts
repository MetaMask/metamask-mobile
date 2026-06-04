// Keep agentic diffs clean on main by restoring setup-noise files to HEAD.

import { execFileSync, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Logger } from './log';

function currentBranch(root: string): string {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  } catch {
    return '';
  }
}

// On main, `yarn setup` rewrites tsconfig.json and pod install bumps
// Podfile.lock — neither should be committed. Restore them to HEAD. Off main
// these diffs may be intentional branch work, so leave them.
export function restoreMainNoise(root: string, files: string[], logger: Logger): void {
  if (currentBranch(root) !== 'main') return;
  const restored: string[] = [];
  for (const f of files) {
    if (!existsSync(join(root, f))) continue;
    const dirty = spawnSync('git', ['diff', '--quiet', 'HEAD', '--', f], { cwd: root })
      .status !== 0;
    if (!dirty) continue;
    if (spawnSync('git', ['restore', '--source=HEAD', '--', f], { cwd: root }).status === 0) {
      restored.push(f);
    }
  }
  if (restored.length) logger.ok(`Restored on main (setup noise): ${restored.join(' ')}`);
}
