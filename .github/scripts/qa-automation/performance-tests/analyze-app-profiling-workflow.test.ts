import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const WORKFLOW_PATH = path.join(
  __dirname,
  '../../../workflows/analyze-app-profiling.yml',
);
const PERFORMANCE_WORKFLOW_PATH = path.join(
  __dirname,
  '../../../workflows/run-performance-e2e-manual.yml',
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
  permissions?: Record<string, string>;
  on: {
    schedule?: { cron: string }[];
    pull_request?: unknown;
    workflow_run?: unknown;
    workflow_call?: {
      inputs: Record<string, { required?: boolean; type?: string }>;
      secrets: Record<string, { required?: boolean }>;
    };
    workflow_dispatch: { inputs: Record<string, unknown> };
  };
  jobs: Record<
    string,
    {
      if?: string;
      permissions?: Record<string, string>;
      needs?: string | string[];
      strategy?: { matrix?: string; 'fail-fast'?: boolean };
      steps: WorkflowStep[];
    }
  > & {
    'report-upstream-failure': { if?: string; steps: WorkflowStep[] };
  };
};

type PerformanceWorkflow = {
  jobs: Record<
    string,
    {
      if?: string;
      needs?: string | string[];
      permissions?: Record<string, string>;
      uses?: string;
      with?: Record<string, string | boolean>;
      secrets?: string | Record<string, string>;
    }
  >;
};

const loadWorkflow = () =>
  yaml.load(fs.readFileSync(WORKFLOW_PATH, 'utf8')) as Workflow;

const loadPerformanceWorkflow = () =>
  yaml.load(
    fs.readFileSync(PERFORMANCE_WORKFLOW_PATH, 'utf8'),
  ) as PerformanceWorkflow;

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
      "inputs.performance_run_id == ''",
    );
  });

  it('is called by the performance suite instead of listening to workflow_run', () => {
    const workflow = loadWorkflow();

    expect(workflow.on).not.toHaveProperty('workflow_run');
    expect(workflow.on.workflow_call?.inputs).toStrictEqual({
      performance_run_id: expect.objectContaining({
        required: true,
        type: 'string',
      }),
      performance_event: expect.objectContaining({
        required: true,
        type: 'string',
      }),
      performance_result: expect.objectContaining({
        required: true,
        type: 'string',
      }),
    });
    expect(workflow.on.workflow_call?.secrets).toStrictEqual({
      E2E_CLAUDE_API_KEY: { required: false },
      SLACK_BOT_TOKEN: { required: false },
    });
  });

  it('never reads workflow_run or caller dispatch inputs from the event', () => {
    const source = fs.readFileSync(WORKFLOW_PATH, 'utf8');

    // Inside workflow_call the event belongs to the performance run.
    expect(source).not.toContain('github.event.workflow_run');
    expect(source).not.toContain('github.event.inputs');
  });

  it('only treats an unchained schedule or dispatch as the weekly report', () => {
    const workflow = loadWorkflow();
    const weeklyValues = workflow.jobs.analyze.steps
      .filter((step) => step.env?.WEEKLY)
      .map((step) => step.env?.WEEKLY);

    // A scheduled performance run also reports `schedule` to the callee.
    expect(weeklyValues).toHaveLength(2);
    for (const value of weeklyValues) {
      expect(value).toBe(
        "${{ inputs.performance_run_id == '' && (github.event_name == 'schedule' || inputs.weekly == true) }}",
      );
    }
  });

  it('chains successful scheduled and manually dispatched performance runs', () => {
    const workflow = loadWorkflow();

    const condition = workflow.jobs.analyze.if ?? '';

    expect(condition).toContain("inputs.performance_result == 'success'");
    expect(condition).toContain(
      "inputs.performance_event == 'workflow_dispatch'",
    );
    expect(condition).toContain("inputs.performance_event == 'schedule'");
  });

  it('collapses a chain and a dispatch of the same performance run', () => {
    const workflow = loadWorkflow();
    const group = workflow.concurrency?.group ?? '';

    expect(group).toContain('weekly');
    expect(group).toContain('inputs.run_id');
    // The chained id wins over `schedule`, which a scheduled caller reports.
    expect(group.indexOf('inputs.performance_run_id')).toBeLessThan(
      group.indexOf("github.event_name == 'schedule'"),
    );
  });

  it('analyzes the performance run that called it', () => {
    const workflow = loadWorkflow();
    const analysisStep = workflow.jobs.analyze.steps.find(
      (step) => step.name === 'Analyze app profiling',
    );

    expect(analysisStep?.env?.RUN_ID).toBe(
      '${{ inputs.performance_run_id || inputs.run_id }}',
    );
    expect(analysisStep?.env?.SCHEDULED_EXCEPTION).toBe(
      "${{ inputs.performance_event == 'schedule' }}",
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
    expect(inputs).not.toHaveProperty('post_to_slack');
  });

  it('keeps manual lookback and run-id selection', () => {
    const workflow = loadWorkflow();
    const analysisStep = workflow.jobs.analyze.steps.find(
      (step) => step.name === 'Analyze app profiling',
    );

    const command = analysisStep?.run ?? '';

    expect(command).toContain('if [ "${WEEKLY}" = "true" ]; then');
    expect(command).toContain(
      'ARGS+=(--weekly --skip-ai --skip-scenario-artifacts --github-issues)',
    );
    expect(command).toContain('ARGS+=(--scheduled-exception)');
    expect(command).toContain('if [ -n \"${LOOKBACK_HOURS}\" ]; then');
    expect(command).toContain('ARGS+=(--lookback-hours \"${LOOKBACK_HOURS}\")');
    expect(command).toContain('elif [ -n \"${RUN_ID}\" ]; then');
    expect(command).toContain('ARGS+=(--run \"${RUN_ID}\")');
  });

  it('does not skip the findings proposal on a scheduled chain', () => {
    const workflow = loadWorkflow();
    const analysisStep = workflow.jobs.analyze.steps.find(
      (step) => step.name === 'Analyze app profiling',
    );
    const command = analysisStep?.run ?? '';

    expect(command).toContain(
      'if [ "${SKIP_AI}" = "true" ] || [ "${WEEKLY}" = "true" ]; then',
    );
    expect(command).not.toContain(
      '|| [ "${SCHEDULED_EXCEPTION}" = "true" ]; then',
    );
  });

  it('pins the profiling proposal skill from MetaMask/skills', () => {
    const workflow = loadWorkflow();
    const pin = workflow.jobs.analyze.steps.find(
      (step) => step.name === 'Pin profiling regression proposal skill',
    );

    expect(pin?.['continue-on-error']).toBe(true);
    expect(pin?.env?.SKILLS_REF).toBe(
      'd384dd6713c575be5201aab29b542ed358949ab3',
    );
    expect(pin?.run).toContain('performance/profiling-regression-proposal');
    expect(pin?.run).toContain('github.com/MetaMask/skills.git');
  });

  it('can list merged pull files for the proposal overlap', () => {
    const workflow = loadWorkflow();

    expect(workflow.jobs.analyze.permissions).toMatchObject({
      contents: 'read',
      actions: 'read',
      'pull-requests': 'read',
    });
  });

  it('grants no token scopes at the workflow level', () => {
    const workflow = loadWorkflow();

    expect(workflow.permissions).toStrictEqual({});
  });

  it('does not grant issues: write while filing is paused', () => {
    const workflow = loadWorkflow();

    const writers = Object.entries(workflow.jobs)
      .filter(([, job]) => job.permissions?.issues === 'write')
      .map(([name]) => name);

    expect(workflow.jobs.analyze.permissions).toMatchObject({
      issues: 'read',
    });
    expect(writers).toStrictEqual([]);
    expect(workflow.jobs['upload-scenario-profiles'].permissions).toStrictEqual(
      {},
    );
    expect(workflow.jobs['publish-summary'].permissions).toStrictEqual({
      contents: 'read',
      actions: 'read',
    });
  });

  it('does not open or comment on GitHub issues', () => {
    const workflow = loadWorkflow();
    const analysisStep = workflow.jobs.analyze.steps.find(
      (step) => step.name === 'Analyze app profiling',
    );
    const command = analysisStep?.run ?? '';

    expect(workflow.jobs.analyze.permissions).toMatchObject({
      issues: 'read',
    });
    expect(analysisStep?.env?.SCHEDULED_EXCEPTION_BRANCH).toBeUndefined();
    expect(command).not.toContain('SCHEDULED_EXCEPTION_BRANCH');
    expect(command).not.toContain('ARGS+=(--github-issues)');
    // Monday still lists issues that were already opened. That flag does not
    // create or comment.
    expect(command).toContain(
      'ARGS+=(--weekly --skip-ai --skip-scenario-artifacts --github-issues)',
    );
    expect(command).toContain('ARGS+=(--scheduled-exception)');

    const upload = workflow.jobs.analyze.steps.find(
      (step) => step.name === 'Upload analysis artifact',
    );
    expect(String(upload?.with?.path)).toContain('github-issues.json');
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

  it('DMs a scheduled issue verdict to one person and does not post channels', () => {
    const workflow = loadWorkflow();
    const notify = workflow.jobs['publish-summary'];
    const slackSteps = Object.values(workflow.jobs).flatMap((job) =>
      job.steps.filter((step) =>
        (step.run ?? '').includes('post-app-profiling-slack.mjs'),
      ),
    );
    const dm = slackSteps[0];

    expect(workflow.env?.SLACK_TARGET).toBeUndefined();
    expect(workflow.env?.SLACK_PERFORMANCE_TARGET).toBeUndefined();
    expect(notify.needs).toStrictEqual([
      'analyze',
      'upload-scenario-profiles',
    ]);
    expect(
      notify.steps.find((step) => step.name === 'Post Slack summary'),
    ).toBeUndefined();
    expect(slackSteps).toHaveLength(1);
    expect(dm?.name).toBe('DM issue verdict');
    expect(dm?.env?.SLACK_TARGET).toBe('UEYQL2PEV');
    expect(dm?.env?.SLACK_BOT_TOKEN).toBe('${{ secrets.SLACK_BOT_TOKEN }}');
    expect(dm?.env?.SLACK_PLAIN).toBe('1');
    expect(dm?.['continue-on-error']).toBe(true);
    expect(dm?.run).toContain('issue-dm.md');
    expect(dm?.run).not.toContain('slack.md');
    expect(dm?.run).not.toContain('slack-performance.md');
    expect(dm?.run).not.toContain('C07KB8HRZ4J');
    expect(dm?.run).not.toContain('C0C3WSWNKS5');
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

  it('publishes one artifact per scenario before the summary', () => {
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

    expect(condition).toContain("inputs.performance_run_id != ''");
    expect(condition).toContain("inputs.performance_result != 'success'");
    // A failed scheduled suite must stay as silent as a successful one.
    expect(condition).toContain(
      "inputs.performance_event == 'workflow_dispatch'",
    );

    const notice = job.steps.find(
      (step) => step.name === 'Record unsuccessful performance run',
    );

    expect(notice?.env?.GITHUB_RUN_URL).toBe(
      '${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ inputs.performance_run_id }}',
    );
    expect(notice?.env?.PERFORMANCE_CONCLUSION).toBe(
      '${{ inputs.performance_result }}',
    );
    expect(notice?.run).toContain('did not run');
    expect(notice?.run).toContain('GITHUB_STEP_SUMMARY');
  });

  it('records a failed analysis job in the Actions summary', () => {
    const workflow = loadWorkflow();
    const failureStep = workflow.jobs.analyze.steps.find(
      (step) => step.name === 'Record analysis failure',
    );

    expect(failureStep?.if).toContain('failure()');
    expect(failureStep?.if).toContain("inputs.performance_event != 'schedule'");
    expect(failureStep?.env?.GITHUB_RUN_URL).toContain(
      'actions/runs/${{ github.run_id }}',
    );
    expect(failureStep?.run).toContain('analysis failed');
    expect(failureStep?.run).toContain('GITHUB_STEP_SUMMARY');
  });
});

describe('Run Performance E2E Tests Manually calls the analysis', () => {
  it('calls analyze-app-profiling after either suite, even a failed one', () => {
    const job = loadPerformanceWorkflow().jobs['analyze-app-profiling'];

    expect(job.uses).toBe('./.github/workflows/analyze-app-profiling.yml');
    expect(job.needs).toStrictEqual(['scheduled-e2e', 'manual']);
    expect(job.if).toContain('always()');
    expect(job.if).toContain("needs.scheduled-e2e.result != 'skipped'");
    expect(job.if).toContain("needs.manual.result != 'skipped'");
  });

  it('identifies the performance run it analyzes', () => {
    const job = loadPerformanceWorkflow().jobs['analyze-app-profiling'];

    expect(job.with).toStrictEqual({
      performance_run_id: '${{ github.run_id }}',
      performance_event: '${{ github.event_name }}',
      performance_result:
        "${{ github.event_name == 'schedule' && needs.scheduled-e2e.result || needs.manual.result }}",
    });
  });

  it('passes only the secrets the analysis uses', () => {
    const job = loadPerformanceWorkflow().jobs['analyze-app-profiling'];

    expect(job.secrets).toStrictEqual({
      E2E_CLAUDE_API_KEY: '${{ secrets.E2E_CLAUDE_API_KEY }}',
      SLACK_BOT_TOKEN: '${{ secrets.SLACK_BOT_TOKEN }}',
    });
  });

  it('grants the scopes the analysis jobs request and nothing more', () => {
    const job = loadPerformanceWorkflow().jobs['analyze-app-profiling'];

    expect(job.permissions).toStrictEqual({
      contents: 'read',
      actions: 'read',
      'pull-requests': 'read',
      issues: 'read',
    });
  });
});
