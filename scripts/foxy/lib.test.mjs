import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseUrl,
  parseFrame,
  classifyFrame,
  summarizeInitiator,
  shortFile,
  cleanMethod,
  packageName,
  frameInfo,
  describeFrames,
  bodyFingerprint,
  dupeKey,
  groupEndpoints,
  computePhases,
  exportCapture,
  exportPhase,
  fileSlug,
  toMarkdown,
} from './lib.mjs';

const BUNDLE =
  'http://10.0.0.9:8081/index.bundle//&platform=ios&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.bytecode=1';
const sym = (methodName, file, lineNumber, column = 1) => ({
  raw: `${methodName}@${file}:${lineNumber}`,
  methodName,
  file,
  lineNumber,
  column,
});

test('parseUrl splits host, path and query', () => {
  assert.deepEqual(
    parseUrl('https://price.api.cx.metamask.io/v3/spot-prices?a=1&b=2'),
    { host: 'price.api.cx.metamask.io', path: '/v3/spot-prices', query: 'a=1&b=2' },
  );
});

test('parseFrame handles Hermes bundle, bytecode, native and JSC formats', () => {
  const a = parseFrame(`at _checkInternetReachability (${BUNDLE}:112436:34)`);
  assert.equal(a.methodName, '_checkInternetReachability');
  assert.equal(a.lineNumber, 112436);
  assert.equal(a.column, 34);
  assert.match(a.file, /index\.bundle/);

  const b = parseFrame('at anonymous (address at InternalBytecode.js:1:8987)');
  assert.equal(b.file, 'InternalBytecode.js');
  assert.equal(b.lineNumber, 1);

  const c = parseFrame('at next (native)');
  assert.equal(c.methodName, 'next');
  assert.equal(c.file, '');

  const d = parseFrame('poll@http://localhost:8081/index.bundle:5:6');
  assert.equal(d.methodName, 'poll');
});

test('shortFile never leaks the bundle query string', () => {
  assert.equal(shortFile(BUNDLE), 'index.bundle');
  assert.equal(
    shortFile('/Users/x/metamask-mobile-4463/node_modules/@react-native-community/netinfo/src/internal/state.ts'),
    '@react-native-community/netinfo/src/internal/state.ts',
  );
  assert.equal(shortFile('/Users/x/metamask-mobile-4463/app/core/Engine/Engine.ts'), 'app/core/Engine/Engine.ts');
  assert.equal(shortFile('/Users/x/metamask-mobile-4463/shim.js'), 'shim.js');
});

test('cleanMethod strips Hermes ?anon_N_ prefixes', () => {
  assert.equal(cleanMethod('?anon_0__fetchCurrentState'), '_fetchCurrentState');
  assert.equal(cleanMethod('anonymous'), '<anonymous>');
  assert.equal(cleanMethod('fetchAll'), 'fetchAll');
});

test('classifyFrame separates real code from wrappers and plumbing', () => {
  const f = (methodName, file) => ({ methodName, file, raw: `${methodName}${file}` });
  assert.equal(classifyFrame(f('x', '/r/metamask-mobile/app/core/Engine/Engine.ts')), 'app');
  assert.equal(classifyFrame(f('x', '/r/node_modules/@metamask/assets-controllers/dist/A.cjs')), 'controller');
  assert.equal(classifyFrame(f('x', '/r/node_modules/axios/lib/core.js')), 'package');
  assert.equal(classifyFrame(f('x', `${BUNDLE}`)), 'unsymbolicated');
  // infra
  assert.equal(classifyFrame(f('captureInitiator', BUNDLE)), 'infra');
  assert.equal(classifyFrame(f('foxyFetch', BUNDLE)), 'infra');
  assert.equal(classifyFrame(f('next', '')), 'infra');
  assert.equal(classifyFrame(f('step', 'InternalBytecode.js')), 'infra');
  assert.equal(classifyFrame(f('?anon_0_proxiedFetch', '/r/metamask-mobile/shim.js')), 'infra');
  assert.equal(classifyFrame(f('x', '/r/node_modules/@babel/runtime/helpers/asyncToGenerator.js')), 'infra');
  assert.equal(classifyFrame(f('x', '/r/app/core/NitroFetchSetup.ts')), 'infra');
  assert.equal(classifyFrame(f('rampsFetchDebugProxy', '/r/app/components/UI/Ramp/debug/RampsDebugBridge.ts')), 'infra');
  assert.equal(classifyFrame(f('apply', '/r/node_modules/@sentry/browser-utils/build/esm/instrument/xhr.js')), 'infra');
});

test('real capture: NetInfo call site is reported with file:line:col', () => {
  const nm = '/r/node_modules/@react-native-community/netinfo/src/internal';
  const frames = [
    sym('captureInitiator', '/r/app/dev-tools/Foxy/FoxyBridge.ts', 139, 28),
    sym('foxyFetch', '/r/app/dev-tools/Foxy/FoxyBridge.ts', 189, 36),
    sym('_checkInternetReachability', `${nm}/internetReachability.ts`, 75, 34),
    sym('_setExpectsConnection', `${nm}/internetReachability.ts`, 65, 40),
    { raw: 'n', methodName: 'next', file: '', lineNumber: 0, column: 0 },
    sym('anonymous', 'InternalBytecode.js', 1, 8987),
  ];
  const s = summarizeInitiator(frames);
  assert.equal(s.symbolicated, true);
  assert.equal(
    s.callSite,
    '_checkInternetReachability  @react-native-community/netinfo/src/internal/internetReachability.ts:75:34',
  );
  assert.equal(s.owner, null); // pure third-party stack: no app/@metamask owner
});

test('call site is the real caller; owner is the nearest app/@metamask frame', () => {
  const frames = [
    sym('foxyFetch', `${BUNDLE}`, 1),
    sym('fetchBalances', '/r/node_modules/@metamask/assets-controllers/dist/Foo.cjs', 10, 7),
    sym('init', '/r/metamask-mobile/app/core/Engine/Engine.ts', 99, 3),
  ];
  const s = summarizeInitiator(frames);
  assert.equal(s.callSite, 'fetchBalances  @metamask/assets-controllers/dist/Foo.cjs:10:7');
  assert.equal(s.owner, 'init  app/core/Engine/Engine.ts:99:3');
  assert.match(s.text, /<-/);
});

test('unsymbolicated frames still show method and line, without the URL', () => {
  const frames = [
    parseFrame(`at foxyFetch (${BUNDLE}:1:1)`),
    parseFrame(`at _fetchCurrentState (${BUNDLE}:112327:40)`),
  ];
  const s = summarizeInitiator(frames);
  assert.equal(s.symbolicated, false);
  assert.equal(s.callSite, '_fetchCurrentState  index.bundle:112327:40 (unsymbolicated)');
  assert.doesNotMatch(s.text, /platform=ios/);
});

test('groupEndpoints counts identical duplicates', () => {
  const mk = (id, query, relMs) => ({
    id,
    method: 'GET',
    host: 'accounts.api.cx.metamask.io',
    path: '/v5/multiaccount/balances',
    query,
    relMs,
    status: 200,
    initiatorText: 'x',
  });
  const [g] = groupEndpoints([mk(1, 'a=1', 100), mk(2, 'a=1', 200), mk(3, 'a=2', 300)]);
  assert.equal(g.count, 3);
  assert.equal(g.distinctQueries, 2);
  assert.equal(g.duplicateIdenticalCalls, 1);
  assert.equal(g.firstSeenMs, 100);
});

test('toMarkdown renders a recommendation table skeleton', () => {
  const md = toMarkdown(
    [{ id: 1, method: 'GET', host: 'h', path: '/p', query: '', relMs: 1500, status: 200, initiatorText: 'init' }],
    { sessionId: 's1', markers: [{ relMs: 2000, label: 'onboarding visible' }] },
  );
  assert.match(md, /GET h\/p/);
  assert.match(md, /Verdict/);
  assert.match(md, /onboarding visible/);
});

test('packageName handles scoped and unscoped packages', () => {
  assert.equal(packageName('@segment/analytics-react-native/src/analytics.ts'), '@segment/analytics-react-native');
  assert.equal(packageName('@metamask/stake-sdk/dist/Lending/LendingApiService.cjs'), '@metamask/stake-sdk');
  assert.equal(packageName('axios/lib/core/Axios.js'), 'axios');
  assert.equal(packageName(''), '');
});

test('frameInfo exposes method, file, location, kind and package', () => {
  const third = frameInfo(sym('uploadEvents', '/r/node_modules/@segment/analytics-react-native/src/plugins/SegmentDestination.ts', 447, 23));
  assert.equal(third.method, 'uploadEvents');
  assert.equal(third.line, 447);
  assert.equal(third.col, 23);
  assert.equal(third.kind, 'package');
  assert.equal(third.pkg, '@segment/analytics-react-native');
  assert.equal(third.unsymbolicated, false);

  const app = frameInfo(sym('init', '/r/app/core/Engine/Engine.ts', 10, 3));
  assert.equal(app.kind, 'app');
  assert.equal(app.pkg, null);

  const raw = frameInfo(sym('foo', `${BUNDLE}`, 99, 4));
  assert.equal(raw.unsymbolicated, true);
});

test('describeFrames attaches owners to non-infra frames only', () => {
  const frames = [
    sym('foxyFetch', '/r/app/dev-tools/Foxy/FoxyBridge.ts', 1),
    sym('init', '/r/app/core/Engine/Engine.ts', 10, 3),
  ];
  const out = describeFrames(frames, (info) => [`owner-of-${info.file}`]);
  assert.equal(out[0].kind, 'infra');
  assert.equal(out[0].owners, null);
  assert.deepEqual(out[1].owners, ['owner-of-app/core/Engine/Engine.ts']);
  assert.ok(out[1].display.includes('init'));
  assert.equal(describeFrames(frames)[1].owners, null);
});

test('bodyFingerprint is empty without body info and differs per body', () => {
  assert.equal(bodyFingerprint(undefined, undefined), '');
  assert.equal(bodyFingerprint(null, null), '');
  assert.equal(bodyFingerprint(10, '{"a":1}'), bodyFingerprint(10, '{"a":1}'));
  assert.notEqual(bodyFingerprint(10, '{"a":1}'), bodyFingerprint(10, '{"a":2}'));
  assert.notEqual(bodyFingerprint(10), bodyFingerprint(11));
});

test('dupeKey: GETs are identical by URL, POSTs only when the body matches, unknown bodies never', () => {
  const get = (url) => ({ method: 'GET', url, key: url });
  assert.equal(dupeKey(get('https://a.io/x?y=1')), dupeKey(get('https://a.io/x?y=1')));
  assert.notEqual(dupeKey(get('https://a.io/x?y=1')), dupeKey(get('https://a.io/x?y=2')));

  const post = (key, bodyKey) => ({ method: 'POST', url: 'https://rpc.io/', key, bodyKey });
  const same1 = post('s:1', bodyFingerprint(5, '{"a":1}'));
  const same2 = post('s:2', bodyFingerprint(5, '{"a":1}'));
  const other = post('s:3', bodyFingerprint(5, '{"a":2}'));
  assert.equal(dupeKey(same1), dupeKey(same2));
  assert.notEqual(dupeKey(same1), dupeKey(other));
  assert.notEqual(dupeKey(post('s:4', '')), dupeKey(post('s:5', ''))); // no body info: not claimed identical
});

test('groupEndpoints does not call differing POST bodies identical', () => {
  const rec = (id, bodyKey) => ({ id, key: `s:${id}`, method: 'POST', host: 'rpc.io', path: '/', query: '', relMs: id, bodyKey });
  const g = groupEndpoints([rec(1, bodyFingerprint(3, 'aaa')), rec(2, bodyFingerprint(3, 'bbb')), rec(3, bodyFingerprint(3, 'aaa'))]);
  assert.equal(g[0].count, 3);
  assert.equal(g[0].duplicateIdenticalCalls, 1);
});

test('computePhases splits the capture at each marker', () => {
  const r = (id, relMs, path, extra = {}) => ({ id, key: `k${id}`, method: 'GET', host: 'h', path, query: '', url: `https://h${path}`, relMs, status: 200, ...extra });
  const records = [
    r(1, 100, '/boot'),
    r(2, 1500, '/a'),
    r(3, 1600, '/a'), // identical repeat of #2, inside the same phase
    r(4, 3200, '/a', { status: 500 }), // identical repeat from an earlier phase, and failed
    r(5, 3300, '/b'),
  ];
  const markers = [
    { id: 'm2', relMs: 3000, label: 'wallet created' },
    { id: 'm1', relMs: 1000, label: 'onboarding visible' }, // unsorted on purpose
  ];
  const phases = computePhases(records, markers);
  assert.deepEqual(phases.map((p) => p.label), ['Before first marker', 'onboarding visible', 'wallet created']);
  assert.deepEqual(phases.map((p) => p.requests), [1, 2, 2]);
  assert.deepEqual(phases.map((p) => p.newEndpoints), [1, 1, 1]);
  assert.deepEqual(phases.map((p) => p.identicalDupes), [0, 1, 1]);
  assert.deepEqual(phases.map((p) => p.failed), [0, 0, 1]);
  assert.equal(phases[1].endMs, 3000);
  assert.equal(phases[2].endMs, Infinity);
});

test('computePhases drops the leading phase when nothing ran before the first marker, and is empty without markers', () => {
  const rec = [{ id: 1, key: 'k1', method: 'GET', host: 'h', path: '/p', url: 'https://h/p', relMs: 500, status: 200 }];
  assert.deepEqual(computePhases(rec, []), []);
  const phases = computePhases(rec, [{ id: 'm', relMs: 100, label: 'start' }]);
  assert.deepEqual(phases.map((p) => p.label), ['start']);
  assert.equal(phases[0].requests, 1);
});

test('toMarkdown includes a phases table when markers exist', () => {
  const md = toMarkdown(
    [{ id: 1, key: 'k1', method: 'GET', host: 'h', path: '/p', query: '', relMs: 1500, status: 200, initiatorText: 'i' }],
    { markers: [{ id: 'm', relMs: 1000, label: 'onboarding visible' }] },
  );
  assert.match(md, /\| Phase \| Starts/);
  assert.match(md, /\| onboarding visible \| 1\.0 \| 1 \| 1 \| 0 \| 0 \|/);
});

test('exportPhase returns the requests from a marker up to the next one', () => {
  const r = (id, relMs, path, extra = {}) => ({ id, key: `k${id}`, method: 'GET', host: 'h', path, query: '', url: `https://h${path}`, relMs, status: 200, ...extra });
  const records = [r(1, 100, '/boot'), r(2, 1500, '/a'), r(3, 1600, '/a'), r(4, 3000, '/b', { status: 500 }), r(5, 3300, '/c')];
  const markers = [{ id: 'm2', relMs: 3000, label: 'wallet created' }, { id: 'm1', relMs: 1000, label: 'onboarding visible' }];

  const mid = exportPhase(records, markers, 'm1');
  assert.deepEqual(mid.records.map((x) => x.id), [2, 3]);
  assert.equal(mid.phase.open, false);
  assert.equal(mid.phase.endMs, 3000); // a request exactly at the next marker belongs to the next phase
  assert.equal(mid.phase.identicalDupes, 1);

  const last = exportPhase(records, markers, 'm2');
  assert.deepEqual(last.records.map((x) => x.id), [4, 5]);
  assert.equal(last.phase.open, true); // nothing ends the last marker's phase: it is still collecting
  assert.equal(last.phase.endMs, null);
  assert.equal(last.phase.failed, 1);

  const pre = exportPhase(records, markers, 'pre');
  assert.deepEqual(pre.records.map((x) => x.id), [1]);
  assert.equal(pre.phase.label, 'Before first marker');
});

test('exportPhase is null for an unknown marker or when there are no markers, and tolerates an empty phase', () => {
  const rec = [{ id: 1, key: 'k1', method: 'GET', host: 'h', path: '/p', url: 'https://h/p', relMs: 500, status: 200 }];
  assert.equal(exportPhase(rec, [], 'pre'), null);
  assert.equal(exportPhase(rec, [{ id: 'm', relMs: 100, label: 'x' }], 'nope'), null);
  const quiet = exportPhase(rec, [{ id: 'm', relMs: 9000, label: 'later' }], 'm');
  assert.deepEqual(quiet.records, []);
  assert.equal(quiet.phase.requests, 0);
});

test('exportCapture takes every request in time order, with the phases they fall into', () => {
  const r = (id, relMs) => ({ id, key: `k${id}`, method: 'GET', host: 'h', path: `/p${id}`, query: '', url: `https://h/p${id}`, relMs, status: 200 });
  const records = [r(3, 3300), r(1, 100), r(2, 1500)];
  const all = exportCapture(records, [{ id: 'm1', relMs: 1000, label: 'onboarding visible' }, { id: 'm2', relMs: 3000, label: 'wallet created' }]);
  assert.deepEqual(all.records.map((x) => x.id), [1, 2, 3]);
  assert.deepEqual(all.phases.map((p) => [p.label, p.requests]), [['Before first marker', 1], ['onboarding visible', 1], ['wallet created', 1]]);
  assert.equal(all.phases.at(-1).open, true);
  assert.equal(all.phases.at(-1).endMs, null); // JSON cannot hold Infinity
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(all)));
  assert.equal(records[0].id, 3); // the input is not reordered
});

test('exportCapture without markers is just the requests', () => {
  const all = exportCapture([{ id: 2, key: 'k2', relMs: 9 }, { id: 1, key: 'k1', relMs: 1 }]);
  assert.deepEqual(all.phases, []);
  assert.deepEqual(all.records.map((x) => x.id), [1, 2]);
  assert.deepEqual(exportCapture([]), { phases: [], records: [] });
});

test('fileSlug makes a safe file name', () => {
  assert.equal(fileSlug('Wallet ready!'), 'wallet-ready');
  assert.equal(fileSlug('Tapped “Create wallet” 🦊'), 'tapped-create-wallet');
  assert.equal(fileSlug('🦊'), 'phase');
});

test('an ended phase closes at its end: later requests are Between phases until the next marker', () => {
  const r = (id, relMs, path) => ({ id, key: `k${id}`, method: 'GET', host: 'h', path, query: '', url: `https://h${path}`, relMs, status: 200 });
  const records = [r(1, 1500, '/a'), r(2, 2000, '/b'), r(3, 3500, '/idle'), r(4, 4500, '/c')];
  const markers = [{ id: 'm1', relMs: 1000, label: 'app launch', endRelMs: 2500 }, { id: 'm2', relMs: 4000, label: 'next flow' }];

  const phases = computePhases(records, markers);
  assert.deepEqual(phases.map((p) => p.label), ['app launch', 'Between phases', 'next flow']); // nothing ran before the first marker, so no leading phase
  const [launch, gap, next] = phases;
  assert.equal(launch.endMs, 2500);
  assert.equal(launch.ended, true);
  assert.equal(launch.requests, 2); // /a and /b; /idle came after the end
  assert.equal(gap.requests, 1);
  assert.equal(gap.endMs, 4000);
  assert.equal(gap.gap, true);
  assert.equal(next.requests, 1);
  assert.equal(next.ended, false);
});

test('ending the last marker leaves an open gap that keeps collecting', () => {
  const r = (id, relMs) => ({ id, key: `k${id}`, method: 'GET', host: 'h', path: `/${id}`, query: '', url: `https://h/${id}`, relMs, status: 200 });
  const records = [r(0, 500), r(2, 2000), r(3, 3000)];
  const markers = [{ id: 'm1', relMs: 1000, label: 'launch', endRelMs: 1800 }];
  const phases = computePhases(records, markers);
  assert.deepEqual(phases.map((p) => p.label), ['Before first marker', 'launch', 'Between phases']);
  const gap = phases[2];
  assert.equal(gap.endMs, Infinity);
  assert.equal(gap.requests, 2);

  const exported = exportPhase(records, markers, 'm1');
  assert.equal(exported.phase.open, false);
  assert.equal(exported.phase.ended, true);
  assert.equal(exported.phase.endMs, 1800);
  assert.deepEqual(exported.records, []); // nothing ran between 1000 and 1800: 500 is before the marker, 2000 and 3000 are after the end
});

test('an empty gap is hidden, and an end that comes after the next marker is ignored', () => {
  const r = (id, relMs) => ({ id, key: `k${id}`, method: 'GET', host: 'h', path: `/${id}`, query: '', url: `https://h/${id}`, relMs, status: 200 });
  // ended at 1900, but the next marker is at 1500: the phase closes at 1500 and there is no gap
  const phases = computePhases([r(1, 1200), r(2, 1600)], [{ id: 'a', relMs: 1000, label: 'a', endRelMs: 1900 }, { id: 'b', relMs: 1500, label: 'b' }]);
  assert.deepEqual(phases.map((p) => p.label), ['a', 'b']);
  assert.equal(phases[0].ended, false);
  assert.equal(phases[0].endMs, 1500);
});
