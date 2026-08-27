import { spawnSync } from 'child_process';
import path from 'path';

const SCRIPT_PATH = path.join(__dirname, 'dual-upload-artifact.mjs');

const runScript = (env: Record<string, string>) =>
  spawnSync(process.execPath, [SCRIPT_PATH, 'require-both-stores'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
    },
  });

describe('dual-upload-artifact', () => {
  it('requires both stores for the namespace provider', () => {
    const result = runScript({
      RUNNER_PROVIDER: 'namespace',
      NS_1: 'success',
      GH_1: 'success',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Uploaded to Namespace and GitHub stores');
  });

  it('requires both stores for a namespace runner label', () => {
    const result = runScript({
      RUNNER_PROVIDER: 'namespace-profile-metamask-android-build',
      NS_1: 'success',
      GH_1: 'success',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Uploaded to Namespace and GitHub stores');
  });

  it('fails a namespace runner label when Namespace never uploads', () => {
    const result = runScript({
      RUNNER_PROVIDER: 'namespace-profile-metamask-ios-e2e',
      NS_1: 'failure',
      NS_2: 'failure',
      NS_3: 'failure',
      GH_1: 'success',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Dual artifact upload failed (Namespace=false GitHub=true)',
    );
  });

  it('requires only GitHub for the current provider', () => {
    const result = runScript({
      RUNNER_PROVIDER: 'current',
      GH_1: 'success',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Uploaded to GitHub store');
  });

  it('fails the current provider when GitHub upload fails', () => {
    const result = runScript({
      RUNNER_PROVIDER: 'current',
      GH_1: 'failure',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Dual artifact upload failed (GitHub=false)',
    );
  });
});
