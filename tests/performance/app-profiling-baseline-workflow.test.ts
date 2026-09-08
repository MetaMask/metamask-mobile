/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../..');

const readRepoFile = (relativePath: string): string =>
  fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');

const getBaselineWorkflow = (): string => {
  const source = readRepoFile('tests/scripts/diff-app-profiling.mjs');
  const match = source.match(/const BASELINE_WORKFLOW = '([^']+)';/);

  if (!match) {
    throw new Error('BASELINE_WORKFLOW not found in diff-app-profiling.mjs');
  }

  return match[1];
};

describe('app profiling baseline workflow', () => {
  it('points at a workflow that exists', () => {
    const workflowPath = path.join(
      REPO_ROOT,
      '.github/workflows',
      getBaselineWorkflow(),
    );

    expect(fs.existsSync(workflowPath)).toBe(true);
  });

  it('points at a workflow that produces listable runs on main', () => {
    // `gh run list --workflow <file>` only returns runs of workflows with their
    // own triggers. A `workflow_call`-only workflow runs as jobs of its caller,
    // so using one as baseline source silently yields zero candidate runs.
    const workflow = readRepoFile(`.github/workflows/${getBaselineWorkflow()}`);
    const triggers = workflow.slice(
      workflow.indexOf('on:'),
      workflow.indexOf('jobs:'),
    );

    expect(triggers).toContain('schedule:');
    expect(triggers).toContain('workflow_dispatch:');
    expect(triggers).not.toContain('workflow_call:');
  });

  it('shares the baseline workflow with the PR comment generator', () => {
    const commentGenerator = readRepoFile(
      'tests/scripts/generate-performance-pr-comment.mjs',
    );

    expect(commentGenerator).toContain('BASELINE_WORKFLOW');
    expect(commentGenerator).not.toMatch(/'run-performance-e2e[^']*\.yml'/);
  });
});
