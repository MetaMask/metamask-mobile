/**
 * Unit tests for worktree-create. Git and the filesystem are mocked.
 */

const mockSpawnFn = jest.fn();
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));
jest.mock('child_process', () => ({ spawn: (...args: unknown[]) => mockSpawnFn(...args) }));

import { existsSync } from 'fs';
import { resolve } from 'path';
import { main } from './worktree-create';

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

describe('worktree-create', () => {
  let savedArgv: string[];
  let exitSpy: jest.SpyInstance;
  let stderrWrite: jest.SpyInstance;

  beforeEach(() => {
    savedArgv = process.argv;
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    stderrWrite = jest.spyOn(process.stderr, 'write').mockImplementation();
    jest.spyOn(process.stdout, 'write').mockImplementation();
    mockSpawnFn.mockReset();
    mockSpawnFn.mockImplementation((cmd: string, args: string[]) => {
      const stdoutData = cmd === 'git' && args[0] === 'rev-parse' ? '/repo/root\n' : '';
      return fakeChild(stdoutData);
    });
    jest.mocked(existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    process.argv = savedArgv;
    jest.restoreAllMocks();
  });

  it('exits before git when the CLI entry has --path and no --branch', async () => {
    process.argv = ['node', '/repo/scripts/worktree-create.ts', '--path', '/tmp/wt'];

    await jest.isolateModulesAsync(async () => {
      await import('./worktree-create');
    });
    await new Promise((resolvePromise) => setImmediate(resolvePromise));

    const stderrOutput = stderrWrite.mock.calls.map((call: [string]) => call[0]).join('');
    expect(stderrOutput).toContain('--branch is required');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockSpawnFn).not.toHaveBeenCalled();
  });

  it('adds a worktree when path and branch are set', async () => {
    const pathArg = resolve(process.cwd(), '../wt-feat');
    process.argv = ['node', 'worktree-create.ts', '--path', pathArg, '--branch', 'feat'];

    await main();

    expect(mockSpawnFn).toHaveBeenCalledWith(
      'git',
      ['worktree', 'add', pathArg, 'feat'],
      expect.objectContaining({ cwd: '/repo/root' }),
    );
  });
});
