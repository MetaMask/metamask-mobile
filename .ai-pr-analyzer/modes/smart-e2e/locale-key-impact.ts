/**
 * Locale key impact for smart-e2e.
 *
 * A change to `en.json` used to force ALL E2E tags. Most locale PRs touch a
 * handful of keys, so this module works out which keys actually changed and
 * which files consume them, then lets the import-graph walker map those files
 * to smoke spec tags.
 *
 * Only modified and removed keys can break an existing test: added keys have
 * no consumers yet (new code that uses them is a changed file in the same PR
 * and is traced by the import graph on its own).
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  evaluateExtractTagsFromImportGraph,
  type TagCatalog,
} from './hard-rule-extract';

export type LocaleKeyChange = {
  key: string;
  kind: 'modified' | 'removed';
  /** Value at the base revision; tests may hardcode it as a literal. */
  oldValue: string;
};

export type LocaleDiff = {
  added: string[];
  changed: LocaleKeyChange[];
};

export type LocaleUsageOptions = {
  baseDir: string;
  /** Directories that consume locale keys (app code, test selectors). */
  usagePrefixes: string[];
  /** Directories where hardcoded copy (old values) is searched. */
  copyLiteralPrefixes: string[];
  /** Old values shorter than this are not searched as copy literals. */
  minCopyLiteralLength: number;
};

const SOURCE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx'];

/** git pathspecs: a bare `*` crosses `/`, so `app/*.ts` is recursive. */
function sourcePathspecs(prefixes: string[]): string[] {
  return prefixes.flatMap((prefix) =>
    SOURCE_EXTENSIONS.map((ext) => `${prefix}*.${ext}`),
  );
}

/**
 * Flatten nested locale JSON to dotted keys. Leaves are stringified.
 *
 * @param value - Parsed locale JSON (or a sub-tree of it).
 * @param prefix - Dotted path of `value`.
 * @param out - Accumulator.
 * @returns Map of dotted key to leaf string.
 */
export function flattenLocale(
  value: unknown,
  prefix = '',
  out: Map<string, string> = new Map(),
): Map<string, string> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [childKey, child] of Object.entries(value)) {
      flattenLocale(child, prefix ? `${prefix}.${childKey}` : childKey, out);
    }
    return out;
  }
  if (prefix) {
    out.set(prefix, typeof value === 'string' ? value : JSON.stringify(value));
  }
  return out;
}

/**
 * Compare two parsed locale trees.
 *
 * @param base - Locale JSON at the merge base.
 * @param head - Locale JSON at HEAD.
 * @returns Added keys and modified/removed keys with their old value.
 */
export function diffLocale(base: unknown, head: unknown): LocaleDiff {
  const before = flattenLocale(base);
  const after = flattenLocale(head);
  const added: string[] = [];
  const changed: LocaleKeyChange[] = [];
  for (const [key, oldValue] of before) {
    if (!after.has(key)) {
      changed.push({ key, kind: 'removed', oldValue });
    } else if (after.get(key) !== oldValue) {
      changed.push({ key, kind: 'modified', oldValue });
    }
  }
  for (const key of after.keys()) {
    if (!before.has(key)) {
      added.push(key);
    }
  }
  return { added, changed };
}

function git(baseDir: string, args: string[]): string | null {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      cwd: baseDir,
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    return null;
  }
}

/**
 * Read the locale file at the merge base of `baseBranch` and HEAD.
 *
 * @param baseDir - Repo root.
 * @param baseBranch - e.g. `origin/main`.
 * @param localeFile - Repo-relative path.
 * @returns Parsed JSON, or null when the base revision cannot be read.
 */
export function readBaseLocale(
  baseDir: string,
  baseBranch: string,
  localeFile: string,
): unknown {
  const mergeBase = git(baseDir, ['merge-base', baseBranch, 'HEAD'])?.trim();
  const rev = mergeBase || baseBranch;
  const source = git(baseDir, ['show', `${rev}:${localeFile}`]);
  if (source === null) {
    return null;
  }
  try {
    return JSON.parse(source);
  } catch {
    return null;
  }
}

/**
 * Read the locale file from the working tree (HEAD in CI).
 *
 * @param baseDir - Repo root.
 * @param localeFile - Repo-relative path.
 * @returns Parsed JSON, or null when missing or invalid.
 */
export function readHeadLocale(baseDir: string, localeFile: string): unknown {
  try {
    return JSON.parse(readFileSync(join(baseDir, localeFile), 'utf8'));
  } catch {
    return null;
  }
}

function grepFiles(
  baseDir: string,
  prefixes: string[],
  pattern: string,
  mode: '-F' | '-E',
): string[] {
  if (prefixes.length === 0) {
    return [];
  }
  const out = git(baseDir, [
    'grep',
    '-l',
    mode,
    '-e',
    pattern,
    '--',
    ...sourcePathspecs(prefixes),
  ]);
  if (!out) {
    return [];
  }
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Static prefixes of template-literal keys, e.g. `` strings(`perps.tabs.${id}`) ``
 * yields `perps.tabs.`. A changed key under that prefix may be consumed there.
 *
 * @param baseDir - Repo root.
 * @param prefixes - Directories to scan.
 * @returns Map of static prefix to files using it.
 */
export function findTemplateKeyPrefixes(
  baseDir: string,
  prefixes: string[],
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  const out = git(baseDir, [
    'grep',
    '-n',
    '-o',
    '-E',
    '-e',
    'strings\\([[:space:]]*`[A-Za-z0-9_.]+\\$\\{',
    '--',
    ...sourcePathspecs(prefixes),
  ]);
  if (!out) {
    return result;
  }
  for (const line of out.split('\n')) {
    const match = /^([^:]+):\d+:strings\(\s*`([A-Za-z0-9_.]+)\$\{/.exec(line);
    if (!match) {
      continue;
    }
    const [, file, keyPrefix] = match;
    // A prefix without a dot (e.g. `` `${ns}` `` or `` `perps${x}` ``) names
    // no namespace; it cannot be traced and would match everything.
    if (!keyPrefix.includes('.')) {
      continue;
    }
    const files = result.get(keyPrefix) ?? new Set<string>();
    files.add(file);
    result.set(keyPrefix, files);
  }
  return result;
}

/**
 * The longest static run of copy in a value, skipping `{{interpolation}}`.
 *
 * @param value - Locale string.
 * @returns Longest literal segment, trimmed.
 */
export function longestStaticSegment(value: string): string {
  return value
    .split(/\{\{[^}]*\}\}/)
    .map((segment) => segment.trim())
    .reduce(
      (best, segment) => (segment.length > best.length ? segment : best),
      '',
    );
}

/**
 * Files that consume one changed key.
 *
 * Covers: quoted key literals (`strings('a.b')`, constants maps),
 * `enContent.a.b` in E2E selectors, template-literal prefixes, and the old
 * copy hardcoded as a quoted literal in tests.
 *
 * @param change - The changed key.
 * @param templatePrefixes - From {@link findTemplateKeyPrefixes}.
 * @param options - Search options.
 * @returns Repo-relative files.
 */
export function findKeyConsumers(
  change: LocaleKeyChange,
  templatePrefixes: Map<string, Set<string>>,
  options: LocaleUsageOptions,
): Set<string> {
  const { baseDir, usagePrefixes, copyLiteralPrefixes } = options;
  const files = new Set<string>();
  const key = escapeRegex(change.key);

  for (const file of grepFiles(
    baseDir,
    usagePrefixes,
    `['"\`]${key}['"\`]|enContent\\.${key}([^A-Za-z0-9_]|$)`,
    '-E',
  )) {
    files.add(file);
  }

  for (const [keyPrefix, prefixFiles] of templatePrefixes) {
    if (change.key.startsWith(keyPrefix)) {
      for (const file of prefixFiles) {
        files.add(file);
      }
    }
  }

  const copy = longestStaticSegment(change.oldValue);
  if (copy.length >= options.minCopyLiteralLength) {
    for (const quote of ["'", '"', '`']) {
      if (copy.includes(quote)) {
        continue;
      }
      // Whole-literal match only: a test asserting the exact old text.
      for (const file of grepFiles(
        baseDir,
        copyLiteralPrefixes,
        `${quote}${copy}${quote}`,
        '-F',
      )) {
        files.add(file);
      }
    }
  }

  return files;
}

type LocaleRule = {
  name: string;
  description: string;
  trigger: { type: string; [key: string]: unknown };
};

type LocaleTrigger = {
  localeFile?: string;
  usagePrefixes?: string[];
  copyLiteralPrefixes?: string[];
  minCopyLiteralLength?: number;
  /** Above this many modified/removed keys, treat as a mass rewrite → ALL. */
  maxChangedKeys?: number;
  /** Trigger fields forwarded to evaluateExtractTagsFromImportGraph. */
  importGraph?: Record<string, unknown>;
};

type AnalysisContext = { baseDir: string; baseBranch: string };

export type LocaleImpactResult = {
  detail: string;
  selectedTags: string[];
  /** Overrides the rule's confidence (0 when the AI must pick the tags). */
  confidence?: number;
};

const MAX_LISTED_CONSUMERS = 30;

const DEFAULT_LOCALE_FILE = 'locales/languages/en.json';

function all(rule: LocaleRule, why: string): LocaleImpactResult {
  return {
    detail: `${rule.description}: ${why}; running ALL`,
    selectedTags: ['ALL'],
  };
}

/**
 * Hard-rule trigger: map changed locale keys to smoke spec tags.
 *
 * Returns null (rule does not match) when the locale file is untouched or no
 * existing key changed, so later rules and the AI handle the rest of the PR.
 * Returns ALL when the diff cannot be computed or is a mass rewrite.
 *
 * @param rule - Hard rule with an `extractTagsFromLocaleKeys` trigger.
 * @param changedFiles - PR changed files.
 * @param context - Analysis context (repo root, base branch).
 * @param catalog - Tag catalog.
 * @param normalize - Path normaliser from the engine.
 * @returns Selected tags and a reasoning detail, or null.
 */
export function evaluateExtractTagsFromLocaleKeys(
  rule: LocaleRule,
  changedFiles: string[],
  context: AnalysisContext,
  catalog: TagCatalog,
  normalize: (path: string) => string,
): LocaleImpactResult | null {
  const trigger = rule.trigger as LocaleTrigger;
  const localeFile = trigger.localeFile ?? DEFAULT_LOCALE_FILE;
  const normalizedChanged = changedFiles.map((file) => normalize(file));
  if (!normalizedChanged.includes(localeFile)) {
    return null;
  }

  const base = readBaseLocale(context.baseDir, context.baseBranch, localeFile);
  const head = readHeadLocale(context.baseDir, localeFile);
  if (base === null || head === null) {
    return all(rule, `could not read ${localeFile} at base or HEAD`);
  }

  const { added, changed } = diffLocale(base, head);
  if (changed.length === 0) {
    // Additions only (or formatting): no existing consumer can break.
    console.log(
      `   ${rule.name}: ${added.length} added key(s), none modified/removed`,
    );
    return null;
  }
  const maxChangedKeys = trigger.maxChangedKeys ?? 150;
  if (changed.length > maxChangedKeys) {
    return all(
      rule,
      `${changed.length} keys modified/removed (limit ${maxChangedKeys})`,
    );
  }

  const options: LocaleUsageOptions = {
    baseDir: context.baseDir,
    usagePrefixes: trigger.usagePrefixes ?? ['app/', 'tests/'],
    copyLiteralPrefixes: trigger.copyLiteralPrefixes ?? ['tests/'],
    minCopyLiteralLength: trigger.minCopyLiteralLength ?? 4,
  };
  const templatePrefixes = findTemplateKeyPrefixes(
    context.baseDir,
    options.usagePrefixes,
  );

  const consumers = new Set<string>();
  const untraced: string[] = [];
  for (const change of changed) {
    const files = findKeyConsumers(change, templatePrefixes, options);
    if (files.size === 0) {
      untraced.push(change.key);
    }
    for (const file of files) {
      consumers.add(file);
    }
  }

  // Union the PR's other changed files: this rule wins first match, so the
  // import-graph rules below it would not run for them otherwise.
  const graphInputs = new Set<string>(consumers);
  for (const file of normalizedChanged) {
    if (file !== localeFile) {
      graphInputs.add(file);
    }
  }

  const graph = evaluateExtractTagsFromImportGraph(
    {
      name: rule.name,
      description: rule.description,
      trigger: {
        ...(trigger.importGraph ?? {}),
        type: 'extractTagsFromImportGraph',
        includeChangedSpecs: true,
      },
    },
    [...graphInputs],
    context,
    catalog,
    normalize,
  );

  const keyList = changed.map((change) => change.key);
  const shown = keyList.slice(0, 10).join(', ');
  const more = keyList.length > 10 ? ` (+${keyList.length - 10} more)` : '';
  const untracedNote = untraced.length
    ? `; no consumers found for ${untraced.length} key(s)`
    : '';

  // Production consumers only: unit tests never run in E2E.
  const listed = [...consumers]
    .filter((file) => !/\.test\.(ts|tsx|js|jsx)$/.test(file))
    .sort();
  const consumerNote =
    listed.length === 0
      ? ''
      : ` Consumers: ${listed.slice(0, MAX_LISTED_CONSUMERS).join(', ')}` +
        (listed.length > MAX_LISTED_CONSUMERS
          ? ` (+${listed.length - MAX_LISTED_CONSUMERS} more)`
          : '');
  const summary =
    `${rule.description}: ${keyList.length} key(s) changed [${shown}${more}], ` +
    `${consumers.size} consumer file(s)${untracedNote}`;

  if (!graph) {
    // No smoke spec imports a consumer directly. Seed the AI with the
    // consumer list (empty floor, zero confidence) so it maps those screens
    // to tags instead of re-deriving the impact from the raw diff.
    return {
      detail: `${summary} → no smoke spec reached via import graph.${consumerNote}`,
      selectedTags: [],
      confidence: 0,
    };
  }

  return {
    detail: `${summary} → ${graph.selectedTags.join(', ')}.${consumerNote}`,
    selectedTags: graph.selectedTags,
  };
}
