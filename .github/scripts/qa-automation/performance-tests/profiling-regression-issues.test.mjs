/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
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
  adfToText,
  buildRecurrenceComment,
  buildRegressionIssue,
  encodeMarker,
  fetchAppVersion,
  findOpenIssue,
  findingKey,
  issueNumberFromKey,
  listIssuesOpenedInWindow,
  listTrackedIssues,
  markdownToAdf,
  parseMarker,
  parseRecurrenceMarkers,
  packageScenarioProfiles,
  scenarioIssueLabel,
  scenarioProfilePaths,
  syncProfilingRegressionIssues,
  topFramesForScenario,
  weeklyIssueBrief,
} from './profiling-regression-issues.mjs';

const JIRA = {
  baseUrl: 'https://consensyssoftware.atlassian.net',
  email: 'bot@example.com',
  apiToken: 'token',
  configured: true,
};

const JIRA_AUTH = `Basic ${Buffer.from(`${JIRA.email}:${JIRA.apiToken}`).toString('base64')}`;

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

function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(payload);
    },
  };
}

function jiraApiIssue({
  key,
  summary = 'tracked',
  category = 'indeterminate',
  created = '2026-09-22T06:40:00.000Z',
  resolutiondate = null,
  labels = [ISSUE_MARKER],
  marker = null,
}) {
  const description = marker
    ? markdownToAdf(`intro\n\n${encodeMarker(ISSUE_MARKER, marker)}\n`)
    : markdownToAdf('no automation marker');
  return {
    id: key,
    key,
    fields: {
      summary,
      status: { statusCategory: { key: category } },
      created,
      resolutiondate,
      labels,
      description,
    },
  };
}

/**
 * Records every Jira request. `handler` returns a fetch Response.
 */
function fakeJira(handler) {
  const calls = [];
  const fetchFn = async (url, options = {}) => {
    const body =
      typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    const call = {
      url,
      method: options.method,
      headers: options.headers,
      body,
    };
    calls.push(call);
    return handler(call);
  };
  return { calls, fetchFn };
}

function createdDescriptions(calls) {
  return calls
    .filter(
      (call) =>
        call.method === 'POST' && call.url.endsWith('/rest/api/3/issue'),
    )
    .map((call) => adfToText(call.body.fields.description));
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
  assert.equal(issue.owner, 'metamask-mobile-platform');
  assert.equal(issue.jiraProject, 'MCWP');
  assert.equal(issue.key, 'browserstack-android|Measure_Warm_Start__Warm_Start_to_Login_Screen');
  assert.deepEqual(issue.labels, [
    ...BASE_LABELS,
    'team-mobile-platform',
    ISSUE_MARKER,
    scenarioIssueLabel(issue.key),
  ]);
  for (const section of BUG_REPORT_SECTIONS) {
    assert.ok(issue.body.includes(`${section}\n`), `missing ${section}`);
  }
  // Sections are in template order.
  const positions = BUG_REPORT_SECTIONS.map((section) => issue.body.indexOf(section));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  assert.match(issue.body, /\*\*20\.4 s\*\* against a \*\*12\.2 s\*\* average/);
  assert.match(
    issue.body,
    /flagged only after two consecutive runs over the threshold/,
  );
  assert.match(issue.body, /\*\*1\.68×\*\*, threshold 1\.5×/);
  assert.match(issue.body, /Owner: `metamask-mobile-platform` \(@MetaMask\/mobile-platform\)/);
  assert.match(
    issue.body,
    /Jira project: `MCWP`\. Filed directly in that project\./,
  );
  assert.match(issue.body, /Team tag: `team-mobile-platform`\./);
  assert.equal(
    parseMarker(adfToText(markdownToAdf(issue.body)), ISSUE_MARKER)?.key,
    issue.key,
  );
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

test('Rewards is filed in RWDS without a team label or GitHub mention', () => {
  const rewards = finding({
    scenario: 'Rewards_tab_time-to-content',
    owner: 'performance-team',
  });
  const issue = buildRegressionIssue({
    finding: rewards,
    exception: exception([rewards]),
    currentReport: { meta: { runId: '1' }, scenarios: [] },
  });

  assert.equal(issue.jiraProject, 'RWDS');
  assert.deepEqual(issue.labels, [
    ...BASE_LABELS,
    ISSUE_MARKER,
    scenarioIssueLabel(issue.key),
  ]);
  assert.match(issue.body, /Owner: `performance-team`\n/);
  assert.match(issue.body, /Jira project: `RWDS`/);
  assert.doesNotMatch(issue.body, /Team tag:/);
  assert.doesNotMatch(issue.body, /@MetaMask\//);
  assert.match(issue.body, /### Version\n\nNot resolved: the performance run reported no head commit/);
  assert.match(issue.body, /### Build number\n\nNot a store build: CI `main-e2e` build\n/);
});

test('recurrence comments carry the run and a machine-readable marker', () => {
  const scenarioComment = buildRecurrenceComment({
    exception: exception([finding()]),
    finding: finding(),
  });

  assert.match(scenarioComment, /Flagged again in performance run \[36676470722\]/);
  assert.match(scenarioComment, /20\.4 s vs 12\.2 s recent average \(1\.68× across 2 baseline runs\)/);
  assert.deepEqual(parseRecurrenceMarkers(scenarioComment), [
    {
      runId: '36676470722',
      ratio: 1.68,
      jsWorkMs: 20359,
      baselineMedianJsWorkMs: 12152,
      detectedAt: '2026-09-23T06:40:00.000Z',
    },
  ]);
});

test('issueNumberFromKey reads the numeric suffix of a Jira key', () => {
  assert.equal(issueNumberFromKey('MCWP-12345'), 12345);
  assert.equal(issueNumberFromKey('not a key'), null);
});

test('listTrackedIssues reads the dedupe label and the marker', async () => {
  const { calls, fetchFn } = fakeJira((call) => {
  assert.match(call.body.jql, /labels = "hermes-profile-regression"/);
  assert.match(call.body.jql, /summary ~ "\\"Hermes JS work regression\\""/);
  assert.match(call.body.jql, /statusCategory != Done/);
    return jsonResponse(200, {
      isLast: true,
      issues: [
        jiraApiIssue({ key: 'MCWP-1', summary: 'hand written' }),
        jiraApiIssue({
          key: 'MCWP-2',
          marker: { key: 'a|b' },
          labels: [ISSUE_MARKER, 'type-bug'],
        }),
      ],
    });
  });

  const tracked = await listTrackedIssues({ jira: JIRA, fetchFn });

  assert.deepEqual(
    tracked.map((issue) => [
      issue.jiraKey,
      issue.state,
      issue.marker?.key || null,
      issue.labels,
    ]),
    [
      ['MCWP-1', 'open', null, [ISSUE_MARKER]],
      ['MCWP-2', 'open', 'a|b', [ISSUE_MARKER, 'type-bug']],
    ],
  );
  assert.equal(calls[0].headers.Authorization, JIRA_AUTH);
  assert.equal(calls[0].headers['Content-Type'], 'application/json');
});

test('findOpenIssue prefers the owning project, then the newest ticket', () => {
  const issues = [
    {
      jiraKey: 'MCWP-50000',
      state: 'open',
      marker: { key: 'k' },
      labels: [],
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    {
      jiraKey: 'TAT-80',
      state: 'open',
      marker: { key: 'k' },
      labels: [],
      createdAt: '2026-09-20T00:00:00.000Z',
    },
    {
      jiraKey: 'MCWP-50001',
      state: 'open',
      marker: { key: 'k' },
      labels: [],
      createdAt: '2026-09-25T00:00:00.000Z',
    },
    {
      jiraKey: 'TAT-9',
      state: 'closed',
      marker: { key: 'k' },
      labels: [],
      createdAt: '2026-09-21T00:00:00.000Z',
    },
    {
      jiraKey: 'MCWP-11',
      state: 'open',
      marker: { key: 'other' },
      labels: [],
      createdAt: '2026-09-22T00:00:00.000Z',
    },
    {
      jiraKey: 'RWDS-4',
      state: 'open',
      marker: null,
      labels: [scenarioIssueLabel('label-only')],
      createdAt: '2026-09-03T00:00:00.000Z',
    },
  ];

  assert.equal(findOpenIssue(issues, 'k', { projectKey: 'TAT' }).jiraKey, 'TAT-80');
  assert.equal(
    findOpenIssue(issues, 'k', { projectKey: 'MCWP' }).jiraKey,
    'MCWP-50001',
  );
  assert.equal(findOpenIssue(issues, 'k').jiraKey, 'MCWP-50001');
  assert.equal(findOpenIssue(issues, 'missing'), null);
  assert.equal(findOpenIssue(issues, 'label-only').jiraKey, 'RWDS-4');
  const titled = [
    {
      jiraKey: 'MCWP-8',
      state: 'open',
      marker: null,
      labels: [],
      title: 'Same',
      createdAt: '2026-09-22T00:00:00.000Z',
    },
    {
      jiraKey: 'TAT-2',
      state: 'open',
      marker: null,
      labels: [],
      title: 'Same',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
  ];
  assert.equal(
    findOpenIssue(titled, 'other-key', { title: 'Same', projectKey: 'TAT' })
      .jiraKey,
    'TAT-2',
  );
  assert.equal(
    findOpenIssue(titled, 'other-key', { title: 'Same', projectKey: 'SWAPS' }),
    null,
  );
});

test('fetchAppVersion decodes package.json at the profiled commit', () => {
  const encoded = Buffer.from(JSON.stringify({ version: '7.61.0' })).toString(
    'base64',
  );
  const { calls, runGh } = fakeGh({
    'api repos/MetaMask/metamask-mobile/contents/package.json?ref=abc': `${encoded.slice(0, 10)}\n${encoded.slice(10)}`,
  });

  assert.equal(
    fetchAppVersion({ repo: 'MetaMask/metamask-mobile', sha: 'abc', runGh }),
    '7.61.0',
  );
  assert.equal(calls.length, 1);
  assert.equal(fetchAppVersion({ repo: 'r', sha: null, runGh }), null);
  assert.equal(fetchAppVersion({ repo: 'r', sha: 'zzz' }), null);
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

test('sync opens a new Jira ticket for a first-time finding and records it on the finding', async () => {
  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-issues-'));
  const { calls, fetchFn } = fakeJira((call) => {
    if (call.url.endsWith('/search/jql')) {
      return jsonResponse(200, { issues: [], isLast: true });
    }
    if (call.method === 'POST' && call.url.endsWith('/rest/api/3/issue')) {
      return jsonResponse(201, { id: '10001', key: 'MCWP-501' });
    }
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  const current = exception([finding()]);

  const result = await syncProfilingRegressionIssues({
    exception: current,
    currentReport: currentReport(),
    frames: FRAMES,
    aiText: null,
    repo: 'MetaMask/metamask-mobile',
    fetchFn,
    jira: JIRA,
    outputDirectory,
  });

  assert.deepEqual(current.findings[0].issue, {
    jiraKey: 'MCWP-501',
    number: 501,
    url: 'https://consensyssoftware.atlassian.net/browse/MCWP-501',
    created: true,
  });
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].owner, 'metamask-mobile-platform');
  assert.equal(result.issues[0].jiraProject, 'MCWP');
  const create = calls.find(
    (call) => call.method === 'POST' && call.url.endsWith('/rest/api/3/issue'),
  );
  assert.equal(create.body.fields.project.key, 'MCWP');
  assert.equal(create.body.fields.issuetype.name, 'Bug');
  assert.equal(
    create.body.fields.summary,
    `${ISSUE_TITLE_PREFIX} — Measure Warm Start: Warm Start to Login Screen`,
  );
  assert.deepEqual(create.body.fields.labels, [
    ...BASE_LABELS,
    'team-mobile-platform',
    ISSUE_MARKER,
    scenarioIssueLabel(findingKey(finding())),
  ]);
  assert.equal(
    calls.some((call) => call.url.endsWith('/comment')),
    false,
  );
  const written = JSON.parse(
    fs.readFileSync(path.join(outputDirectory, 'jira-issues.json'), 'utf8'),
  );
  assert.equal(written[0].jiraKey, 'MCWP-501');
  fs.rmSync(outputDirectory, { recursive: true, force: true });
});

test('sync comments on an open ticket for the same finding instead of opening another', async () => {
  const key = findingKey(finding());
  const { calls, fetchFn } = fakeJira((call) => {
    if (call.url.endsWith('/search/jql')) {
      return jsonResponse(200, {
        isLast: true,
        issues: [
          jiraApiIssue({
            key: 'MCWP-400',
            marker: { key, kind: 'scenario' },
            labels: [ISSUE_MARKER, scenarioIssueLabel(key)],
          }),
        ],
      });
    }
    if (call.url.endsWith('/comment') && call.method === 'POST') {
      return jsonResponse(201, { id: '1' });
    }
    if (call.method === 'POST' && call.url.endsWith('/rest/api/3/issue')) {
      throw new Error('must not create');
    }
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  const current = exception([finding()]);

  await syncProfilingRegressionIssues({
    exception: current,
    currentReport: currentReport(),
    repo: 'MetaMask/metamask-mobile',
    fetchFn,
    jira: JIRA,
  });

  assert.deepEqual(current.findings[0].issue, {
    jiraKey: 'MCWP-400',
    number: 400,
    url: 'https://consensyssoftware.atlassian.net/browse/MCWP-400',
    created: false,
  });
  const comment = calls.find((call) => call.url.endsWith('/comment'));
  assert.match(comment.url, /\/issue\/MCWP-400\/comment$/);
  assert.match(adfToText(comment.body.body), /Flagged again/);
  assert.equal(
    calls.some(
      (call) => call.method === 'POST' && call.url.endsWith('/rest/api/3/issue'),
    ),
    false,
  );
});

test('a closed ticket for the same finding does not stop a new one', async () => {
  const { calls, fetchFn } = fakeJira((call) => {
    if (call.url.endsWith('/search/jql')) {
      return jsonResponse(200, {
        isLast: true,
        issues: [
          jiraApiIssue({
            key: 'MCWP-12',
            category: 'done',
            marker: { key: findingKey(finding()) },
          }),
        ],
      });
    }
    if (call.method === 'POST' && call.url.endsWith('/rest/api/3/issue')) {
      return jsonResponse(201, { id: '2', key: 'MCWP-502' });
    }
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  const current = exception([finding()]);

  await syncProfilingRegressionIssues({
    exception: current,
    currentReport: currentReport(),
    fetchFn,
    jira: JIRA,
  });

  assert.equal(current.findings[0].issue.created, true);
  assert.equal(current.findings[0].issue.jiraKey, 'MCWP-502');
  assert.equal(
    calls.filter(
      (call) => call.method === 'POST' && call.url.endsWith('/rest/api/3/issue'),
    ).length,
    1,
  );
});

test('several findings in one run each open their own ticket in the owning project', async () => {
  const keys = { MCWP: 'MCWP-600', TAT: 'TAT-601' };
  const { calls, fetchFn } = fakeJira((call) => {
    if (call.url.endsWith('/search/jql')) {
      return jsonResponse(200, { issues: [], isLast: true });
    }
    if (call.method === 'POST' && call.url.endsWith('/rest/api/3/issue')) {
      return jsonResponse(201, {
        id: call.body.fields.project.key,
        key: keys[call.body.fields.project.key],
      });
    }
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });
  const current = exception([
    finding(),
    finding({
      scenario: 'Perps_add_funds',
      owner: 'mm-perps-engineering-team',
      ratio: 2,
    }),
  ]);

  const result = await syncProfilingRegressionIssues({
    exception: current,
    currentReport: currentReport(),
    fetchFn,
    jira: JIRA,
  });

  const creates = calls.filter(
    (call) => call.method === 'POST' && call.url.endsWith('/rest/api/3/issue'),
  );
  assert.equal(creates.length, 2);
  assert.equal(creates[0].body.fields.project.key, 'MCWP');
  assert.equal(creates[1].body.fields.project.key, 'TAT');
  assert.ok(creates[0].body.fields.labels.includes('team-mobile-platform'));
  assert.ok(creates[1].body.fields.labels.includes('team-perps'));
  assert.equal(current.findings[0].issue.jiraKey, 'MCWP-600');
  assert.equal(current.findings[1].issue.jiraKey, 'TAT-601');
  assert.equal(result.issues.length, 2);
  const bodies = createdDescriptions(calls);
  assert.match(bodies[0], /Warm Start to Login Screen/);
  assert.match(bodies[1], /Perps add funds/);
});

test('several findings keep only the proposal lines that name that scenario', async () => {
  const { calls, fetchFn } = fakeJira((call) => {
    if (call.url.endsWith('/search/jql')) {
      return jsonResponse(200, { issues: [], isLast: true });
    }
    return jsonResponse(201, {
      id: String(createdDescriptions(calls).length + 1),
      key: `MCWP-${createdDescriptions(calls).length + 1}`,
    });
  });
  const proposal = [
    '• Measure Warm Start: Warm Start to Login Screen — memoized dominates',
    '• Perps add funds — usePerpsOrderForm dominates',
    '• shared note that names no scenario',
  ].join('\n');

  await syncProfilingRegressionIssues({
    exception: exception([
      finding(),
      finding({
        scenario: 'Perps_add_funds',
        owner: 'mm-perps-engineering-team',
        ratio: 2,
      }),
    ]),
    currentReport: currentReport(),
    aiText: proposal,
    fetchFn,
    jira: JIRA,
  });

  const bodies = createdDescriptions(calls);
  assert.match(bodies[0], /memoized dominates/);
  assert.doesNotMatch(bodies[0], /usePerpsOrderForm/);
  assert.doesNotMatch(bodies[0], /shared note/);
  assert.match(bodies[1], /usePerpsOrderForm/);
  assert.doesNotMatch(bodies[1], /memoized dominates/);
  assert.doesNotMatch(bodies[1], /shared note/);
});

test('a proposal that names no scenario is left off every ticket in a multi-finding run', async () => {
  let next = 1;
  const { calls, fetchFn } = fakeJira((call) => {
    if (call.url.endsWith('/search/jql')) {
      return jsonResponse(200, { issues: [], isLast: true });
    }
    const key = `MCWP-${next}`;
    next += 1;
    return jsonResponse(201, { id: key, key });
  });

  await syncProfilingRegressionIssues({
    exception: exception([
      finding(),
      finding({
        scenario: 'Perps_add_funds',
        owner: 'mm-perps-engineering-team',
      }),
    ]),
    currentReport: currentReport(),
    aiText: '• reselect is hot somewhere',
    fetchFn,
    jira: JIRA,
  });

  const bodies = createdDescriptions(calls);
  assert.equal(bodies.length, 2);
  assert.doesNotMatch(bodies[0], /AI proposal/);
  assert.doesNotMatch(bodies[1], /AI proposal/);
  assert.doesNotMatch(bodies[0], /reselect is hot/);
  assert.doesNotMatch(bodies[1], /reselect is hot/);
});

test('one finding still gets the full proposal', async () => {
  const { calls, fetchFn } = fakeJira((call) => {
    if (call.url.endsWith('/search/jql')) {
      return jsonResponse(200, { issues: [], isLast: true });
    }
    return jsonResponse(201, { id: '1', key: 'MCWP-501' });
  });

  await syncProfilingRegressionIssues({
    exception: exception([finding()]),
    currentReport: currentReport(),
    aiText: '• reselect memoized dominates self time',
    fetchFn,
    jira: JIRA,
  });

  const [body] = createdDescriptions(calls);
  assert.match(body, /AI proposal \(profiling evidence only; not a root cause\)/);
  assert.match(body, /reselect memoized dominates self time/);
});

test('a failing Jira create is recorded on the finding and does not throw', async () => {
  const { fetchFn } = fakeJira((call) => {
    if (call.url.endsWith('/search/jql')) {
      return jsonResponse(200, { issues: [], isLast: true });
    }
    return jsonResponse(403, {
      errorMessages: ['Resource not accessible by integration'],
    });
  });
  const current = exception([finding()]);

  const result = await syncProfilingRegressionIssues({
    exception: current,
    currentReport: currentReport(),
    fetchFn,
    jira: JIRA,
  });

  assert.deepEqual(current.findings[0].issue, {
    error: 'Jira HTTP 403: Resource not accessible by integration',
  });
  assert.deepEqual(result.issues, []);
});

test('a failing ticket lookup marks every finding and skips creation', async () => {
  const { calls, fetchFn } = fakeJira(() =>
    jsonResponse(429, { message: 'rate limited' }),
  );
  const current = exception([finding()]);

  const result = await syncProfilingRegressionIssues({
    exception: current,
    currentReport: currentReport(),
    fetchFn,
    jira: JIRA,
  });

  assert.equal(result.error, 'Jira HTTP 429: rate limited');
  assert.deepEqual(current.findings[0].issue, {
    error: 'Jira HTTP 429: rate limited',
  });
  assert.equal(
    calls.some(
      (call) => call.method === 'POST' && call.url.endsWith('/rest/api/3/issue'),
    ),
    false,
  );
});

test('missing Jira credentials skip ticket creation without calling Jira', async () => {
  let called = false;
  const current = exception([finding()]);
  const result = await syncProfilingRegressionIssues({
    exception: current,
    currentReport: currentReport(),
    fetchFn: async () => {
      called = true;
      throw new Error('must not call Jira');
    },
    jira: { ...JIRA, email: '', apiToken: '', configured: false },
  });

  assert.equal(called, false);
  assert.deepEqual(result, { issues: [], skipped: true });
  assert.equal(current.findings[0].issue, undefined);
});

test('an all-clear run does not call Jira', async () => {
  let called = false;
  const result = await syncProfilingRegressionIssues({
    exception: exception([]),
    currentReport: currentReport(),
    fetchFn: async () => {
      called = true;
      throw new Error('must not call Jira');
    },
    jira: JIRA,
  });

  assert.deepEqual(result, { issues: [] });
  assert.equal(called, false);
});

test('listIssuesOpenedInWindow keeps the week and counts recurrences', async () => {
  const inWeek = jiraApiIssue({
    key: 'TAT-700',
    created: '2026-09-22T06:40:00.000Z',
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
  });
  const beforeWeek = jiraApiIssue({
    key: 'TAT-690',
    created: '2026-09-20T23:59:59.000Z',
    marker: { key: 'x', kind: 'scenario', scenario: 'x' },
  });
  const atUntil = jiraApiIssue({
    key: 'TAT-710',
    created: '2026-09-28T00:00:00.000Z',
    marker: { key: 'y', kind: 'scenario', scenario: 'y' },
  });
  const closedSlowRun = jiraApiIssue({
    key: 'MCWP-705',
    category: 'done',
    created: '2026-09-24T12:00:00.000Z',
    resolutiondate: '2026-09-25T12:00:00.000Z',
    marker: {
      key: SLOW_RUN_KEY,
      kind: 'slow-run',
      scenarios: ['a', 'b', 'c'],
      runId: '12',
      maxRatio: 2.1,
    },
  });
  const { calls, fetchFn } = fakeJira((call) => {
    if (call.url.endsWith('/search/jql')) {
      assert.doesNotMatch(call.body.jql, /statusCategory/);
      assert.match(call.body.jql, /created >= "2026-09-20"/);
      return jsonResponse(200, {
        isLast: true,
        issues: [inWeek, beforeWeek, atUntil, closedSlowRun],
      });
    }
    if (call.url.includes('/issue/TAT-700/comment')) {
      return jsonResponse(200, {
        total: 3,
        comments: [
          {
            body: markdownToAdf(
              `again\n${encodeMarker(RECURRENCE_MARKER, { runId: '12' })}`,
            ),
          },
          { body: markdownToAdf('a human comment') },
          {
            body: markdownToAdf(
              `again\n${encodeMarker(RECURRENCE_MARKER, { runId: '13' })}`,
            ),
          },
        ],
      });
    }
    if (call.url.includes('/comment')) {
      return jsonResponse(200, { total: 0, comments: [] });
    }
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });

  const items = await listIssuesOpenedInWindow({
    jira: JIRA,
    fetchFn,
    sinceIso: '2026-09-21T00:00:00.000Z',
    untilIso: '2026-09-28T00:00:00.000Z',
  });

  assert.deepEqual(
    items.map((issue) => [issue.jiraKey, issue.state, issue.recurrences]),
    [
      ['TAT-700', 'open', 2],
      ['MCWP-705', 'closed', 0],
    ],
  );
  assert.equal(calls[0].method, 'POST');
  assert.equal(
    weeklyIssueBrief(items[0]),
    'Perps add funds — JS work 340.0 ms vs 200.0 ms recent baseline (1.7×) in run 11 · owner mm-perps-engineering-team · open, flagged 2 more times since',
  );
  assert.equal(
    weeklyIssueBrief(items[1]),
    'slow run 12: 3 scenarios over the threshold (up to 2.1×) · closed, not flagged again',
  );
});

test('sync uploads the scenario profile onto the ticket it opens', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-sync-'));
  const profilePath = path.join(directory, 'warm-start.cpuprofile');
  fs.writeFileSync(profilePath, '{"samples":[1]}');
  const warmStart = finding();
  const current = exception([warmStart]);
  const { calls, fetchFn } = fakeJira((call) => {
    if (call.url.endsWith('/search/jql')) {
      return jsonResponse(200, { issues: [], isLast: true });
    }
    if (call.method === 'POST' && call.url.endsWith('/rest/api/3/issue')) {
      return jsonResponse(201, { id: '1', key: 'MCWP-501' });
    }
    if (call.url.endsWith('/attachments')) {
      return jsonResponse(200, [{ filename: 'profile.cpuprofile' }]);
    }
    throw new Error(`unexpected ${call.method} ${call.url}`);
  });

  await syncProfilingRegressionIssues({
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
    fetchFn,
    jira: JIRA,
    outputDirectory: directory,
  });

  const [body] = createdDescriptions(calls);
  assert.match(
    body,
    /Hermes CPU profile attached: hermes-profile-Measure_Warm_Start__Warm_Start_to_Login_Screen\.cpuprofile/,
  );
  const upload = calls.find((call) => call.url.endsWith('/attachments'));
  assert.equal(upload.headers['X-Atlassian-Token'], 'no-check');
  assert.equal(upload.headers['Content-Type'], undefined);
  assert.match(upload.url, /\/issue\/MCWP-501\/attachments$/);
  assert.equal(upload.body instanceof FormData, true);
  const file = upload.body.get('file');
  assert.equal(
    file.name,
    'hermes-profile-Measure_Warm_Start__Warm_Start_to_Login_Screen.cpuprofile',
  );
  fs.rmSync(directory, { recursive: true, force: true });
});

test('a profile over the Jira size limit links the workflow artifact instead', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-big-'));
  const profilePath = path.join(directory, 'warm-start.cpuprofile');
  fs.writeFileSync(profilePath, '{"samples":[1]}');
  const warmStart = finding();
  const { calls, fetchFn } = fakeJira((call) => {
    if (call.url.endsWith('/search/jql')) {
      return jsonResponse(200, { issues: [], isLast: true });
    }
    if (call.url.endsWith('/attachments')) {
      throw new Error('must not upload');
    }
    return jsonResponse(201, { id: '1', key: 'MCWP-501' });
  });

  await syncProfilingRegressionIssues({
    exception: exception([warmStart]),
    currentReport: {
      meta: {
        runId: '36676470722',
        analysisArtifactsUrl:
          'https://github.com/MetaMask/metamask-mobile/actions/runs/1#artifacts',
      },
      scenarios: [
        {
          projectName: warmStart.projectName,
          scenario: warmStart.scenario,
          profiles: [{ sourcePath: profilePath }],
        },
      ],
    },
    fetchFn,
    jira: JIRA,
    attachmentByteLimit: 1,
    outputDirectory: directory,
  });

  const [body] = createdDescriptions(calls);
  assert.match(body, /over the 1 byte Jira attachment limit/);
  assert.match(body, /actions\/runs\/1#artifacts/);
  assert.equal(
    calls.some((call) => call.url.endsWith('/attachments')),
    false,
  );
  fs.rmSync(directory, { recursive: true, force: true });
});

test('a finding with no profile on disk still opens its ticket and says so', async () => {
  const current = exception([finding()]);
  const { calls, fetchFn } = fakeJira((call) => {
    if (call.url.endsWith('/search/jql')) {
      return jsonResponse(200, { issues: [], isLast: true });
    }
    return jsonResponse(201, { id: '1', key: 'MCWP-501' });
  });

  await syncProfilingRegressionIssues({
    exception: current,
    currentReport: currentReport(),
    fetchFn,
    jira: JIRA,
  });

  const [body] = createdDescriptions(calls);
  assert.match(body, /Hermes CPU profile not attached: no Hermes \.cpuprofile/);
  assert.equal(current.findings[0].issue.jiraKey, 'MCWP-501');
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
