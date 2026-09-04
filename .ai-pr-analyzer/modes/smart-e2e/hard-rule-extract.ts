/**
 * Tag-extraction helpers for smart-e2e hard-rule triggers.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export type TagCatalog = Record<
  string,
  Array<{ id: string; description: string }>
>;

export type RemainingChangesGate = {
  prefixes: string[];
  ignorablePathRegexes?: string[];
};

type AnalysisContext = {
  baseDir: string;
  baseBranch: string;
  prNumber?: number;
  githubRepo?: string;
};

type ExtractRule = {
  name: string;
  description: string;
  trigger: {
    type: string;
    [key: string]: unknown;
  };
};

const DEFAULT_SPEC_PATTERN = '\\.spec\\.';
const DEFAULT_TAGS_IMPORT_REGEX =
  'import\\s*\\{([^}]+)\\}\\s*from\\s*[\'"][^\'"]*\\/tags\\.js[\'"]';

type NormalizePath = (path: string) => string;

function defaultNormalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}

function remainingChangesAllowed(
  changedFiles: string[],
  gate: RemainingChangesGate,
  normalize: NormalizePath,
): boolean {
  const ignorables = (gate.ignorablePathRegexes ?? []).map(
    (pattern) => new RegExp(pattern),
  );
  return changedFiles.every((file) => {
    const normalized = normalize(file);
    return (
      (gate.prefixes ?? []).some((prefix) => normalized.startsWith(prefix)) ||
      ignorables.some((regex) => regex.test(normalized))
    );
  });
}

function importedTagName(
  raw: string,
  validTags: Set<string> | null,
): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  if (validTags?.has(trimmed)) {
    return trimmed;
  }
  const beforeAs = trimmed.split(/\s+as\s+/)[0]?.trim() ?? trimmed;
  return beforeAs.split(/\s+/).pop() || undefined;
}

function readSpecSource(baseDir: string, specPath: string): string | null {
  try {
    return readFileSync(join(baseDir, specPath), 'utf8');
  } catch {
    return null;
  }
}

function extractImportedTags(
  source: string,
  tagsImportRegex: string,
  validTags: Set<string> | null,
): string[] {
  let pattern: RegExp;
  try {
    pattern = new RegExp(tagsImportRegex, 'g');
  } catch {
    return [];
  }
  const names: string[] = [];
  for (const match of source.matchAll(pattern)) {
    const captured = match[1] ?? '';
    for (const part of captured.split(',')) {
      const name = importedTagName(part, validTags);
      if (name && (!validTags || validTags.has(name))) {
        names.push(name);
      }
    }
  }
  return names;
}

export function evaluateExtractTagsFromChangedSpecs(
  rule: ExtractRule,
  changedFiles: string[],
  context: AnalysisContext,
  catalog: TagCatalog,
  normalize: NormalizePath = defaultNormalize,
): { detail: string; selectedTags: string[] } | null {
  const trigger = rule.trigger as {
    onlyIfRemainingChangesMatch?: RemainingChangesGate;
    specPattern?: string;
    specPrefixes?: string[];
    catalogGroup?: string;
    tagsImportRegex?: string;
  };
  const gate = trigger.onlyIfRemainingChangesMatch;
  if (gate && !remainingChangesAllowed(changedFiles, gate, normalize)) {
    return null;
  }

  const specPattern = new RegExp(trigger.specPattern ?? DEFAULT_SPEC_PATTERN);
  const specPrefixes = trigger.specPrefixes ?? [];
  const specFiles = changedFiles
    .map((file) => normalize(file))
    .filter(
      (normalized) =>
        specPrefixes.some((prefix) => normalized.startsWith(prefix)) &&
        specPattern.test(normalized),
    );

  const validTags = trigger.catalogGroup
    ? new Set((catalog[trigger.catalogGroup] ?? []).map((entry) => entry.id))
    : null;

  const selected = new Set<string>();
  for (const specPath of specFiles) {
    const source = readSpecSource(context.baseDir, specPath);
    if (source === null) {
      continue;
    }
    for (const tag of extractImportedTags(
      source,
      trigger.tagsImportRegex ?? DEFAULT_TAGS_IMPORT_REGEX,
      validTags,
    )) {
      selected.add(tag);
    }
  }

  if (selected.size === 0) {
    return null;
  }

  const selectedTags = [...selected];
  return {
    detail: `${rule.description}: ${selectedTags.join(', ')}`,
    selectedTags,
  };
}

const SOURCE_EXT = /\.(ts|tsx|js|jsx)$/;

function fileStem(filePath: string): string {
  return basename(filePath).replace(SOURCE_EXT, '');
}

function isSpecFile(
  normalized: string,
  specPrefixes: string[],
  specPattern: RegExp,
): boolean {
  return (
    specPrefixes.some((prefix) => normalized.startsWith(prefix)) &&
    specPattern.test(normalized)
  );
}

function moduleSpecifierNeedles(stem: string): string[] {
  return [`/${stem}'`, `/${stem}"`, `/${stem}.`, `/${stem}/`];
}

function grepFixedStem(
  baseDir: string,
  stem: string,
  searchPrefixes: string[],
  normalize: NormalizePath,
): string[] {
  const searchDirs = searchPrefixes.filter((prefix) =>
    existsSync(join(baseDir, prefix)),
  );
  if (!stem || searchDirs.length === 0) {
    return [];
  }
  const matches = new Set<string>();
  for (const needle of moduleSpecifierNeedles(stem)) {
    try {
      const stdout = execFileSync(
        'grep',
        [
          '-r',
          '-l',
          '-F',
          '--include=*.ts',
          '--include=*.tsx',
          '--include=*.js',
          '--include=*.jsx',
          needle,
          ...searchDirs,
        ],
        { encoding: 'utf8', cwd: baseDir, stdio: ['ignore', 'pipe', 'pipe'] },
      );
      for (const line of stdout.split('\n')) {
        const normalized = normalize(line.trim());
        if (normalized) {
          matches.add(normalized);
        }
      }
    } catch {
      // grep exits non-zero when a needle has no matches
    }
  }
  return [...matches];
}

function collectTagsFromSpecs(
  specFiles: Iterable<string>,
  baseDir: string,
  tagsImportRegex: string,
  validTags: Set<string> | null,
): string[] {
  const selected = new Set<string>();
  for (const specPath of specFiles) {
    const source = readSpecSource(baseDir, specPath);
    if (source === null) {
      continue;
    }
    for (const tag of extractImportedTags(source, tagsImportRegex, validTags)) {
      selected.add(tag);
    }
  }
  return [...selected];
}

export function evaluateExtractTagsFromImportGraph(
  rule: ExtractRule,
  changedFiles: string[],
  context: AnalysisContext,
  catalog: TagCatalog,
  normalize: NormalizePath = defaultNormalize,
): { detail: string; selectedTags: string[] } | null {
  const trigger = rule.trigger as {
    onlyIfRemainingChangesMatch?: RemainingChangesGate;
    specPattern?: string;
    specPrefixes?: string[];
    sourcePrefixes?: string[];
    intermediatePrefixes?: string[];
    hop?: number;
    catalogGroup?: string;
    tagsImportRegex?: string;
    includeChangedSpecs?: boolean;
  };
  const gate = trigger.onlyIfRemainingChangesMatch;
  if (gate && !remainingChangesAllowed(changedFiles, gate, normalize)) {
    return null;
  }

  const specPattern = new RegExp(trigger.specPattern ?? DEFAULT_SPEC_PATTERN);
  const specPrefixes = trigger.specPrefixes ?? [];
  const sourcePrefixes = trigger.sourcePrefixes ?? [];
  const intermediatePrefixes = trigger.intermediatePrefixes ?? [];
  const hops = trigger.hop ?? 1;
  const includeChangedSpecs = trigger.includeChangedSpecs !== false;
  const firstSearchPrefixes = [...specPrefixes, ...intermediatePrefixes];

  const specFiles = new Set<string>();
  const changedSpecFiles: string[] = [];
  let sawSharedSource = false;
  for (const source of changedFiles.map((file) => normalize(file))) {
    if (isSpecFile(source, specPrefixes, specPattern)) {
      changedSpecFiles.push(source);
      continue;
    }
    if (!sourcePrefixes.some((prefix) => source.startsWith(prefix))) {
      continue;
    }
    sawSharedSource = true;
    const stem = fileStem(source);
    if (!stem) {
      continue;
    }
    for (const match of grepFixedStem(
      context.baseDir,
      stem,
      firstSearchPrefixes,
      normalize,
    )) {
      if (isSpecFile(match, specPrefixes, specPattern)) {
        specFiles.add(match);
        continue;
      }
      if (hops < 1) {
        continue;
      }
      if (!intermediatePrefixes.some((prefix) => match.startsWith(prefix))) {
        continue;
      }
      const hopStem = fileStem(match);
      if (!hopStem) {
        continue;
      }
      for (const hopMatch of grepFixedStem(
        context.baseDir,
        hopStem,
        specPrefixes,
        normalize,
      )) {
        if (isSpecFile(hopMatch, specPrefixes, specPattern)) {
          specFiles.add(hopMatch);
        }
      }
    }
  }

  // `continue: true` seeds AI from this rule; later extract-spec rules do not
  // refill the floor. Union smoke specs changed in the same PR, matching the
  // previous test-shared-infra-impact handler.
  if (includeChangedSpecs && sawSharedSource) {
    for (const specPath of changedSpecFiles) {
      specFiles.add(specPath);
    }
  }

  const validTags = trigger.catalogGroup
    ? new Set((catalog[trigger.catalogGroup] ?? []).map((entry) => entry.id))
    : null;
  const selectedTags = collectTagsFromSpecs(
    specFiles,
    context.baseDir,
    trigger.tagsImportRegex ?? DEFAULT_TAGS_IMPORT_REGEX,
    validTags,
  );
  if (selectedTags.length === 0) {
    return null;
  }
  return {
    detail: `${rule.description}: ${selectedTags.join(', ')}`,
    selectedTags,
  };
}
