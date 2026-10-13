/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildIsolationPullRequest,
  findingsForOverlappingPull,
  isolationBranchName,
  openProfilingIsolationDrafts,
} from './profiling-isolation-drafts.mjs';

const PERPS_FILE = 'app/components/UI/Perps/hooks/usePerpsOrderForm.ts';

function finding(overrides = {}) {
  return {
    projectName: 'browserstack-android',
    scenario: 'Perps_add_funds',
    owner: 'mm-perps-engineering-team',
    jsWorkMs: 12600,
    baselineMedianJsWorkMs: 3000,
    ratio: 4.2,
    baselineRuns: 3,
    issue: {
      number: 501,
      url: 'https://github.com/MetaMask/metamask-mobile/issues/501',
      created: true,
    },
    ...overrides,
  };
}

function currentReport() {
  return {
    meta: {
      runId: '99',
      runUrl: 'https://github.com/MetaMask/metamask-mobile/actions/runs/99',
      createdAt: '2026-09-23T12:00:00.000Z',
    },
    scenarios: [
      {
        projectName: 'browserstack-android',
        scenario: 'Perps_add_funds',
        profiles: [
          {
            skillAudit: {
              topSwapsFrames: [
                {
                  name: 'usePerpsOrderForm',
                  url: PERPS_FILE,
                  line: 40,
                  selfMs: 800,
                },
              ],
              topNonSwapsFrames: [],
            },
          },
        ],
      },
      {
        projectName: 'browserstack-android',
        scenario: 'Wallet_home',
        profiles: [
          {
            skillAudit: {
              topSwapsFrames: [
                {
                  name: 'WalletHome',
                  url: 'app/components/Views/Wallet/index.tsx',
                  line: 1,
                  selfMs: 50,
                },
              ],
              topNonSwapsFrames: [],
            },
          },
        ],
      },
    ],
  };
}

function exceptionFor(findings) {
  return {
    meta: {
      hasFindings: findings.length > 0,
      runId: '99',
      runUrl: 'https://github.com/MetaMask/metamask-mobile/actions/runs/99',
    },
    findings,
  };
}

function mergedPull(number, mergedAt, files) {
  return {
    number,
    title: `Change ${number}`,
    url: `https://github.com/MetaMask/metamask-mobile/pull/${number}`,
    mergedAt,
    files,
  };
}

function perpsFiles() {
  return [
    { path: PERPS_FILE, patch: '+changed' },
    { path: 'README.md', patch: '+docs' },
  ];
}

function fakeGh({ pulls, openPulls = [], mergeSha = 'abc123', onCreate, onComment }) {
  const calls = [];
  const runGh = (args) => {
    calls.push(args);
    if (args[0] === 'pr' && args[1] === 'list' && args.includes('--state') && args[args.indexOf('--state') + 1] === 'merged') {
      return JSON.stringify(
        pulls.map(({ files, ...pull }) => pull),
      );
    }
    if (args[0] === 'api') {
      const number = Number(args.join(' ').match(/pulls\/(\d+)/)?.[1]);
      const pull = pulls.find((candidate) => candidate.number === number);
      return JSON.stringify(pull?.files || []);
    }
    if (args[0] === 'pr' && args[1] === 'list' && args.includes('open')) {
      const branch = args[args.indexOf('--head') + 1];
      return JSON.stringify(
        openPulls.filter((pull) => pull.headRefName === branch),
      );
    }
    if (args[0] === 'pr' && args[1] === 'view') {
      const number = args[2];
      const sha = typeof mergeSha === 'function' ? mergeSha(number) : mergeSha;
      return `${sha}\n`;
    }
    if (args[0] === 'pr' && args[1] === 'create') {
      const body = fs.readFileSync(args[args.indexOf('--body-file') + 1], 'utf8');
      const created = onCreate
        ? onCreate(args, body)
        : 'https://github.com/MetaMask/metamask-mobile/pull/900\n';
      return created;
    }
    if (args[0] === 'issue' && args[1] === 'comment') {
      const body = fs.readFileSync(args[args.indexOf('--body-file') + 1], 'utf8');
      if (onComment) {
        onComment(args, body);
      }
      return 'ok\n';
    }
    throw new Error(`unexpected gh ${args.join(' ')}`);
  };
  return { calls, runGh };
}

function fakeGit({ merge = false, failRevert = false, rejectFirstPush = false } = {}) {
  const calls = [];
  let pushed = false;
  const runGit = (args) => {
    calls.push(args);
    if (args[0] === 'rev-list') {
      return merge ? 'abc123 parent1 parent2\n' : 'abc123 parent1\n';
    }
    if (args.includes('revert')) {
      if (failRevert) {
        throw new Error('revert conflict in usePerpsOrderForm.ts');
      }
      return '';
    }
    if (args[0] === 'push' && !args.includes('--force-with-lease')) {
      if (rejectFirstPush && !pushed) {
        pushed = true;
        throw new Error('non-fast-forward');
      }
    }
    return '';
  };
  return { calls, runGit };
}

function openDrafts({
  findings,
  pulls,
  previousRun = { createdAt: '2026-09-23T06:00:00.000Z' },
  ...rest
}) {
  const gh = fakeGh({ pulls, ...rest });
  const git = fakeGit(rest);
  const outputDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'isolation-drafts-'),
  );
  const exception = exceptionFor(findings);
  const result = openProfilingIsolationDrafts({
    exception,
    currentReport: currentReport(),
    previousRun,
    repo: 'MetaMask/metamask-mobile',
    aiText: rest.aiText || null,
    runGh: gh.runGh,
    runGit: git.runGit,
    outputDirectory,
  });
  return { exception, result, gh, git, outputDirectory };
}

test('the draft body isolates one overlapping pull request and does not close the bug', () => {
  const perps = finding();
  const wallet = finding({
    scenario: 'Wallet_home',
    issue: {
      number: 502,
      url: 'https://github.com/MetaMask/metamask-mobile/issues/502',
      created: true,
    },
  });
  const frames = [
    { scenario: 'Perps_add_funds', url: PERPS_FILE },
    { scenario: 'Wallet_home', url: 'app/components/Views/Wallet/index.tsx' },
  ];
  const pull = {
    number: 10,
    overlappingFiles: [{ path: PERPS_FILE, patch: '+changed' }],
  };

  assert.equal(isolationBranchName(10), 'revert/10_isolate-hermes-js-regression');
  assert.deepEqual(
    findingsForOverlappingPull(pull, frames, [perps, wallet]).map(
      (item) => item.scenario,
    ),
    ['Perps_add_funds'],
  );

  const pullRequest = buildIsolationPullRequest({
    pull,
    findings: [perps],
    runUrl: 'https://github.com/MetaMask/metamask-mobile/actions/runs/99',
    aiText: '• <#10> overlaps usePerpsOrderForm',
  });

  assert.equal(
    pullRequest.title,
    'revert: isolate #10 to check a Hermes JS regression',
  );
  assert.match(pullRequest.body, /<!-- profiling-isolation-source: 10 -->/);
  assert.match(pullRequest.body, /hypothesis, not a confirmed cause/);
  assert.match(pullRequest.body, /until a person pushes to the branch/);
  assert.match(pullRequest.body, /Refs: #501/);
  assert.match(pullRequest.body, /^Fixes:[ \t]*$/m);
  assert.doesNotMatch(pullRequest.body, /^Fixes:[ \t]+\S/m);
  assert.match(pullRequest.body, new RegExp(PERPS_FILE.replaceAll('/', '\\/')));
  assert.doesNotMatch(pullRequest.body, /README\.md/);
  assert.doesNotMatch(pullRequest.body, /Wallet home/);
  assert.match(pullRequest.body, /usePerpsOrderForm/);
  assert.match(pullRequest.body, /CHANGELOG entry: null/);
});

test('no overlapping pull request does not fetch or open a draft', () => {
  const { result, git, gh } = openDrafts({
    findings: [finding()],
    pulls: [
      mergedPull(11, '2026-09-23T09:00:00.000Z', [
        { path: 'docs/readme.md', patch: '+hello' },
      ]),
    ],
  });

  assert.deepEqual(result.pulls, []);
  assert.equal(git.calls.length, 0);
  assert.equal(
    gh.calls.some((args) => args[1] === 'create'),
    false,
  );
});

test('a missing previous run does not query merged pull requests', () => {
  const { result, gh, git } = openDrafts({
    findings: [finding()],
    pulls: [],
    previousRun: null,
  });

  assert.deepEqual(result.pulls, []);
  assert.equal(gh.calls.length, 0);
  assert.equal(git.calls.length, 0);
});

test('an overlapping pull request becomes one draft revert and a bug comment', () => {
  let body = '';
  const comments = [];
  const { exception, result, git, outputDirectory } = openDrafts({
    findings: [
      finding(),
      finding({
        scenario: 'Wallet_home',
        issue: {
          number: 502,
          url: 'https://github.com/MetaMask/metamask-mobile/issues/502',
          created: true,
        },
      }),
    ],
    pulls: [mergedPull(10, '2026-09-23T09:00:00.000Z', perpsFiles())],
    aiText: '• isolate the overlapping file',
    onCreate: (args, pullBody) => {
      body = pullBody;
      assert.ok(args.includes('--draft'));
      assert.equal(
        args[args.indexOf('--head') + 1],
        'revert/10_isolate-hermes-js-regression',
      );
      return 'https://github.com/MetaMask/metamask-mobile/pull/900\n';
    },
    onComment: (_args, comment) => {
      comments.push(comment);
    },
  });

  assert.equal(result.pulls[0].url, 'https://github.com/MetaMask/metamask-mobile/pull/900');
  assert.equal(result.pulls[0].created, true);
  assert.equal(exception.findings[0].isolation.number, 900);
  assert.equal(exception.findings[1].isolation, undefined);
  assert.match(body, /Refs: #501/);
  assert.doesNotMatch(body, /#502/);
  assert.doesNotMatch(body, /README\.md/);
  assert.match(comments[0], /pull\/900/);
  assert.match(comments[0], /not a confirmed cause/);
  const revert = git.calls.find((args) => args.includes('revert'));
  assert.ok(revert.includes('abc123'));
  assert.equal(revert.includes('-m'), false);
  assert.ok(
    git.calls.some(
      (args) =>
        args[0] === 'push' &&
        args.includes('revert/10_isolate-hermes-js-regression') &&
        !args.includes('main'),
    ),
  );
  const saved = JSON.parse(
    fs.readFileSync(path.join(outputDirectory, 'github-isolation-drafts.json'), 'utf8'),
  );
  assert.equal(saved[0].number, 900);
});

test('a merge commit is reverted with the first parent', () => {
  const { git } = openDrafts({
    findings: [finding()],
    pulls: [mergedPull(10, '2026-09-23T09:00:00.000Z', perpsFiles())],
    merge: true,
  });
  const revert = git.calls.find((args) => args.includes('revert'));
  assert.deepEqual(revert.slice(revert.indexOf('-m'), revert.indexOf('-m') + 2), [
    '-m',
    '1',
  ]);
});

test('an open isolation draft is reused without another revert', () => {
  const comments = [];
  const { result, git } = openDrafts({
    findings: [finding({ issue: { number: 501, url: 'https://github.com/MetaMask/metamask-mobile/issues/501', created: false } })],
    pulls: [mergedPull(10, '2026-09-23T09:00:00.000Z', perpsFiles())],
    openPulls: [
      {
        number: 77,
        url: 'https://github.com/MetaMask/metamask-mobile/pull/77',
        isDraft: true,
        headRefName: 'revert/10_isolate-hermes-js-regression',
      },
    ],
    onComment: (_args, comment) => comments.push(comment),
  });

  assert.equal(result.pulls[0].number, 77);
  assert.equal(result.pulls[0].created, false);
  assert.equal(comments.length, 0);
  assert.equal(
    git.calls.some((args) => args.includes('revert') || args[0] === 'push'),
    false,
  );
});

test('a new bug comments on the existing draft', () => {
  const comments = [];
  openDrafts({
    findings: [finding()],
    pulls: [mergedPull(10, '2026-09-23T09:00:00.000Z', perpsFiles())],
    openPulls: [
      {
        number: 77,
        url: 'https://github.com/MetaMask/metamask-mobile/pull/77',
        isDraft: true,
        headRefName: 'revert/10_isolate-hermes-js-regression',
      },
    ],
    onComment: (_args, comment) => comments.push(comment),
  });

  assert.match(comments[0], /pull\/77/);
});

test('a revert conflict does not push, and a recurrence does not comment again', () => {
  const comments = [];
  const { exception, result, git } = openDrafts({
    findings: [
      finding({
        issue: {
          number: 501,
          url: 'https://github.com/MetaMask/metamask-mobile/issues/501',
          created: false,
        },
      }),
    ],
    pulls: [mergedPull(10, '2026-09-23T09:00:00.000Z', perpsFiles())],
    failRevert: true,
    onComment: (_args, comment) => comments.push(comment),
  });

  assert.equal(result.pulls[0].url, undefined);
  assert.match(exception.findings[0].isolation.error, /revert conflict/);
  assert.equal(comments.length, 0);
  assert.equal(
    git.calls.some((args) => args[0] === 'push'),
    false,
  );
});

test('a rejected push retries with a lease and still only pushes the isolation branch', () => {
  const { git } = openDrafts({
    findings: [finding()],
    pulls: [mergedPull(10, '2026-09-23T09:00:00.000Z', perpsFiles())],
    rejectFirstPush: true,
  });
  const pushes = git.calls.filter((args) => args[0] === 'push');
  assert.equal(pushes.length, 2);
  assert.ok(pushes[1].includes('--force-with-lease'));
  assert.ok(pushes[1].includes('revert/10_isolate-hermes-js-regression'));
});
