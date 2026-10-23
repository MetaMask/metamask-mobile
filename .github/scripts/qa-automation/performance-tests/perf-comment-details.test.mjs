import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateApiCalls,
  buildProfilingSection,
  buildApiRequestsSection,
  buildApiRequestsFullReport,
  describeFailure,
  describeQualityGateViolations,
} from './perf-comment-details.mjs';

const profiling = {
  cpu: { avg: 14.19, max: 32.89, unit: '%' },
  memory: { avg: 649.66, max: 786.84, unit: 'MB' },
  networkIO: { upload: 591, download: 5046, unit: 'KB' },
  uiRendering: { slowFrames: 468, frozenFrames: 0, anrs: 0 },
  fps: { avg: 103.92 },
  startup: { cold: 460, hot: 65, unit: 'ms' },
  batteryDrain: { total: 7.68, unit: 'mAh' },
  temperature: { avg: 23.9, max: 24.4, unit: '°C' },
  crashes: 0,
};

test('aggregateApiCalls groups by method and sanitized URL, most called first', () => {
  const groups = aggregateApiCalls([
    { method: 'GET', url: 'https://a.test/prices?x=1', status: 200, time: 10 },
    { method: 'GET', url: 'https://a.test/prices?x=2', status: 200, time: 30 },
    { method: 'GET', url: 'https://a.test/prices?x=3', status: 500, time: 20 },
    { method: 'POST', url: 'https://b.test/rpc', status: 200 },
  ]);

  assert.equal(groups[0].url, 'a.test/prices');
  assert.equal(groups[0].count, 3);
  assert.equal(groups[0].totalTime / groups[0].timedCount, 20);
  assert.equal(groups[1].method, 'POST');
});

test('buildProfilingSection renders a collapsed table with the key metrics', () => {
  const md = buildProfilingSection([
    { testName: 'Asset View', device: 'Pixel 8 (v14.0)', profilingSummary: profiling },
  ]);

  assert.match(md, /<details>\n<summary>📊 App profiling \(1\)<\/summary>/);
  assert.doesNotMatch(md, /<details open/);
  assert.match(
    md,
    /\| Asset View \| Pixel 8 \(v14\.0\) \| 14\.2 \/ 32\.9 % \| 649\.7 \/ 786\.8 MB \| ↓ 4\.9 MB \/ ↑ 591 KB \| 468 \/ 0 \| 103\.9 \| 460 \/ 65 ms \| 7\.7 mAh \| 23\.9 \/ 24\.4 °C \| 0 \| 0 \|/,
  );
});

test('buildProfilingSection shows a dash for metrics TestMu did not report', () => {
  const { cpu, memory } = profiling;

  const md = buildProfilingSection([
    { testName: 'A', device: 'D', profilingSummary: { cpu, memory } },
  ]);

  assert.match(md, /\| — \| — \| — \| — \| — \| — \|\n/);
});

test('buildProfilingSection reports errored scenarios and ignores ones without data', () => {
  const md = buildProfilingSection([
    { testName: 'A', device: 'D', profilingSummary: profiling },
    { testName: 'B', device: 'D', profilingSummary: { error: 'boom' } },
    { testName: 'C', device: 'D', profilingSummary: null },
  ]);

  assert.match(md, /App profiling \(1 of 2\)/);
  assert.match(md, /unavailable for 1 scenario/);
  assert.equal(buildProfilingSection([]), '');
});

const manyCalls = (prefix, count = 3, repeat = 1) =>
  Array.from({ length: count * repeat }, (_, i) => ({
    method: 'GET',
    url: `https://a.test/${prefix}/${i % count}`,
    status: 200,
    time: 5,
  }));

test('buildApiRequestsSection renders one collapsed table per scenario', () => {
  const md = buildApiRequestsSection([
    {
      testName: 'Asset View',
      device: 'D',
      apiCalls: [
        { method: 'GET', url: 'https://a.test/x?k=1', status: 200, time: 10 },
        { method: 'GET', url: 'https://a.test/x?k=2', status: 200, time: 30 },
      ],
    },
  ]);

  assert.match(md, /^<details>\n<summary>🌐 API requests \(1 scenarios, 2 calls\)/);
  assert.match(md, /Asset View — 2 calls, 1 unique/);
  assert.match(md, /\| GET \| `a\.test\/x` \| 2 \| 200 \| 20 ms \|/);
  assert.doesNotMatch(md, /<details open/);
  assert.doesNotMatch(md, /not shown|run summary/);
});

test('buildApiRequestsSection gives every scenario the same number of rows within the budget', () => {
  const runs = [
    { testName: 'Big', device: 'D', apiCalls: manyCalls('big', 200) },
    { testName: 'Medium', device: 'D', apiCalls: manyCalls('med', 80) },
    { testName: 'Small', device: 'D', apiCalls: manyCalls('small', 5) },
  ];

  const md = buildApiRequestsSection(runs, {
    charBudget: 6000,
    fullListUrl: 'https://github.com/o/r/actions/runs/1',
  });

  assert.ok(md.length <= 6000, `section is ${md.length} chars`);
  const rows = (name) => {
    const block = md.split('<details>\n<summary>').find((b) => b.startsWith(name));
    return block.split('\n').filter((l) => l.startsWith('| GET')).length;
  };
  assert.equal(rows('Small'), 5);
  assert.equal(rows('Big'), rows('Medium'));
  assert.ok(rows('Big') > 5);
  assert.match(md, /\[run summary\]\(https:\/\/github\.com\/o\/r\/actions\/runs\/1\)/);
  assert.match(md, /more endpoints \(fewest calls\) not shown/);
});

test('buildApiRequestsSection keeps the most called endpoints when truncating', () => {
  const calls = [
    ...manyCalls('hot', 1, 30),
    ...Array.from({ length: 20 }, (_, i) => ({
      method: 'GET',
      url: `https://a.test/cold-${i}`,
      status: 200,
    })),
  ];
  const md = buildApiRequestsSection(
    [{ testName: 'S', device: 'D', apiCalls: calls }],
    { charBudget: 1500 },
  );

  assert.match(md, /a\.test\/hot\/0/);
  assert.doesNotMatch(md, /cold-9\b/);
  assert.match(md, /not shown/);
});

test('buildApiRequestsSection drops scenarios only when one row each does not fit', () => {
  const runs = Array.from({ length: 10 }, (_, i) => ({
    testName: `Scenario ${i}`,
    device: 'D',
    apiCalls: manyCalls(`s${i}`, 3),
  }));

  const md = buildApiRequestsSection(runs, { charBudget: 2500 });

  assert.ok(md.length <= 2500, `section is ${md.length} chars`);
  assert.match(md, /scenario\(s\) omitted/);
});

test('buildApiRequestsSection notes scenarios whose network logs failed', () => {
  const md = buildApiRequestsSection([
    { testName: 'A', device: 'D', apiCalls: [{ url: 'https://a.test/x' }] },
    { testName: 'B', device: 'D', apiCalls: [], apiCallsError: 'Not Found' },
  ]);

  assert.match(md, /Network logs unavailable for 1 scenario/);
});

test('buildApiRequestsSection is empty when there is nothing to report', () => {
  assert.equal(
    buildApiRequestsSection([{ testName: 'A', device: 'D', apiCalls: null }]),
    '',
  );
});

test('buildApiRequestsFullReport lists every endpoint of every scenario', () => {
  const md = buildApiRequestsFullReport([
    { testName: 'Big', device: 'D', apiCalls: manyCalls('big', 300) },
    { testName: 'Small', device: 'D', apiCalls: manyCalls('small', 2) },
  ]);

  assert.match(md, /^## 🌐 API requests \(complete list\)/);
  assert.equal(md.split('\n').filter((l) => l.startsWith('| GET')).length, 302);
  assert.doesNotMatch(md, /not shown/);
  assert.equal(buildApiRequestsFullReport([]), '');
});

test('describeFailure names the element when it was not found', () => {
  assert.equal(
    describeFailure(
      'Test error',
      'element ("android=new UiSelector().resourceId("navbar-hamburger-menu-button")") still not displayed after 936ms',
    ),
    'Element "navbar-hamburger-menu-button" not found',
  );
  assert.equal(
    describeFailure('Test error', 'element ("~login-button") still not displayed after 10ms'),
    'Element "login-button" not found',
  );
  assert.equal(
    describeFailure(
      'Test error',
      "element (\"//*[@name='x']\") still not displayed after 10ms",
    ),
    "Element \"//*[@name='x']\" not found",
  );
});

test('describeFailure appends the first error line to the reason label', () => {
  assert.equal(
    describeFailure('Test error', 'Expected element text "A" within 10000ms'),
    'Test error: Expected element text "A" within 10000ms',
  );
  assert.match(describeFailure('Test error', 'x'.repeat(400)), /…$/);
});

test('describeFailure falls back to the label without a message', () => {
  assert.equal(describeFailure('Timed out', null), 'Timed out');
  assert.equal(describeFailure('Timed out', undefined), 'Timed out');
});

test('describeQualityGateViolations names each timer with its time and maximum', () => {
  const result = describeQualityGateViolations({
    violations: [
      {
        type: 'step',
        stepIndex: 0,
        stepName: 'time the asset view takes to load',
        actual: 6500,
        threshold: 4000,
      },
      { type: 'total', actual: 12000, threshold: 10000 },
    ],
  });

  assert.equal(
    result,
    'Quality gates exceeded: "time the asset view takes to load" took 6500 ms > max of 4000 ms<br>Total duration was 12000 ms > max of 10000 ms',
  );
});

test('describeQualityGateViolations returns null without usable violations', () => {
  assert.equal(describeQualityGateViolations(null), null);
  assert.equal(describeQualityGateViolations({ violations: [] }), null);
  assert.equal(
    describeQualityGateViolations({ violations: [{ type: 'step' }] }),
    null,
  );
});
