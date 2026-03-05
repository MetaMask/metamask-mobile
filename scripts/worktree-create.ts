#!/usr/bin/env ts-node
/**
 * Creates a git worktree and runs post-creation commands from .cursor/worktrees.json.
 * Single source of truth for setup is the JSON config (shared with Cursor agent worktrees).
 */

import { spawn } from 'child_process';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import prompts from 'prompts';
import { run, writeStderr, writeStdout, getRepoRoot } from './worktree-utils';

interface WorktreesConfig {
  'setup-worktree'?: string[];
  'setup-worktree-unix'?: string[];
  'setup-worktree-windows'?: string[];
}

export function parseArgs(argv: string[]): {
  path: string | null;
  branch: string | null;
  from: string | null;
  cd: boolean;
} {
  let pathArg: string | null = null;
  let branchArg: string | null = null;
  let fromArg: string | null = null;
  let cd = false;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--path' && argv[i + 1]) {
      pathArg = argv[++i];
    } else if (arg === '--branch' && argv[i + 1]) {
      branchArg = argv[++i];
    } else if (arg === '--from' && argv[i + 1]) {
      fromArg = argv[++i];
    } else if (arg === '--cd') {
      cd = true;
    } else if (!arg.startsWith('--')) {
      positional.push(arg);
    }
  }

  // Fill remaining nulls from positionals in order
  let posIdx = 0;
  if (pathArg === null && posIdx < positional.length) {
    pathArg = positional[posIdx++];
  }
  if (branchArg === null && posIdx < positional.length) {
    branchArg = positional[posIdx];
  }

  return { path: pathArg, branch: branchArg, from: fromArg, cd };
}

export function loadWorktreesConfig(repoRoot: string): WorktreesConfig | null {
  const configPath = join(repoRoot, '.cursor', 'worktrees.json');
  if (!existsSync(configPath)) return null;
  try {
    const raw = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw) as WorktreesConfig;
    return config;
  } catch {
    return null;
  }
}

export function getSetupCommands(config: WorktreesConfig | null): string[] {
  if (!config) return [];
  const isWin = process.platform === 'win32';
  const arr =
    (isWin ? config['setup-worktree-windows'] : config['setup-worktree-unix']) ??
    config['setup-worktree'] ??
    [];
  return Array.isArray(arr) ? arr : [];
}

async function runInteractive(): Promise<{
  path: string;
  branch: string;
  from: string | null;
  spawnShell: boolean;
}> {
  const { path: pathArg } = await prompts(
    {
      type: 'text',
      name: 'path',
      message: 'Worktree path',
      initial: '../metamask-mobile.worktrees/feat/my-feature',
      validate: (v) => (v.trim().length > 0 ? true : 'Worktree path is required'),
      stdin: process.stdin,
      stdout: process.stderr,
    },
  );
  if (pathArg === undefined) throw new Error('cancelled');

  const { branch: branchArg } = await prompts(
    {
      type: 'text',
      name: 'branch',
      message: 'Branch name',
      validate: (v) => (v.trim().length > 0 ? true : 'Branch name is required'),
      stdin: process.stdin,
      stdout: process.stderr,
    },
  );
  if (branchArg === undefined) throw new Error('cancelled');

  const { createNew } = await prompts(
    {
      type: 'confirm',
      name: 'createNew',
      message: 'Create new branch?',
      initial: false,
      stdin: process.stdin,
      stdout: process.stderr,
    },
  );
  if (createNew === undefined) throw new Error('cancelled');

  let fromArg: string | null = null;
  if (createNew) {
    const { from } = await prompts(
      {
        type: 'text',
        name: 'from',
        message: 'From ref',
        initial: 'main',
        stdin: process.stdin,
        stdout: process.stderr,
      },
    );
    if (from === undefined) throw new Error('cancelled');
    fromArg = (from as string).trim() || 'main';
  }

  const { goToDir } = await prompts(
    {
      type: 'confirm',
      name: 'goToDir',
      message: 'Go to new worktree directory?',
      initial: false,
      stdin: process.stdin,
      stdout: process.stderr,
    },
  );
  if (goToDir === undefined) throw new Error('cancelled');

  return {
    path: pathArg.trim(),
    branch: branchArg.trim(),
    from: fromArg,
    spawnShell: goToDir,
  };
}

export async function main(): Promise<void> {
  const cwd = process.cwd();
  const args = parseArgs(process.argv.slice(2));

  let pathArg: string;
  let branchArg: string;
  let fromRef: string | null;
  let spawnShell: boolean;

  if (args.path !== null && args.branch !== null) {
    pathArg = args.path;
    branchArg = args.branch;
    fromRef = args.from;
    spawnShell = args.cd;
  } else {
    const interactive = await runInteractive();
    pathArg = interactive.path;
    branchArg = interactive.branch;
    fromRef = interactive.from;
    spawnShell = interactive.spawnShell;
  }

  const repoRoot = await getRepoRoot(cwd);
  const worktreePathAbs = resolve(cwd, pathArg);

  const config = loadWorktreesConfig(repoRoot);
  if (!config) {
    writeStderr(chalk.yellow('Warning: .cursor/worktrees.json not found or invalid; skipping post-setup.\n'));
  }

  if (fromRef !== null) {
    await run('git', ['worktree', 'add', '-b', branchArg, worktreePathAbs, fromRef], {
      cwd: repoRoot,
    });
  } else {
    await run('git', ['worktree', 'add', worktreePathAbs, branchArg], {
      cwd: repoRoot,
    });
  }

  const setupCommands = getSetupCommands(config);
  const env = { ...process.env, ROOT_WORKTREE_PATH: repoRoot };
  const shellCmd = process.platform === 'win32' ? 'cmd' : 'sh';
  const shellArg = process.platform === 'win32' ? '/c' : '-c';
  for (const cmd of setupCommands) {
    const substituted = cmd.replace(/\$ROOT_WORKTREE_PATH/g, repoRoot);
    await run(shellCmd, [shellArg, substituted], {
      cwd: worktreePathAbs,
      env,
    });
  }

  writeStderr(
    chalk.green(`Worktree created at ${worktreePathAbs}`) +
      chalk.dim(` (branch: ${branchArg}).\n`) +
      chalk.dim('Run `yarn setup` or `yarn setup:expo` and `git submodule update --init --recursive` in the worktree as needed.\n'),
  );

  if (spawnShell) {
    const shell = process.env.SHELL || 'bash';
    const isInteractiveShell = shell.endsWith('bash') || shell.endsWith('zsh');
    const shellArgs = isInteractiveShell ? ['-i'] : [];
    const child = spawn(shell, shellArgs, {
      stdio: 'inherit',
      cwd: worktreePathAbs,
    });
    child.on('exit', (code) => process.exit(code ?? 0));
    return;
  }

  writeStdout(worktreePathAbs + '\n');
}

if (typeof require !== 'undefined' && require.main === module) {
  main().catch((err) => {
    if (err.message !== 'cancelled') {
      writeStderr(chalk.red(err.message + '\n'));
    }
    process.exit(err.message === 'cancelled' ? 130 : 1);
  });
}
