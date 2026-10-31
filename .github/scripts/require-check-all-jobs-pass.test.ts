import { execFileSync } from 'child_process';
import { readdirSync, readFileSync } from 'fs';
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
  workflow_path?: string;
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
    workflow_path: '.github/workflows/ci.yml',
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
    expect(result.stderr).toContain('no ci.yml "Check all jobs pass"');
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
    expect(result.stdout).toContain(`ci.yml "Check all jobs pass" succeeded on ${SHA}`);
  });

  it('passes when ci.yml succeeded and a newer same-name gate run is in progress', () => {
    const result = runCli([
      runOnThisSha({
        id: 1,
        started_at: '2026-10-26T11:00:00Z',
        completed_at: '2026-10-26T11:10:00Z',
      }),
      runOnThisSha({
        id: 2,
        status: 'in_progress',
        conclusion: null,
        started_at: '2026-10-26T12:30:00Z',
        completed_at: null,
        workflow_path: '.github/workflows/runway-ota-production.yml',
        html_url: 'https://github.com/example/actions/runs/gate',
      }),
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`ci.yml "Check all jobs pass" succeeded on ${SHA}`);
  });

  it('blocks a newer same-name success from another workflow when ci.yml failed', () => {
    const result = runCli([
      runOnThisSha({
        id: 1,
        conclusion: 'failure',
        started_at: '2026-10-26T11:00:00Z',
        completed_at: '2026-10-26T11:10:00Z',
      }),
      runOnThisSha({
        id: 2,
        conclusion: 'success',
        started_at: '2026-10-26T12:30:00Z',
        completed_at: '2026-10-26T12:31:00Z',
        workflow_path: '.github/workflows/push-eas-update.yml',
        html_url: 'https://github.com/example/actions/runs/rc-skip',
      }),
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('failure');
    expect(result.stderr).not.toContain('succeeded');
  });

  it('blocks when the only same-name success is not from ci.yml', () => {
    const result = runCli([
      runOnThisSha({
        workflow_path: '.github/workflows/push-eas-update.yml',
      }),
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('no ci.yml "Check all jobs pass"');
  });

  it('ignores a success recorded on a different SHA', () => {
    const result = runCli([
      runOnThisSha({
        head_sha: OTHER_SHA,
        started_at: '2026-10-26T13:00:00Z',
      }),
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('no ci.yml "Check all jobs pass"');
  });

  it('blocks a success posted by an app other than GitHub Actions', () => {
    const result = runCli([runOnThisSha({ app: { slug: 'some-other-app' } })]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('GitHub Actions');
  });

  it('blocks when the check run omits head_sha', () => {
    const result = runCli([runOnThisSha({ head_sha: undefined })]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('no ci.yml "Check all jobs pass"');
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

  it('accepts the aggregate job from a ci.yml workflow run', () => {
    const result = runCli({
      workflow_runs: [
        {
          id: 40,
          path: '.github/workflows/ci.yml',
          head_sha: SHA,
          status: 'completed',
          conclusion: 'success',
          run_started_at: '2026-10-26T11:00:00Z',
        },
      ],
      jobs: {
        40: [
          {
            id: 400,
            name: 'Check all jobs pass',
            status: 'completed',
            conclusion: 'success',
            head_sha: SHA,
            started_at: '2026-10-26T11:05:00Z',
            completed_at: '2026-10-26T11:10:00Z',
          },
        ],
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`ci.yml "Check all jobs pass" succeeded on ${SHA}`);
  });

  it('blocks when a newer completed ci.yml run has no aggregate job', () => {
    const result = runCli({
      workflow_runs: [
        {
          id: 40,
          path: '.github/workflows/ci.yml',
          head_sha: SHA,
          status: 'completed',
          conclusion: 'success',
          run_started_at: '2026-10-26T11:00:00Z',
        },
        {
          id: 50,
          path: '.github/workflows/ci.yml',
          head_sha: SHA,
          status: 'completed',
          conclusion: 'success',
          run_started_at: '2026-10-26T12:30:00Z',
        },
      ],
      jobs: {
        40: [
          {
            id: 400,
            name: 'Check all jobs pass',
            status: 'completed',
            conclusion: 'success',
            head_sha: SHA,
            started_at: '2026-10-26T11:05:00Z',
            completed_at: '2026-10-26T11:10:00Z',
          },
        ],
        50: [],
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('missing');
  });

  it('blocks when a newer ci.yml aggregate job is queued and has no start time', () => {
    const result = runCli({
      workflow_runs: [
        {
          id: 40,
          path: '.github/workflows/ci.yml',
          head_sha: SHA,
          status: 'completed',
          conclusion: 'success',
          run_started_at: '2026-10-26T11:00:00Z',
        },
        {
          id: 50,
          path: '.github/workflows/ci.yml',
          head_sha: SHA,
          status: 'queued',
          conclusion: null,
          run_started_at: '2026-10-26T12:30:00Z',
        },
      ],
      jobs: {
        40: [
          {
            id: 400,
            name: 'Check all jobs pass',
            status: 'completed',
            conclusion: 'success',
            head_sha: SHA,
            started_at: '2026-10-26T11:05:00Z',
            completed_at: '2026-10-26T11:10:00Z',
          },
        ],
        50: [
          {
            id: 500,
            name: 'Check all jobs pass',
            status: 'queued',
            conclusion: null,
            head_sha: SHA,
            started_at: null,
            completed_at: null,
          },
        ],
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('queued');
  });

  it('blocks when a newer ci.yml run has not created the aggregate job', () => {
    const result = runCli({
      workflow_runs: [
        {
          id: 40,
          path: '.github/workflows/ci.yml',
          head_sha: SHA,
          status: 'completed',
          conclusion: 'success',
          run_started_at: '2026-10-26T11:00:00Z',
          html_url: 'https://github.com/example/actions/runs/40',
        },
        {
          id: 50,
          path: '.github/workflows/ci.yml',
          head_sha: SHA,
          status: 'in_progress',
          conclusion: null,
          run_started_at: '2026-10-26T12:30:00Z',
          html_url: 'https://github.com/example/actions/runs/50',
        },
      ],
      jobs: {
        40: [
          {
            id: 400,
            name: 'Check all jobs pass',
            status: 'completed',
            conclusion: 'success',
            head_sha: SHA,
            started_at: '2026-10-26T11:05:00Z',
            completed_at: '2026-10-26T11:10:00Z',
          },
        ],
        50: [
          {
            id: 500,
            name: 'lint',
            status: 'in_progress',
            conclusion: null,
            head_sha: SHA,
            started_at: '2026-10-26T12:31:00Z',
          },
        ],
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('in_progress');
  });

  it('ignores a ci.yml run recorded on a different SHA', () => {
    const result = runCli({
      workflow_runs: [
        {
          id: 40,
          path: '.github/workflows/ci.yml',
          head_sha: OTHER_SHA,
          status: 'completed',
          conclusion: 'success',
          run_started_at: '2026-10-26T12:30:00Z',
        },
      ],
      jobs: {
        40: [
          {
            id: 400,
            name: 'Check all jobs pass',
            status: 'completed',
            conclusion: 'success',
            head_sha: OTHER_SHA,
            started_at: '2026-10-26T12:31:00Z',
            completed_at: '2026-10-26T12:40:00Z',
          },
        ],
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('no ci.yml "Check all jobs pass"');
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

  it('blocks an in-progress ci.yml run that overlaps an older success', () => {
    const result = runCli({
      workflow_runs: [
        {
          id: 40,
          path: '.github/workflows/ci.yml',
          head_sha: SHA,
          status: 'completed',
          conclusion: 'success',
          run_started_at: '2026-10-26T11:00:00Z',
        },
        {
          id: 50,
          path: '.github/workflows/ci.yml',
          head_sha: SHA,
          status: 'in_progress',
          conclusion: null,
          run_started_at: '2026-10-26T12:00:00Z',
        },
      ],
      jobs: {
        40: [
          {
            id: 400,
            name: 'Check all jobs pass',
            status: 'completed',
            conclusion: 'success',
            head_sha: SHA,
            started_at: '2026-10-26T12:40:00Z',
            completed_at: '2026-10-26T12:45:00Z',
          },
        ],
        50: [
          {
            id: 500,
            name: 'lint',
            status: 'in_progress',
            conclusion: null,
            head_sha: SHA,
            started_at: '2026-10-26T12:01:00Z',
          },
        ],
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('in_progress');
  });

  it('blocks a newer ci.yml run that failed before the aggregate job existed', () => {
    const result = runCli({
      workflow_runs: [
        {
          id: 40,
          path: '.github/workflows/ci.yml',
          head_sha: SHA,
          status: 'completed',
          conclusion: 'success',
          run_started_at: '2026-10-26T11:00:00Z',
        },
        {
          id: 50,
          path: '.github/workflows/ci.yml',
          head_sha: SHA,
          status: 'completed',
          conclusion: 'failure',
          run_started_at: '2026-10-26T12:10:00Z',
        },
      ],
      jobs: {
        40: [
          {
            id: 400,
            name: 'Check all jobs pass',
            status: 'completed',
            conclusion: 'success',
            head_sha: SHA,
            started_at: '2026-10-26T12:40:00Z',
            completed_at: '2026-10-26T12:45:00Z',
          },
        ],
        50: [],
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('missing');
  });

  it('treats a year-1 queued job start as unset and blocks on that newer run', () => {
    const result = runCli({
      workflow_runs: [
        {
          id: 40,
          path: '.github/workflows/ci.yml',
          head_sha: SHA,
          status: 'completed',
          conclusion: 'success',
          run_started_at: '2026-10-26T11:00:00Z',
        },
        {
          id: 50,
          path: '.github/workflows/ci.yml',
          head_sha: SHA,
          status: 'queued',
          conclusion: null,
          run_started_at: '2026-10-26T12:00:00Z',
        },
      ],
      jobs: {
        40: [
          {
            id: 400,
            name: 'Check all jobs pass',
            status: 'completed',
            conclusion: 'success',
            head_sha: SHA,
            started_at: '2026-10-26T12:40:00Z',
            completed_at: '2026-10-26T12:45:00Z',
          },
        ],
        50: [
          {
            id: 500,
            name: 'Check all jobs pass',
            status: 'queued',
            conclusion: null,
            head_sha: SHA,
            started_at: '0001-01-01T00:00:00Z',
            completed_at: null,
          },
        ],
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('queued');
  });
});

const WORKFLOWS = path.join(__dirname, '../workflows');
const ACCESS_RANK: Record<string, number> = { none: 0, read: 1, write: 2 };

interface JobBlock {
  id: string;
  permissions: Record<string, string> | null;
  uses: string | null;
}

function parsePermissionValue(raw: string): string {
  return raw.replace(/\s+#.*$/, '').trim().replace(/^['"]|['"]$/g, '');
}

function parseWorkflow(yaml: string): {
  workflowPermissions: Record<string, string> | null;
  jobs: JobBlock[];
} {
  const jobs: JobBlock[] = [];
  let workflowPermissions: Record<string, string> | null = null;
  let inWorkflowPermissions = false;
  let seenJobs = false;
  let current: JobBlock | null = null;
  let inJobPermissions = false;

  for (const line of yaml.split('\n')) {
    if (!seenJobs) {
      if (line === 'jobs:' || line.startsWith('jobs:')) {
        seenJobs = true;
        inWorkflowPermissions = false;
        continue;
      }
      if (/^permissions:\s*$/.test(line)) {
        workflowPermissions = {};
        inWorkflowPermissions = true;
        continue;
      }
      if (inWorkflowPermissions && workflowPermissions) {
        const match = line.match(/^  ([A-Za-z0-9_-]+):\s*(.*)$/);
        if (match) {
          workflowPermissions[match[1]] = parsePermissionValue(match[2]);
          continue;
        }
        if (line.trim() === '' || line.trim().startsWith('#')) {
          continue;
        }
        inWorkflowPermissions = false;
      }
      continue;
    }

    const jobMatch = line.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (jobMatch) {
      current = { id: jobMatch[1], permissions: null, uses: null };
      jobs.push(current);
      inJobPermissions = false;
      continue;
    }
    if (!current) {
      continue;
    }
    if (/^    permissions:\s*$/.test(line)) {
      current.permissions = {};
      inJobPermissions = true;
      continue;
    }
    if (inJobPermissions && current.permissions) {
      const perm = line.match(/^      ([A-Za-z0-9_-]+):\s*(.*)$/);
      if (perm) {
        current.permissions[perm[1]] = parsePermissionValue(perm[2]);
        continue;
      }
      if (line.trim() === '' || line.trim().startsWith('#')) {
        continue;
      }
      inJobPermissions = false;
    }
    const uses = line.match(/^    uses:\s*(\.\/\.github\/workflows\/\S+)/);
    if (uses) {
      current.uses = uses[1].replace(/['"]/g, '');
    }
  }

  return { workflowPermissions, jobs };
}

function effectivePermissions(job: JobBlock, workflowPermissions: Record<string, string> | null): Record<string, string> {
  return job.permissions ?? workflowPermissions ?? {};
}

function requiredPermissions(calleeFile: string): Record<string, string> {
  const parsed = parseWorkflow(readFileSync(path.join(WORKFLOWS, calleeFile), 'utf8'));
  const required: Record<string, string> = {};
  for (const job of parsed.jobs) {
    const permissions = effectivePermissions(job, parsed.workflowPermissions);
    for (const [scope, access] of Object.entries(permissions)) {
      const rank = ACCESS_RANK[access] ?? 0;
      const current = ACCESS_RANK[required[scope] ?? ''] ?? 0;
      if (rank > current) {
        required[scope] = access;
      }
    }
  }
  return required;
}

function callersOf(calleeFile: string): { workflow: string; job: string; permissions: Record<string, string> }[] {
  const needle = `./.github/workflows/${calleeFile}`;
  const callers: { workflow: string; job: string; permissions: Record<string, string> }[] = [];
  for (const name of readdirSync(WORKFLOWS)) {
    if (!name.endsWith('.yml') && !name.endsWith('.yaml')) {
      continue;
    }
    const parsed = parseWorkflow(readFileSync(path.join(WORKFLOWS, name), 'utf8'));
    for (const job of parsed.jobs) {
      if (job.uses !== needle) {
        continue;
      }
      callers.push({
        workflow: name,
        job: job.id,
        permissions: effectivePermissions(job, parsed.workflowPermissions),
      });
    }
  }
  return callers;
}

function missingGrants(caller: Record<string, string>, required: Record<string, string>): string[] {
  const missing: string[] = [];
  for (const [scope, access] of Object.entries(required)) {
    const have = ACCESS_RANK[caller[scope] ?? ''] ?? 0;
    const need = ACCESS_RANK[access] ?? 0;
    if (have < need) {
      missing.push(`${scope}: ${access}`);
    }
  }
  return missing;
}

describe('OTA reusable workflow permissions', () => {
  it.each(['push-eas-update.yml', 'eas-update-platform.yml'])(
    'every caller of %s grants the permissions its jobs request',
    (callee) => {
      const required = requiredPermissions(callee);
      const callers = callersOf(callee);

      expect(callers.length).toBeGreaterThan(0);
      expect(Object.keys(required).length).toBeGreaterThan(0);
      for (const caller of callers) {
        expect({
          caller: `${caller.workflow}#${caller.job}`,
          missing: missingGrants(caller.permissions, required),
        }).toEqual({
          caller: `${caller.workflow}#${caller.job}`,
          missing: [],
        });
      }
    },
  );

  it('re-reads ci.yml as the first production step of the EAS push job', () => {
    const platform = readFileSync(path.join(WORKFLOWS, 'eas-update-platform.yml'), 'utf8');
    const production = readFileSync(path.join(WORKFLOWS, 'runway-ota-production.yml'), 'utf8');
    const steps = platform.slice(platform.indexOf('    steps:'));
    const gateAt = steps.indexOf('require-check-all-jobs-pass.mts');
    const pushAt = steps.indexOf('Build & Push EAS Update via build.sh');

    expect(gateAt).toBeGreaterThan(-1);
    expect(gateAt).toBeLessThan(pushAt);
    expect(steps.indexOf("inputs.channel == 'production'")).toBeLessThan(gateAt);
    expect(production).toContain('eas-update-platform.yml re-reads ci.yml');
    expect(production).not.toContain('immediately before the EAS push');
  });
});
