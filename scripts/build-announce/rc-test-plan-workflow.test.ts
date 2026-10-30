import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const BUILD_WORKFLOW_PATH = path.join(
  __dirname,
  '../../.github/workflows/build-rc-auto.yml',
);
const TEST_PLAN_WORKFLOW_PATH = path.join(
  __dirname,
  '../../.github/workflows/rc-ai-test-plan.yml',
);

interface WorkflowStep {
  name?: string;
  run?: string;
  env?: Record<string, string>;
  uses?: string;
  with?: Record<string, unknown>;
}

interface WorkflowJob {
  name?: string;
  needs?: string | string[];
  if?: string;
  environment?: string;
  permissions?: Record<string, string>;
  uses?: string;
  steps?: WorkflowStep[];
}

interface Workflow {
  on?: {
    workflow_dispatch?: { inputs?: Record<string, { required?: boolean }> };
    push?: unknown;
  };
  concurrency?: { group?: string; 'cancel-in-progress'?: boolean };
  jobs: Record<string, WorkflowJob>;
}

const loadWorkflow = (workflowPath: string): Workflow =>
  yaml.load(fs.readFileSync(workflowPath, 'utf8')) as Workflow;

const needsOf = (job: WorkflowJob): string[] => {
  if (!job.needs) {
    return [];
  }
  return Array.isArray(job.needs) ? job.needs : [job.needs];
};

const AI_KEY_ENV = [
  'E2E_CLAUDE_API_KEY',
  'E2E_OPENAI_API_KEY',
  'E2E_GEMINI_API_KEY',
];

describe('Auto RC builds do not wait on the AI test plan', () => {
  const workflow = loadWorkflow(BUILD_WORKFLOW_PATH);

  it('posts the RC comment without provider keys or the test plan artifact', () => {
    const commentJob = workflow.jobs['post-rc-build-comment'];
    const announceStep = commentJob.steps?.find((step) =>
      step.run?.includes('scripts/build-announce/index.ts'),
    );

    expect(commentJob.environment).toBeUndefined();
    expect(commentJob.permissions).toEqual({
      'pull-requests': 'write',
      contents: 'read',
    });
    expect(announceStep?.env).toBeDefined();
    for (const key of AI_KEY_ENV) {
      expect(announceStep?.env).not.toHaveProperty(key);
    }

    const uploadsPlan = commentJob.steps?.some(
      (step) =>
        step.uses?.startsWith('actions/upload-artifact') &&
        step.with?.path === 'release-test-plan.json',
    );
    expect(uploadsPlan).toBe(false);
  });

  it('dispatches the test plan only after the comment job succeeds', () => {
    const dispatchJob = workflow.jobs['dispatch-rc-ai-test-plan'];
    const dispatchStep = dispatchJob.steps?.find((step) =>
      step.run?.includes('rc-ai-test-plan.yml'),
    );

    expect(needsOf(dispatchJob)).toContain('post-rc-build-comment');
    expect(dispatchJob.if).toContain(
      "needs.post-rc-build-comment.result == 'success'",
    );
    expect(dispatchJob.permissions?.actions).toBe('write');
    expect(dispatchStep?.run).toContain('gh workflow run rc-ai-test-plan.yml');
    expect(dispatchStep?.env).not.toHaveProperty('E2E_CLAUDE_API_KEY');
  });

  it('keeps platform builds and Slack off the test plan job', () => {
    for (const jobName of [
      'trigger-ios-rc-build',
      'trigger-android-rc-build',
      'repack-ios-rc-build',
      'repack-android-rc-build',
      'slack-notification',
    ]) {
      const needs = needsOf(workflow.jobs[jobName]);
      expect(needs).not.toContain('post-rc-build-comment');
      expect(needs).not.toContain('dispatch-rc-ai-test-plan');
    }

    const usesTestPlanWorkflow = Object.values(workflow.jobs).some(
      (job) => job.uses === './.github/workflows/rc-ai-test-plan.yml',
    );
    expect(usesTestPlanWorkflow).toBe(false);
  });
});

describe('RC AI test plan workflow', () => {
  const workflow = loadWorkflow(TEST_PLAN_WORKFLOW_PATH);

  it('is dispatched on its own and cancels a stale plan for the same branch', () => {
    expect(workflow.on?.push).toBeUndefined();
    expect(workflow.on?.workflow_dispatch?.inputs).toMatchObject({
      pr_number: { required: true },
      semver: { required: true },
      ios_build_number: { required: true },
      android_build_number: { required: true },
      source_sha: { required: true },
    });
    expect(workflow.concurrency).toMatchObject({
      'cancel-in-progress': true,
    });
  });

  it('holds the provider keys and edits the RC comment', () => {
    const job = workflow.jobs['generate-and-post'];
    const generateStep = job.steps?.find((step) =>
      step.run?.includes('scripts/build-announce/post-test-plan.ts'),
    );

    expect(job.environment).toBe('release-ci');
    expect(job.permissions).toMatchObject({
      'pull-requests': 'write',
      contents: 'read',
    });
    expect(generateStep?.env).toMatchObject({
      E2E_CLAUDE_API_KEY: '${{ secrets.E2E_CLAUDE_API_KEY }}',
      E2E_OPENAI_API_KEY: '${{ secrets.E2E_OPENAI_API_KEY }}',
      E2E_GEMINI_API_KEY: '${{ secrets.E2E_GEMINI_API_KEY }}',
    });
  });
});
