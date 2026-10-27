import { execFileSync } from 'child_process';
import path from 'path';

const SCRIPT = path.join(__dirname, 'plan-ota-pull-request.mts');

function plan(prs: unknown[]): { exitCode: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PRS_JSON: JSON.stringify(prs),
        DESIRED_BASE: 'ota-base/v8.15.0',
        SEMVER: '8.15.1',
      },
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

describe('plan-ota-pull-request', () => {
  it('opens a pull request when the branch has none', () => {
    const result = plan([]);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).action).toBe('create');
  });

  it('retargets the stable OTA release pull request', () => {
    const result = plan([
      {
        number: 42,
        baseRefName: 'stable',
        state: 'OPEN',
        title: 'release: 8.15.1 (OTA)',
      },
    ]);
    const body = JSON.parse(result.stdout) as { action: string; prNumber: number };

    expect(result.exitCode).toBe(0);
    expect(body).toMatchObject({ action: 'retarget', prNumber: 42, fromBase: 'stable' });
  });

  it('keeps the ota-base pull request and closes the stable duplicate', () => {
    const result = plan([
      {
        number: 9,
        baseRefName: 'stable',
        state: 'OPEN',
        title: 'release: 8.15.1 (OTA)',
      },
      {
        number: 4,
        baseRefName: 'ota-base/v8.15.0',
        state: 'OPEN',
        title: 'release: 8.15.1 (OTA)',
      },
    ]);
    const body = JSON.parse(result.stdout) as { action: string; prNumber: number; closePrNumbers: number[] };

    expect(body).toMatchObject({ action: 'use', prNumber: 4, closePrNumbers: [9] });
  });

  it('closes an extra bot pull request that already targets the pin', () => {
    const result = plan([
      {
        number: 4,
        baseRefName: 'ota-base/v8.15.0',
        state: 'OPEN',
        title: 'release: 8.15.1 (OTA)',
      },
      {
        number: 11,
        baseRefName: 'ota-base/v8.15.0',
        state: 'OPEN',
        title: 'release: 8.15.1 (OTA)',
      },
    ]);
    const body = JSON.parse(result.stdout) as { action: string; prNumber: number; closePrNumbers: number[] };

    expect(body).toMatchObject({ action: 'use', prNumber: 4, closePrNumbers: [11] });
  });

  it('fails closed when the only pin pull request has a different title', () => {
    const result = plan([
      {
        number: 4,
        baseRefName: 'ota-base/v8.15.0',
        state: 'OPEN',
        title: 'fix: something else',
      },
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('PR #4');
    expect(result.stderr).toContain('fix: something else');
  });

  it('fails closed when a second pull request targets the pin with another title', () => {
    const result = plan([
      {
        number: 4,
        baseRefName: 'ota-base/v8.15.0',
        state: 'OPEN',
        title: 'release: 8.15.1 (OTA)',
      },
      {
        number: 5,
        baseRefName: 'ota-base/v8.15.0',
        state: 'OPEN',
        title: 'fix: something else',
      },
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('PR #5');
  });

  it('fails closed when an unrelated pull request is open from the same head', () => {
    const result = plan([
      {
        number: 3,
        baseRefName: 'main',
        state: 'OPEN',
        title: 'fix: something else',
      },
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('PR #3');
    expect(result.stderr).toContain('main');
  });

  it('ignores closed pull requests', () => {
    const result = plan([
      {
        number: 1,
        baseRefName: 'stable',
        state: 'CLOSED',
        title: 'release: 8.15.1 (OTA)',
      },
    ]);

    expect(JSON.parse(result.stdout).action).toBe('create');
  });
});
