import { spawnSync } from 'child_process';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

const SCRIPT_PATH = path.join(__dirname, 'dual-upload-e2e-artifact.mjs');
const ACTION_PATH = path.join(__dirname, 'action.yml');

type ActionStep = {
  id?: string;
  if?: string;
  name?: string;
  uses?: string;
};

type ActionMetadata = {
  inputs: Record<string, { required?: boolean; default?: string }>;
  runs: {
    steps: ActionStep[];
  };
};

const runScript = (env: Record<string, string>) =>
  spawnSync(process.execPath, [SCRIPT_PATH, 'require-both-stores'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
    },
  });

const loadActionMetadata = () =>
  yaml.load(fs.readFileSync(ACTION_PATH, 'utf8')) as ActionMetadata;

const getStepById = (id: string) => {
  const actionMetadata = loadActionMetadata();

  return actionMetadata.runs.steps.find((step) => step.id === id);
};

const getStepByName = (name: string) => {
  const actionMetadata = loadActionMetadata();

  return actionMetadata.runs.steps.find((step) => step.name === name);
};

describe('dual-upload-e2e-artifact', () => {
  it('requires callers to pass runner-provider', () => {
    const actionMetadata = loadActionMetadata();

    expect(actionMetadata.inputs['runner-provider'].required).toBe(true);
  });

  it('runs the first Namespace upload only for namespace providers', () => {
    const namespaceUpload = getStepById('ns-1');

    expect(namespaceUpload).toMatchObject({
      if: "${{ contains(inputs.runner-provider, 'namespace') }}",
      uses: 'namespace-actions/upload-artifact@f6ccaacc655aec41b93af180d1d7eef21af862d2',
    });
  });

  it('retries Namespace after the first Namespace failure', () => {
    const retryWait = getStepByName('Wait before Namespace retry (attempt 2)');
    const retryUpload = getStepById('ns-2');

    expect(retryWait?.if).toBe(
      "${{ contains(inputs.runner-provider, 'namespace') && steps.ns-1.outcome == 'failure' }}",
    );
    expect(retryUpload?.if).toBe(
      "${{ contains(inputs.runner-provider, 'namespace') && steps.ns-1.outcome == 'failure' }}",
    );
  });

  it('stops Namespace retries unless the first two attempts fail', () => {
    const retryWait = getStepByName('Wait before Namespace retry (attempt 3)');
    const retryUpload = getStepById('ns-3');

    expect(retryWait?.if).toBe(
      "${{ contains(inputs.runner-provider, 'namespace') && steps.ns-1.outcome == 'failure' && steps.ns-2.outcome == 'failure' }}",
    );
    expect(retryUpload?.if).toBe(
      "${{ contains(inputs.runner-provider, 'namespace') && steps.ns-1.outcome == 'failure' && steps.ns-2.outcome == 'failure' }}",
    );
  });

  it('skips Namespace upload attempts for non-Namespace providers', () => {
    const actionMetadata = loadActionMetadata();
    const namespaceSteps = actionMetadata.runs.steps.filter((step) =>
      step.name?.includes('Namespace'),
    );

    for (const namespaceStep of namespaceSteps) {
      expect(namespaceStep.if).toContain(
        "contains(inputs.runner-provider, 'namespace')",
      );
    }
  });

  it('retries the GitHub upload after the first GitHub failure', () => {
    const githubUploadSteps = loadActionMetadata().runs.steps.filter(
      (step) => step.uses === 'actions/upload-artifact@v7',
    );

    expect(githubUploadSteps.map((step) => step.id)).toStrictEqual([
      'gh-1',
      'gh-2',
      'gh-3',
    ]);
    expect(githubUploadSteps[0]).toMatchObject({
      name: 'Upload to GitHub (attempt 1)',
      if: "${{ inputs.skip-github != 'true' || !contains(inputs.runner-provider, 'namespace') }}",
    });
    expect(githubUploadSteps[1]?.if).toBe(
      "${{ steps.gh-1.outcome == 'failure' }}",
    );
    expect(githubUploadSteps[2]?.if).toBe(
      "${{ steps.gh-1.outcome == 'failure' && steps.gh-2.outcome == 'failure' }}",
    );
    for (const step of githubUploadSteps) {
      expect(step?.with?.path).toBe(
        "${{ contains(inputs.runner-provider, 'namespace') && inputs.github-path != '' && inputs.github-path || inputs.path }}",
      );
    }
  });

  it('waits before each GitHub retry', () => {
    expect(getStepByName('Wait before GitHub retry (attempt 2)')?.if).toBe(
      "${{ steps.gh-1.outcome == 'failure' }}",
    );
    expect(getStepByName('Wait before GitHub retry (attempt 3)')?.if).toBe(
      "${{ steps.gh-1.outcome == 'failure' && steps.gh-2.outcome == 'failure' }}",
    );
  });

  it('exposes github-required as an optional input defaulting to true', () => {
    const actionMetadata = loadActionMetadata();

    expect(actionMetadata.inputs['github-required']).toMatchObject({
      required: false,
    });
    expect(actionMetadata.inputs['github-required'].default).toBe('true');
  });

  it('exposes github-path as an optional input defaulting to empty', () => {
    const actionMetadata = loadActionMetadata();

    expect(actionMetadata.inputs['github-path']).toMatchObject({
      required: false,
    });
    expect(actionMetadata.inputs['github-path'].default).toBe('');
  });

  it('exposes skip-github as an optional input defaulting to false', () => {
    const actionMetadata = loadActionMetadata();

    expect(actionMetadata.inputs['skip-github']).toMatchObject({
      required: false,
    });
    expect(actionMetadata.inputs['skip-github'].default).toBe('false');
  });

  it('requires both stores for the namespace provider', () => {
    const result = runScript({
      RUNNER_PROVIDER: 'namespace',
      NS_1: 'success',
      GH_1: 'success',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Uploaded to Namespace and GitHub stores');
  });

  it('requires only Namespace when skip-github is set on a namespace provider', () => {
    const result = runScript({
      RUNNER_PROVIDER: 'namespace',
      SKIP_GITHUB: 'true',
      NS_1: 'success',
      GH_1: '',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Uploaded to Namespace store');
  });

  it('fails skip-github namespace upload when Namespace never succeeds', () => {
    const result = runScript({
      RUNNER_PROVIDER: 'namespace',
      SKIP_GITHUB: 'true',
      NS_1: 'failure',
      NS_2: 'failure',
      NS_3: 'failure',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Dual artifact upload failed (Namespace=false)',
    );
  });

  it('still requires GitHub on current even when skip-github is set', () => {
    const result = runScript({
      RUNNER_PROVIDER: 'current',
      SKIP_GITHUB: 'true',
      GH_1: 'success',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Uploaded to GitHub store');
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

  describe('github-required=false', () => {
    it('passes with a warning when GitHub fails after retries but Namespace succeeded', () => {
      const result = runScript({
        RUNNER_PROVIDER: 'namespace',
        GITHUB_REQUIRED: 'false',
        NS_1: 'success',
        GH_1: 'failure',
        GH_2: 'failure',
        GH_3: 'failure',
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain(
        '::warning::Optional GitHub artifact upload failed after retries',
      );
      expect(result.stdout).toContain('Uploaded to Namespace store');
    });

    it('does not warn when GitHub succeeded on a retry', () => {
      const result = runScript({
        RUNNER_PROVIDER: 'namespace',
        GITHUB_REQUIRED: 'false',
        NS_1: 'success',
        GH_1: 'failure',
        GH_2: 'success',
      });

      expect(result.status).toBe(0);
      expect(result.stdout).not.toContain('::warning::');
    });

    it('still fails when Namespace never succeeds', () => {
      const result = runScript({
        RUNNER_PROVIDER: 'namespace',
        GITHUB_REQUIRED: 'false',
        NS_1: 'failure',
        NS_2: 'failure',
        NS_3: 'failure',
        GH_1: 'success',
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        'Dual artifact upload failed (Namespace=false)',
      );
    });

    it('still requires GitHub on a non-Namespace provider', () => {
      const result = runScript({
        RUNNER_PROVIDER: 'current',
        GITHUB_REQUIRED: 'false',
        GH_1: 'failure',
        GH_2: 'failure',
        GH_3: 'failure',
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        'Dual artifact upload failed (GitHub=false)',
      );
    });
  });

  it('requires GitHub by default so a GitHub failure still fails the step', () => {
    const result = runScript({
      RUNNER_PROVIDER: 'namespace',
      NS_1: 'success',
      GH_1: 'failure',
      GH_2: 'failure',
      GH_3: 'failure',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Dual artifact upload failed (Namespace=true GitHub=false)',
    );
  });

  it('accepts a GitHub upload that only succeeded on its last retry', () => {
    const result = runScript({
      RUNNER_PROVIDER: 'namespace',
      NS_1: 'success',
      GH_1: 'failure',
      GH_2: 'failure',
      GH_3: 'success',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Uploaded to Namespace and GitHub stores');
  });

  it('names the store in the retry-wait warning', () => {
    const result = spawnSync(process.execPath, [SCRIPT_PATH, 'retry-wait'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        ATTEMPT: '2',
        STORE_NAME: 'GitHub',
        RETRY_WAIT_SECONDS: '0',
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('::warning::GitHub upload failed');
  });
});
