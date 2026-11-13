import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const scriptPath = path.join(
  process.cwd(),
  '.github',
  'scripts',
  'qa-automation',
  'performance-tests',
  'open-heal-pr.sh',
);

const REPO = 'MetaMask/metamask-mobile';
const BASE_REF = 'mmqa/agent-driven-perf-scenario-poc-0205';
const HEAL_BRANCH = 'perf-scenario-heal/43054065231';
const TITLE = 'test(perf): heal scenario cache';
const BASE_SHA = 'a'.repeat(40);
const BASE_TREE = 'b'.repeat(40);
const EXISTING_TIP = 'c'.repeat(40);
const TOKEN = 'super-secret-token-do-not-print';

function sha1(text) {
  return crypto.createHash('sha1').update(text).digest('hex');
}

function writeMock(dir) {
  const ghPath = path.join(dir, 'gh');
  fs.writeFileSync(
    ghPath,
    `#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const readsStdin = args.includes('--input');
const stdin = readsStdin ? fs.readFileSync(0, 'utf8') : '';
fs.appendFileSync(process.env.GH_MOCK_LOG, JSON.stringify({ args, stdin }) + '\\n');

const statePath = process.env.GH_MOCK_STATE;
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const save = () => fs.writeFileSync(statePath, JSON.stringify(state));
const flag = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const endpoint = args.find((arg) => arg.startsWith('repos/'));
const method = flag('--method') || 'GET';
const jq = flag('--jq');
const fail = (message, status = 1) => {
  process.stderr.write(message + '\\n');
  process.exit(status);
};
const emit = (value) => {
  if (jq === '.sha') process.stdout.write(value.sha + '\\n');
  else if (jq === '.tree.sha') process.stdout.write(value.tree.sha + '\\n');
  else if (jq === '.object.sha') process.stdout.write(value.object.sha + '\\n');
  else process.stdout.write(JSON.stringify(value) + '\\n');
};

if (args[0] === 'pr' && args[1] === 'create') {
  const bodyFile = flag('--body-file');
  if (!args.includes('--draft')) fail('refusing a non-draft PR');
  if (flag('--base') !== state.baseRef) fail('unexpected base');
  if (flag('--head') !== state.healBranch) fail('unexpected head');
  if (flag('--title') !== state.title) fail('unexpected title');
  if (!bodyFile || fs.readFileSync(bodyFile, 'utf8') !== state.body) fail('unexpected body');
  process.stdout.write(state.prUrl + '\\n');
  process.exit(0);
}
if (args[0] === 'pr' && args[1] === 'edit') {
  process.exit(0);
}
if (args[0] !== 'api' || !endpoint) fail('unmocked gh call');

if (method === 'GET' && endpoint.endsWith('/commits/' + state.baseRef)) {
  emit({ sha: state.baseSha });
} else if (method === 'GET' && endpoint.endsWith('/commits/' + state.healBranch)) {
  emit({ sha: state.tip });
} else if (method === 'GET' && endpoint.includes('/git/commits/')) {
  emit({ tree: { sha: state.baseTree } });
} else if (method === 'POST' && endpoint.endsWith('/git/refs')) {
  if (state.failCreate === 'denied') fail('{"message":"Resource not accessible by integration"}');
  if (state.failCreate === 'exists') fail('{"message":"Reference already exists"}');
  state.tip = state.baseSha;
  save();
  emit({ ref: 'refs/heads/' + state.healBranch, object: { sha: state.baseSha } });
} else if (method === 'POST' && endpoint.endsWith('/git/blobs')) {
  emit({ sha: crypto.createHash('sha1').update(stdin).digest('hex') });
} else if (method === 'POST' && endpoint.endsWith('/git/trees')) {
  emit({ sha: crypto.createHash('sha1').update(stdin).digest('hex') });
} else if (method === 'POST' && endpoint.endsWith('/git/commits')) {
  emit({ sha: crypto.createHash('sha1').update(stdin).digest('hex') });
} else if (method === 'PATCH' && endpoint.includes('/git/refs/heads/')) {
  if (state.failUpdate) fail('{"message":"Update is not a fast forward"}');
  const shaArg = args.find((arg) => arg.startsWith('sha='));
  emit({ object: { sha: shaArg.slice(4) } });
} else {
  fail('unmocked endpoint ' + method + ' ' + endpoint);
}
`,
    { mode: 0o755 },
  );
  return ghPath;
}

function gitRepo(files) {
  const tracked = { ...files };
  if (!Object.keys(tracked).some((file) => file.endsWith('.scenario.md'))) {
    tracked['tests/performance/login/scenarios/placeholder.scenario.md'] = 'placeholder\n';
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'open-heal-pr-'));
  const git = (...gitArgs) => {
    const result = spawnSync('git', gitArgs, { cwd: root, encoding: 'utf8' });
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }
  };
  git('init', '-q');
  git('config', 'user.email', 't@t');
  git('config', 'user.name', 't');
  for (const [file, content] of Object.entries(tracked)) {
    fs.mkdirSync(path.join(root, path.dirname(file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
  git('add', '.');
  git('commit', '-qm', 'base');
  return { root, dirty(next, extra) {
    for (const [file, content] of Object.entries(next)) {
      fs.mkdirSync(path.join(root, path.dirname(file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), content);
    }
    if (extra) {
      fs.mkdirSync(path.join(root, path.dirname(extra)), { recursive: true });
      fs.writeFileSync(path.join(root, extra), 'nope\n');
    }
  } };
}

function run(root, { failCreate = null, failUpdate = false, tip = null } = {}) {
  const mockDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-heal-gh-'));
  writeMock(mockDir);
  const log = path.join(mockDir, 'calls.log');
  const statePath = path.join(mockDir, 'state.json');
  const bodyFile = path.join(mockDir, 'body.md');
  const outputFile = path.join(mockDir, 'github-output.txt');
  const summaryFile = path.join(mockDir, 'summary.md');
  const body = 'Heal body\n';
  fs.writeFileSync(bodyFile, body);
  fs.writeFileSync(log, '');
  fs.writeFileSync(
    statePath,
    JSON.stringify({
      baseRef: BASE_REF,
      healBranch: HEAL_BRANCH,
      title: TITLE,
      body,
      prUrl: 'https://github.com/MetaMask/metamask-mobile/pull/77',
      baseSha: BASE_SHA,
      baseTree: BASE_TREE,
      tip: tip ?? BASE_SHA,
      failCreate,
      failUpdate,
    }),
  );
  const result = spawnSync('bash', [scriptPath], {
    cwd: root,
    encoding: 'utf8',
    env: {
      PATH: `${mockDir}:${process.env.PATH}`,
      GH_TOKEN: TOKEN,
      GH_MOCK_LOG: log,
      GH_MOCK_STATE: statePath,
      GITHUB_REPOSITORY: REPO,
      BASE_REF,
      HEAL_BRANCH,
      PR_TITLE: TITLE,
      BODY_FILE: bodyFile,
      GITHUB_OUTPUT: outputFile,
      GITHUB_STEP_SUMMARY: summaryFile,
    },
  });
  const calls = fs
    .readFileSync(log, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  return { result, calls, outputFile, summaryFile };
}

const CACHE = 'tests/performance/login/scenarios/predict-available-balance.scenario.cache.json';
const OTHER = 'tests/performance/login/scenarios/asset-view.scenario.cache.json';
const MARKDOWN = 'tests/performance/login/scenarios/predict-available-balance.scenario.md';

function callsOf(calls, suffix) {
  return calls.filter((call) => call.args.some((arg) => arg.endsWith(suffix)));
}

test('publishes cache files as one commit and opens a draft PR', () => {
  const repo = gitRepo({ [CACHE]: '{"old":true}\n', [OTHER]: '{"old":true}\n' });
  repo.dirty({
    [CACHE]: '{"learned":true}\n',
    [OTHER]: '{"learned":2}\n',
  });

  const { result, calls, outputFile, summaryFile } = run(repo.root);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes(TOKEN), false);
  assert.equal(result.stderr.includes(TOKEN), false);
  assert.equal(calls.some((call) => call.args.includes('push')), false);

  const createRef = callsOf(calls, '/git/refs')[0];
  assert.equal(createRef.args.includes('ref=refs/heads/' + HEAL_BRANCH), true);
  assert.equal(createRef.args.includes('sha=' + BASE_SHA), true);

  const blobs = callsOf(calls, '/git/blobs');
  assert.equal(blobs.length, 2);
  const decoded = blobs.map((call) => {
    const payload = JSON.parse(call.stdin);
    assert.equal(payload.encoding, 'base64');
    return Buffer.from(payload.content, 'base64').toString('utf8');
  });
  assert.deepEqual(decoded.sort(), ['{"learned":2}\n', '{"learned":true}\n']);

  const tree = JSON.parse(callsOf(calls, '/git/trees')[0].stdin);
  assert.equal(tree.base_tree, BASE_TREE);
  assert.deepEqual(
    tree.tree.map((entry) => entry.path).sort(),
    [CACHE, OTHER].sort(),
  );
  assert.equal(tree.tree.every((entry) => entry.mode === '100644' && entry.type === 'blob'), true);

  const commitCall = callsOf(calls, '/git/commits').find((call) => call.stdin.includes('"parents"'));
  const commit = JSON.parse(commitCall.stdin);
  assert.equal(commit.message, TITLE);
  assert.deepEqual(commit.parents, [BASE_SHA]);

  const patch = calls.find((call) => call.args.includes('--method') && call.args.includes('PATCH'));
  assert.equal(patch.args.includes('sha=' + sha1(commitCall.stdin)), true);
  assert.equal(patch.args.includes('force=false'), true);

  const pr = calls.find((call) => call.args[0] === 'pr' && call.args[1] === 'create');
  assert.equal(pr.args.includes('--draft'), true);
  assert.equal(pr.args.includes('--base'), true);
  assert.equal(pr.args.includes(BASE_REF), true);
  assert.equal(pr.args.includes(HEAL_BRANCH), true);
  const labels = calls
    .filter((call) => call.args[1] === 'edit')
    .map((call) => call.args[call.args.indexOf('--add-label') + 1]);
  assert.deepEqual(labels, ['team-qa', 'perf-scenario-heal']);

  const output = fs.readFileSync(outputFile, 'utf8');
  assert.match(output, /^pr_url=https:\/\/github.com\/MetaMask\/metamask-mobile\/pull\/77$/m);
  assert.match(output, /^commit_sha=[0-9a-f]{40}$/m);
  assert.match(fs.readFileSync(summaryFile, 'utf8'), /Heal PR: https:\/\/github.com\/MetaMask\/metamask-mobile\/pull\/77/);
});

test('a 422 Reference already exists updates the existing branch', () => {
  const repo = gitRepo({ [CACHE]: '{"old":true}\n' });
  repo.dirty({ [CACHE]: '{"learned":true}\n' });

  const { result, calls } = run(repo.root, { failCreate: 'exists', tip: EXISTING_TIP });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /already exists/);
  const commitCall = calls.find((call) => call.stdin.includes('"parents"'));
  const commit = JSON.parse(commitCall.stdin);
  assert.deepEqual(commit.parents, [EXISTING_TIP]);
  assert.equal(commit.message, TITLE);
});

test('a failed ref create exits non-zero and does not open a PR', () => {
  const repo = gitRepo({ [CACHE]: '{"old":true}\n' });
  repo.dirty({ [CACHE]: '{"learned":true}\n' });

  const { result, calls } = run(repo.root, { failCreate: 'denied' });

  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /Failed to create perf-scenario-heal\/43054065231/);
  assert.match(result.stdout + result.stderr, /Resource not accessible by integration/);
  assert.equal(calls.some((call) => call.args[0] === 'pr'), false);
  assert.equal(result.stdout.includes(TOKEN), false);
  assert.equal(result.stderr.includes(TOKEN), false);
});

test('a failed ref update exits non-zero and does not open a PR', () => {
  const repo = gitRepo({ [CACHE]: '{"old":true}\n' });
  repo.dirty({ [CACHE]: '{"learned":true}\n' });

  const { result, calls } = run(repo.root, { failUpdate: true });

  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /Failed to point/);
  assert.equal(calls.some((call) => call.args[1] === 'create'), false);
});

test('an unrelated tracked file aborts before any GitHub call', () => {
  const workflow = '.github/workflows/run-performance-e2e.yml';
  const repo = gitRepo({
    [CACHE]: '{"old":true}\n',
    [workflow]: 'name: Performance\n',
  });
  repo.dirty({ [CACHE]: '{"learned":true}\n' });
  fs.writeFileSync(path.join(repo.root, workflow), 'name: Changed\n');

  const { result, calls } = run(repo.root);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /Unexpected changes outside scenario caches and Markdown/);
  assert.equal(calls.length, 0);
});

test('a reworded scenario markdown is published with the cache', () => {
  const repo = gitRepo({
    [CACHE]: '{"old":true}\n',
    [MARKDOWN]: 'old wording\n',
  });
  repo.dirty({
    [CACHE]: '{"learned":true}\n',
    [MARKDOWN]: 'new wording\n',
  });

  const { result, calls } = run(repo.root);
  assert.equal(result.status, 0, result.stderr);
  const tree = JSON.parse(callsOf(calls, '/git/trees')[0].stdin);
  assert.deepEqual(tree.tree.map((entry) => entry.path).sort(), [CACHE, MARKDOWN]);
});

test('a staged file outside the scenario files is refused before any GitHub call', () => {
  const repo = gitRepo({ [CACHE]: '{"old":true}\n' });
  repo.dirty({ [CACHE]: '{"learned":true}\n' });
  fs.writeFileSync(path.join(repo.root, 'notes.txt'), 'nope\n');
  const added = spawnSync('git', ['add', 'notes.txt'], { cwd: repo.root, encoding: 'utf8' });
  assert.equal(added.status, 0, added.stderr);

  const { result, calls } = run(repo.root);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /Refusing to publish notes.txt/);
  assert.equal(calls.length, 0);
});

test('no cache change does not create a branch', () => {
  const repo = gitRepo({ [CACHE]: '{"old":true}\n' });
  const { result, calls } = run(repo.root);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /No scenario cache or Markdown changes/);
  assert.equal(calls.length, 0);
});
