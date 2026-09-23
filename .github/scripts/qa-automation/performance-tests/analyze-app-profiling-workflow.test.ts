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
  uses?: string;
  with?: Record<string, string | boolean | number>;
};

type Workflow = {
  concurrency?: { group: string; 'cancel-in-progress'?: boolean };
  env?: Record<string, string>;
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
      needs?: string | string[];
      strategy?: { matrix?: string; 'fail-fast'?: boolean };
      steps: WorkflowStep[];
    }
  > & {
    'report-upstream-failure': { if?: string; steps: WorkflowStep[] };
  };
};

const loadWorkflow = () =>
  yaml.load(fs.readFileSync(WORKFLOW_PATH, 'utf8')) as Workflow;

describe('Analyze App Profiling triggers', () => {
  it('does not run on a pull request', () => {
    const workflow = loadWorkflow();

    expect(workflow.on).not.toHaveProperty('pull_request');
    expect(workflow.on.workflow_dispatch).toBeDefined();
  });

  it('runs the weekly conclusions job on Monday', () => {
    const workflow = loadWorkflow();

    expect(workflow.on.schedule).toStrictEqual([{ cron: '0 9 * * 1' }]);
    expect(workflow.jobs.analyze.if).toContain(
      "github.event_name == 'schedule'",
    );
  });

  it('chains from a finished performance suite', () => {
    const workflow = loadWorkflow();

    expect(workflow.on.workflow_run?.workflows).toStrictEqual([
      'Run Performance E2E Tests Manually',
    ]);
    expect(workflow.on.workflow_run?.types).toStrictEqual(['completed']);
  });

  it('chains successful scheduled and manually dispatched performance runs', () => {
    const workflow = loadWorkflow();

    const condition = workflow.jobs.analyze.if ?? '';

    expect(condition).toContain(
      "github.event.workflow_run.conclusion == 'success'",
    );
    expect(condition).toContain(
      "github.event.workflow_run.event == 'workflow_dispatch'",
    );
    expect(condition).toContain(
      "github.event.workflow_run.event == 'schedule'",
    );
  });

  it('collapses a chain and a dispatch of the same performance run', () => {
    const workflow = loadWorkflow();

    expect(workflow.concurrency?.group).toContain('weekly');
    expect(workflow.concurrency?.group).toContain(
      'github.event.workflow_run.id',
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
    expect(inputs).toHaveProperty('weekly');
    expect(inputs).toHaveProperty('max_runs_per_week');
    expect(inputs).toHaveProperty('max_analysis_minutes');
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

    expect(command).toContain('if [ "${WEEKLY}" = "true" ]; then');
    expect(command).toContain('ARGS+=(--weekly --skip-ai --skip-scenario-artifacts)');
    expect(command).toContain('ARGS+=(--scheduled-exception)');
    expect(command).toContain('if [ -n \"${LOOKBACK_HOURS}\" ]; then');
    expect(command).toContain('ARGS+=(--lookback-hours \"${LOOKBACK_HOURS}\")');
    expect(command).toContain('elif [ -n \"${RUN_ID}\" ]; then');
    expect(command).toContain('ARGS+=(--run \"${RUN_ID}\")');
  });

  it('bounds the weekly rebuild by time instead of by run count', () => {
    const workflow = loadWorkflow();
    const analysisStep = workflow.jobs.analyze.steps.find(
      (step) => step.name === 'Analyze app profiling',
    );

    expect(analysisStep?.env?.MAX_ANALYSIS_MINUTES).toBe(
      '${{ inputs.max_analysis_minutes }}',
    );
    expect(analysisStep?.run ?? '').toContain(
      'ARGS+=(--max-analysis-minutes \"${MAX_ANALYSIS_MINUTES}\")',
    );
  });

  it('posts Slack on scheduled findings, a manual run, and Monday', () => {
    const workflow = loadWorkflow();
    const notify = workflow.jobs['publish-summary'];
    const slackStep = notify.steps.find(
      (step) => step.name === 'Post Slack summary',
    );
    expect(slackStep?.if).toContain('inputs.post_to_slack');
    expect(slackStep?.if).toContain("github.event_name == 'schedule'");
    expect(slackStep?.if).toContain(
      "github.event.workflow_run.event == 'workflow_dispatch'",
    );
    expect(slackStep?.if).toContain(
      "github.event.workflow_run.event == 'schedule'",
    );
    expect(notify.needs).toStrictEqual([
      'analyze',
      'upload-scenario-profiles',
    ]);
    expect(slackStep?.env?.GITHUB_RUN_ID).toBe('${{ github.run_id }}');
  });

  it('posts every scheduled run so a quiet channel means a stopped job', () => {
    const workflow = loadWorkflow();
    const notify = workflow.jobs['publish-summary'];
    const slackStep = notify.steps.find(
      (step) => step.name === 'Post Slack summary',
    );

    expect(slackStep?.if).not.toContain('has-findings');
    expect(
      notify.steps.find((step) => step.name === 'Detect Slack findings'),
    ).toBeUndefined();
  });

  it('routes Slack by the branch that produced the profiles', () => {
    const workflow = loadWorkflow();

    const target = workflow.env?.SLACK_TARGET ?? '';

    expect(target).toContain('C0C3WSWNKS5');
    expect(target).toContain('UEYQL2PEV');
    // A workflow_run listener always runs from the default branch, so
    // github.ref would send a chained branch run to the channel.
    expect(target).toContain('github.event.workflow_run.head_branch');
    expect(target).toContain('github.ref_name');
    expect(target).not.toContain("github.ref == 'refs/heads/main'");
    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps) {
        expect(step.env?.SLACK_TARGET).toBeUndefined();
      }
    }
  });

  it('keeps digests for a week and collected history for two', () => {
    const workflow = loadWorkflow();
    const analysisUpload = workflow.jobs.analyze.steps.find(
      (step) => step.name === 'Upload analysis artifact',
    );
    const scenarioUpload = workflow.jobs['upload-scenario-profiles'].steps.find(
      (step) => step.name === 'Upload scenario profile artifact',
    );
    const flags = workflow.jobs.analyze.steps.find(
      (step) => step.name === 'Record upload flags',
    );

    expect(scenarioUpload?.with?.['retention-days']).toBe(7);
    expect(analysisUpload?.with?.['retention-days']).toBe(
      "${{ steps.flags.outputs.retention-days || 7 }}",
    );
    // The Monday report compares two whole weeks, so a collected report has
    // to outlive a 7-day digest.
    expect(flags?.run).toContain('RETENTION_DAYS=7');
    expect(flags?.run).toContain('RETENTION_DAYS=21');
  });

  it('publishes one artifact per scenario before posting Slack', () => {
    const workflow = loadWorkflow();
    const analyze = workflow.jobs.analyze;
    const upload = workflow.jobs['upload-scenario-profiles'];

    expect(analyze.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Prepare scenario artifact matrix',
        }),
        expect.objectContaining({
          name: 'Cache scenario profile bundles',
          uses: 'actions/cache/save@v6',
        }),
      ]),
    );
    expect(upload.if).toContain("needs.analyze.outputs.upload-profiles == 'true'");
    expect(upload.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Restore scenario profile bundles',
          uses: 'actions/cache/restore@v6',
        }),
        expect.objectContaining({
          name: 'Upload scenario profile artifact',
          uses: 'actions/upload-artifact@v7',
          with: expect.objectContaining({
            name: '${{ matrix.artifactName }}',
            path: '${{ matrix.path }}',
          }),
        }),
      ]),
    );
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

    expect(failureStep?.if).toContain('failure()');
    expect(failureStep?.if).toContain(
      "github.event.workflow_run.event == 'schedule'",
    );
    // A Slack outage must not turn a failed analysis into a failed workflow.
    expect(failureStep?.['continue-on-error']).toBe(true);
    expect(failureStep?.env?.GITHUB_RUN_URL).toContain(
      'actions/runs/${{ github.run_id }}',
    );
    expect(failureStep?.env?.GITHUB_RUN_LABEL).toBe('Failed analysis job');
    expect(failureStep?.run).toContain('analysis failed');
  });
});
