#!/usr/bin/env node
/**
 * Shard the same file set as `yarn lint`'s ESLint invocation.
 *
 * The CLI passes the quoted glob of js, ts, and tsx files to ESLint 8.57
 * with --cache and no --ext.
 * Files are enumerated with ESLint's FileEnumerator so .eslintignore,
 * ignorePatterns, and default ignores match the unsharded command.
 * Shards are a deterministic longest-first bin pack by file size.
 *
 * The messenger action types check runs once, on shard 1. Shards 2 and
 * later only lint their files. A shard 1 failure still fails the aggregate
 * `Run lint` job.
 *
 *   node scripts/lint-shard.mjs --help
 *   node scripts/lint-shard.mjs --plan --shards 4
 *   node scripts/lint-shard.mjs --check-union
 *   node scripts/lint-shard.mjs --shard 1 --shards 4
 *   node scripts/lint-shard.mjs --self-test
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, splitBySize, unionDiff } from './lint-shard-plan.mjs';

const require = createRequire(import.meta.url);

let eslintApis;

/**
 * ESLint loads on first enumeration or lint. --help, -h, and --self-test
 * return before this, so they run without node_modules present.
 */
function loadEslintApis() {
  if (!eslintApis) {
    const eslintRoot = path.dirname(require.resolve('eslint/package.json'));
    eslintApis = {
      FileEnumerator: require(
        path.join(eslintRoot, 'lib/cli-engine/file-enumerator.js'),
      ).FileEnumerator,
      ESLint: require('eslint').ESLint,
    };
  }
  return eslintApis;
}

const LINT_PATTERNS = ['**/*.{js,ts,tsx}'];

/**
 * @param {string} cwd
 * @returns {string[]} Absolute paths ESLint would lint for LINT_PATTERNS.
 */
export function listLintFiles(cwd) {
  const { FileEnumerator } = loadEslintApis();
  const enumerator = new FileEnumerator({
    cwd,
    // null matches the CLI: the glob selects extensions, not --ext.
    extensions: null,
    globInputPaths: true,
    errorOnUnmatchedPattern: true,
    ignore: true,
  });
  /** @type {string[]} */
  const files = [];
  for (const entry of enumerator.iterateFiles(LINT_PATTERNS)) {
    if (!entry.ignored) {
      files.push(entry.filePath);
    }
  }
  files.sort();
  return files;
}

/**
 * @param {string[]} files
 * @param {number} shards
 */
export function shardFiles(files, shards) {
  const entries = files.map((filePath) => ({
    path: filePath,
    bytes: fs.statSync(filePath).size,
  }));
  return splitBySize(entries, shards);
}

function selfTest() {
  const entries = [
    { path: 'a', bytes: 50 },
    { path: 'b', bytes: 40 },
    { path: 'c', bytes: 30 },
    { path: 'd', bytes: 20 },
    { path: 'e', bytes: 10 },
  ];
  const bins = splitBySize(entries, 2);
  const again = splitBySize(entries, 2);
  if (JSON.stringify(bins) !== JSON.stringify(again)) {
    throw new Error('split is not deterministic');
  }
  const diff = unionDiff(
    bins.map((bin) => bin.files),
    entries.map((entry) => entry.path),
  );
  if (diff.missing.length || diff.extra.length || diff.duplicates.length) {
    throw new Error(`self-test union failed: ${JSON.stringify(diff)}`);
  }
  // 50+10+20 = 80 and 40+30 = 70, or 50+20 = 70 and 40+30+10 = 80.
  const totals = bins.map((bin) => bin.bytes).sort((a, b) => a - b);
  if (totals[0] !== 70 || totals[1] !== 80) {
    throw new Error(`unexpected balance ${totals.join(',')}`);
  }
  console.log('self-test ok');
}

async function lintPaths(cwd, files) {
  const { ESLint } = loadEslintApis();
  const eslint = new ESLint({
    cwd,
    cache: true,
    cacheStrategy: 'metadata',
    useEslintrc: true,
    errorOnUnmatchedPattern: true,
  });
  const results = await eslint.lintFiles(files);
  const formatter = await eslint.loadFormatter('stylish');
  const text = await formatter.format(results);
  if (text) {
    process.stdout.write(text);
  }
  return results.reduce((sum, result) => sum + result.errorCount, 0);
}

/**
 * Yarn binary for the messenger check.
 * Trust npm_execpath only when its basename matches /yarn/i. Yarn sets that
 * variable to its own binary. npm and node set it to their binaries, and
 * spawning those for messenger-action-types:check fails. Any other value
 * uses yarnPath from .yarnrc.yml, so a Yarn bump needs no edit here.
 * @param {string} cwd
 * @returns {string}
 */
function resolveYarnBinary(cwd) {
  const fromEnv = process.env.npm_execpath;
  if (fromEnv && /yarn/i.test(path.basename(fromEnv))) {
    return fromEnv;
  }
  const yarnrcPath = path.join(cwd, '.yarnrc.yml');
  const yarnrc = fs.readFileSync(yarnrcPath, 'utf8');
  const match = /^yarnPath:\s*(.+)$/m.exec(yarnrc);
  if (!match) {
    throw new Error(`yarnPath is missing from ${yarnrcPath}`);
  }
  const configured = match[1]
    .trim()
    .replace(/\s+#.*$/, '')
    .replace(/^['"]|['"]$/g, '');
  return path.resolve(cwd, configured);
}

/**
 * Print the flags this script actually accepts.
 */
function printHelp() {
  console.log(`Usage: node scripts/lint-shard.mjs [options]

Shard the same file set as yarn lint. The messenger action types check runs
only on shard 1.

Options:
  --shard <n>          Shard index, from 1 to --shards (default 1)
  --shards <n>         Number of shards (default 1)
  --plan               Print file and byte counts per shard
  --check-union        Check shards 2, 3, and 4 against the full file set
  --list               Print the unsharded file list
  --files-from <path>  Lint newline-separated paths instead of enumerating
  --skip-messenger     Skip messenger-action-types:check on shard 1
  --self-test          Run the bin-pack self test
  -h, --help           Show this help
`);
}

function runMessenger(cwd) {
  const yarnBin = resolveYarnBinary(cwd);
  const result = spawnSync(yarnBin, ['messenger-action-types:check'], {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    throw result.error;
  }
  return result.status ?? 1;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.selfTest) {
    selfTest();
    return;
  }

  const cwd = process.cwd();
  const files = args.filesFrom
    ? fs.readFileSync(String(args.filesFrom), 'utf8').split('\n').filter(Boolean)
    : listLintFiles(cwd);

  if (args.list) {
    process.stdout.write(`${files.join('\n')}\n`);
    return;
  }

  const shards = Number(args.shards || (args.checkUnion ? 0 : 1));
  if (args.checkUnion) {
    let failed = false;
    for (const count of [2, 3, 4]) {
      const bins = shardFiles(files, count);
      const diff = unionDiff(
        bins.map((bin) => bin.files),
        files,
      );
      const widths = bins.map((bin) => bin.bytes);
      const min = Math.min(...widths);
      const max = Math.max(...widths);
      console.log(
        `shards=${count} files=${files.length} missing=${diff.missing.length} extra=${diff.extra.length} dup=${diff.duplicates.length} bytes=${widths.join(',')} skew=${(max / min).toFixed(3)}`,
      );
      if (diff.missing.length || diff.extra.length || diff.duplicates.length) {
        failed = true;
      }
    }
    if (failed) {
      process.exitCode = 1;
    }
    return;
  }

  if (args.plan) {
    const bins = shardFiles(files, shards);
    bins.forEach((bin, index) => {
      console.log(
        `shard ${index + 1}/${shards} files=${bin.files.length} bytes=${bin.bytes}`,
      );
    });
    return;
  }

  const shard = Number(args.shard || 1);
  if (!Number.isInteger(shard) || shard < 1 || shard > shards) {
    throw new Error(`--shard must be between 1 and ${shards}`);
  }
  const bins = shardFiles(files, shards);
  const selected = bins[shard - 1];
  const started = Date.now();
  const errorCount = await lintPaths(cwd, selected.files);
  const eslintSeconds = ((Date.now() - started) / 1000).toFixed(1);
  console.error(
    `LINT_SHARD_TIMING shard=${shard}/${shards} files=${selected.files.length} bytes=${selected.bytes} eslint_s=${eslintSeconds} errors=${errorCount}`,
  );
  if (errorCount > 0) {
    process.exitCode = 1;
    return;
  }
  // Once per `yarn lint`, on shard 1. Later shards would repeat the same
  // repository-wide check. Shard 1 is required, so a failure still fails the
  // aggregate lint job.
  if (shard === 1 && !args.skipMessenger) {
    const status = runMessenger(cwd);
    if (status !== 0) {
      process.exitCode = status;
    }
  }
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
