import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
);

const ignoreLines = fs
  .readFileSync(path.join(repoRoot, 'tests', 'hyperexecute', '.hyperexecuteignore'), 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

// /app/**/*.png -> png
const droppedAppExtensions = ignoreLines
  .map((line) => /^\/app\/\*\*\/\*\.(\w+)$/.exec(line)?.[1])
  .filter(Boolean);

// /app/images/ -> app/images/
const droppedAppDirectories = ignoreLines
  .map((line) => /^\/(app\/[\w-]+\/)$/.exec(line)?.[1])
  .filter(Boolean);

const testSources = spawnSync('git', ['ls-files', '-z', 'tests'], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 1 << 26,
})
  .stdout.split('\0')
  .filter((file) => /\.(ts|tsx|js|mjs)$/.test(file));

const IMPORT_SPECIFIER =
  /(?:from|require\(|import\()\s*['"](\.[^'"]*)['"]/g;

/** Relative imports under tests/ that resolve to a path inside app/. */
function appImportsOf(file) {
  const source = fs.readFileSync(path.join(repoRoot, file), 'utf8');
  const resolved = [];
  for (const [, specifier] of source.matchAll(IMPORT_SPECIFIER)) {
    const target = path
      .relative(repoRoot, path.resolve(repoRoot, path.dirname(file), specifier))
      .split(path.sep)
      .join('/');
    if (target.startsWith('app/')) {
      resolved.push({ file, target });
    }
  }
  return resolved;
}

const appImports = testSources.flatMap(appImportsOf);

test('the ignore file drops the app asset types and folders it documents', () => {
  assert.ok(droppedAppExtensions.length > 0);
  assert.ok(droppedAppDirectories.length > 0);
});

test('no test imports an asset type that the HyperExecute upload drops from app/', () => {
  const offenders = appImports.filter(({ target }) =>
    droppedAppExtensions.some((ext) => target.endsWith(`.${ext}`)),
  );

  assert.deepEqual(offenders, []);
});

test('no test imports from an app folder that the HyperExecute upload drops', () => {
  const offenders = appImports.filter(({ target }) =>
    droppedAppDirectories.some((dir) => target.startsWith(dir)),
  );

  assert.deepEqual(offenders, []);
});

test('asset extension rules are anchored to app/ so tests/ fixtures still upload', () => {
  const unanchored = ignoreLines.filter(
    (line) =>
      /^\*\.(png|jpe?g|gif|webp|svg|riv|ttf|otf|html)$/.test(line) ||
      /^\/?\*\*\/\*\.(png|jpe?g|gif|webp|svg|riv|ttf|otf|html)$/.test(line),
  );

  assert.deepEqual(unanchored, []);
});
