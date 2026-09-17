import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const WORKFLOW_PATH = path.join(
  __dirname,
  '../../../workflows/analyze-app-profiling.yml',
);

type WorkflowStep = {
  name?: string;
  env?: Record<string, string>;
  run?: string;
  if?: string;
  'continue-on-error'?: boolean;
};

type Workflow = {
  concurrency?: { group: string; 'cancel-in-progress'?: boolean };
  on: {
    schedule?: { cron: string }[];
    pull_request?: unknown;
    workflow_run?: { workflows: string[]; types: string[] };
    workflow_dispatch: { inputs: Record<string, unknown> };
  };
  jobs: Record<
    string,
    {
      if?: string;
      steps: WorkflowStep[];
    }
  > & {
    'report-upstream-failure': { if?: string; steps: WorkflowStep[] };
  };
};

const loadWorkflow = () =>
  yaml.load(fs.readFileSync(WORKFLOW_PATH, 'utf8')) as Workflow;

describe('Analyze App Profiling triggers', () => {
  it('never runs on a schedule or a pull request', () => {
    const workflow = loadWorkflow();

    expect(workflow.on).not.toHaveProperty('schedule');
    expect(workflow.on).not.toHaveProperty('pull_request');
    expect(workflow.on.workflow_dispatch).toBeDefined();
  });

  it('chains from a finished performance suite', () => {
    const workflow = loadWorkflow();

    expect(workflow.on.workflow_run?.workflows).toStrictEqual([
      'Run Performance E2E Tests Manually',
    ]);
    expect(workflow.on.workflow_run?.types).toStrictEqual(['completed']);
  });

  it('chains only successful, manually dispatched performance runs', () => {
    const workflow = loadWorkflow();

    // The performance suite also runs on a 6-hourly cron; chaining those
    // would produce four unsolicited digests a day.
    const condition = workflow.jobs.analyze.if ?? '';

    expect(condition).toContain(
      "github.event.workflow_run.conclusion == 'success'",
    );
    expect(condition).toContain(
      "github.event.workflow_run.event == 'workflow_dispatch'",
    );
  });

  it('collapses a chain and a dispatch of the same performance run', () => {
    const workflow = loadWorkflow();

    expect(workflow.concurrency?.group).toBe(
      'analyze-app-profiling-${{ github.event.workflow_run.id || github.event.inputs.run_id || github.run_id }}',
    );
  });

  it('analyzes the performance run that triggered the chain', () => {
    const workflow = loadWorkflow();
    const analysisStep = workflow.jobs.analyze.steps.find(
      (step) => step.name === 'Analyze app profiling',
    );

    expect(analysisStep?.env?.RUN_ID).toBe(
      '${{ inputs.run_id || github.event.workflow_run.id }}',
    );
  });

  it('keeps the manual workflow trigger and its inputs', () => {
    const workflow = loadWorkflow();

    const inputs = workflow.on.workflow_dispatch.inputs;

    expect(inputs).toHaveProperty('run_id');
    expect(inputs).toHaveProperty('lookback_hours');
    expect(inputs).toHaveProperty('scenario');
    expect(inputs).toHaveProperty('skip_ai');
    expect(inputs).toHaveProperty('post_to_slack');
  });

  it('keeps manual lookback and run-id selection', () => {
    const workflow = loadWorkflow();
    const analysisStep = workflow.jobs.analyze.steps.find(
      (step) => step.name === 'Analyze app profiling',
    );

    const command = analysisStep?.run ?? '';

    expect(command).not.toContain('schedule');
    expect(command).toContain('if [ -n \"${LOOKBACK_HOURS}\" ]; then');
    expect(command).toContain('ARGS+=(--lookback-hours \"${LOOKBACK_HOURS}\")');
    expect(command).toContain('elif [ -n \"${RUN_ID}\" ]; then');
    expect(command).toContain('ARGS+=(--run \"${RUN_ID}\")');
  });

  it('posts Slack on a chained run and on an opted-in dispatch', () => {
    const workflow = loadWorkflow();
    const slackStep = workflow.jobs.analyze.steps.find(
      (step) => step.name === 'Post Slack summary',
    );

    expect(slackStep?.if).toContain('inputs.post_to_slack');
    expect(slackStep?.if).toContain(
      "github.event_name != 'workflow_dispatch'",
    );
    expect(slackStep?.env?.SLACK_TARGET).toBe('UEYQL2PEV');
  });

  it('reports an unsuccessful performance run instead of going quiet', () => {
    const workflow = loadWorkflow();
    const job = workflow.jobs['report-upstream-failure'];

    const condition = job.if ?? '';

    expect(condition).toContain(
      "github.event.workflow_run.conclusion != 'success'",
    );
    // A failed scheduled suite must stay as silent as a successful one.
    expect(condition).toContain(
      "github.event.workflow_run.event == 'workflow_dispatch'",
    );

    const notice = job.steps.find(
      (step) => step.name === 'Post Slack failure notice',
    );

    expect(notice?.env?.SLACK_TARGET).toBe('UEYQL2PEV');
    // The link must point at the failed performance run, not this reporter.
    expect(notice?.env?.GITHUB_RUN_URL).toBe(
      '${{ github.event.workflow_run.html_url }}',
    );
    expect(notice?.env?.GITHUB_RUN_LABEL).toBe('Failed performance run');
    expect(notice?.run).toContain('did not run');
  });

  it('reports a failed analysis job with a link to it', () => {
    const workflow = loadWorkflow();
    const failureStep = workflow.jobs.analyze.steps.find(
      (step) => step.name === 'Post Slack analysis failure',
    );

    expect(failureStep?.if).toBe('failure()');
    // A Slack outage must not turn a failed analysis into a failed workflow.
    expect(failureStep?.['continue-on-error']).toBe(true);
    expect(failureStep?.env?.SLACK_TARGET).toBe('UEYQL2PEV');
    expect(failureStep?.env?.GITHUB_RUN_URL).toContain(
      'actions/runs/${{ github.run_id }}',
    );
    expect(failureStep?.env?.GITHUB_RUN_LABEL).toBe('Failed analysis job');
    expect(failureStep?.run).toContain('analysis failed');
  });
});
