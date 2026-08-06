/* eslint-disable import-x/no-nodejs-modules */
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

interface CommandResult {
  status: number;
  output: string;
}

const checkerPath = path.resolve(
  __dirname,
  '../../scripts/check-no-code-fences.sh',
);

const tempRepos: string[] = [];

const runCommand = (cwd: string, cmd: string, args: string[]): CommandResult => {
  const result = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
  });

  return {
    status: result.status ?? -1,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
};

const runGit = (cwd: string, args: string[]) => {
  const result = runCommand(cwd, 'git', args);
  expect(result.status).toBe(0);
};

const runChecker = (repoPath: string): CommandResult =>
  runCommand(process.cwd(), 'bash', [checkerPath, '--path', repoPath]);

const createRepo = (): string => {
  const repo = mkdtempSync(path.join(tmpdir(), 'fence-checker-test-'));
  tempRepos.push(repo);

  runGit(repo, ['init']);
  runGit(repo, ['config', 'user.name', 'Fence Checker Test']);
  runGit(repo, ['config', 'user.email', 'fence-checker-test@example.com']);
  runGit(repo, ['config', 'commit.gpgsign', 'false']);

  mkdirSync(path.join(repo, 'app'), { recursive: true });
  writeFileSync(path.join(repo, 'app/sample.ts'), 'export const sample = 1;\n');

  runGit(repo, ['add', 'app/sample.ts']);
  runGit(repo, ['commit', '-m', 'init']);

  return repo;
};

const commitFile = (repo: string, relativePath: string, contents: string) => {
  writeFileSync(path.join(repo, relativePath), contents);
  runGit(repo, ['add', relativePath]);
  runGit(repo, ['commit', '-m', `add ${relativePath}`]);
};

afterAll(() => {
  for (const repo of tempRepos) {
    rmSync(repo, { recursive: true, force: true });
  }
});

describe('check-no-code-fences.sh', () => {
  it('passes on a clean tree', () => {
    const repo = createRepo();

    const result = runChecker(repo);

    expect(result.status).toBe(0);
    expect(result.output).toContain('OK: no code-fence markers found.');
  });

  it('fails when a BEGIN/END:ONLY_INCLUDE_IF fence marker is committed', () => {
    const repo = createRepo();
    commitFile(
      repo,
      'app/fenced.ts',
      [
        '///: BEGIN:ONLY_INCLUDE_IF(snaps)',
        "export const snapsOnly = 'x';",
        '///: END:ONLY_INCLUDE_IF',
        '',
      ].join('\n'),
    );

    const result = runChecker(repo);

    expect(result.status).toBe(1);
    expect(result.output).toContain('Found code-fence marker');
    expect(result.output).toContain('app/fenced.ts');
  });

  it('fails on the malformed marker variants seen historically in this codebase', () => {
    const repo = createRepo();
    commitFile(
      repo,
      'app/malformed.ts',
      [
        '/// BEGIN:ONLY_INCLUDE_IF(bitcoin)',
        "export const bitcoinOnly = 'x';",
        '/// END:ONLY_INCLUDE_IF(bitcoin)',
        '',
      ].join('\n'),
    );

    const result = runChecker(repo);

    expect(result.status).toBe(1);
    expect(result.output).toContain('app/malformed.ts');
  });

  it('ignores untracked files that are not committed or staged', () => {
    const repo = createRepo();
    writeFileSync(
      path.join(repo, 'app/untracked.ts'),
      '///: BEGIN:ONLY_INCLUDE_IF(solana)\n///: END:ONLY_INCLUDE_IF\n',
    );

    const result = runChecker(repo);

    expect(result.status).toBe(0);
    expect(result.output).toContain('OK: no code-fence markers found.');
  });

  it('errors loudly instead of reporting success when the path is not a git repository', () => {
    const notARepo = mkdtempSync(path.join(tmpdir(), 'fence-checker-not-repo-'));
    tempRepos.push(notARepo);

    const result = runChecker(notARepo);

    expect(result.status).not.toBe(0);
    expect(result.output).not.toContain('OK: no code-fence markers found.');
    expect(result.output.toLowerCase()).toContain('git repository');
  });
});
