import { execFileSync, spawnSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const SCRIPT = path.join(__dirname, 'ensure-ota-base-branch.sh');

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

function makeRepo(): { root: string; work: string } {
  const root = mkdtempSync(path.join(tmpdir(), 'ota-base-'));
  const bare = path.join(root, 'remote.git');
  const work = path.join(root, 'work');
  execFileSync('git', ['init', '--bare', '-b', 'main', bare]);
  execFileSync('git', ['init', '-b', 'main', work]);
  git(work, ['config', 'user.email', 'ota@example.com']);
  git(work, ['config', 'user.name', 'ota']);
  writeFileSync(
    path.join(work, 'package.json'),
    JSON.stringify({ version: '8.15.0' }),
  );
  git(work, ['add', 'package.json']);
  git(work, ['commit', '-m', 'store build']);
  git(work, ['tag', '-a', 'v8.15.0', '-m', 'store build 8.15.0']);
  git(work, ['remote', 'add', 'origin', bare]);
  git(work, ['push', 'origin', 'HEAD:refs/heads/release/8.15.1-ota']);
  git(work, ['push', 'origin', 'v8.15.0']);
  return { root, work };
}

function run(work: string): string {
  return execFileSync('bash', [SCRIPT], { cwd: work, encoding: 'utf8' }).trim();
}

describe('ensure-ota-base-branch.sh', () => {
  const cleanups: string[] = [];

  afterAll(() => {
    for (const root of cleanups) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('escapes workflow commands in a rejected package.json version', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'ota-version-'));
    cleanups.push(root);
    const work = path.join(root, 'work');
    execFileSync('git', ['init', '-b', 'main', work]);
    git(work, ['config', 'user.email', 'ota@example.com']);
    git(work, ['config', 'user.name', 'ota']);
    writeFileSync(
      path.join(work, 'package.json'),
      JSON.stringify({ version: '8.15.0%0A::add-mask::SECRET' }),
    );
    git(work, ['add', 'package.json']);
    git(work, ['commit', '-m', 'bad version']);

    const ran = spawnSync('bash', [SCRIPT], { cwd: work, encoding: 'utf8' });
    const stderr = ran.stderr ?? '';

    expect(ran.status).toBe(1);
    expect(stderr).toContain('8.15.0%250A::add-mask::SECRET');
    expect(stderr.split('\n').some((line) => line.startsWith('::add-mask::'))).toBe(false);
  });

  it('creates the pin from the store tag and reuses it', () => {
    const repo = makeRepo();
    cleanups.push(repo.root);
    const tagObject = git(repo.work, ['rev-parse', 'v8.15.0']).trim();
    const tagCommit = git(repo.work, ['rev-parse', 'v8.15.0^{}']).trim();

    expect(tagObject).not.toBe(tagCommit);
    expect(run(repo.work)).toBe('ota-base/v8.15.0');
    expect(run(repo.work)).toBe('ota-base/v8.15.0');
    expect(
      git(repo.work, ['ls-remote', 'origin', 'refs/heads/ota-base/v8.15.0']).split(/\s+/)[0],
    ).toBe(tagCommit);
  });

  it('fails when the pin has moved and leaves the remote branch in place', () => {
    const repo = makeRepo();
    cleanups.push(repo.root);
    run(repo.work);
    git(repo.work, ['commit', '--allow-empty', '-m', 'move the pin']);
    git(repo.work, ['push', 'origin', 'HEAD:refs/heads/ota-base/v8.15.0']);
    const moved = git(repo.work, ['rev-parse', 'HEAD']).trim();

    expect(() => run(repo.work)).toThrow(/refusing to move the pin/);
    expect(
      git(repo.work, ['ls-remote', 'origin', 'refs/heads/ota-base/v8.15.0']).split(/\s+/)[0],
    ).toBe(moved);
  });

  it('fails when the OTA ref does not contain the store tag', () => {
    const repo = makeRepo();
    cleanups.push(repo.root);
    git(repo.work, ['checkout', '--orphan', 'side']);
    writeFileSync(
      path.join(repo.work, 'package.json'),
      JSON.stringify({ version: '8.15.0' }),
    );
    git(repo.work, ['add', 'package.json']);
    git(repo.work, ['commit', '-m', 'unrelated history']);

    expect(() => run(repo.work)).toThrow(/does not contain v8.15.0/);
  });

  it('fails when the store tag is missing', () => {
    const repo = makeRepo();
    cleanups.push(repo.root);
    writeFileSync(
      path.join(repo.work, 'package.json'),
      JSON.stringify({ version: '9.9.9' }),
    );
    git(repo.work, ['add', 'package.json']);
    git(repo.work, ['commit', '-m', 'untagged store version']);

    expect(() => run(repo.work)).toThrow(/v9.9.9/);
  });
});
