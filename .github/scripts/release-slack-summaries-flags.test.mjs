import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const scriptPath = path.resolve(
  '.github/scripts/release-slack-summaries-flags.sh',
);
const workflowPath = path.resolve(
  '.github/workflows/release-slack-summaries.yml',
);

const BLOCKER_JQL =
  'type = Bug AND labels = "release-blocker" AND statusCategory != Done';
const REGRESSION_JQL = 'type = Bug AND statusCategory != Done';
const CRON_BLOCKER = '16 10 * * 1-5';
const CRON_VALIDATION = '21 10 * * 1-5';
const SAFE_CHANNEL = '#mm-summary-test';
const NBSP = '\u00a0';
const FEFF = '\uFEFF';
const ZWSP = '\u200B';
const RELEASE_CHANNEL_ID = 'C0C7GM7J16W';
const LIVE_JQL = {
  RELEASE_SUMMARY_BLOCKER_JQL: BLOCKER_JQL,
  RELEASE_SUMMARY_REGRESSION_JQL: REGRESSION_JQL,
};

function run(env = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-slack-flags-'));
  const outputFile = path.join(dir, 'output');
  const summaryFile = path.join(dir, 'summary');
  fs.writeFileSync(outputFile, '');
  fs.writeFileSync(summaryFile, '');
  const proc = spawnSync('bash', [scriptPath], {
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      BLOCKER_JQL,
      REGRESSION_JQL,
      EVENT_NAME: '',
      SCHEDULE: '',
      INPUT_MODE: '',
      INPUT_DRY_RUN: '',
      INPUT_TEST_CHANNEL: '',
      GA_MODE: '',
      TEST_CHANNEL_VAR: '',
      ...env,
      GITHUB_OUTPUT: outputFile,
      GITHUB_STEP_SUMMARY: summaryFile,
    },
  });
  const body = fs.readFileSync(outputFile, 'utf8');
  const outputs = {};
  for (const line of body.split('\n')) {
    if (!line) continue;
    const index = line.indexOf('=');
    outputs[line.slice(0, index)] = line.slice(index + 1);
  }
  return {
    status: proc.status,
    stdout: proc.stdout,
    stderr: proc.stderr,
    outputs,
    raw: body,
  };
}

function assertFailedClosed(result) {
  assert.notEqual(result.status, 0);
  assert.equal(result.outputs['allow-pr-write'], undefined);
  assert.match(`${result.stdout}\n${result.stderr}`, /::error::/);
}

test('schedule crons select the matching mode', () => {
  const blocker = run({
    EVENT_NAME: 'schedule',
    SCHEDULE: CRON_BLOCKER,
    GA_MODE: 'test',
    TEST_CHANNEL_VAR: SAFE_CHANNEL,
  });
  assert.equal(blocker.status, 0);
  assert.equal(blocker.outputs.mode, 'blocker-summary');
  assert.equal(blocker.outputs['dry-run'], 'false');
  assert.equal(blocker.outputs['allow-pr-write'], 'false');

  const validation = run({
    EVENT_NAME: 'schedule',
    SCHEDULE: CRON_VALIDATION,
    GA_MODE: 'test',
    TEST_CHANNEL_VAR: SAFE_CHANNEL,
  });
  assert.equal(validation.status, 0);
  assert.equal(validation.outputs.mode, 'release-validation');
  assert.equal(validation.outputs['allow-pr-write'], 'false');
});

test('unknown schedule or event fails', () => {
  assert.notEqual(
    run({ EVENT_NAME: 'schedule', SCHEDULE: '0 0 * * *' }).status,
    0,
  );
  assert.notEqual(run({ EVENT_NAME: 'push' }).status, 0);
  assert.notEqual(
    run({
      EVENT_NAME: 'workflow_dispatch',
      INPUT_MODE: 'nope',
      INPUT_DRY_RUN: 'true',
    }).status,
    0,
  );
});

test('F1 whitespace test channels never post while not live', () => {
  const blanks = [' ', '\t', NBSP];
  for (const blank of blanks) {
    for (const gaMode of ['', 'test', 'live']) {
      const fromVariable = run({
        EVENT_NAME: 'schedule',
        SCHEDULE: CRON_BLOCKER,
        GA_MODE: gaMode,
        TEST_CHANNEL_VAR: blank,
        ...(gaMode === 'live' ? LIVE_JQL : {}),
      });
      const fromDispatch = run({
        EVENT_NAME: 'workflow_dispatch',
        INPUT_MODE: 'release-validation',
        INPUT_DRY_RUN: 'false',
        INPUT_TEST_CHANNEL: blank,
        GA_MODE: gaMode,
      });

      if (gaMode === 'live') {
        // Live schedules do not read the test-channel variable. A blank
        // variable must not become the post target. Blocker mode never writes.
        assert.equal(fromVariable.status, 0);
        assert.equal(fromVariable.outputs['test-channel'], '');
        assert.equal(fromVariable.outputs['allow-pr-write'], 'false');
        assert.equal(fromVariable.outputs['dry-run'], 'false');
      } else {
        assertFailedClosed(fromVariable);
      }
      assertFailedClosed(fromDispatch);
      assert.equal(fromDispatch.outputs['allow-pr-write'], undefined);
    }
  }
});

test('F1 newlines are still refused', () => {
  for (const raw of ['\n', '\r\n', 'C0123\n']) {
    const result = run({
      EVENT_NAME: 'workflow_dispatch',
      INPUT_MODE: 'blocker-summary',
      INPUT_DRY_RUN: 'true',
      INPUT_TEST_CHANNEL: raw,
      GA_MODE: 'test',
    });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /newline/);
  }
});

test('F1 not live with no channel dry-runs and does not write', () => {
  const result = run({
    EVENT_NAME: 'schedule',
    SCHEDULE: CRON_VALIDATION,
    GA_MODE: '',
    TEST_CHANNEL_VAR: '',
  });
  assert.equal(result.status, 0);
  assert.equal(result.outputs['dry-run'], 'true');
  assert.equal(result.outputs['allow-pr-write'], 'false');
  assert.equal(result.outputs['test-channel'], '');
});

test('F2 dispatch dry-run false survives and other values stay dry', () => {
  const posting = run({
    EVENT_NAME: 'workflow_dispatch',
    INPUT_MODE: 'blocker-summary',
    INPUT_DRY_RUN: 'false',
    GA_MODE: 'test',
    TEST_CHANNEL_VAR: SAFE_CHANNEL,
  });
  assert.equal(posting.status, 0);
  assert.equal(posting.outputs['dry-run'], 'false');
  assert.equal(posting.outputs['test-channel'], SAFE_CHANNEL);
  assert.equal(posting.outputs['allow-pr-write'], 'false');

  for (const value of ['true', '', 'FALSE', 'no', '0']) {
    const result = run({
      EVENT_NAME: 'workflow_dispatch',
      INPUT_MODE: 'blocker-summary',
      INPUT_DRY_RUN: value,
      GA_MODE: 'test',
      TEST_CHANNEL_VAR: SAFE_CHANNEL,
    });
    assert.equal(result.status, 0, value);
    assert.equal(result.outputs['dry-run'], 'true', value);
  }
});

test('F2 a schedule ignores the dry-run input', () => {
  const forcedFalse = run({
    EVENT_NAME: 'schedule',
    SCHEDULE: CRON_BLOCKER,
    INPUT_DRY_RUN: 'false',
    GA_MODE: 'test',
    TEST_CHANNEL_VAR: SAFE_CHANNEL,
  });
  const forcedTrue = run({
    EVENT_NAME: 'schedule',
    SCHEDULE: CRON_BLOCKER,
    INPUT_DRY_RUN: 'true',
    GA_MODE: 'test',
    TEST_CHANNEL_VAR: SAFE_CHANNEL,
  });
  assert.equal(forcedFalse.outputs['dry-run'], 'false');
  assert.equal(forcedTrue.outputs['dry-run'], 'false');
});

test('F3 live non-dry-run without blocker JQL fails closed', () => {
  const missing = run({
    EVENT_NAME: 'workflow_dispatch',
    INPUT_MODE: 'release-validation',
    INPUT_DRY_RUN: 'false',
    GA_MODE: 'live',
    BLOCKER_JQL: '',
    REGRESSION_JQL,
  });
  assertFailedClosed(missing);
  assert.match(missing.stdout, /jira-release-blocker-jql/);

  const whitespace = run({
    EVENT_NAME: 'schedule',
    SCHEDULE: CRON_VALIDATION,
    GA_MODE: 'live',
    BLOCKER_JQL: ' \t',
    REGRESSION_JQL,
  });
  assertFailedClosed(whitespace);

  const dry = run({
    EVENT_NAME: 'workflow_dispatch',
    INPUT_MODE: 'release-validation',
    INPUT_DRY_RUN: 'true',
    GA_MODE: 'live',
    BLOCKER_JQL: '',
  });
  assert.equal(dry.status, 0);
  assert.equal(dry.outputs['dry-run'], 'true');
  assert.equal(dry.outputs['allow-pr-write'], 'false');
});

test('F5 scheduled and dispatched runs of one mode share a concurrency suffix', () => {
  const suffix = (schedule, mode) => {
    const proc = spawnSync(
      'bash',
      [
        '-c',
        'source "$1"; release_slack_summaries_concurrency_suffix "$2" "$3"',
        'bash',
        scriptPath,
        schedule,
        mode,
      ],
      { encoding: 'utf8' },
    );
    assert.equal(proc.status, 0, proc.stderr);
    return proc.stdout.trim();
  };

  assert.equal(suffix(CRON_BLOCKER, ''), 'blocker-summary');
  assert.equal(suffix(CRON_VALIDATION, ''), 'release-validation');
  assert.equal(suffix('', 'blocker-summary'), 'blocker-summary');
  assert.equal(suffix('', 'release-validation'), 'release-validation');
  assert.equal(suffix(CRON_BLOCKER, ''), suffix('', 'blocker-summary'));
  assert.equal(suffix(CRON_VALIDATION, ''), suffix('', 'release-validation'));
  assert.notEqual(suffix(CRON_BLOCKER, ''), suffix(CRON_VALIDATION, ''));

  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert.match(
    workflow,
    /group: release-slack-summaries-\$\{\{ github\.event\.schedule == '21 10 \* \* 1-5' && 'release-validation' \|\| github\.event\.schedule && 'blocker-summary' \|\| inputs\.mode \}\}/,
  );
});

test('F6 every run still requests pull_requests write', () => {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert.match(workflow, /pull_requests: write/);
  assert.doesNotMatch(workflow, /pull_requests: read/);
  assert.match(workflow, /Warden F6/);
});

test('F7 a non-live release channel is rejected', () => {
  for (const gaMode of ['', 'test']) {
    for (const source of ['dispatch', 'variable']) {
      const env = {
        GA_MODE: gaMode,
        INPUT_DRY_RUN: 'false',
      };
      if (source === 'dispatch') {
        env.EVENT_NAME = 'workflow_dispatch';
        env.INPUT_MODE = 'release-validation';
        env.INPUT_TEST_CHANNEL = '#release-mobile-7-60-0';
      } else {
        env.EVENT_NAME = 'schedule';
        env.SCHEDULE = CRON_VALIDATION;
        env.TEST_CHANNEL_VAR = '#release-mobile-7-60-0';
      }
      const result = run(env);
      assertFailedClosed(result);
      assert.match(result.stdout, /release channel/i);
    }
  }
});

test('allow-pr-write is only the live validation run with no test channel', () => {
  const write = run({
    EVENT_NAME: 'schedule',
    SCHEDULE: CRON_VALIDATION,
    GA_MODE: 'live',
    ...LIVE_JQL,
  });
  assert.equal(write.status, 0);
  assert.equal(write.outputs['allow-pr-write'], 'true');
  assert.equal(write.outputs['dry-run'], 'false');
  assert.equal(write.outputs['test-channel'], '');
  assert.equal(write.outputs['blocker-jql'], BLOCKER_JQL);
  assert.equal(write.outputs['regression-jql'], REGRESSION_JQL);

  const blocker = run({
    EVENT_NAME: 'schedule',
    SCHEDULE: CRON_BLOCKER,
    GA_MODE: 'live',
    ...LIVE_JQL,
  });
  assert.equal(blocker.outputs['allow-pr-write'], 'false');

  const withChannel = run({
    EVENT_NAME: 'workflow_dispatch',
    INPUT_MODE: 'release-validation',
    INPUT_DRY_RUN: 'false',
    GA_MODE: 'live',
    INPUT_TEST_CHANNEL: SAFE_CHANNEL,
    ...LIVE_JQL,
  });
  assert.equal(withChannel.status, 0);
  assert.equal(withChannel.outputs['allow-pr-write'], 'false');
  assert.equal(withChannel.outputs['test-channel'], SAFE_CHANNEL);

  const dry = run({
    EVENT_NAME: 'workflow_dispatch',
    INPUT_MODE: 'release-validation',
    INPUT_DRY_RUN: 'true',
    GA_MODE: 'live',
  });
  assert.equal(dry.outputs['allow-pr-write'], 'false');
});

test('F2 and F4 workflow wiring', () => {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert.match(workflow, /format\('\{0\}', inputs\.dry-run\)/);
  assert.doesNotMatch(workflow, /inputs\.dry-run \|\| ''/);
  assert.match(
    workflow,
    /release-slack-summaries@f99347bfb23bbbd352d199be7b58b3d7cb9f9bb9 # cursor\/release-slack-summaries-a324 \(github-tools#306\)/,
  );
  assert.match(
    workflow,
    /github-tools-ref: f99347bfb23bbbd352d199be7b58b3d7cb9f9bb9/,
  );
});

test('F3 live non-dry runs require both repository JQL variables', () => {
  for (const schedule of [CRON_BLOCKER, CRON_VALIDATION]) {
    const missing = run({
      EVENT_NAME: 'schedule',
      SCHEDULE: schedule,
      GA_MODE: 'live',
    });
    assertFailedClosed(missing);
  }

  const blockerOnly = run({
    EVENT_NAME: 'schedule',
    SCHEDULE: CRON_VALIDATION,
    GA_MODE: 'live',
    RELEASE_SUMMARY_BLOCKER_JQL: 'labels = "release-blocker"',
  });
  assertFailedClosed(blockerOnly);
  assert.match(blockerOnly.stdout, /RELEASE_SUMMARY_REGRESSION_JQL/);

  const regressionOnly = run({
    EVENT_NAME: 'schedule',
    SCHEDULE: CRON_BLOCKER,
    GA_MODE: 'live',
    RELEASE_SUMMARY_REGRESSION_JQL: 'labels = "regression-RC-8.16.0"',
  });
  assertFailedClosed(regressionOnly);
  assert.match(regressionOnly.stdout, /RELEASE_SUMMARY_BLOCKER_JQL/);

  for (const blank of [FEFF, ZWSP, ` \t${FEFF}`]) {
    const result = run({
      EVENT_NAME: 'schedule',
      SCHEDULE: CRON_VALIDATION,
      GA_MODE: 'live',
      RELEASE_SUMMARY_BLOCKER_JQL: blank,
      RELEASE_SUMMARY_REGRESSION_JQL: 'labels = "regression-RC-8.16.0"',
    });
    assertFailedClosed(result);
  }

  const blockerQuery =
    'type = Bug AND labels = "release-blocker" AND labels = "regression-RC-8.16.0" AND statusCategory != Done';
  const regressionQuery =
    'type = Bug AND labels = "regression-RC-8.16.0" AND statusCategory != Done';
  const posted = run({
    EVENT_NAME: 'schedule',
    SCHEDULE: CRON_VALIDATION,
    GA_MODE: 'live',
    RELEASE_SUMMARY_BLOCKER_JQL: blockerQuery,
    RELEASE_SUMMARY_REGRESSION_JQL: regressionQuery,
  });
  assert.equal(posted.status, 0);
  assert.equal(posted.outputs['blocker-jql'], blockerQuery);
  assert.equal(posted.outputs['regression-jql'], regressionQuery);
  assert.equal(posted.outputs['dry-run'], 'false');
  assert.ok(posted.raw.indexOf('blocker-jql=') < posted.raw.indexOf('\nmode='));
  assert.ok(
    posted.raw.indexOf('regression-jql=') < posted.raw.indexOf('\nallow-pr-write='),
  );

  const dry = run({
    EVENT_NAME: 'workflow_dispatch',
    INPUT_MODE: 'release-validation',
    INPUT_DRY_RUN: 'true',
    GA_MODE: 'live',
  });
  assert.equal(dry.status, 0);
  assert.equal(dry.outputs['dry-run'], 'true');
  assert.equal(dry.outputs['blocker-jql'], BLOCKER_JQL);
  assert.equal(dry.outputs['regression-jql'], REGRESSION_JQL);
});

test('F3 JQL with a newline writes nothing', () => {
  for (const raw of [
    'x\nallow-pr-write=true\ndry-run=false',
    'x\rallow-pr-write=true',
  ]) {
    const result = run({
      EVENT_NAME: 'schedule',
      SCHEDULE: CRON_VALIDATION,
      GA_MODE: 'live',
      RELEASE_SUMMARY_BLOCKER_JQL: raw,
      RELEASE_SUMMARY_REGRESSION_JQL: 'labels = "regression-RC-8.16.0"',
    });
    assert.notEqual(result.status, 0);
    assert.equal(result.raw, '');
    assert.match(result.stdout, /::error::/);
  }
});

test('F1 invisible characters cannot disguise a release channel', () => {
  const disguised = [
    FEFF,
    ZWSP,
    `${FEFF}#release-mobile-8-16-0`,
    `#release-mobile-8-16-0${FEFF}`,
  ];
  for (const channel of disguised) {
    for (const source of ['dispatch', 'variable']) {
      const env = { GA_MODE: 'test', INPUT_DRY_RUN: 'false' };
      if (source === 'dispatch') {
        env.EVENT_NAME = 'workflow_dispatch';
        env.INPUT_MODE = 'release-validation';
        env.INPUT_TEST_CHANNEL = channel;
      } else {
        env.EVENT_NAME = 'schedule';
        env.SCHEDULE = CRON_VALIDATION;
        env.TEST_CHANNEL_VAR = channel;
      }
      assertFailedClosed(run(env));
    }
  }
});

test('F7 a non-live channel id must equal the configured variable', () => {
  const foreign = run({
    EVENT_NAME: 'workflow_dispatch',
    INPUT_MODE: 'release-validation',
    INPUT_DRY_RUN: 'false',
    GA_MODE: 'test',
    INPUT_TEST_CHANNEL: RELEASE_CHANNEL_ID,
    TEST_CHANNEL_VAR: SAFE_CHANNEL,
  });
  assertFailedClosed(foreign);

  const configured = run({
    EVENT_NAME: 'schedule',
    SCHEDULE: CRON_VALIDATION,
    GA_MODE: 'test',
    TEST_CHANNEL_VAR: RELEASE_CHANNEL_ID,
  });
  assert.equal(configured.status, 0);
  assert.equal(configured.outputs['test-channel'], RELEASE_CHANNEL_ID);
  assert.equal(configured.outputs['dry-run'], 'false');
  assert.equal(configured.outputs['allow-pr-write'], 'false');

  const sameId = run({
    EVENT_NAME: 'workflow_dispatch',
    INPUT_MODE: 'blocker-summary',
    INPUT_DRY_RUN: 'false',
    GA_MODE: 'test',
    INPUT_TEST_CHANNEL: RELEASE_CHANNEL_ID,
    TEST_CHANNEL_VAR: RELEASE_CHANNEL_ID,
  });
  assert.equal(sameId.status, 0);
  assert.equal(sameId.outputs['test-channel'], RELEASE_CHANNEL_ID);
});
