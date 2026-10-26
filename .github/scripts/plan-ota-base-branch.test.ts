import { execFileSync } from 'child_process';
import path from 'path';

const SCRIPT = path.join(__dirname, 'plan-ota-base-branch.mts');
const TAG = 'abc123abc123abc123abc123abc123abc123abc1';
const OTHER = 'def456def456def456def456def456def456def4';

function plan(env: Record<string, string>): { exitCode: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT], {
      encoding: 'utf8',
      env: { ...process.env, ...env },
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

describe('plan-ota-base-branch', () => {
  const baseEnv = {
    PACKAGE_VERSION: '8.15.0',
    TAG_SHA: TAG,
    BASE_BRANCH_SHA: '',
    TAG_IS_ANCESTOR: 'true',
  };

  it('creates the pin when the base branch is missing', () => {
    const result = plan(baseEnv);
    const body = JSON.parse(result.stdout) as { action: string; branch: string; sha: string; tag: string };

    expect(result.exitCode).toBe(0);
    expect(body).toMatchObject({
      action: 'create',
      branch: 'ota-base/v8.15.0',
      sha: TAG,
      tag: 'v8.15.0',
    });
  });

  it('reuses the pin when it already matches the tag', () => {
    const result = plan({ ...baseEnv, BASE_BRANCH_SHA: TAG });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).action).toBe('reuse');
  });

  it('fails when the release tag does not exist', () => {
    const result = plan({ ...baseEnv, TAG_SHA: '' });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('v8.15.0');
    expect(result.stderr).toContain('does not exist');
  });

  it('fails when the OTA branch does not contain the tag', () => {
    const result = plan({ ...baseEnv, TAG_IS_ANCESTOR: 'false' });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('does not contain');
  });

  it('fails when the pin has moved off the tag', () => {
    const result = plan({ ...baseEnv, BASE_BRANCH_SHA: OTHER });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('refusing to move the pin');
  });

  it('fails when package.json version is not strict semver', () => {
    const result = plan({ ...baseEnv, PACKAGE_VERSION: '08.15.0' });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('strict X.Y.Z');
  });
});
