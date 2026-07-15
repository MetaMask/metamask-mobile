/**
 * Shared utilities for worktree scripts.
 */

import { spawn } from 'child_process';

/** Run a command and return stdout; throws on non-zero exit. Avoids ESM-only execa when running under ts-node (CJS). */
export function run(
  cmd: string,
  args: string[],
  opts?: { cwd?: string; env?: NodeJS.ProcessEnv },
): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts?.cwd,
      env: opts?.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdoutBuf = '';
    let stderrBuf = '';
    child.stdout?.on('data', (chunk) => (stdoutBuf += chunk.toString()));
    child.stderr?.on('data', (chunk) => (stderrBuf += chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout: stdoutBuf });
      else reject(new Error(`Command failed (${code}): ${cmd} ${args.join(' ')}\n${stderrBuf}`));
    });
  });
}

export const writeStderr = (msg: string): void => {
  process.stderr.write(msg);
};

export const writeStdout = (msg: string): void => {
  process.stdout.write(msg);
};

export async function getRepoRoot(cwd: string): Promise<string> {
  const { stdout } = await run('git', ['rev-parse', '--show-toplevel'], {
    cwd,
  });
  return stdout.trim();
}
