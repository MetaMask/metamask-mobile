/**
 * Unit tests for worktree-remove script.
 * No real git operations; child_process.spawn is mocked.
 */

const mockSpawnFn = jest.fn();
jest.mock('child_process', () => ({ spawn: (...args: unknown[]) => mockSpawnFn(...args) }));

import { resolve } from 'path';
import { main, parseWorktreeList } from './worktree-remove';

function fakeChild(stdoutData: string) {
  return {
    stdout: {
      on: (ev: string, fn: (chunk: Buffer) => void) => {
        if (ev === 'data' && stdoutData) setTimeout(() => fn(Buffer.from(stdoutData)), 0);
      },
    },
    stderr: { on: jest.fn() },
    on: (ev: string, fn: (code?: number) => void) => {
      if (ev === 'close') setTimeout(() => fn(0), 0);
    },
  };
}

function fakeChildFail(exitCode: number, stderrData = '') {
  return {
    stdout: { on: jest.fn() },
    stderr: {
      on: (ev: string, fn: (chunk: Buffer) => void) => {
        if (ev === 'data' && stderrData) setTimeout(() => fn(Buffer.from(stderrData)), 0);
      },
    },
    on: (ev: string, fn: (code?: number) => void) => {
      if (ev === 'close') setTimeout(() => fn(exitCode), 0);
    },
  };
}

const PORCELAIN_TWO_WORKTREES = [
  'worktree /repo/root',
  'HEAD abc123',
  'branch refs/heads/main',
  '',
  'worktree /repo/wt-feat',
  'HEAD def456',
  'branch refs/heads/feat',
].join('\n');

describe('parseWorktreeList', () => {
  it('parses porcelain output into entries', () => {
    const entries = parseWorktreeList(PORCELAIN_TWO_WORKTREES);
    expect(entries).toEqual([
      { path: '/repo/root', commit: 'abc123', branch: 'main' },
      { path: '/repo/wt-feat', commit: 'def456', branch: 'feat' },
    ]);
  });

  it('returns entries with optional branch for detached HEAD', () => {
    const porcelain = [
      'worktree /repo/root',
      'HEAD abc123',
      'branch refs/heads/main',
      '',
      'worktree /repo/wt-detached',
      'HEAD 999aaa',
    ].join('\n');
    const entries = parseWorktreeList(porcelain);
    expect(entries).toEqual([
      { path: '/repo/root', commit: 'abc123', branch: 'main' },
      { path: '/repo/wt-detached', commit: '999aaa' },
    ]);
    expect(entries[1].branch).toBeUndefined();
  });
});

describe('worktree-remove main', () => {
  let savedArgv: string[];
  let stdoutWrite: jest.SpyInstance;
  let stderrWrite: jest.SpyInstance;

  beforeEach(() => {
    savedArgv = process.argv;
    stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
    stderrWrite = jest.spyOn(process.stderr, 'write').mockImplementation();
    mockSpawnFn.mockReset();
    mockSpawnFn.mockImplementation((cmd: string, args: string[]) => {
      const stdoutData =
        cmd === 'git' && args[0] === 'rev-parse'
          ? '/repo/root\n'
          : cmd === 'git' && args[0] === 'worktree' && args[1] === 'list'
            ? PORCELAIN_TWO_WORKTREES
            : '';
      return fakeChild(stdoutData);
    });
  });

  afterEach(() => {
    process.argv = savedArgv;
    stdoutWrite.mockRestore();
    stderrWrite.mockRestore();
  });

  it('removes worktree by path when path argument provided', async () => {
    const pathArg = resolve(process.cwd(), '../wt-feat');
    process.argv = ['node', 'worktree-remove.ts', pathArg];

    await main();

    expect(mockSpawnFn).toHaveBeenCalledWith('git', ['rev-parse', '--show-toplevel'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(mockSpawnFn).toHaveBeenCalledWith(
      'git',
      ['worktree', 'remove', pathArg, '-f'],
      { cwd: '/repo/root', env: process.env, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    expect(stdoutWrite).toHaveBeenCalledWith(pathArg + '\n');
  });

  it('prints warning when no additional worktrees exist', async () => {
    mockSpawnFn.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'git' && args[0] === 'rev-parse') return fakeChild('/repo/root\n');
      if (cmd === 'git' && args[0] === 'worktree' && args[1] === 'list') {
        // Only the main worktree
        return fakeChild(
          ['worktree /repo/root', 'HEAD abc123', 'branch refs/heads/main'].join('\n'),
        );
      }
      return fakeChild('');
    });
    process.argv = ['node', 'worktree-remove.ts'];

    await main();

    const output = stderrWrite.mock.calls.map((c: [string]) => c[0]).join('');
    expect(output).toContain('No additional worktrees');
    expect(stdoutWrite).not.toHaveBeenCalled();
  });

  it('rejects when git worktree remove fails', async () => {
    mockSpawnFn.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'git' && args[0] === 'rev-parse') return fakeChild('/repo/root\n');
      if (cmd === 'git' && args[0] === 'worktree' && args[1] === 'remove') {
        return fakeChildFail(1, 'fatal: not a valid worktree');
      }
      return fakeChild('');
    });
    const pathArg = resolve(process.cwd(), '../wt-bad');
    process.argv = ['node', 'worktree-remove.ts', pathArg];

    await expect(main()).rejects.toThrow('Command failed');
  });
});
