import { spawnSync } from 'child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const SCRIPT = path.join(__dirname, 'validate-pr-commit.sh');
const HEAD = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const MOVED = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function run(options: {
  expected?: string;
  head?: string;
}): { exitCode: number; stderr: string; output: string } {
  const root = mkdtempSync(path.join(tmpdir(), 'validate-pr-'));
  const bin = path.join(root, 'bin');
  const output = path.join(root, 'github.output');
  mkdirSync(bin);
  writeFileSync(output, '');
  writeFileSync(
    path.join(bin, 'curl'),
    `#!/usr/bin/env bash
url="\${@: -1}"
if [[ "$url" == */pulls/* ]]; then
  printf '%s\\n' "$PR_JSON"
  exit 0
fi
echo "unexpected curl url: $url" >&2
exit 1
`,
  );
  chmodSync(path.join(bin, 'curl'), 0o755);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH ?? ''}`,
    PR_NUMBER: '15',
    GITHUB_TOKEN: 'test-token',
    GITHUB_REPOSITORY: 'example/repo',
    GITHUB_OUTPUT: output,
    PR_JSON: JSON.stringify({
      id: 15,
      state: 'open',
      head: { sha: options.head ?? HEAD },
    }),
  };
  if (options.expected === undefined) {
    delete env.EXPECTED_COMMIT_SHA;
  } else {
    env.EXPECTED_COMMIT_SHA = options.expected;
  }

  const result = spawnSync('bash', [SCRIPT], { encoding: 'utf8', env });
  const githubOutput = readFileSync(output, 'utf8');
  rmSync(root, { recursive: true, force: true });
  return {
    exitCode: result.status ?? 1,
    stderr: result.stderr ?? '',
    output: githubOutput,
  };
}

describe('validate-pr-commit.sh', () => {
  it('resolves the pull request head when no expected SHA is set', () => {
    const result = run({});

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain(`commit_sha=${HEAD}`);
    expect(result.output).toContain('pr_number=15');
  });

  it('accepts an expected SHA that matches the pull request head', () => {
    const result = run({ expected: HEAD.toUpperCase() });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain(`commit_sha=${HEAD}`);
  });

  it('exits 1 when the pull request head moved off the expected SHA', () => {
    const result = run({ expected: MOVED });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('moved after the CI gate');
    expect(result.stderr).toContain(MOVED);
    expect(result.stderr).toContain(HEAD);
    expect(result.output).not.toContain('commit_sha=');
  });

  it('exits 1 when the expected SHA is not a full commit', () => {
    const result = run({ expected: 'abc' });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('40-character');
    expect(result.output).not.toContain('commit_sha=');
  });
});
