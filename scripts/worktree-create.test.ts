/**
 * Unit tests for worktree-create script.
 * No real git or filesystem operations; fs and spawn are mocked.
 */

const mockSpawnFn = jest.fn();
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));
jest.mock('child_process', () => ({ spawn: (...args: unknown[]) => mockSpawnFn(...args) }));

import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import {
  main,
  parseArgs,
  getSetupCommands,
  loadWorktreesConfig,
} from './worktree-create';

afterEach(() => {
  jest.mocked(existsSync).mockReset();
  jest.mocked(readFileSync).mockReset();
});

/** Fake child for spawn mock: resolves run() with optional stdout and exit 0. */
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

describe('worktree-create parseArgs', () => {
  it('parses positional path and branch', () => {
    expect(parseArgs(['../wt', 'feat'])).toEqual({
      path: '../wt',
      branch: 'feat',
      from: null,
      cd: false,
    });
  });

  it('parses --path and --branch', () => {
    expect(parseArgs(['--path', '/tmp/wt', '--branch', 'main'])).toEqual({
      path: '/tmp/wt',
      branch: 'main',
      from: null,
      cd: false,
    });
  });

  it('parses --from', () => {
    expect(parseArgs(['../wt', 'new-branch', '--from', 'develop'])).toEqual({
      path: '../wt',
      branch: 'new-branch',
      from: 'develop',
      cd: false,
    });
  });

  it('parses --cd', () => {
    expect(parseArgs(['../wt', 'feat', '--cd'])).toEqual({
      path: '../wt',
      branch: 'feat',
      from: null,
      cd: true,
    });
  });

  it('returns null path/branch when missing (interactive)', () => {
    expect(parseArgs([])).toEqual({
      path: null,
      branch: null,
      from: null,
      cd: false,
    });
  });

  it('fills branch from positional when --path is provided', () => {
    expect(parseArgs(['--path', '/tmp/wt', 'myBranch'])).toEqual({
      path: '/tmp/wt',
      branch: 'myBranch',
      from: null,
      cd: false,
    });
  });

  it('fills path from positional when --branch is provided', () => {
    expect(parseArgs(['--branch', 'feat', '../wt'])).toEqual({
      path: '../wt',
      branch: 'feat',
      from: null,
      cd: false,
    });
  });
});

describe('worktree-create getSetupCommands', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });

  it('returns setup-worktree-unix on darwin', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
    const config = {
      'setup-worktree': ['fallback'],
      'setup-worktree-unix': ['cp $ROOT_WORKTREE_PATH/.js.env .js.env'],
    };
    expect(getSetupCommands(config)).toEqual(['cp $ROOT_WORKTREE_PATH/.js.env .js.env']);
  });

  it('returns setup-worktree-windows on win32', () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    const config = {
      'setup-worktree': ['fallback'],
      'setup-worktree-windows': ['copy %ROOT_WORKTREE_PATH%\\.js.env .js.env'],
    };
    expect(getSetupCommands(config)).toEqual([
      'copy %ROOT_WORKTREE_PATH%\\.js.env .js.env',
    ]);
  });

  it('falls back to setup-worktree when OS-specific missing', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
    const config = { 'setup-worktree': ['cp $ROOT_WORKTREE_PATH/.js.env .js.env'] };
    expect(getSetupCommands(config)).toEqual([
      'cp $ROOT_WORKTREE_PATH/.js.env .js.env',
    ]);
  });

  it('returns empty array for null config', () => {
    expect(getSetupCommands(null)).toEqual([]);
  });
});

describe('worktree-create loadWorktreesConfig', () => {
  it('returns null when file does not exist', () => {
    jest.mocked(existsSync).mockReturnValue(false);
    expect(loadWorktreesConfig('/repo')).toBeNull();
    expect(readFileSync).not.toHaveBeenCalled();
  });

  it('returns parsed config when file exists and is valid', () => {
    jest.mocked(existsSync).mockReturnValue(true);
    const configJson = JSON.stringify({
      'setup-worktree': ['cp $ROOT_WORKTREE_PATH/.js.env .js.env'],
    });
    jest.mocked(readFileSync).mockReturnValue(configJson);
    const config = loadWorktreesConfig('/repo');
    expect(config).toEqual({ 'setup-worktree': ['cp $ROOT_WORKTREE_PATH/.js.env .js.env'] });
    expect(readFileSync).toHaveBeenCalledWith(
      join('/repo', '.cursor', 'worktrees.json'),
      'utf-8',
    );
  });

  it('returns null when JSON is invalid', () => {
    jest.mocked(existsSync).mockReturnValue(true);
    jest.mocked(readFileSync).mockReturnValue('not json');
    expect(loadWorktreesConfig('/repo')).toBeNull();
  });
});

describe('worktree-create main flow', () => {
  let savedArgv: string[];
  let stdoutWrite: jest.SpyInstance;
  let stderrWrite: jest.SpyInstance;

  beforeEach(() => {
    savedArgv = process.argv;
    stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
    stderrWrite = jest.spyOn(process.stderr, 'write').mockImplementation();
    mockSpawnFn.mockReset();
    mockSpawnFn.mockImplementation((cmd: string, args: string[], opts?: { stdio?: unknown }) => {
      const isRun = Array.isArray(opts?.stdio) && opts?.stdio?.[1] === 'pipe';
      const stdoutData =
        isRun && cmd === 'git' && args[0] === 'rev-parse' ? '/repo/root\n' : '';
      return fakeChild(stdoutData);
    });
  });

  afterEach(() => {
    process.argv = savedArgv;
    stdoutWrite.mockRestore();
    stderrWrite.mockRestore();
  });

  it('calls git worktree add and runs setup commands then prints path to stdout', async () => {
    jest.mocked(existsSync).mockReturnValue(true);
    jest.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        'setup-worktree': ['cp $ROOT_WORKTREE_PATH/.js.env .js.env'],
      }),
    );

    const pathArg = resolve(process.cwd(), '../wt-feat');
    process.argv = ['node', 'worktree-create.ts', pathArg, 'feat'];
    const cwd = process.cwd();

    await main();

    expect(mockSpawnFn).toHaveBeenCalledWith('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(mockSpawnFn).toHaveBeenCalledWith('git', ['worktree', 'add', pathArg, 'feat'], {
      cwd: '/repo/root',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(mockSpawnFn).toHaveBeenCalledWith(
      'sh',
      ['-c', 'cp /repo/root/.js.env .js.env'],
      expect.objectContaining({
        cwd: pathArg,
        env: expect.objectContaining({ ROOT_WORKTREE_PATH: '/repo/root' }),
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    );
    expect(stdoutWrite).toHaveBeenCalledWith(pathArg + '\n');
  });

  it('calls git worktree add -b when --from is provided', async () => {
    jest.mocked(existsSync).mockReturnValue(false);

    const pathArg = resolve(process.cwd(), '../wt-new');
    process.argv = ['node', 'worktree-create.ts', pathArg, 'new-feat', '--from', 'develop'];

    await main();

    expect(mockSpawnFn).toHaveBeenCalledWith(
      'git',
      ['worktree', 'add', '-b', 'new-feat', pathArg, 'develop'],
      expect.objectContaining({ cwd: '/repo/root' }),
    );
  });

  it('warns when .cursor/worktrees.json is missing', async () => {
    jest.mocked(existsSync).mockReturnValue(false);

    const pathArg = resolve(process.cwd(), '../wt-no-config');
    process.argv = ['node', 'worktree-create.ts', pathArg, 'feat'];

    await main();

    const stderrCalls = stderrWrite.mock.calls.map((c: [string]) => c[0]).join('');
    expect(stderrCalls).toContain('worktrees.json not found');
  });

  it('rejects when only --path is provided without --branch', async () => {
    jest.mocked(existsSync).mockReturnValue(false);
    process.argv = ['node', 'worktree-create.ts', '--path', '../wt-partial'];

    await expect(main()).rejects.toThrow('--branch is required');
  });

  it('rejects when only --branch is provided without --path', async () => {
    jest.mocked(existsSync).mockReturnValue(false);
    process.argv = ['node', 'worktree-create.ts', '--branch', 'feat'];

    await expect(main()).rejects.toThrow('--path is required');
  });

  it('spawns interactive shell when --cd is passed', async () => {
    jest.mocked(existsSync).mockReturnValue(false);

    const pathArg = resolve(process.cwd(), '../wt-cd');
    process.argv = ['node', 'worktree-create.ts', '--cd', pathArg, 'feat'];

    const mockChild = {
      on: jest.fn(),
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
    };

    mockSpawnFn.mockImplementation((cmd: string, args: string[], opts?: { stdio?: unknown }) => {
      const isRun = Array.isArray(opts?.stdio) && opts?.stdio?.[1] === 'pipe';
      if (isRun && cmd === 'git' && args[0] === 'rev-parse') {
        return fakeChild('/repo/root\n');
      }
      if (isRun) return fakeChild('');
      // spawn for the interactive shell (stdio: 'inherit')
      return mockChild;
    });

    await main();

    const shellSpawnCall = mockSpawnFn.mock.calls.find(
      (call: [string, string[], Record<string, unknown>]) => call[2]?.stdio === 'inherit',
    );
    expect(shellSpawnCall).toBeDefined();
    expect(shellSpawnCall[2].cwd).toBe(pathArg);
    // stdout should NOT have been written (shell takes over)
    expect(stdoutWrite).not.toHaveBeenCalledWith(pathArg + '\n');
  });
});
