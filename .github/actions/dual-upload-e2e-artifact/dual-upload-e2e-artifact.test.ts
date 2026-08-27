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
  inputs: Record<string, { required?: boolean }>;
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

  it('uploads to GitHub once without retry orchestration', () => {
    const actionMetadata = loadActionMetadata();
    const githubUploadSteps = actionMetadata.runs.steps.filter(
      (step) => step.uses === 'actions/upload-artifact@v4',
    );

    expect(githubUploadSteps).toHaveLength(1);
    expect(githubUploadSteps[0]).toMatchObject({
      id: 'gh-1',
      name: 'Upload to GitHub',
    });
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
