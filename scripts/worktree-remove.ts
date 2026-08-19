#!/usr/bin/env ts-node
/**
 * Removes a git worktree. Uses -f because this repo has submodules.
 * Run from repo root or any worktree of the same repo.
 */

import chalk from 'chalk';
import { resolve, normalize } from 'path';
import prompts from 'prompts';
import { run, writeStderr, writeStdout, getRepoRoot } from './worktree-utils';

export interface WorktreeEntry {
  path: string;
  commit?: string;
  branch?: string;
}

export function parseWorktreeList(porcelainOutput: string): WorktreeEntry[] {
  const lines = porcelainOutput.trim().split('\n');
  const entries: WorktreeEntry[] = [];
  let current: Partial<WorktreeEntry> = {};
  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      if (current.path) {
        entries.push(current as WorktreeEntry);
      }
      current = { path: line.slice(9).trim() };
    } else if (line.startsWith('HEAD ')) {
      current.commit = line.slice(5).trim();
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice(7).trim().replace(/^refs\/heads\//, '');
    }
  }
  if (current.path) {
    entries.push(current as WorktreeEntry);
  }
  return entries;
}

async function listWorktrees(repoRoot: string): Promise<WorktreeEntry[]> {
  const { stdout } = await run('git', ['worktree', 'list', '--porcelain'], {
    cwd: repoRoot,
  });
  return parseWorktreeList(stdout);
}

export async function main(): Promise<void> {
  const cwd = process.cwd();
  const repoRoot = await getRepoRoot(cwd);
  const argv = process.argv.slice(2);
  const pathArg = argv[0] ?? null;

  if (pathArg) {
    const worktreePathAbs = resolve(cwd, pathArg);
    await run('git', ['worktree', 'remove', worktreePathAbs, '-f'], {
      cwd: repoRoot,
    });
    writeStderr(chalk.green(`Removed worktree at ${worktreePathAbs}.\n`));
    writeStdout(worktreePathAbs + '\n');
    return;
  }

  const worktrees = await listWorktrees(repoRoot);
  // The first entry in `git worktree list` is always the main worktree,
  // whereas repoRoot (--show-toplevel) just reflects the current worktree.
  const mainPath = worktrees.length > 0 ? normalize(worktrees[0].path) : normalize(repoRoot);
  const others = worktrees.filter((w) => normalize(w.path) !== mainPath);
  if (others.length === 0) {
    writeStderr(chalk.yellow('No additional worktrees to remove.\n'));
    return;
  }

  const { chosen } = await prompts(
    {
      type: 'select',
      name: 'chosen',
      message: 'Worktree to remove',
      choices: others.map((w) => ({
        title: `${w.path} ${chalk.dim(`(${w.branch ?? w.commit ?? 'detached'})`)}`,
        value: w.path,
      })),
      stdin: process.stdin,
      stdout: process.stderr,
    },
  );
  if (chosen === undefined) {
    return;
  }

  const toRemove = normalize(chosen);
  await run('git', ['worktree', 'remove', toRemove, '-f'], { cwd: repoRoot });
  writeStderr(chalk.green(`Removed worktree at ${toRemove}.\n`));
  writeStdout(toRemove + '\n');
}

if (typeof require !== 'undefined' && require.main === module) {
  main().catch((err) => {
    if (err.message !== 'cancelled') {
      writeStderr(chalk.red(err.message + '\n'));
    }
    process.exit(err.message === 'cancelled' ? 130 : 1);
  });
}
