#!/usr/bin/env node
/**
 * Split today's ESLint rules into two halves that together match the
 * resolved config for every file `yarn lint` lints:
 *
 *   syntax — every enabled rule that is not cross-file and not type-aware.
 *             Safe to cache per file (content strategy).
 *   cross  — import-x rules that resolve other files, plus the four rules
 *             called out in #33370, plus rules whose implementation requests
 *             type information. Never cached.
 *
 *   node scripts/lint-rule-halves.mjs --prove
 *   node scripts/lint-rule-halves.mjs --half syntax
 *   node scripts/lint-rule-halves.mjs --half cross --files a.js,b.ts
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { listLintFiles } from './lint-shard.mjs';

const require = createRequire(import.meta.url);
const eslintRoot = path.dirname(require.resolve('eslint/package.json'));
const { FileEnumerator } = require(
  path.join(eslintRoot, 'lib/cli-engine/file-enumerator.js'),
);
const { ESLint } = require('eslint');

const LINT_PATTERNS = ['**/*.{js,ts,tsx}'];
const NAMED_CROSS_FILE_RULES = [
  'import-x/no-unresolved',
  'import-x/no-extraneous-dependencies',
  'import-x/no-restricted-paths',
  'import-x/no-duplicates',
];
const IMPORT_X_RULES_DIR = path.resolve(
  'node_modules/eslint-plugin-import-x/lib/rules',
);
const TS_RULES_DIR = path.resolve(
  'node_modules/@typescript-eslint/eslint-plugin/dist/rules',
);

/**
 * @param {unknown} value
 * @returns {0 | 1 | 2}
 */
function severityOf(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 1 || raw === 'warn') return 1;
  if (raw === 2 || raw === 'error') return 2;
  return 0;
}

/**
 * @param {string} ruleId
 */
function isCrossFileRule(ruleId) {
  if (NAMED_CROSS_FILE_RULES.includes(ruleId)) return true;
  if (!ruleId.startsWith('import-x/')) return false;
  const name = ruleId.slice('import-x/'.length);
  const filePath = path.join(IMPORT_X_RULES_DIR, `${name}.js`);
  if (!fs.existsSync(filePath)) return false;
  const source = fs.readFileSync(filePath, 'utf8');
  return /ExportMap|utils_1\.resolve\b|packageDir|readPkgUp|restrictedPath|isExternalModule/.test(
    source,
  );
}

/**
 * @param {string} ruleId
 */
function isTypeAwareRule(ruleId) {
  if (!ruleId.startsWith('@typescript-eslint/')) return false;
  const name = ruleId.slice('@typescript-eslint/'.length);
  const filePath = path.join(TS_RULES_DIR, `${name}.js`);
  if (!fs.existsSync(filePath)) return false;
  const source = fs.readFileSync(filePath, 'utf8');
  return /requiresTypeChecking:\s*true|getParserServices\(/.test(source);
}

/**
 * Enabled rule ids for every file the unsharded lint enumerates.
 * @param {string} cwd
 */
function collectEnabledRules(cwd) {
  const enumerator = new FileEnumerator({
    cwd,
    extensions: null,
    globInputPaths: true,
    errorOnUnmatchedPattern: true,
    ignore: true,
  });
  /** @type {Map<string, Set<string>>} */
  const perFile = new Map();
  const union = new Set();
  let fileCount = 0;
  for (const entry of enumerator.iterateFiles(LINT_PATTERNS)) {
    if (entry.ignored) continue;
    fileCount += 1;
    const resolved = entry.config
      .extractConfig(entry.filePath)
      .toCompatibleObjectAsConfigFileContent();
    /** @type {Set<string>} */
    const enabled = new Set();
    for (const [ruleId, setting] of Object.entries(resolved.rules ?? {})) {
      if (severityOf(setting) > 0) {
        enabled.add(ruleId);
        union.add(ruleId);
      }
    }
    perFile.set(entry.filePath, enabled);
  }
  const cross = new Set(
    [...union].filter((ruleId) => isCrossFileRule(ruleId) || isTypeAwareRule(ruleId)).sort(),
  );
  const syntax = new Set([...union].filter((ruleId) => !cross.has(ruleId)).sort());
  return { fileCount, perFile, union, cross, syntax };
}

/**
 * @param {ReturnType<typeof collectEnabledRules>} collected
 */
function prove(collected) {
  const overlap = [...collected.syntax].filter((ruleId) => collected.cross.has(ruleId));
  const uncovered = [...collected.union].filter(
    (ruleId) => !collected.syntax.has(ruleId) && !collected.cross.has(ruleId),
  );
  let filesWithGap = 0;
  for (const enabled of collected.perFile.values()) {
    for (const ruleId of enabled) {
      const inSyntax = collected.syntax.has(ruleId);
      const inCross = collected.cross.has(ruleId);
      if (inSyntax === inCross) {
        filesWithGap += 1;
        break;
      }
    }
  }
  const crossList = [...collected.cross].sort();
  const syntaxList = [...collected.syntax].sort();
  console.log(`files=${collected.fileCount}`);
  console.log(`enabled_union=${collected.union.size}`);
  console.log(`syntax_half=${syntaxList.length}`);
  console.log(`cross_half=${crossList.length}`);
  console.log(`overlap=${overlap.length}`);
  console.log(`uncovered=${uncovered.length}`);
  console.log(`files_with_gap=${filesWithGap}`);
  console.log('CROSS_RULES');
  for (const ruleId of crossList) console.log(ruleId);
  console.log('SYNTAX_RULES');
  for (const ruleId of syntaxList) console.log(ruleId);
  if (overlap.length || uncovered.length || filesWithGap) {
    process.exitCode = 1;
  }
}

/**
 * @param {string} cwd
 * @param {'syntax' | 'cross'} half
 * @param {ReturnType<typeof collectEnabledRules>} collected
 * @param {string[] | null} files
 */
async function runHalf(cwd, half, collected, files) {
  const turnOff = half === 'syntax' ? collected.cross : collected.syntax;
  /** @type {Record<string, 'off'>} */
  const rules = {};
  for (const ruleId of turnOff) {
    rules[ruleId] = 'off';
  }
  // ESLint 8 unlinks `cacheLocation` whenever `cache` is false
  // (CLIEngine.executeOnFiles). The cross half must not point at the syntax
  // cache, or at the default `.eslintcache`, or that unlink deletes them.
  const useCache = half === 'syntax';
  const eslint = new ESLint({
    cwd,
    useEslintrc: true,
    errorOnUnmatchedPattern: true,
    cache: useCache,
    cacheStrategy: 'content',
    cacheLocation: useCache
      ? path.join(cwd, '.cache/eslint-syntax/cache')
      : path.join(cwd, '.cache/eslint-cross-nocache'),
    overrideConfig: { rules },
  });
  const targets = files ?? listLintFiles(cwd);
  const started = Date.now();
  const results = await eslint.lintFiles(targets);
  const formatter = await eslint.loadFormatter('stylish');
  const text = await formatter.format(results);
  if (text) process.stdout.write(text);
  const errors = results.reduce((sum, result) => sum + result.errorCount, 0);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.error(
    `LINT_HALF_TIMING half=${half} files=${targets.length} eslint_s=${seconds} errors=${errors}`,
  );
  return errors;
}

function parseArgs(argv) {
  /** @type {{ prove: boolean, half: string | null, files: string | null }} */
  const args = { prove: false, half: null, files: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--prove') args.prove = true;
    else if (token === '--half') args.half = argv[++index] ?? null;
    else if (token === '--files') args.files = argv[++index] ?? null;
    else throw new Error(`Unknown argument ${token}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const collected = collectEnabledRules(cwd);
  if (args.prove || !args.half) {
    prove(collected);
  }
  if (!args.half) return;
  if (args.half !== 'syntax' && args.half !== 'cross') {
    throw new Error('--half must be syntax or cross');
  }
  const files = args.files
    ? args.files.split(',').map((filePath) => path.resolve(cwd, filePath))
    : null;
  const errors = await runHalf(cwd, args.half, collected, files);
  if (errors > 0) process.exitCode = 1;
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
