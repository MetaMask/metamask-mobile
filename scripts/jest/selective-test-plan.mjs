/**
 * Decides which unit and component-view suites a pull request must run.
 *
 * Any change that can affect every suite (Jest/Babel/TS config, the shared test
 * harness, mocks, dependency lockfiles, CI itself, non-English locales) selects
 * the full suite. Changes to `locales/languages/en.json` only select suites that
 * reference the changed message keys. Everything else selects the suites that
 * Jest's `--changedSince` and `--findRelatedTests` resolve for the changed files.
 * Related tests use the tuned dependency extractor in `dependency-extractor.js`.
 *
 * CI is in shadow mode: this plan is recorded and compared with failures, and
 * every suite still runs. Main, the merge queue, scheduled and manual runs, and
 * a pull request with the `run-all-unit-tests` label, plan the full suite.
 *
 * Usage (from the repo root, on a pull request checkout):
 *   node scripts/jest/selective-test-plan.mjs --event pull_request --base <base-sha>
 *
 * Writes the plan as JSON to stdout and, when GITHUB_OUTPUT is set, as step
 * outputs consumed by the `test-plan` job in `.github/workflows/ci.yml`.
 */
import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

export const FULL_SHARD_COUNT = 10;
export const UNIT_SINGLE_SHARD_MAX = 100;
export const CV_SINGLE_SHARD_MAX = 15;
// The tuned graph's typical selection is well under half the suite. 80% is the
// point where a "selective" run is close enough to a full run to just be one.
export const MAX_SELECTED_SHARE = 0.8;
export const EN_MESSAGES_PATH = 'locales/languages/en.json';

const KEY_SCAN_ROOTS = ['app', 'tests'];
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/;

const FULL_RUN_PATTERNS = [
  /^jest\.config(?:\.[\w-]+)?\.js$/,
  /^jest\.preprocessor\.js$/,
  /^babel\.config(?:\.[\w-]+)?\.js$/,
  /^tsconfig(?:\.[\w-]+)?\.json$/,
  /^package\.json$/,
  /^yarn\.lock$/,
  /^\.yarnrc\.yml$/,
  /^\.yarn\//,
  /^\.nvmrc$/,
  /^app\/util\/test\//,
  /^app\/__mocks__\//,
  /^app\/core\/__mocks__\//,
  /^tests\/component-view\//,
  /^tests\/(?:helpers|utils|setup)\//,
  /^locales\/i18n\.js$/,
  /^locales\/languages\/(?!en\.json$)[^/]+\.json$/,
  /^scripts\/jest\//,
  /^\.github\//,
];

const STRING_LITERAL = /['"`]([^'"`\\\r\n]{1,300})['"`]/g;
const TEMPLATE_PREFIX = /`([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)\.\$\{/g;
const CONCAT_PREFIX = /['"]([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)\.['"]\s*\+/g;

/**
 * @param {string} file Repo-relative path.
 * @returns {string | null} The first full-run trigger matched by `file`, if any.
 */
export function findFullRunTrigger(changedFiles) {
  for (const file of changedFiles) {
    if (FULL_RUN_PATTERNS.some((pattern) => pattern.test(file))) {
      return file;
    }
  }
  return null;
}

/**
 * @param {unknown} value Parsed locale JSON.
 * @param {string} prefix Dotted key prefix.
 * @param {Map<string, string>} out Receives dotted key -> serialized leaf value.
 * @returns {Map<string, string>}
 */
export function flattenMessages(value, prefix = '', out = new Map()) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flattenMessages(child, prefix ? `${prefix}.${key}` : key, out);
    }
  } else {
    out.set(prefix, JSON.stringify(value));
  }
  return out;
}

/**
 * @returns {string[]} Dotted keys added, removed or whose value changed.
 */
export function changedMessageKeys(baseMessages, headMessages) {
  const base = flattenMessages(baseMessages);
  const head = flattenMessages(headMessages);
  const changed = new Set();
  for (const [key, value] of base) {
    if (head.get(key) !== value) {
      changed.add(key);
    }
  }
  for (const key of head.keys()) {
    if (!base.has(key)) {
      changed.add(key);
    }
  }
  return [...changed].sort();
}

/**
 * Extracts what a source file says about message keys.
 *
 * @param {string} content Source text.
 * @returns {{ literals: Set<string>, dynamicPrefixes: Set<string> }}
 * `dynamicPrefixes` holds key prefixes that are built at runtime, such as
 * `` `perps.${name}` `` or `'perps.' + name`. Keys under them cannot be traced
 * back to files, so the caller must fall back to the full suite.
 */
export function scanSource(content) {
  const literals = new Set();
  const dynamicPrefixes = new Set();
  for (const match of content.matchAll(STRING_LITERAL)) {
    literals.add(match[1]);
  }
  for (const match of content.matchAll(TEMPLATE_PREFIX)) {
    dynamicPrefixes.add(match[1]);
  }
  for (const match of content.matchAll(CONCAT_PREFIX)) {
    dynamicPrefixes.add(match[1]);
  }
  return { literals, dynamicPrefixes };
}

/**
 * @param {string[]} keys Changed message keys.
 * @param {{ file: string, literals: Set<string>, dynamicPrefixes: Set<string> }[]} scans
 * @returns {{ files: Set<string>, dynamicKeys: string[] }}
 */
export function findKeyReferences(keys, scans) {
  const files = new Set();
  const dynamicPrefixes = new Set();
  for (const scan of scans) {
    for (const prefix of scan.dynamicPrefixes) {
      dynamicPrefixes.add(prefix);
    }
    for (const key of keys) {
      if (scan.literals.has(key)) {
        files.add(scan.file);
      }
    }
  }
  const dynamicKeys = keys.filter((key) =>
    [...dynamicPrefixes].some(
      (prefix) => key === prefix || key.startsWith(`${prefix}.`),
    ),
  );
  return { files, dynamicKeys };
}

/**
 * @param {string} project `unit` or `cv`.
 * @param {number} count Selected suite count.
 * @returns {number[]} Shard indexes (1-based) to run.
 */
export function shardIndexesFor(project, count) {
  const singleShardMax =
    project === 'cv' ? CV_SINGLE_SHARD_MAX : UNIT_SINGLE_SHARD_MAX;
  const shardCount = count <= singleShardMax ? 1 : FULL_SHARD_COUNT;
  return Array.from({ length: shardCount }, (_, index) => index + 1);
}

/**
 * @param {string} testPath Repo-relative test path.
 * @returns {string} A Jest regex that matches exactly that path at its end.
 */
export function toPathPattern(testPath) {
  return `${testPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
}

/**
 * @param {{
 *   eventName: string,
 *   changedFiles: string[],
 *   changedMessages: string[] | null,
 *   scans: { file: string, literals: Set<string>, dynamicPrefixes: Set<string> }[],
 *   listSuites: (project: string, options: { changedSince?: string, relatedTo?: string[] }) => string[],
 *   runAll?: boolean | string,
 *   reason?: string,
 * }} input
 * `listSuites` returns repo-relative suite paths for a project and must already
 * honour the same selection as the matching CI command.
 */
export function computePlan(input) {
  const { eventName, changedFiles, changedMessages, scans } = input;

  if (eventName !== 'pull_request') {
    return fullPlan(`non-pull-request event: ${eventName}`);
  }

  if (input.runAll === true || input.runAll === 'true') {
    return fullPlan('run-all-unit-tests label');
  }

  const trigger = findFullRunTrigger(changedFiles);
  if (trigger) {
    return fullPlan(`full-run trigger changed: ${trigger}`);
  }

  let referencingSources = [];
  if (changedMessages && changedMessages.length > 0) {
    const refs = findKeyReferences(changedMessages, scans);
    if (refs.dynamicKeys.length > 0) {
      return fullPlan(
        `changed message keys are built dynamically: ${refs.dynamicKeys.slice(0, 5).join(', ')}`,
      );
    }
    referencingSources = [...refs.files]
      .filter((file) => SOURCE_FILE.test(file))
      .sort();
  }

  const projects = {
    unit: planProject({ project: 'unit', input, referencingSources }),
    cv: planProject({ project: 'cv', input, referencingSources }),
  };

  return {
    eventName,
    shadow: true,
    reason:
      referencingSources.length > 0
        ? `selected suites referencing ${changedMessages.length} changed message key(s)`
        : 'selected suites related to changed files',
    thresholdsEnforced: Object.values(projects).every(
      (plan) => plan.mode === 'full',
    ),
    projects,
  };
}

function planProject({ project, input, referencingSources }) {
  const total = input.listSuites(project, {});
  const totalSet = new Set(total);
  const changedSince = input
    .listSuites(project, { changedSince: input.baseSha })
    .filter((suite) => totalSet.has(suite));
  const related =
    referencingSources.length > 0
      ? input
          .listSuites(project, { relatedTo: referencingSources })
          .filter((suite) => totalSet.has(suite))
      : [];

  const selected = [...new Set([...changedSince, ...related])].sort();
  if (selected.length > total.length * MAX_SELECTED_SHARE) {
    return {
      mode: 'full',
      reason: `selection covers ${selected.length} of ${total.length} suites`,
      count: total.length,
      shards: fullShards(),
      patterns: [],
    };
  }

  return {
    mode: 'selective',
    reason: `${selected.length} of ${total.length} suites selected`,
    count: selected.length,
    shards: shardIndexesFor(project, selected.length),
    patterns: selected.map(toPathPattern),
  };
}

function fullShards() {
  return Array.from({ length: FULL_SHARD_COUNT }, (_, index) => index + 1);
}

function fullPlan(reason) {
  const project = (name) => ({
    mode: 'full',
    reason,
    count: null,
    shards: fullShards(),
    patterns: [],
  });
  return {
    eventName: 'non-pull-request',
    shadow: true,
    reason,
    thresholdsEnforced: true,
    projects: { unit: project('unit'), cv: project('cv') },
  };
}

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

function readBaseFile(baseSha, file) {
  try {
    return git(['show', `${baseSha}:${file}`]);
  } catch {
    return null;
  }
}

function listSourceFiles(root) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(path.join(root, dir), {
      withFileTypes: true,
    })) {
      const relative = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') {
          walk(relative);
        }
      } else if (SOURCE_FILE.test(entry.name)) {
        files.push(relative);
      }
    }
  };
  for (const scanRoot of KEY_SCAN_ROOTS) {
    walk(scanRoot);
  }
  return files;
}

function runJestListTests(args) {
  const output = execFileSync('yarn', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => path.relative(process.cwd(), line));
}

// `all` reuses the CI test script so the suite universe matches what each shard
// runs. `changedSince` and `relatedTo` call Jest directly: the test:unit script's
// positional roots turn --changedSince into a no-op, and findRelatedTests would
// treat those roots as source files. Their results are intersected with `all`.
const LIST_COMMANDS = {
  unit: { all: ['test:unit'], direct: ['jest'] },
  cv: {
    all: ['test:view:ci'],
    direct: ['jest', '-c', 'jest.config.view.js'],
  },
};

function makeListSuites() {
  return (project, options) => {
    const { direct, all } = LIST_COMMANDS[project];
    if (options.relatedTo) {
      return runJestListTests([
        ...direct,
        '--listTests',
        '--findRelatedTests',
        ...options.relatedTo,
      ]);
    }
    if (options.changedSince) {
      return runJestListTests([
        ...direct,
        '--listTests',
        `--changedSince=${options.changedSince}`,
      ]);
    }
    return runJestListTests([...all, '--listTests']);
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    options[argv[index].replace(/^--/, '')] = argv[index + 1];
  }
  return options;
}

function writeGithubOutputs(plan) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) {
    return;
  }
  const lines = [
    `thresholds_enforced=${plan.thresholdsEnforced}`,
    `reason=${plan.reason.replace(/\r?\n/g, ' ')}`,
  ];
  for (const [project, value] of Object.entries(plan.projects)) {
    lines.push(
      `${project}_mode=${value.mode}`,
      `${project}_count=${value.count ?? ''}`,
    );
  }
  appendFileSync(outputFile, `${lines.join('\n')}\n`);
}

function changedFilesSince(baseSha) {
  return git(['diff', '--name-only', '--diff-filter=ACMRD', `${baseSha}...HEAD`])
    .split('\n')
    .filter(Boolean);
}

function buildPlan({ eventName, baseSha, runAll }) {
  if (eventName !== 'pull_request') {
    return computePlan({
      eventName,
      baseSha,
      changedFiles: [],
      changedMessages: null,
      scans: [],
      listSuites: () => [],
    });
  }

  if (runAll === true || runAll === 'true') {
    return fullPlan('run-all-unit-tests label');
  }

  let changedFiles;
  try {
    changedFiles = changedFilesSince(baseSha);
  } catch (error) {
    return fullPlan(`could not diff against base: ${error.message}`);
  }

  let changedMessages = null;
  if (changedFiles.includes(EN_MESSAGES_PATH)) {
    const baseSource = readBaseFile(baseSha, EN_MESSAGES_PATH);
    if (baseSource === null) {
      return fullPlan(`${EN_MESSAGES_PATH} is missing on the base commit`);
    }
    changedMessages = changedMessageKeys(
      JSON.parse(baseSource),
      JSON.parse(readFileSync(EN_MESSAGES_PATH, 'utf8')),
    );
  }

  const scans =
    changedMessages && changedMessages.length > 0
      ? listSourceFiles(process.cwd()).map((file) => ({
          file,
          ...scanSource(readFileSync(file, 'utf8')),
        }))
      : [];

  return computePlan({
    eventName,
    baseSha,
    changedFiles,
    changedMessages,
    scans,
    runAll,
    listSuites: makeListSuites(),
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const eventName = options.event ?? process.env.GITHUB_EVENT_NAME ?? 'local';
  const plan = buildPlan({
    eventName,
    baseSha: options.base,
    runAll: options['run-all'],
  });

  const json = `${JSON.stringify(plan, null, 2)}\n`;
  if (options.out) {
    writeFileSync(options.out, json);
  }
  process.stdout.write(json);
  writeGithubOutputs(plan);
}

if (process.argv[1] && path.basename(process.argv[1]) === 'selective-test-plan.mjs') {
  main();
}
