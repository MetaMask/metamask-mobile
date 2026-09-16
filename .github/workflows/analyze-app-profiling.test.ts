import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const WORKFLOW_PATH = path.join(__dirname, 'analyze-app-profiling.yml');

type WorkflowStep = {
  name?: string;
  env?: Record<string, string>;
  run?: string;
};

type Workflow = {
  on: {
    schedule: { cron: string }[];
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
  it('runs once each day at 08:00 UTC', () => {
    const workflow = loadWorkflow();

    const schedules = workflow.on.schedule;

    expect(schedules).toStrictEqual([{ cron: '0 8 * * *' }]);
    expect(workflow.jobs.analyze.if).toContain(
      "github.event_name == 'schedule'",
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

  it('analyzes the preceding 24 hours for a scheduled run', () => {
    const workflow = loadWorkflow();
    const analysisStep = workflow.jobs.analyze.steps.find(
      (step) => step.name === 'Analyze app profiling',
    );

    const command = analysisStep?.run ?? '';

    expect(analysisStep?.env?.EVENT_NAME).toBe('${{ github.event_name }}');
    expect(command).toContain('if [ \"${EVENT_NAME}\" = \"schedule\" ]; then');
    expect(command).toContain('ARGS+=(--lookback-hours 24)');
  });

  it('keeps manual lookback and run-id selection', () => {
    const workflow = loadWorkflow();
    const analysisStep = workflow.jobs.analyze.steps.find(
      (step) => step.name === 'Analyze app profiling',
    );

    const command = analysisStep?.run ?? '';

    expect(command).toContain('elif [ -n \"${LOOKBACK_HOURS}\" ]; then');
    expect(command).toContain('ARGS+=(--lookback-hours \"${LOOKBACK_HOURS}\")');
    expect(command).toContain('elif [ -n \"${RUN_ID}\" ]; then');
    expect(command).toContain('ARGS+=(--run \"${RUN_ID}\")');
  });
});
