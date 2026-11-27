/* eslint-disable import-x/no-commonjs, import-x/no-nodejs-modules */
// Run with: node --test scripts/network-inspector
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseStack, classifyFrame, pickCaller } = require('./stack');

const BUNDLE = 'http://localhost:8081/index.bundle//&platform=ios&dev=true';

test('parseStack reads named, anonymous and address frames and skips native ones', () => {
  const stack = [
    'Error',
    `    at inspectedFetch (${BUNDLE}:10:5)`,
    `    at ${BUNDLE}:20:7`,
    `    at useBalance (address at ${BUNDLE}:30:9)`,
    '    at forEach (native)',
  ].join('\n');

  assert.deepEqual(parseStack(stack), [
    { methodName: 'inspectedFetch', file: BUNDLE, lineNumber: 10, column: 5 },
    { methodName: '<anonymous>', file: BUNDLE, lineNumber: 20, column: 7 },
    { methodName: 'useBalance', file: BUNDLE, lineNumber: 30, column: 9 },
  ]);
});

test('parseStack returns no frames for a missing stack', () => {
  assert.deepEqual(parseStack(undefined), []);
});

test('pickCaller prefers the first app frame over libraries and the inspector', () => {
  const root = '/repo';
  const frames = [
    { file: '/repo/app/util/networkInspector/install.ts' },
    { file: '/repo/node_modules/axios/index.js' },
    { file: '/repo/app/components/Balance.tsx' },
  ].map((frame) =>
    classifyFrame({ ...frame, methodName: 'f', lineNumber: 1, column: 1 }, root),
  );

  assert.equal(pickCaller(frames).relative, 'app/components/Balance.tsx');
});

test('classifyFrame tolerates frames Metro could not map (file null)', () => {
  const frame = classifyFrame(
    { file: null, methodName: 'next', lineNumber: null, column: null },
    '/repo',
  );

  assert.equal(frame.relative, '');
  assert.equal(frame.origin, 'other');
});

test('pickCaller never names an unresolved bundle URL as the caller', () => {
  const bundle = 'http://localhost:8081/index.bundle?platform=ios';
  const frames = [bundle, bundle].map((file) =>
    classifyFrame({ file, methodName: 'captureStack', lineNumber: 1, column: 1 }, '/repo'),
  );

  assert.equal(frames[0].origin, 'unresolved');
  assert.equal(pickCaller(frames), null);
});

test('pickCaller falls back to a library frame when no app frame exists', () => {
  const frames = [
    { file: '/repo/app/util/networkInspector/install.ts' },
    { file: '/repo/node_modules/axios/index.js' },
  ].map((frame) =>
    classifyFrame({ ...frame, methodName: 'f', lineNumber: 1, column: 1 }, '/repo'),
  );

  assert.equal(pickCaller(frames).relative, 'node_modules/axios/index.js');
});
