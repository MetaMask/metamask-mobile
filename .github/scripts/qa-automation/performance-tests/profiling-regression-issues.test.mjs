/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  BASE_LABELS,
  ISSUE_MARKER,
  ISSUE_TITLE_PREFIX,
  RECURRENCE_MARKER,
  SLOW_RUN_KEY,
  buildRecurrenceComment,
  buildRegressionIssue,
  buildSlowRunIssue,
  encodeMarker,
  fetchAppVersion,
  findOpenIssue,
  findingKey,
  issueNumberFromUrl,
  listIssuesOpenedInWindow,
  listTrackedIssues,
  parseMarker,
  parseRecurrenceMarkers,
  packageScenarioProfiles,
  scenarioProfilePaths,
  syncProfilingRegressionIssues,
  topFramesForScenario,
  uploadGitHubAttachment,
  weeklyIssueBrief,
} from './profiling-regression-issues.mjs';

const BUG_REPORT_SECTIONS = [
  '### Describe the bug',
  '### Expected behavior',
  '### Screenshots/Recordings',
  '### Steps to reproduce',
  '### Error messages or log output',
  '### Where was this bug found?',
  '### Version',
  '### Build number',
  '### Build type',
  '### Device',
  '### Operating system',
  '### Additional context',
  '### Severity',
];

function finding(overrides = {}) {
  return {
    projectName: 'browserstack-android',
    scenario: 'Measure_Warm_Start__Warm_Start_to_Login_Screen',
    jsWorkMs: 20359,
    baselineMedianJsWorkMs: 12152,
    baselineRuns: 2,
    ratio: 1.68,
    owner: 'metamask-mobile-platform',
    ...overrides,
  };
}

function exception(findings, overrides = {}) {
  return {
    meta: {
      mode: 'scheduled-exception',
      hasFindings: findings.length > 0,
      runId: '36676470722',
      runUrl:
        'https://github.com/MetaMask/metamask-mobile/actions/runs/36676470722',
      createdAt: '2026-09-23T06:40:00.000Z',
      baselinePreviousRuns: 2,
      baselineRunCount: 2,
      minimumBaselineRuns: 2,
      thresholdRatio: 1.5,
      scenarioCount: 12,
      comparedScenarioCount: 12,
      profileCount: 14,
      symbolicatedProfileCount: 14,
      ...overrides,
    },
    findings,
  };
}

function currentReport() {
  return {
    meta: {
      runId: '36676470722',
      headSha: 'abc1234def5678',
      analysisArtifactsUrl:
        'https://github.com/MetaMask/metamask-mobile/actions/runs/1#artifacts',
    },
    scenarios: [],
  };
}

const FRAMES = [
  {
    scenario: 'Measure_Warm_Start__Warm_Start_to_Login_Screen',
    name: 'memoized',
    url: 'node_modules/reselect/dist/cjs/reselect.cjs',
    line: 502,
    selfMs: 4137,
  },
  {
    scenario: 'Measure_Warm_Start__Warm_Start_to_Login_Screen',
    name: 'memoized',
    url: 'node_modules/reselect/dist/cjs/reselect.cjs',
    line: 502,
    selfMs: 100,
  },
  {
    scenario: 'Measure_Warm_Start__Warm_Start_to_Login_Screen',
    name: 'areObjectsEqual',
    url: 'node_modules/fast-equals/dist/cjs/index.cjs',
    line: 12,
    selfMs: 2400,
  },
  {
    scenario: 'Perps_add_funds',
    name: 'usePerpsOrderForm',
    url: 'app/components/UI/Perps/hooks/usePerpsOrderForm.ts',
    line: 40,
    selfMs: 800,
  },
];

/**
 * Records every `gh` call and answers from a script keyed by the subcommand.
 */
function fakeGh(responses = {}) {
  const calls = [];
  const runGh = (args) => {
    calls.push(args);
    const key = `${args[0]} ${args[1]}`;
    const answer = responses[key];
    if (answer instanceof Error) {
      throw answer;
    }
    if (typeof answer === 'function') {
      return answer(args);
    }
    return answer ?? '';
  };
  return { calls, runGh };
}

function trackedIssueJson(issues) {
  return JSON.stringify(
    issues.map((issue) => ({
      number: issue.number,
      title: issue.title || `${ISSUE_TITLE_PREFIX} — x`,
      url: `https://github.com/MetaMask/metamask-mobile/issues/${issue.number}`,
      state: issue.state || 'OPEN',
      createdAt: issue.createdAt || '2026-09-22T06:40:00.000Z',
      closedAt: issue.closedAt || null,
      body: `intro\n\n${encodeMarker(ISSUE_MARKER, issue.marker)}\n`,
      labels: (issue.labels || []).map((name) => ({ name })),
    })),
  );
}

test('markers round-trip through an issue body', () => {
  const marker = encodeMarker(ISSUE_MARKER, { key: 'a|b', ratio: 1.68 });
  const body = `### Describe the bug\n\ntext\n\n${marker}\n`;

  assert.deepEqual(parseMarker(body, ISSUE_MARKER), { key: 'a|b', ratio: 1.68 });
  assert.equal(parseMarker(body, RECURRENCE_MARKER), null);
  assert.equal(parseMarker('no marker here', ISSUE_MARKER), null);
});

test('parseRecurrenceMarkers counts every recurrence in a comment thread', () => {
  const body = [
    encodeMarker(RECURRENCE_MARKER, { runId: '1' }),
    'prose',
    encodeMarker(RECURRENCE_MARKER, { runId: '2' }),
    `<!-- ${RECURRENCE_MARKER} {broken -->`,
  ].join('\n');

  assert.deepEqual(parseRecurrenceMarkers(body), [{ runId: '1' }, { runId: '2' }]);
});

test('topFramesForScenario merges segments and keeps other scenarios out', () => {
  const top = topFramesForScenario(FRAMES, 'Measure_Warm_Start__Warm_Start_to_Login_Screen');

  assert.deepEqual(
    top.map((frame) => [frame.name, frame.selfMs]),
    [
      ['memoized', 4237],
      ['areObjectsEqual', 2400],
    ],
  );
});

test('a scenario issue follows the bug-report template and routes to its team', () => {
  const issue = buildRegressionIssue({
    finding: finding(),
    exception: exception([finding()]),
    currentReport: currentReport(),
    frames: FRAMES,
    aiText: '• reselect memoized dominates self time',
    appVersion: '7.60.0',
  });

  assert.equal(
    issue.title,
    `${ISSUE_TITLE_PREFIX} — Measure Warm Start: Warm Start to Login Screen`,
  );
  assert.deepEqual(issue.labels, [...BASE_LABELS, 'team-mobile-platform']);
  assert.equal(issue.owner, 'metamask-mobile-platform');
  assert.equal(issue.key, 'browserstack-android|Measure_Warm_Start__Warm_Start_to_Login_Screen');
  for (const section of BUG_REPORT_SECTIONS) {
    assert.ok(issue.body.includes(`${section}\n`), `missing ${section}`);
  }
  // Sections are in template order.
  const positions = BUG_REPORT_SECTIONS.map((section) => issue.body.indexOf(section));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  assert.match(issue.body, /\*\*20\.4 s\*\* against a \*\*12\.2 s\*\* median/);
  assert.match(issue.body, /\*\*1\.68×\*\*, threshold 1\.5×/);
  assert.match(issue.body, /Owner: `metamask-mobile-platform` \(@MetaMask\/mobile-platform\)/);
  assert.match(issue.body, /`memoized` — node_modules\/reselect\/dist\/cjs\/reselect\.cjs:502 — 4,237 ms self/);
  assert.match(issue.body, /### Version\n\n7\.60\.0 \(`package\.json` at `abc1234def5678`\)/);
  assert.match(issue.body, /### Operating system\n\nAndroid/);
  assert.match(issue.body, /AI proposal \(profiling evidence only; not a root cause\)/);
  assert.match(issue.body, /reselect memoized dominates self time/);
  assert.match(issue.body, /actions\/runs\/1#artifacts/);
  assert.deepEqual(parseMarker(issue.body, ISSUE_MARKER), {
    key: 'browserstack-android|Measure_Warm_Start__Warm_Start_to_Login_Screen',
    kind: 'scenario',
    scenario: 'Measure Warm Start: Warm Start to Login Screen',
    projectName: 'browserstack-android',
    owner: 'metamask-mobile-platform',
    runId: '36676470722',
    ratio: 1.68,
    jsWorkMs: 20359,
    baselineMedianJsWorkMs: 12152,
    detectedAt: '2026-09-23T06:40:00.000Z',
  });
});

test('a scenario without a team label gets only the base labels and no mention', () => {
  const rewards = finding({
    scenario: 'Rewards_tab_time-to-content',
    owner: 'performance-team',
  });
  const issue = buildRegressionIssue({
    finding: rewards,
    exception: exception([rewards]),
    currentReport: { meta: { runId: '1' }, scenarios: [] },
  });

  assert.deepEqual(issue.labels, BASE_LABELS);
  assert.match(issue.body, /Owner: `performance-team`\n/);
  assert.doesNotMatch(issue.body, /@MetaMask\//);
  assert.match(issue.body, /### Version\n\nNot resolved: the performance run reported no head commit/);
  assert.match(issue.body, /### Build number\n\nNot a store build: CI `main-e2e` build\n/);
});

test('a slow run becomes one issue with no team label', () => {
  const findings = [
    finding(),
    finding({
      scenario: 'Perps_add_funds',
      owner: 'mm-perps-engineering-team',
      jsWorkMs: 300,
      baselineMedianJsWorkMs: 100,
      ratio: 3,
    }),
  ];
  const issue = buildSlowRunIssue({
    exception: exception(findings),
    currentReport: currentReport(),
    appVersion: '7.60.0',
  });

  assert.equal(issue.key, SLOW_RUN_KEY);
  assert.equal(issue.owner, null);
  assert.deepEqual(issue.labels, BASE_LABELS);
  assert.match(issue.title, /Hermes slow run — 2 scenarios over 1\.5× in run 36676470722/);
  for (const section of BUG_REPORT_SECTIONS) {
    assert.ok(issue.body.includes(`${section}\n`), `missing ${section}`);
  }
  assert.match(issue.body, /one run-level anomaly and no team is routed/);
  assert.match(issue.body, /\*\*Perps add funds\*\* — JS work 0\.3 s vs 0\.1 s recent median \(3×\) · owner `mm-perps-engineering-team`/);
  assert.doesNotMatch(issue.body, /@MetaMask\//);
  assert.deepEqual(parseMarker(issue.body, ISSUE_MARKER), {
    key: SLOW_RUN_KEY,
    kind: 'slow-run',
    scenarios: ['Measure Warm Start: Warm Start to Login Screen', 'Perps add funds'],
    runId: '36676470722',
    maxRatio: 3,
    detectedAt: '2026-09-23T06:40:00.000Z',
  });
});

test('recurrence comments carry the run and a machine-readable marker', () => {
  const scenarioComment = buildRecurrenceComment({
    exception: exception([finding()]),
    finding: finding(),
  });
  const slowRunComment = buildRecurrenceComment({
    exception: exception([finding(), finding({ scenario: 'Perps_add_funds', ratio: 2 })]),
  });

  assert.match(scenarioComment, /Flagged again in performance run \[36676470722\]/);
  assert.match(scenarioComment, /20\.4 s vs 12\.2 s recent median \(1\.68× across 2 baseline runs\)/);
  assert.deepEqual(parseRecurrenceMarkers(scenarioComment), [
    {
      runId: '36676470722',
      ratio: 1.68,
      jsWorkMs: 20359,
      baselineMedianJsWorkMs: 12152,
      detectedAt: '2026-09-23T06:40:00.000Z',
    },
  ]);
  assert.match(slowRunComment, /Another slow run/);
  assert.equal(parseRecurrenceMarkers(slowRunComment)[0].maxRatio, 2);
});

test('issueNumberFromUrl reads the number gh prints', () => {
  assert.equal(
    issueNumberFromUrl('https://github.com/MetaMask/metamask-mobile/issues/12345\n'),
    12345,
  );
  assert.equal(issueNumberFromUrl('not a url'), null);
});

test('listTrackedIssues keeps only issues that carry the marker', () => {
  const { calls, runGh } = fakeGh({
    'issue list': JSON.stringify([
      {
        number: 1,
        title: 'hand written',
        url: 'u1',
        state: 'OPEN',
        createdAt: '2026-09-22T00:00:00.000Z',
        body: 'mentions hermes-profile-regression in prose',
        labels: [],
      },
      {
        number: 2,
        title: 'tracked',
        url: 'u2',
        state: 'OPEN',
        createdAt: '2026-09-22T00:00:00.000Z',
        body: encodeMarker(ISSUE_MARKER, { key: 'a|b' }),
        labels: [{ name: 'type-bug' }],
      },
    ]),
  });

  const tracked = listTrackedIssues({ repo: 'MetaMask/metamask-mobile', runGh });

  assert.deepEqual(
    tracked.map((issue) => [issue.number, issue.state, issue.marker.key, issue.labels]),
    [[2, 'open', 'a|b', ['type-bug']]],
  );
  assert.deepEqual(calls[0].slice(0, 6), [
    'issue',
    'list',
    '--repo',
    'MetaMask/metamask-mobile',
    '--state',
    'open',
  ]);
  assert.equal(calls[0][calls[0].indexOf('--search') + 1], `${ISSUE_MARKER} in:body`);
});

test('findOpenIssue prefers the newest open issue for the key', () => {
  const issues = [
    { number: 3, state: 'open', marker: { key: 'k' } },
    { number: 7, state: 'open', marker: { key: 'k' } },
    { number: 9, state: 'closed', marker: { key: 'k' } },
    { number: 11, state: 'open', marker: { key: 'other' } },
  ];

  assert.equal(findOpenIssue(issues, 'k').number, 7);
  assert.equal(findOpenIssue(issues, 'missing'), null);
});

test('fetchAppVersion decodes package.json at the profiled commit', () => {
  const encoded = Buffer.from(JSON.stringify({ version: '7.61.0' })).toString('base64');
  const { calls, runGh } = fakeGh({ 'api repos/MetaMask/metamask-mobile/contents/package.json?ref=abc': `${encoded.slice(0, 10)}\n${encoded.slice(10)}` });

  assert.equal(
    fetchAppVersion({ repo: 'MetaMask/metamask-mobile', sha: 'abc', runGh }),
    '7.61.0',
  );
  assert.equal(calls.length, 1);
  assert.equal(fetchAppVersion({ repo: 'r', sha: null, runGh }), null);
  assert.equal(
    fetchAppVersion({
      repo: 'r',
      sha: 'zzz',
      runGh: () => {
        throw new Error('HTTP 404');
      },
    }),
    null,
  );
});

test('sync opens a new issue for a first-time finding and records it on the finding', () => {
  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-issues-'));
  const { calls, runGh } = fakeGh({
    'issue list': trackedIssueJson([]),
    'issue create': 'https://github.com/MetaMask/metamask-mobile/issues/501\n',
  });
  const current = exception([finding()]);

  const result = syncProfilingRegressionIssues({
    exception: current,
    currentReport: currentReport(),
    frames: FRAMES,
    aiText: null,
    repo: 'MetaMask/metamask-mobile',
    runGh,
    outputDirectory,
  });

  assert.deepEqual(current.findings[0].issue, {
    number: 501,
    url: 'https://github.com/MetaMask/metamask-mobile/issues/501',
    created: true,
  });
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].owner, 'metamask-mobile-platform');
  const create = calls.find((args) => args[1] === 'create');
  assert.ok(create);
  assert.equal(create[create.indexOf('--title') + 1], `${ISSUE_TITLE_PREFIX} — Measure Warm Start: Warm Start to Login Screen`);
  const labels = create.flatMap((arg, index) => (arg === '--label' ? [create[index + 1]] : []));
  assert.deepEqual(labels, [...BASE_LABELS, 'team-mobile-platform']);
  assert.equal(calls.some((args) => args[1] === 'comment'), false);
  const written = JSON.parse(
    fs.readFileSync(path.join(outputDirectory, 'github-issues.json'), 'utf8'),
  );
  assert.equal(written[0].number, 501);
  fs.rmSync(outputDirectory, { recursive: true, force: true });
});

test('sync references an open issue for the same finding instead of opening another', () => {
  const { calls, runGh } = fakeGh({
    'issue list': trackedIssueJson([
      {
        number: 400,
        marker: { key: findingKey(finding()), kind: 'scenario' },
      },
    ]),
    'issue create': new Error('must not create'),
  });
  const current = exception([finding()]);

  syncProfilingRegressionIssues({
    exception: current,
    currentReport: currentReport(),
    repo: 'MetaMask/metamask-mobile',
    runGh,
  });

  assert.deepEqual(current.findings[0].issue, {
    number: 400,
    url: 'https://github.com/MetaMask/metamask-mobile/issues/400',
    created: false,
  });
  const comment = calls.find((args) => args[1] === 'comment');
  assert.equal(comment[2], '400');
  assert.equal(calls.some((args) => args[1] === 'create'), false);
});

test('a closed issue for the same finding does not stop a new one', () => {
  const { calls, runGh } = fakeGh({
    // The open-state query already excludes it; a closed issue never reaches
    // the matcher, so the finding is new again.
    'issue list': trackedIssueJson([]),
    'issue create': 'https://github.com/MetaMask/metamask-mobile/issues/502\n',
  });
  const current = exception([finding()]);

  syncProfilingRegressionIssues({
    exception: current,
    currentReport: currentReport(),
    repo: 'MetaMask/metamask-mobile',
    runGh,
  });

  assert.equal(current.findings[0].issue.created, true);
  assert.equal(calls.filter((args) => args[1] === 'create').length, 1);
});

test('several findings in one run open a single slow-run issue', () => {
  const { calls, runGh } = fakeGh({
    'issue list': trackedIssueJson([]),
    'issue create': 'https://github.com/MetaMask/metamask-mobile/issues/600\n',
  });
  const current = exception([
    finding(),
    finding({ scenario: 'Perps_add_funds', owner: 'mm-perps-engineering-team', ratio: 2 }),
  ]);

  const result = syncProfilingRegressionIssues({
    exception: current,
    currentReport: currentReport(),
    repo: 'MetaMask/metamask-mobile',
    runGh,
  });

  assert.equal(calls.filter((args) => args[1] === 'create').length, 1);
  assert.deepEqual(current.meta.slowRunIssue, {
    number: 600,
    url: 'https://github.com/MetaMask/metamask-mobile/issues/600',
    created: true,
  });
  assert.equal(current.findings[0].issue, undefined);
  assert.equal(result.issues[0].key, SLOW_RUN_KEY);
  const create = calls.find((args) => args[1] === 'create');
  const labels = create.flatMap((arg, index) => (arg === '--label' ? [create[index + 1]] : []));
  assert.deepEqual(labels, BASE_LABELS);
});

test('a failing GitHub call is recorded on the finding and does not throw', () => {
  const { runGh } = fakeGh({
    'issue list': trackedIssueJson([]),
    'issue create': new Error('HTTP 403: Resource not accessible by integration'),
  });
  const current = exception([finding()]);

  const result = syncProfilingRegressionIssues({
    exception: current,
    currentReport: currentReport(),
    repo: 'MetaMask/metamask-mobile',
    runGh,
  });

  assert.deepEqual(current.findings[0].issue, {
    error: 'HTTP 403: Resource not accessible by integration',
  });
  assert.deepEqual(result.issues, []);
});

test('a failing issue lookup marks every finding and skips creation', () => {
  const { calls, runGh } = fakeGh({
    'issue list': new Error('gh: rate limited'),
    'issue create': 'https://github.com/MetaMask/metamask-mobile/issues/1\n',
  });
  const current = exception([finding()]);

  const result = syncProfilingRegressionIssues({
    exception: current,
    currentReport: currentReport(),
    repo: 'MetaMask/metamask-mobile',
    runGh,
  });

  assert.equal(result.error, 'gh: rate limited');
  assert.deepEqual(current.findings[0].issue, { error: 'gh: rate limited' });
  assert.equal(calls.some((args) => args[1] === 'create'), false);
});

test('an all-clear run does not touch GitHub', () => {
  const { calls, runGh } = fakeGh();

  const result = syncProfilingRegressionIssues({
    exception: exception([]),
    currentReport: currentReport(),
    repo: 'MetaMask/metamask-mobile',
    runGh,
  });

  assert.deepEqual(result, { issues: [] });
  assert.deepEqual(calls, []);
});

test('listIssuesOpenedInWindow keeps the week and counts recurrences', () => {
  const inWeek = {
    number: 700,
    createdAt: '2026-09-22T06:40:00.000Z',
    marker: {
      key: 'browserstack-android|Perps_add_funds',
      kind: 'scenario',
      scenario: 'Perps add funds',
      owner: 'mm-perps-engineering-team',
      runId: '11',
      ratio: 1.7,
      jsWorkMs: 340,
      baselineMedianJsWorkMs: 200,
    },
  };
  const beforeWeek = {
    number: 690,
    createdAt: '2026-09-20T23:59:59.000Z',
    marker: { key: 'x', kind: 'scenario', scenario: 'x' },
  };
  const atUntil = {
    number: 710,
    createdAt: '2026-09-28T00:00:00.000Z',
    marker: { key: 'y', kind: 'scenario', scenario: 'y' },
  };
  const closedSlowRun = {
    number: 705,
    state: 'CLOSED',
    createdAt: '2026-09-24T12:00:00.000Z',
    closedAt: '2026-09-25T12:00:00.000Z',
    marker: {
      key: SLOW_RUN_KEY,
      kind: 'slow-run',
      scenarios: ['a', 'b', 'c'],
      runId: '12',
      maxRatio: 2.1,
    },
  };
  const { calls, runGh } = fakeGh({
    'issue list': trackedIssueJson([inWeek, beforeWeek, atUntil, closedSlowRun]),
    'issue view': (args) =>
      args[2] === '700'
        ? JSON.stringify([
            `again\n${encodeMarker(RECURRENCE_MARKER, { runId: '12' })}`,
            'a human comment',
            `again\n${encodeMarker(RECURRENCE_MARKER, { runId: '13' })}`,
          ])
        : '[]',
  });

  const items = listIssuesOpenedInWindow({
    repo: 'MetaMask/metamask-mobile',
    runGh,
    sinceIso: '2026-09-21T00:00:00.000Z',
    untilIso: '2026-09-28T00:00:00.000Z',
  });

  assert.deepEqual(
    items.map((issue) => [issue.number, issue.state, issue.recurrences]),
    [
      [700, 'open', 2],
      [705, 'closed', 0],
    ],
  );
  const list = calls.find((args) => args[1] === 'list');
  assert.equal(list[list.indexOf('--state') + 1], 'all');
  assert.match(list[list.indexOf('--search') + 1], /created:>=2026-09-21/);
  assert.equal(
    weeklyIssueBrief(items[0]),
    'Perps add funds — JS work 340.0 ms vs 200.0 ms recent median (1.7×) in run 11 · owner mm-perps-engineering-team · open, flagged 2 more times since',
  );
  assert.equal(
    weeklyIssueBrief(items[1]),
    'slow run 12: 3 scenarios over the threshold (up to 2.1×) · closed, not flagged again',
  );
});

test('a single raw capture is attached as a .cpuprofile and several files as a zip', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-profiles-'));
  const raw = path.join(directory, 'browserstack-android-Warm_Start.cpuprofile');
  const symbolicated = path.join(directory, 'symbolicated.cpuprofile');
  fs.writeFileSync(raw, '{"samples":[]}');
  fs.writeFileSync(symbolicated, '{"nodes":[]}');
  const warmStart = finding();
  const report = {
    scenarios: [
      {
        projectName: warmStart.projectName,
        scenario: warmStart.scenario,
        profiles: [{ sourcePath: raw, analysisPath: symbolicated }],
      },
      {
        projectName: 'browserstack-android',
        scenario: 'Other',
        profiles: [{ sourcePath: path.join(directory, 'missing.cpuprofile') }],
      },
    ],
  };

  assert.deepEqual(
    scenarioProfilePaths(report, warmStart).map((file) => file.archiveName),
    [
      path.join('raw', 'browserstack-android-Warm_Start.cpuprofile'),
      path.join('symbolicated', 'symbolicated.cpuprofile'),
    ],
  );
  assert.deepEqual(scenarioProfilePaths(report, finding({ scenario: 'Other' })), []);

  const output = path.join(directory, 'out');
  const zipped = packageScenarioProfiles({
    finding: warmStart,
    files: scenarioProfilePaths(report, warmStart),
    outputDirectory: output,
  });
  assert.match(path.basename(zipped), /^hermes-profile-Measure_Warm_Start.*\.zip$/);
  assert.ok(fs.statSync(zipped).size > 0);

  const onlyRaw = packageScenarioProfiles({
    finding: warmStart,
    files: [{ path: raw, archiveName: path.join('raw', path.basename(raw)) }],
    outputDirectory: output,
  });
  assert.ok(onlyRaw.endsWith('.cpuprofile'));
  assert.equal(fs.readFileSync(onlyRaw, 'utf8'), '{"samples":[]}');
  fs.rmSync(directory, { recursive: true, force: true });
});

test('uploadGitHubAttachment posts the file to the issue attachment store', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-upload-'));
  const filePath = path.join(directory, 'hermes-profile-Warm_Start.cpuprofile');
  fs.writeFileSync(filePath, '{"samples":[]}');
  const { calls, runGh } = fakeGh({
    'api --method': JSON.stringify({
      url: 'https://github.com/user-attachments/assets/abc',
    }),
  });

  const uploaded = uploadGitHubAttachment({
    filePath,
    repositoryId: 42,
    runGh,
  });

  assert.deepEqual(uploaded, {
    url: 'https://github.com/user-attachments/assets/abc',
    name: 'hermes-profile-Warm_Start.cpuprofile',
    bytes: fs.statSync(filePath).size,
  });
  const endpoint = calls[0].at(-1);
  assert.match(endpoint, /^https:\/\/uploads\.github\.com\/user-attachments\/assets\?/);
  assert.match(endpoint, /repository_id=42/);
  assert.match(endpoint, /name=hermes-profile-Warm_Start\.cpuprofile/);
  assert.equal(calls[0][calls[0].indexOf('--input') + 1], filePath);
  fs.rmSync(directory, { recursive: true, force: true });
});

test('uploadGitHubAttachment refuses a file over the 25 MB issue limit', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-upload-'));
  const filePath = path.join(directory, 'huge.cpuprofile');
  fs.writeFileSync(filePath, '');
  fs.truncateSync(filePath, 25 * 1024 * 1024 + 1);

  assert.throws(
    () =>
      uploadGitHubAttachment({
        filePath,
        repositoryId: 1,
        runGh: () => {
          throw new Error('must not upload');
        },
      }),
    /limited to 25 MB/,
  );
  fs.rmSync(directory, { recursive: true, force: true });
});

test('sync uploads the scenario profile onto the issue it opens', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-sync-'));
  const profilePath = path.join(directory, 'warm-start.cpuprofile');
  fs.writeFileSync(profilePath, '{"samples":[1]}');
  const warmStart = finding();
  const current = exception([warmStart]);
  let issueBody = '';
  const calls = [];
  const runGh = (args) => {
    calls.push(args);
    if (args[1] === 'list') {
      return trackedIssueJson([]);
    }
    if (args[1] === 'repos/MetaMask/metamask-mobile') {
      return '99';
    }
    if (args[1] === '--method') {
      return JSON.stringify({
        url: 'https://github.com/user-attachments/assets/profile',
      });
    }
    if (args[1] === 'create') {
      issueBody = fs.readFileSync(args[args.indexOf('--body-file') + 1], 'utf8');
      return 'https://github.com/MetaMask/metamask-mobile/issues/501\n';
    }
    return '';
  };

  syncProfilingRegressionIssues({
    exception: current,
    currentReport: {
      meta: { runId: '36676470722', headSha: null },
      scenarios: [
        {
          projectName: warmStart.projectName,
          scenario: warmStart.scenario,
          profiles: [{ sourcePath: profilePath }],
        },
      ],
    },
    repo: 'MetaMask/metamask-mobile',
    runGh,
    outputDirectory: directory,
  });

  assert.match(
    issueBody,
    /Hermes CPU profile: \[hermes-profile-Measure_Warm_Start__Warm_Start_to_Login_Screen\.cpuprofile\]\(https:\/\/github\.com\/user-attachments\/assets\/profile\)/,
  );
  assert.equal(
    calls.some((args) => String(args.at(-1)).includes('uploads.github.com')),
    true,
  );
  fs.rmSync(directory, { recursive: true, force: true });
});

test('a finding with no profile on disk still opens its issue and says so', () => {
  const current = exception([finding()]);
  let issueBody = '';
  const { runGh } = fakeGh({
    'issue list': trackedIssueJson([]),
    'issue create': (args) => {
      issueBody = fs.readFileSync(args[args.indexOf('--body-file') + 1], 'utf8');
      return 'https://github.com/MetaMask/metamask-mobile/issues/501\n';
    },
  });

  syncProfilingRegressionIssues({
    exception: current,
    currentReport: currentReport(),
    repo: 'MetaMask/metamask-mobile',
    runGh,
  });

  assert.match(issueBody, /Hermes CPU profile not attached: no Hermes \.cpuprofile/);
  assert.equal(current.findings[0].issue.number, 501);
});

test('weeklyIssueBrief uses singular for one recurrence', () => {
  assert.match(
    weeklyIssueBrief({
      kind: 'scenario',
      scenario: 'Cold Start',
      owner: 'metamask-mobile-platform',
      runId: '1',
      ratio: 1.5,
      jsWorkMs: 15000,
      baselineMedianJsWorkMs: 10000,
      state: 'open',
      recurrences: 1,
    }),
    /15\.0 s vs 10\.0 s .* open, flagged 1 more time since$/,
  );
});
