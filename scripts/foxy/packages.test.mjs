import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodeMappings, originalLine, createPackageLinker, createTagIndex } from './packages.mjs';

test('decodeMappings reads VLQ segments, carrying line state across lines', () => {
  // "AAAA" = gen col 0 -> source 0 line 0; "CAEC" = gen col +1, source line +2 (line 3)
  const lines = decodeMappings('AAAA;CAEC');
  assert.deepEqual(lines, [[[0, 0]], [[1, 2]]]);
  assert.equal(originalLine({ lines }, 1, 1), 1);
  assert.equal(originalLine({ lines }, 2, 2), 3);
  assert.equal(originalLine({ lines }, 2, 1), null, 'before the first mapped column');
  assert.equal(originalLine({ lines }, 9, 1), null, 'line with no mapping');
});

test('decodeMappings handles negative line deltas', () => {
  // "AAEA": source line +2 (0-based 2). "AADA": source line -1, so back to 0-based 1.
  const lines = decodeMappings('AAEA;AADA');
  assert.equal(lines[0][0][1], 2);
  assert.equal(lines[1][0][1], 1);
});

const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'foxy-pkgs-'));
  const write = (rel, body) => {
    const file = join(root, rel);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, body);
  };
  write('node_modules/@metamask/foo-bar/package.json', JSON.stringify({ name: '@metamask/foo-bar', version: '1.2.3', repository: { type: 'git', url: 'git+https://github.com/MetaMask/core.git' } }));
  write('node_modules/@metamask/foo-bar/dist/a.js', 'compiled');
  write('node_modules/@metamask/foo-bar/dist/a.js.map', JSON.stringify({ sources: ['../src/a.ts'], mappings: 'AAAA;CAEC' }));
  write('node_modules/@metamask/no-map/package.json', JSON.stringify({ name: '@metamask/no-map', version: '0.1.0', repository: 'https://github.com/MetaMask/core' }));
  write('node_modules/@metamask/no-map/dist/b.js', 'compiled');
  write('node_modules/third-lib/package.json', JSON.stringify({ name: 'third-lib', version: '9.0.0', repository: { url: 'git+https://github.com/someone/third-lib.git' } }));
  write('node_modules/third-lib/dist/c.js', 'compiled');
  write('node_modules/no-repo/package.json', JSON.stringify({ name: 'no-repo', version: '1.0.0' }));
  write('node_modules/no-repo/index.js', 'compiled');
  return root;
};

test('createPackageLinker links a MetaMask/core package to the source line behind the dist frame', () => {
  const root = fixture();
  try {
    const link = createPackageLinker(root);
    const hit = link({ kind: 'package', file: '@metamask/foo-bar/dist/a.js', line: 2, col: 2 });
    assert.equal(hit.url, 'https://github.com/MetaMask/core/blob/%40metamask/foo-bar%401.2.3/packages/foo-bar/src/a.ts#L3');
    assert.equal(hit.text, 'src/a.ts:3');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('createPackageLinker falls back to the package folder at its release tag, then to the repository', () => {
  const root = fixture();
  try {
    const link = createPackageLinker(root);
    assert.equal(
      link({ kind: 'controller', file: '@metamask/no-map/dist/b.js', line: 4, col: 1 }).url,
      'https://github.com/MetaMask/core/tree/%40metamask/no-map%400.1.0/packages/no-map',
    );
    assert.equal(link({ kind: 'package', file: 'third-lib/dist/c.js', line: 1, col: 1 }).url, 'https://github.com/someone/third-lib');
    assert.equal(link({ kind: 'package', file: 'no-repo/index.js', line: 1, col: 1 }), null, 'no repository: nothing to link');
    assert.equal(link({ kind: 'app', file: 'app/x.ts', line: 1, col: 1 }), null, 'our own files are linked by the dashboard');
    assert.equal(link({ kind: 'package', file: '@metamask/missing/dist/x.js', line: 1, col: 1 }), null, 'unknown package');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a repo outside MetaMask/core links to the exact file and line at its release tag', () => {
  const root = mkdtempSync(join(tmpdir(), 'foxy-pkgs-'));
  try {
    const write = (rel, body) => { mkdirSync(join(root, rel, '..'), { recursive: true }); writeFileSync(join(root, rel), body); };
    write('node_modules/@metamask/abi-utils/package.json', JSON.stringify({ name: '@metamask/abi-utils', version: '3.0.0', repository: { type: 'git', url: 'git+https://github.com/MetaMask/abi-utils.git' } }));
    write('node_modules/@metamask/abi-utils/dist/index.js', 'compiled');
    write('node_modules/@metamask/abi-utils/dist/index.js.map', JSON.stringify({ sources: ['../src/index.ts'], mappings: 'AAAA;CAEC' }));
    write('node_modules/@metamask/nested/package.json', JSON.stringify({ name: '@metamask/nested', version: '1.0.0', repository: { type: 'git', url: 'https://github.com/MetaMask/mono.git', directory: 'packages/nested' } }));
    write('node_modules/@metamask/nested/dist/n.js', 'compiled');
    write('node_modules/@metamask/nested/dist/n.js.map', JSON.stringify({ sources: ['../src/n.ts'], mappings: 'AAAA;CAEC' }));
    const tags = { get: (slug) => (slug === 'MetaMask/abi-utils' ? new Set(['v3.0.0']) : slug === 'MetaMask/mono' ? new Set(['@metamask/nested@1.0.0']) : new Set()) };
    const link = createPackageLinker(root, tags);
    assert.equal(
      link({ kind: 'controller', file: '@metamask/abi-utils/dist/index.js', line: 2, col: 2 }).url,
      'https://github.com/MetaMask/abi-utils/blob/v3.0.0/src/index.ts#L3',
    );
    assert.equal(
      link({ kind: 'controller', file: '@metamask/nested/dist/n.js', line: 2, col: 2 }).url,
      'https://github.com/MetaMask/mono/blob/%40metamask/nested%401.0.0/packages/nested/src/n.ts#L3',
      'a monorepo package uses its repository.directory and its own tag',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a repo outside MetaMask/core falls back to its front page until its tags are known, and when no tag matches', () => {
  const root = mkdtempSync(join(tmpdir(), 'foxy-pkgs-'));
  try {
    const write = (rel, body) => { mkdirSync(join(root, rel, '..'), { recursive: true }); writeFileSync(join(root, rel), body); };
    write('node_modules/@metamask/abi-utils/package.json', JSON.stringify({ name: '@metamask/abi-utils', version: '3.0.0', repository: 'https://github.com/MetaMask/abi-utils' }));
    write('node_modules/@metamask/abi-utils/dist/index.js.map', JSON.stringify({ sources: ['../src/index.ts'], mappings: 'AAAA;CAEC' }));
    const loading = createPackageLinker(root, { get: () => null });
    assert.equal(loading.call(null, { kind: 'controller', file: '@metamask/abi-utils/dist/index.js', line: 2, col: 2 }).url, 'https://github.com/MetaMask/abi-utils');
    const noTag = createPackageLinker(root, { get: () => new Set(['v2.0.0']) });
    assert.equal(noTag({ kind: 'controller', file: '@metamask/abi-utils/dist/index.js', line: 2, col: 2 }).url, 'https://github.com/MetaMask/abi-utils', 'no tag for 3.0.0');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('createTagIndex reads the tags once, in the background', async () => {
  let calls = 0;
  const index = createTagIndex(async (slug) => { calls += 1; return new Set([`tag-of-${slug}`]); });
  assert.equal(index.get('MetaMask/x'), null, 'null while loading');
  assert.equal(index.get('MetaMask/x'), null);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual([...index.get('MetaMask/x')], ['tag-of-MetaMask/x']);
  assert.equal(calls, 1, 'one lookup per repo');
});
