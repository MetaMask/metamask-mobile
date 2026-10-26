import { execFileSync } from 'child_process';
import path from 'path';

const SCRIPT = path.join(__dirname, 'require-check-all-jobs-pass.mts');
const SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER_SHA = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

interface CheckRunFixture {
  id?: number;
  name?: string;
  status?: string | null;
  conclusion?: string | null;
  head_sha?: string;
  started_at?: string;
  completed_at?: string;
  html_url?: string;
  app?: { slug?: string | null } | null;
}

function runOnThisSha(overrides: Partial<CheckRunFixture> = {}): CheckRunFixture {
  return {
    id: 10,
    name: 'Check all jobs pass',
    status: 'completed',
    conclusion: 'success',
    head_sha: SHA,
    started_at: '2026-10-26T12:00:00Z',
    completed_at: '2026-10-26T12:05:00Z',
    html_url: 'https://github.com/example/actions/runs/1',
    app: { slug: 'github-actions' },
    ...overrides,
  };
}

function runCli(runs: unknown, sha: string = SHA): {
  exitCode: number;
  stderr: string;
  stdout: string;
} {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    COMMIT_SHA: sha,
    CHECK_RUNS_JSON: JSON.stringify(runs),
    GITHUB_STEP_SUMMARY: '',
  };
  delete env.GITHUB_TOKEN;
  delete env.GH_TOKEN;
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT], {
      encoding: 'utf8',
      env,
    });
    return { exitCode: 0, stdout, stderr: '' };
  } catch (error) {
    const failed = error as {
      status?: number;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
    };
    return {
      exitCode: failed.status ?? 1,
      stdout: String(failed.stdout ?? ''),
      stderr: String(failed.stderr ?? ''),
    };
  }
}

describe('require-check-all-jobs-pass', () => {
  it('blocks when the SHA has no Check all jobs pass run', () => {
    const result = runCli([]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(SHA);
    expect(result.stderr).toContain('no "Check all jobs pass"');
  });

  it('blocks a short commit SHA before looking at runs', () => {
    const result = runCli([runOnThisSha()], 'abc');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('40-character');
  });

  it('blocks while the latest run on the SHA is in progress', () => {
    const result = runCli([
      runOnThisSha({
        id: 1,
        conclusion: 'success',
        started_at: '2026-10-26T11:00:00Z',
      }),
      runOnThisSha({
        id: 2,
        status: 'in_progress',
        conclusion: null,
        started_at: '2026-10-26T12:30:00Z',
      }),
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('in_progress');
  });

  it('blocks when a newer run on the SHA failed after an older success', () => {
    const result = runCli([
      runOnThisSha({ id: 1, started_at: '2026-10-26T11:00:00Z' }),
      runOnThisSha({
        id: 2,
        conclusion: 'failure',
        started_at: '2026-10-26T12:30:00Z',
      }),
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('failure');
  });

  it('exits 0 when the latest run on the SHA succeeded', () => {
    const result = runCli([
      runOnThisSha({
        id: 1,
        conclusion: 'failure',
        started_at: '2026-10-26T11:00:00Z',
      }),
      runOnThisSha({ id: 2, started_at: '2026-10-26T12:30:00Z' }),
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`"Check all jobs pass" succeeded on ${SHA}`);
  });

  it('ignores a success recorded on a different SHA', () => {
    const result = runCli([
      runOnThisSha({
        head_sha: OTHER_SHA,
        started_at: '2026-10-26T13:00:00Z',
      }),
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('no "Check all jobs pass"');
  });

  it('blocks a success posted by an app other than GitHub Actions', () => {
    const result = runCli([runOnThisSha({ app: { slug: 'some-other-app' } })]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('GitHub Actions');
  });

  it('blocks when the check run omits head_sha', () => {
    const result = runCli([runOnThisSha({ head_sha: undefined })]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('no "Check all jobs pass"');
  });

  it('blocks a skipped conclusion', () => {
    const result = runCli([runOnThisSha({ conclusion: 'skipped' })]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('skipped');
  });

  it('blocks a cancelled conclusion', () => {
    const result = runCli([runOnThisSha({ conclusion: 'cancelled' })]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('cancelled');
  });

  it('uses the higher check run id when start times match', () => {
    const result = runCli([
      runOnThisSha({ id: 4, conclusion: 'success' }),
      runOnThisSha({ id: 9, conclusion: 'failure' }),
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('failure');
  });

  it('reads the check_runs array from a REST payload', () => {
    const result = runCli({
      total_count: 1,
      check_runs: [runOnThisSha()],
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(SHA);
  });

  it('exits 1 when no fixture is provided and no token is available', () => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      COMMIT_SHA: SHA,
      GITHUB_REPOSITORY: '',
      GITHUB_STEP_SUMMARY: '',
    };
    delete env.CHECK_RUNS_JSON;
    delete env.GITHUB_TOKEN;
    delete env.GH_TOKEN;

    let exitCode = 0;
    let stderr = '';
    try {
      execFileSync(process.execPath, [SCRIPT], { encoding: 'utf8', env });
    } catch (error) {
      const failed = error as { status?: number; stderr?: string | Buffer };
      exitCode = failed.status ?? 1;
      stderr = String(failed.stderr ?? '');
    }

    expect(exitCode).toBe(1);
    expect(stderr).toContain('::error::');
    expect(stderr).toContain('GITHUB_TOKEN');
  });
});
