/**
 * Unit tests for worktree-remove. Git is mocked.
 */

const mockSpawnFn = jest.fn();
jest.mock('child_process', () => ({ spawn: (...args: unknown[]) => mockSpawnFn(...args) }));

import { resolve } from 'path';

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

describe('worktree-remove', () => {
  let savedArgv: string[];

  beforeEach(() => {
    savedArgv = process.argv;
    jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.spyOn(process.stdout, 'write').mockImplementation();
    jest.spyOn(process.stderr, 'write').mockImplementation();
    mockSpawnFn.mockReset();
    mockSpawnFn.mockImplementation((cmd: string, args: string[]) => {
      const stdoutData = cmd === 'git' && args[0] === 'rev-parse' ? '/repo/root\n' : '';
      return fakeChild(stdoutData);
    });
  });

  afterEach(() => {
    process.argv = savedArgv;
    jest.restoreAllMocks();
  });

  it('removes the given path when the CLI entry is worktree-remove.ts', async () => {
    const pathArg = resolve(process.cwd(), '../wt-feat');
    process.argv = ['node', '/repo/scripts/worktree-remove.ts', pathArg];

    await jest.isolateModulesAsync(async () => {
      await import('./worktree-remove');
    });
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));

    expect(mockSpawnFn).toHaveBeenCalledWith(
      'git',
      ['worktree', 'remove', pathArg, '-f'],
      expect.objectContaining({ cwd: '/repo/root' }),
    );
  });
});
