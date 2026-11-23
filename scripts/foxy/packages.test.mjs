import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodeMappings, originalLine, createPackageLinker } from './packages.mjs';

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
