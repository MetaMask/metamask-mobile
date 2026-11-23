#!/usr/bin/env node
/**
 * Apply oxlint auto-fixes for `yarn lint:fix` and lint-staged.
 *
 * Plain `oxlint --fix` also rewrites code at sites listed in
 * oxlint-suppressions.json, and prunes that file. This runs oxlint with a
 * temporary copy of .oxlintrc.json (see buildFixConfig) where suppressed rules
 * are off and every other rule warns, so findings do not fail the fix step;
 * the `oxlint` check after it reports them. Oxlint reads
 * oxlint-suppressions.json from its working directory, so it runs from an
 * empty temporary directory and never sees or rewrites that file.
 *
 * Oxlint applies one round of fixes per run, and one fix can expose another
 * (prefer-arrow-callback, then arrow-body-style). Like eslint --fix, this
 * repeats until no file changes, up to 10 passes.
 *
 *   node scripts/oxlint-fix.mjs            # whole repository
 *   node scripts/oxlint-fix.mjs a.ts b.tsx # only these files
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFixConfig } from './oxlint-fix-config.mjs';

const MAX_PASSES = 10;

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

/**
 * Files whose modification time tells whether a pass changed anything:
 * the given files, or the files in the given directories.
 * @param {string[]} targets
 * @returns {string[]}
 */
function watchedFiles(targets) {
  const pathspecs = targets.length
    ? targets
    : ['*.js', '*.jsx', '*.ts', '*.tsx'];
  const listed = spawnSync(
    'git',
    [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '-z',
      '--',
      ...pathspecs,
    ],
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (listed.error || listed.status !== 0) {
    throw listed.error ?? new Error(listed.stderr);
  }
  return listed.stdout
    .split('\0')
    .filter(Boolean)
    .map((file) => path.join(repoRoot, file));
}

/**
 * @param {string[]} files
 * @returns {string}
 */
function snapshot(files) {
  return files
    .map((file) => {
      const stat = fs.statSync(file, { bigint: true, throwIfNoEntry: false });
      return stat ? `${stat.mtimeNs}:${stat.size}` : '';
    })
    .join('\n');
}

function main() {
  const readJson = (name) =>
    JSON.parse(fs.readFileSync(path.join(repoRoot, name), 'utf8'));
  const fixConfig = buildFixConfig(
    readJson('.oxlintrc.json'),
    readJson('oxlint-suppressions.json'),
  );
  // Globs in the config resolve against its directory, so the copy sits next
  // to .oxlintrc.json. .gitignore covers the name.
  const configPath = path.join(
    repoRoot,
    `.oxlintrc.fix-${process.pid}.tmp.json`,
  );
  const targets = process.argv.slice(2).map((file) => path.resolve(file));
  const watched = watchedFiles(targets);
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oxlint-fix-'));
  fs.writeFileSync(configPath, JSON.stringify(fixConfig));
  try {
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const before = snapshot(watched);
      const result = spawnSync(
        path.join(repoRoot, 'node_modules', '.bin', 'oxlint'),
        [
          '-c',
          configPath,
          '--fix',
          '--quiet',
          '--no-error-on-unmatched-pattern',
          ...(targets.length ? targets : [repoRoot]),
        ],
        { cwd: workDir, stdio: ['ignore', 'pipe', 'inherit'] },
      );
      if (result.error) {
        throw result.error;
      }
      if (result.status !== 0) {
        process.stdout.write(result.stdout);
        process.exitCode = result.status ?? 1;
        return;
      }
      if (snapshot(watched) === before) {
        return;
      }
    }
  } finally {
    fs.rmSync(configPath, { force: true });
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

main();
