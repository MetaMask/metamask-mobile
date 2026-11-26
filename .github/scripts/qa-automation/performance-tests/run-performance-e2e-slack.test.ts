import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const WORKFLOW_PATH = path.join(
  __dirname,
  '../../../workflows/run-performance-e2e.yml',
);

/** #mm-qa-legends-ai-alerts */
const PERFORMANCE_ALERTS_CHANNEL_ID = 'C0C3WSWNKS5';

type WorkflowStep = {
  name?: string;
  run?: string;
  uses?: string;
  with?: Record<string, string>;
};

type Workflow = {
  jobs: Record<string, { steps?: WorkflowStep[] }>;
};

const loadWorkflow = (): Workflow =>
  yaml.load(fs.readFileSync(WORKFLOW_PATH, 'utf8')) as Workflow;

describe('performance E2E Slack notification', () => {
  const steps = loadWorkflow().jobs['slack-notification'].steps;
  const step = steps?.find(({ name }) => name === 'Send Slack Notification');
  const summary = steps?.find(({ name }) => name === 'Generate Test Summary');

  it('builds the message with generate-slack-summary.sh', () => {
    expect(summary?.run).toContain(
      './.github/scripts/qa-automation/performance-tests/generate-slack-summary.sh',
    );
    expect(step?.with?.payload).toContain(
      '"text": "${{ steps.summary.outputs.summary }}"',
    );
  });

  it('posts the TestMu run summary to #mm-qa-legends-ai-alerts', () => {
    expect(step?.uses).toContain('slackapi/slack-github-action@');
    expect(step?.with?.method).toBe('chat.postMessage');
    expect(step?.with?.token).toBe('${{ secrets.SLACK_BOT_TOKEN }}');
    expect(step?.with?.payload).toContain(
      `"channel": "${PERFORMANCE_ALERTS_CHANNEL_ID}"`,
    );
  });

  it('does not use the incoming webhook bound to a DM', () => {
    expect(step?.with?.webhook).toBeUndefined();
    expect(step?.with?.['webhook-type']).toBeUndefined();
    expect(JSON.stringify(step?.with)).not.toContain(
      'PERFORMANCE_E2E_SLACK_WEBHOOK_URL',
    );
  });
});
