import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateApiCalls,
  buildProfilingSection,
  buildApiRequestsSection,
  describeFailure,
} from './perf-comment-details.mjs';

const profiling = {
  cpu: { avg: 14.19, max: 32.89, unit: '%' },
  memory: { avg: 649.66, max: 786.84, unit: 'MB' },
  networkIO: { upload: 591, download: 5046, unit: 'KB' },
  uiRendering: { slowFrames: 468, frozenFrames: 0, anrs: 0 },
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
    /\| Asset View \| Pixel 8 \(v14\.0\) \| 14\.2 \/ 32\.9 % \| 649\.7 \/ 786\.8 MB \| ↓ 4\.9 MB \/ ↑ 591 KB \| 468 \/ 0 \| 0 \|/,
  );
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

test('buildApiRequestsSection nests a collapsed table per scenario', () => {
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

  assert.match(md, /🌐 API requests \(1 scenarios, 2 calls\)/);
  assert.match(md, /Asset View — 2 calls, 1 unique/);
  assert.match(md, /\| GET \| `a\.test\/x` \| 2 \| 200 \| 20 ms \|/);
  assert.doesNotMatch(md, /<details open/);
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

test('buildApiRequestsSection stays within the character budget', () => {
  const runs = Array.from({ length: 30 }, (_, i) => ({
    testName: `Scenario ${i}`,
    device: 'D',
    apiCalls: Array.from({ length: 40 }, (_, j) => ({
      method: 'GET',
      url: `https://a.test/${j}`,
      status: 200,
      time: 5,
    })),
  }));

  const md = buildApiRequestsSection(runs, { charBudget: 8000 });

  assert.ok(md.length <= 8000, `section is ${md.length} chars`);
  assert.match(md, /scenario\(s\) omitted/);
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
