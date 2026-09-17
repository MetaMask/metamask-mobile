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
};

type Workflow = {
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
  >;
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
});
