import { execFileSync } from 'child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const SCRIPT = path.join(__dirname, 'repair-ota-release-pr.sh');
const WORKFLOW = path.join(__dirname, '../workflows/ensure-ota-release-pr.yml');

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

describe('repair-ota-release-pr.sh', () => {
  const cleanups: string[] = [];

  afterAll(() => {
    for (const root of cleanups) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('pins the peeled annotated tag and opens the pull request', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'ota-repair-'));
    cleanups.push(root);
    const bare = path.join(root, 'remote.git');
    const work = path.join(root, 'work');
    const bin = path.join(root, 'bin');
    const log = path.join(root, 'gh.log');
    execFileSync('git', ['init', '--bare', '-b', 'main', bare]);
    execFileSync('git', ['init', '-b', 'main', work]);
    git(work, ['config', 'user.email', 'ota@example.com']);
    git(work, ['config', 'user.name', 'ota']);
    writeFileSync(path.join(work, 'package.json'), JSON.stringify({ version: '8.15.0' }));
    git(work, ['add', 'package.json']);
    git(work, ['commit', '-m', 'store build']);
    git(work, ['tag', '-a', 'v8.15.0', '-m', 'store build 8.15.0']);
    git(work, ['remote', 'add', 'origin', bare]);
    git(work, ['push', 'origin', 'HEAD:refs/heads/release/8.15.1-ota']);
    git(work, ['push', 'origin', 'v8.15.0']);

    mkdirSync(bin);
    writeFileSync(
      path.join(bin, 'gh'),
      `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$GH_LOG"
if [[ "$1" == "pr" && "$2" == "list" ]]; then
  printf '%s\\n' '[]'
  exit 0
fi
if [[ "$1" == "pr" && "$2" == "create" ]]; then
  printf '%s\\n' 'https://github.com/example/repo/pull/77'
  exit 0
fi
exit 0
`,
    );
    chmodSync(path.join(bin, 'gh'), 0o755);
    writeFileSync(log, '');

    const tagObject = git(work, ['rev-parse', 'v8.15.0']).trim();
    const tagCommit = git(work, ['rev-parse', 'v8.15.0^{}']).trim();
    execFileSync('bash', [SCRIPT], {
      cwd: work,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH ?? ''}`,
        GH_LOG: log,
        OTA_BRANCH: 'release/8.15.1-ota',
        GH_TOKEN: 'test-token',
        GITHUB_REPOSITORY: 'example/repo',
      },
    });

    const pin = git(work, ['ls-remote', 'origin', 'refs/heads/ota-base/v8.15.0']).split(/\s+/)[0];
    const ghLog = readFileSync(log, 'utf8');

    expect(tagObject).not.toBe(tagCommit);
    expect(pin).toBe(tagCommit);
    expect(ghLog).toContain('pr create');
    expect(ghLog).toContain('--base ota-base/v8.15.0');
    expect(ghLog).toContain('--head release/8.15.1-ota');
  });

  it('rejects a branch that is not release/X.Y.Z-ota', () => {
    expect(() =>
      execFileSync('bash', [SCRIPT], {
        encoding: 'utf8',
        env: {
          ...process.env,
          OTA_BRANCH: 'release/not-an-ota',
          GH_TOKEN: 'test-token',
          GITHUB_REPOSITORY: 'example/repo',
        },
      }),
    ).toThrow(/release\/X\.Y\.Z-ota/);
  });
});

describe('ensure-ota-release-pr.yml', () => {
  it('accepts a successful Auto Create run triggered by create or push', () => {
    const workflow = readFileSync(WORKFLOW, 'utf8');

    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(workflow).toContain(
      "github.event.workflow_run.event == 'push' || github.event.workflow_run.event == 'create'",
    );
    expect(workflow).toContain("endsWith(github.event.workflow_run.head_branch, '-ota')");
    expect(workflow).toContain(
      'github.event.workflow_run.head_repository.full_name == github.repository',
    );
  });
});
