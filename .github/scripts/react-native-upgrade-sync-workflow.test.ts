import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {
  PR_TEMPLATE_SECTIONS,
  runAllChecks,
} from './shared/pr-template-checks';

const WORKFLOW_PATH = path.join(
  __dirname,
  '../workflows/react-native-upgrade-sync.yml',
);

type WorkflowStep = {
  id?: string;
  name?: string;
  if?: string;
  env?: Record<string, string>;
  run?: string;
  uses?: string;
  with?: Record<string, string>;
};

type WorkflowJob = {
  name?: string;
  'runs-on'?: string;
  'timeout-minutes'?: number;
  permissions?: Record<string, string>;
  env?: Record<string, string>;
  steps: WorkflowStep[];
};

type Workflow = {
  name?: string;
  on: {
    workflow_dispatch?: { inputs?: Record<string, unknown> } | null;
    push?: unknown;
    pull_request?: unknown;
    schedule?: unknown;
    workflow_call?: unknown;
    workflow_run?: unknown;
  };
  permissions?: Record<string, string>;
  concurrency?: { group?: string; 'cancel-in-progress'?: boolean };
  jobs: Record<string, WorkflowJob>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const loadWorkflow = (): Workflow => {
  const document: unknown = yaml.load(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  if (!isRecord(document) || !isRecord(document.jobs)) {
    throw new Error('Workflow YAML must contain jobs.');
  }
  return document as Workflow;
};

const workflowSource = fs.readFileSync(WORKFLOW_PATH, 'utf8');
const workflow = loadWorkflow();
const job = workflow.jobs['open-sync-pull-request'];
const steps = job.steps;
const tokenStep = steps.find((step) => step.id === 'get-token');
const syncStep = steps.find((step) => step.id === 'sync');
const syncRun = syncStep?.run ?? '';

const indexOf = (value: string) => {
  const index = syncRun.indexOf(value);
  expect(index).toBeGreaterThan(-1);
  return index;
};

const renderSyncBody = (): string => {
  const marker = "<<'EOF'\n";
  const start = syncRun.indexOf(marker);
  const end = syncRun.indexOf('\nEOF', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  return syncRun
    .slice(start + marker.length, end)
    .split('__SOURCE_SHA__')
    .join('a'.repeat(40))
    .split('__TARGET_SHA__')
    .join('b'.repeat(40))
    .split('__TEMP_BRANCH__')
    .join('rn-upgrade-sync/aaaaaaaaaaaa-1')
    .split('__SOURCE_BRANCH__')
    .join('main')
    .split('__TARGET_BRANCH__')
    .join('react-native-continuous-upgrade');
};

describe('React Native upgrade sync workflow', () => {
  it('dispatches manually and has no other trigger', () => {
    expect(Object.keys(workflow.on)).toStrictEqual(['workflow_dispatch']);
    expect(workflow.on.workflow_dispatch ?? {}).not.toHaveProperty('inputs');
    expect(workflow.on.push).toBeUndefined();
    expect(workflow.on.pull_request).toBeUndefined();
    expect(workflow.on.schedule).toBeUndefined();
    expect(workflow.on.workflow_call).toBeUndefined();
    expect(workflow.on.workflow_run).toBeUndefined();
  });

  it('uses one fixed concurrency group and does not cancel a running sync', () => {
    expect(workflow.concurrency).toStrictEqual({
      group: 'react-native-upgrade-sync',
      'cancel-in-progress': false,
    });
  });

  it('grants no token scopes at the workflow level', () => {
    expect(workflow.permissions).toStrictEqual({});
  });

  it('bounds the job and keeps the default token read-only', () => {
    expect(job['runs-on']).toBe('ubuntu-latest');
    expect(job['timeout-minutes']).toBe(10);
    expect(job.permissions).toStrictEqual({
      contents: 'read',
      'id-token': 'write',
    });
  });

  it('fixes the source, target, and temporary ref prefix', () => {
    expect(job.env).toMatchObject({
      SOURCE_BRANCH: 'main',
      TARGET_BRANCH: 'react-native-continuous-upgrade',
      TEMP_BRANCH_PREFIX: 'rn-upgrade-sync/',
      SYNC_MARKER: '<!-- rn-upgrade-sync -->',
    });
    expect(syncRun).not.toContain('refs/heads/main');
    expect(syncRun).not.toContain('refs/heads/${SOURCE_BRANCH}');
    expect(syncRun).not.toContain('refs/heads/${TARGET_BRANCH}');
    expect(syncRun).toContain('TEMP_REF="refs/heads/${TEMP_BRANCH}"');
  });

  it('exchanges an OIDC token for only the write scopes needed to create a ref and pull request', () => {
    expect(tokenStep?.uses).toBe(
      'MetaMask/github-tools/.github/actions/get-token@v1',
    );
    expect(tokenStep?.with?.['token-exchange-url']).toBe(
      '${{ vars.TOKEN_EXCHANGE_URL }}',
    );
    expect(tokenStep?.with?.permissions?.trim().split('\n')).toStrictEqual([
      'contents: write',
      'pull_requests: write',
      'workflows: write',
    ]);
    expect(syncStep?.env).toStrictEqual({
      GH_TOKEN: '${{ steps.get-token.outputs.token }}',
    });
    expect(syncRun).not.toContain('echo "$GH_TOKEN"');
    expect(syncRun).not.toContain('echo "${GH_TOKEN}"');
    expect(syncRun).not.toContain('printenv');
    expect(workflowSource).not.toContain('secrets.');
  });

  it('checks ancestry before listing pull requests or writing a ref', () => {
    const currentExit = indexOf('[[ "$BEHIND_BY" == "0" ]]');
    const compare = indexOf(
      'repos/${GITHUB_REPOSITORY}/compare/${SOURCE_SHA}...${TARGET_SHA}',
    );
    const pullRequests = indexOf('gh pr list');
    const createRef = indexOf('--method POST');

    expect(compare).toBeLessThan(currentExit);
    expect(currentExit).toBeLessThan(pullRequests);
    expect(pullRequests).toBeLessThan(createRef);
    expect(syncRun.match(/--method POST/g)).toStrictEqual(['--method POST']);
  });

  it('reports a current target and exits before any write', () => {
    const currentHeading = indexOf(
      '## React Native upgrade branch is current',
    );
    const currentExit = syncRun.indexOf('exit 0', currentHeading);
    const pullRequests = indexOf('gh pr list');

    expect(syncRun).toContain('Observed main SHA:');
    expect(syncRun).toContain('Target ref:');
    expect(syncRun).toContain('No temporary ref or pull request was created.');
    expect(currentExit).toBeGreaterThan(currentHeading);
    expect(currentExit).toBeLessThan(pullRequests);
  });

  it('surfaces one active sync pull request and rejects an ambiguous set', () => {
    const pullRequests = indexOf('gh pr list');
    const existingHeading = indexOf(
      '## React Native upgrade sync pull request already exists',
    );
    const existingExit = syncRun.indexOf('exit 0', existingHeading);
    const createRef = indexOf('--method POST');

    expect(syncRun).toContain('--base "$TARGET_BRANCH"');
    expect(syncRun).toContain('startswith($prefix)');
    expect(syncRun).toContain('contains($marker)');
    expect(syncRun).toContain('[[ "$PREFIX_COUNT" != "$MARKER_COUNT" ]]');
    expect(syncRun).toContain('[[ "$PREFIX_COUNT" -gt 1 ]]');
    expect(syncRun).toContain('[[ "$PREFIX_COUNT" -eq 1 ]]');
    expect(syncRun).toContain('Existing pull request:');
    expect(existingExit).toBeGreaterThan(pullRequests);
    expect(existingExit).toBeLessThan(createRef);
  });

  it('reuses an exact temporary ref and does not update a mismatched ref', () => {
    const createRef = indexOf(
      'gh api --method POST "repos/${GITHUB_REPOSITORY}/git/refs" -f ref="$TEMP_REF" -f sha="$SOURCE_SHA"',
    );
    const mismatch = indexOf('The ref was not updated.');
    const pullRequest = indexOf('gh pr create');

    expect(syncRun).toContain(
      'TEMP_BRANCH="${TEMP_BRANCH_PREFIX}${SHORT_SHA}-${GITHUB_RUN_ID}"',
    );
    expect(syncRun).toContain('[[ "$EXISTING_SHA" != "$SOURCE_SHA" ]]');
    expect(syncRun).toContain('[[ "$READ_BACK" != "$SOURCE_SHA" ]]');
    expect(mismatch).toBeGreaterThan(createRef);
    expect(pullRequest).toBeGreaterThan(mismatch);
    expect(syncRun).not.toContain('--force');
    expect(syncRun).not.toContain('git push');
    expect(syncRun).not.toContain('git update-ref');
    expect(syncRun).not.toContain('--method PATCH');
    expect(syncRun).not.toContain('gh pr merge');
  });

  it('opens the temporary ref into the upgrade branch with the ancestry contract', () => {
    expect(syncRun).toContain(
      'gh pr create --repo "$GITHUB_REPOSITORY" --base "$TARGET_BRANCH" --head "$TEMP_BRANCH"',
    );
    expect(syncRun).toContain(
      '--title "$PR_TITLE" --body-file "$BODY_FILE"',
    );
    expect(syncRun).toContain('<!-- rn-upgrade-sync -->');
    expect(syncRun).toContain('__SOURCE_SHA__');
    expect(syncRun).toContain('__TARGET_SHA__');
    expect(syncRun).toContain('Merge this pull request with a merge commit.');
    expect(syncRun).toContain('preserve both long-lived branch refs');
    expect(syncRun).toContain(
      '[[ "$BASE_ACTUAL" != "$TARGET_BRANCH" || "$HEAD_ACTUAL" != "$TEMP_BRANCH" || "$TITLE_ACTUAL" != "$PR_TITLE" ]]',
    );
  });

  it('reports the observed source SHA for every successful outcome and for a failure', () => {
    expect(syncRun).toContain('## React Native upgrade branch is current');
    expect(syncRun).toContain(
      '## React Native upgrade sync pull request already exists',
    );
    expect(syncRun).toContain(
      '## React Native upgrade sync pull request created',
    );
    expect(syncRun).toContain('## React Native upgrade sync failed');
    expect(syncRun.match(/Observed main SHA:/g)).toHaveLength(4);
    expect(syncRun).toContain('Pull request:');
    expect(syncRun).toContain('Target ref:');
  });

  it('renders a pull request body that satisfies the repository template', () => {
    const body = renderSyncBody();

    for (const title of PR_TEMPLATE_SECTIONS) {
      expect(body).toContain(title);
    }
    expect(runAllChecks(body, false)).toEqual([]);
  });

  it('keeps the sync title within the repository title limit', () => {
    const title = syncRun.match(/PR_TITLE="([^"]+)"/)?.[1] ?? '';

    expect(title).toBe(
      'chore: sync main into the React Native upgrade branch',
    );
    expect(title.length).toBeLessThan(72);
  });
});
