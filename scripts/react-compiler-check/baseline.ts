export interface CompilerFailure {
  line: number;
  column: number;
  reason: string;
}

export interface FileResult {
  path: string;
  failures: CompilerFailure[];
}

export interface BaselineEntry {
  count: number;
  reasons: string[];
}

export type Baseline = Record<string, BaselineEntry>;

export interface Regression {
  path: string;
  baselineCount: number;
  count: number;
  newReasons: string[];
  failures: CompilerFailure[];
}

export interface Improvement {
  path: string;
  baselineCount: number;
  count: number;
}

export interface Comparison {
  regressions: Regression[];
  improvements: Improvement[];
}

export function toBaselineEntry(failures: CompilerFailure[]): BaselineEntry {
  return {
    count: failures.length,
    reasons: [...new Set(failures.map((failure) => failure.reason))].sort(),
  };
}

export function sortBaseline(baseline: Baseline): Baseline {
  const sorted: Baseline = {};
  for (const path of Object.keys(baseline).sort()) {
    sorted[path] = {
      count: baseline[path].count,
      reasons: [...baseline[path].reasons].sort(),
    };
  }
  return sorted;
}

export function serializeBaseline(baseline: Baseline): string {
  return `${JSON.stringify(sortBaseline(baseline), null, 2)}\n`;
}

export function parseBaseline(text: string): Baseline {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('The baseline must be a JSON object keyed by file path.');
  }
  for (const [path, entry] of Object.entries(parsed)) {
    const { count, reasons } = (entry ?? {}) as Partial<BaselineEntry>;
    if (
      !Number.isInteger(count) ||
      (count as number) < 1 ||
      !Array.isArray(reasons) ||
      !reasons.every((reason) => typeof reason === 'string')
    ) {
      throw new Error(`Invalid baseline entry for ${path}.`);
    }
  }
  return parsed as Baseline;
}

export function compareWithBaseline(
  results: FileResult[],
  baseline: Baseline,
  checkedPaths: Iterable<string>,
): Comparison {
  const current = new Map(results.map((result) => [result.path, result]));
  const regressions: Regression[] = [];
  const improvements: Improvement[] = [];
  for (const path of [...new Set(checkedPaths)].sort()) {
    const failures = current.get(path)?.failures ?? [];
    const baselineEntry = baseline[path] ?? { count: 0, reasons: [] };
    const entry = toBaselineEntry(failures);
    const newReasons = entry.reasons.filter(
      (reason) => !baselineEntry.reasons.includes(reason),
    );
    const removedReasons = baselineEntry.reasons.filter(
      (reason) => !entry.reasons.includes(reason),
    );
    const counts = { baselineCount: baselineEntry.count, count: entry.count };
    if (entry.count > baselineEntry.count || newReasons.length > 0) {
      regressions.push({ path, ...counts, newReasons, failures });
    } else if (
      entry.count < baselineEntry.count ||
      removedReasons.length > 0
    ) {
      improvements.push({ path, ...counts });
    }
  }
  return { regressions, improvements };
}

export function updateBaseline(
  results: FileResult[],
  baseline: Baseline,
  checkedPaths: Iterable<string>,
): Baseline {
  const next: Baseline = { ...baseline };
  const current = new Map(results.map((result) => [result.path, result]));
  for (const path of new Set(checkedPaths)) {
    const failures = current.get(path)?.failures ?? [];
    if (failures.length > 0) {
      next[path] = toBaselineEntry(failures);
    } else {
      delete next[path];
    }
  }
  return sortBaseline(next);
}

export function summarize(baseline: Baseline): {
  files: number;
  failures: number;
} {
  const entries = Object.values(baseline);
  return {
    files: entries.length,
    failures: entries.reduce((total, entry) => total + entry.count, 0),
  };
}
