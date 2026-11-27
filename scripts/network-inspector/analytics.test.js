/* eslint-disable import-x/no-commonjs, import-x/no-nodejs-modules */
// Run with: node --test scripts/network-inspector/analytics.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./analytics');

const NOW = 1_000_000;
let sequence = 0;

function rec(overrides = {}) {
  sequence += 1;
  return {
    id: `r${sequence}`,
    kind: 'fetch',
    method: 'GET',
    url: 'https://api.example.com/v1/things',
    startedAt: NOW - 60000 + sequence * 10,
    status: 200,
    durationMs: 100,
    done: true,
    resSize: 1000,
    ...overrides,
  };
}

test('normalizePath collapses ids, hashes and addresses but keeps versions', () => {
  assert.equal(
    A.normalizePath('/v3/00000000000000000000000000000000'),
    '/v3/:id',
  );
  assert.equal(
    A.normalizePath('/v1/profiles/eacffcc1-b6d5-4905-8f72-0a1b2c3d4e5f'),
    '/v1/profiles/:id',
  );
  assert.equal(
    A.normalizePath('/users/0xa14f0971474281db04367be2ab9b6a8a5a9d3a21'),
    '/users/:address',
  );
  assert.equal(A.normalizePath('/v1/lending/1/markets'), '/v1/lending/1/markets');
});

test('endpointLabel groups by normalized path and appends the JSON-RPC method', () => {
  const call = rec({
    method: 'POST',
    url: 'https://mainnet.infura.io/v3/00000000000000000000000000000000',
    reqBody: '{"jsonrpc":"2.0","method":"eth_call","params":[]}',
  });
  assert.equal(A.endpointLabel(call), 'POST mainnet.infura.io/v3/:id · eth_call');
  const batch = rec({
    method: 'POST',
    reqBody: '[{"method":"a"},{"method":"b"}]',
  });
  assert.equal(A.rpcLabel(batch), 'batch(2)');
});

test('percentile uses nearest rank and tolerates empty input', () => {
  assert.equal(A.percentile([10, 20, 30, 40], 50), 20);
  assert.equal(A.percentile([10, 20, 30, 40], 95), 40);
  assert.equal(A.percentile([], 50), undefined);
});

test('summarize counts http only, failures, in-flight and sockets', () => {
  const records = [
    rec(),
    rec({ status: 500 }),
    rec({ done: false, status: undefined, durationMs: undefined }),
    rec({ kind: 'ws', method: 'WS', url: 'wss://x.io' }),
  ];
  const summary = A.summarize(records, NOW);
  assert.equal(summary.total, 3);
  assert.equal(summary.sockets, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.inFlight, 1);
});

test('duplicates flags the same call repeated inside the window, not spaced out ones', () => {
  const t = NOW - 30000;
  const burst = [0, 500, 900].map((offset) =>
    rec({ url: 'https://a.io/x', startedAt: t + offset, durationMs: 800 }),
  );
  const spaced = [0, 20000].map((offset) =>
    rec({ url: 'https://a.io/y', startedAt: t + offset }),
  );
  const found = A.duplicates([...burst, ...spaced], NOW);
  assert.equal(found.length, 1);
  assert.equal(found[0].wasted, 2);
  assert.equal(found[0].concurrent, 2);
});

test('detectPolling reports a steady interval and ignores irregular traffic', () => {
  const steady = [0, 1, 2, 3, 4, 5].map((index) =>
    rec({ url: 'https://a.io/poll', startedAt: NOW - 50000 + index * 5000 }),
  );
  const irregular = [0, 300, 4000, 4100, 19000, 19050].map((offset) =>
    rec({ url: 'https://a.io/random', startedAt: NOW - 50000 + offset }),
  );
  const found = A.detectPolling([...steady, ...irregular]);
  assert.equal(found.length, 1);
  assert.equal(found[0].intervalMs, 5000);
});

test('peakConcurrency counts overlapping requests', () => {
  const records = [
    rec({ startedAt: 1000, durationMs: 500 }),
    rec({ startedAt: 1100, durationMs: 500 }),
    rec({ startedAt: 1200, durationMs: 100 }),
    rec({ startedAt: 5000, durationMs: 100 }),
  ];
  assert.equal(A.peakConcurrency(records, NOW).peak, 3);
});

test('timeline buckets requests and keeps failures per bucket', () => {
  const records = [
    rec({ startedAt: 0, status: 500 }),
    rec({ startedAt: 500 }),
    rec({ startedAt: 2500 }),
  ];
  const { bucketMs, buckets } = A.timeline(records, 3000);
  assert.equal(bucketMs, 1000);
  assert.equal(buckets[0].count, 2);
  assert.equal(buckets[0].failed, 1);
  assert.equal(buckets[2].count, 1);
});

test('insights ranks a failing endpoint first and explains a 401', () => {
  const failing = Array.from({ length: 6 }, () =>
    rec({ method: 'POST', url: 'https://m.infura.io/v3/00000000000000000000000000000000', status: 401 }),
  );
  const fine = [rec({ url: 'https://ok.io/a' }), rec({ url: 'https://ok.io/b' })];
  const found = A.insights([...fine, ...failing], NOW);
  assert.equal(found[0].kind, 'Failing endpoint');
  assert.equal(found[0].severity, 'critical');
  assert.match(found[0].advice, /credentials/);
  assert.deepEqual(found[0].filter.status, 'failed');
});

test('insights groups many endpoints rejecting credentials into one root cause', () => {
  const rejected = ['https://a.io/x', 'https://b.io/y', 'https://c.io/z'].flatMap((url) =>
    [1, 2, 3].map(() => rec({ url, status: 401 })),
  );
  const found = A.insights(rejected, NOW);
  assert.equal(found[0].kind, 'Root cause');
  assert.equal(found[0].affected, 9);
  assert.match(found[0].title, /3 endpoints/);
  assert.equal(A.applyFilter(rejected, found[0].filter, NOW).length, 9);
  // Children point back at the root cause instead of repeating the advice.
  assert.equal(found[1].advice, 'Part of the credentials issue above.');
});

test('callerInfo treats an unresolved caller as unknown', () => {
  const unresolved = rec({ caller: { relative: 'http://x/index.bundle', origin: 'unresolved' } });
  assert.equal(A.callerInfo(unresolved).key, '(unknown)');
});

test('insights flags slow endpoints and heavy responses', () => {
  const slow = [rec({ url: 'https://s.io/slow', durationMs: 5000 }), rec({ url: 'https://s.io/slow', durationMs: 4500 })];
  const heavy = [rec({ url: 'https://s.io/big', resSize: 500 * 1024 })];
  const kinds = A.insights([...slow, ...heavy], NOW).map((item) => item.kind);
  assert.ok(kinds.includes('Slow endpoint'));
  assert.ok(kinds.includes('Heavy response'));
});

test('applyFilter scopes by host, endpoint, status and free text together', () => {
  const records = [
    rec({ url: 'https://a.io/x', status: 500 }),
    rec({ url: 'https://a.io/x', status: 200 }),
    rec({ url: 'https://b.io/x', status: 500 }),
  ];
  const scoped = A.applyFilter(records, { host: 'a.io', status: 'failed' }, NOW);
  assert.equal(scoped.length, 1);
  assert.equal(A.applyFilter(records, { q: 'b.io' }, NOW).length, 1);
  assert.equal(A.applyFilter(records, { kinds: ['ws'] }, NOW).length, 0);
});

test('duplicates never merge identical calls made by different devices', () => {
  const t = NOW - 30000;
  const call = (session) =>
    rec({ url: 'https://a.io/x', session, startedAt: t, durationMs: 100 });
  assert.equal(A.duplicates([call('A'), call('B')], NOW).length, 0);
  const same = A.duplicates([call('A'), call('A')], NOW);
  assert.equal(same.length, 1);
  assert.equal(same[0].session, 'A');
});

test('peakConcurrency reports the busiest single device, not the sum of devices', () => {
  const overlapping = (session, count) =>
    Array.from({ length: count }, () =>
      rec({ session, startedAt: 1000, durationMs: 500 }),
    );
  const result = A.peakConcurrency([...overlapping('A', 3), ...overlapping('B', 2)], NOW);
  assert.equal(result.peak, 3);
  assert.equal(result.session, 'A');
});

test('detectPolling finds each device rhythm even when devices interleave', () => {
  const steady = (session, offset) =>
    [0, 1, 2, 3, 4, 5].map((index) =>
      rec({ session, url: 'https://a.io/poll', startedAt: NOW - 50000 + offset + index * 5000 }),
    );
  const found = A.detectPolling([...steady('A', 0), ...steady('B', 1000)]);
  assert.deepEqual(found.map((item) => item.session).sort(), ['A', 'B']);
});

test('sessionsList describes each device with a readable label', () => {
  const records = [
    rec({ session: 'A', platform: 'ios', osVersion: '26.5', startedAt: 5000 }),
    rec({ session: 'A', platform: 'ios', osVersion: '26.5', startedAt: 6000, status: 500 }),
    rec({ session: 'B', platform: 'android', osVersion: '34', startedAt: 9000 }),
  ];
  const [latest, earlier] = A.sessionsList(records);
  assert.equal(latest.id, 'B');
  assert.match(latest.label, /^Android 34 · /);
  assert.equal(earlier.count, 2);
  assert.equal(earlier.failed, 1);
});

test('applyFilter scopes to one device', () => {
  const records = [rec({ session: 'A' }), rec({ session: 'B' }), rec({ session: 'B' })];
  assert.equal(A.applyFilter(records, { session: 'B' }, NOW).length, 2);
});

test('insights name the device and scope the drill-down when several are present', () => {
  const t = NOW - 30000;
  const burst = [0, 100, 200].map((offset) =>
    rec({ session: 'A', platform: 'ios', url: 'https://a.io/x', startedAt: t + offset, durationMs: 800 }),
  );
  const other = rec({ session: 'B', platform: 'android', url: 'https://b.io/y' });
  const found = A.insights([...burst, other], NOW).find((item) => item.kind === 'Repeated request');
  assert.equal(found.filter.session, 'A');
  assert.match(found.device, /iOS/);
  const single = A.insights(burst, NOW).find((item) => item.kind === 'Repeated request');
  assert.equal(single.filter.session, undefined);
});

test('formatters read well at each magnitude', () => {
  assert.equal(A.formatMs(420), '420 ms');
  assert.equal(A.formatMs(1234), '1.23 s');
  assert.equal(A.formatBytes(2048), '2.0 kB');
  assert.equal(A.formatPercent(0.004), '<1%');
  assert.equal(A.formatPercent(0.5), '50%');
});

test('toMarkdown produces a shareable report with pain points', () => {
  const failing = Array.from({ length: 4 }, () => rec({ url: 'https://f.io/x', status: 500 }));
  const markdown = A.toMarkdown(failing, NOW);
  assert.match(markdown, /# Network report/);
  assert.match(markdown, /Failing endpoint/);
});
