/* eslint-disable import-x/no-nodejs-modules */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const DEFAULT_INPUT_DIR = 'tests/test-reports/appium-timings';

export function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function percentile(
  values: number[],
  percentileValue: number,
): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  );
  return sorted[index];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function collectTimingFiles(inputPath: string): string[] {
  const resolved = resolve(inputPath);
  if (!existsSync(resolved)) return [];
  const stats = statSync(resolved);
  if (stats.isFile()) return resolved.endsWith('.json') ? [resolved] : [];
  const files: string[] = [];
  for (const name of readdirSync(resolved)) {
    const full = join(resolved, name);
    const st = statSync(full);
    if (st.isFile() && name.endsWith('.json')) files.push(full);
    else if (st.isDirectory()) {
      for (const nested of readdirSync(full)) {
        if (nested.endsWith('.json')) files.push(join(full, nested));
      }
    }
  }
  return files.sort();
}

export interface TimingTestEntry {
  phases?: Record<string, number>;
  meta?: Record<string, unknown>;
  outcome?: string;
  retry?: number;
  title?: string;
  file?: string;
}

export interface TimingSuiteFile {
  suite?: string;
  tests?: TimingTestEntry[];
  sourcePath?: string;
}

export function loadTimingFile(filePath: string): TimingSuiteFile | null {
  try {
    const raw: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!isObject(raw) || !Array.isArray(raw.tests)) return null;
    return { ...(raw as TimingSuiteFile), sourcePath: filePath };
  } catch {
    return null;
  }
}

export interface PhaseStats {
  avg: number | null;
  p95: number | null;
  samples: number;
}

export interface AggregateTimingReport {
  schemaVersion: 1;
  generatedAt: string;
  testCount: number;
  suiteCount: number;
  phases: Record<string, Record<string, PhaseStats>>;
  slowestShard: {
    suite: string;
    platform: string;
    totalMs: number;
    sourcePath?: string;
  } | null;
  retryRatePerSpec: Record<
    string,
    { attempts: number; retries: number; retryRate: number }
  >;
  sessionReuse: { known: number; reused: number; rate: number | null };
}

export function aggregateTimingSuites(
  suites: TimingSuiteFile[],
): AggregateTimingReport {
  const phaseByPlatform = new Map<string, number[]>();
  const retryBySpec = new Map<string, { attempts: number; retries: number }>();
  const shardTotals: AggregateTimingReport['slowestShard'][] = [];
  let sessionReuseTrue = 0;
  let sessionReuseKnown = 0;
  let testCount = 0;

  for (const suite of suites) {
    const suiteName = suite.suite || 'unknown';
    const totalsByPlatform = new Map<string, number>();

    for (const test of suite.tests ?? []) {
      testCount += 1;
      const platform =
        typeof test.meta?.platform === 'string'
          ? test.meta.platform
          : 'unknown';
      let testPhaseSum = 0;
      for (const [phase, ms] of Object.entries(test.phases ?? {})) {
        if (typeof ms !== 'number' || !Number.isFinite(ms)) continue;
        testPhaseSum += ms;
        const key = `${platform}::${phase}`;
        const bucket = phaseByPlatform.get(key) ?? [];
        bucket.push(ms);
        phaseByPlatform.set(key, bucket);
      }
      totalsByPlatform.set(
        platform,
        (totalsByPlatform.get(platform) ?? 0) + testPhaseSum,
      );

      const specKey = `${test.file ?? 'unknown'}::${test.title ?? 'unknown'}`;
      const retryStats = retryBySpec.get(specKey) ?? {
        attempts: 0,
        retries: 0,
      };
      retryStats.attempts += 1;
      if ((test.retry ?? 0) > 0) retryStats.retries += 1;
      retryBySpec.set(specKey, retryStats);

      if (typeof test.meta?.sessionReused === 'boolean') {
        sessionReuseKnown += 1;
        if (test.meta.sessionReused) sessionReuseTrue += 1;
      }
    }

    for (const [platform, totalMs] of totalsByPlatform.entries()) {
      shardTotals.push({
        suite: suiteName,
        platform,
        totalMs,
        sourcePath: suite.sourcePath,
      });
    }
  }

  const phases: AggregateTimingReport['phases'] = {};
  for (const [key, values] of phaseByPlatform.entries()) {
    const [platform, phase] = key.split('::');
    phases[platform] ??= {};
    phases[platform][phase] = {
      avg: average(values),
      p95: percentile(values, 95),
      samples: values.length,
    };
  }

  const retryRatePerSpec: AggregateTimingReport['retryRatePerSpec'] = {};
  for (const [spec, stats] of retryBySpec.entries()) {
    retryRatePerSpec[spec] = {
      ...stats,
      retryRate: stats.attempts === 0 ? 0 : stats.retries / stats.attempts,
    };
  }

  const sortedShards = [...shardTotals].filter(
    (shard): shard is NonNullable<typeof shard> => shard != null,
  );
  sortedShards.sort((a, b) => b.totalMs - a.totalMs);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    testCount,
    suiteCount: suites.length,
    phases,
    slowestShard: sortedShards[0] ?? null,
    retryRatePerSpec,
    sessionReuse: {
      known: sessionReuseKnown,
      reused: sessionReuseTrue,
      rate:
        sessionReuseKnown === 0 ? null : sessionReuseTrue / sessionReuseKnown,
    },
  };
}

export function formatTrendMarkdown(report: AggregateTimingReport): string {
  const lines = [
    '# Appium phase timing trend',
    '',
    `Generated: ${report.generatedAt}`,
    `Suites: ${report.suiteCount} · Tests: ${report.testCount}`,
    '',
  ];
  if (report.sessionReuse.rate !== null) {
    lines.push(
      `Session reuse rate: ${(report.sessionReuse.rate * 100).toFixed(1)}% (${report.sessionReuse.reused}/${report.sessionReuse.known})`,
      '',
    );
  }
  if (report.slowestShard) {
    lines.push(
      `Slowest shard: **${report.slowestShard.suite}** (${report.slowestShard.platform}) — ${Math.round(report.slowestShard.totalMs)}ms phase sum`,
      '',
    );
  }
  lines.push('## Avg / p95 by phase (ms)', '');
  for (const platform of Object.keys(report.phases).sort()) {
    lines.push(
      `### ${platform}`,
      '',
      '| Phase | Avg | p95 | Samples |',
      '| --- | ---: | ---: | ---: |',
    );
    for (const phase of Object.keys(report.phases[platform]).sort()) {
      const row = report.phases[platform][phase];
      lines.push(
        `| ${phase} | ${row.avg === null ? '—' : Math.round(row.avg)} | ${row.p95 === null ? '—' : Math.round(row.p95)} | ${row.samples} |`,
      );
    }
    lines.push('');
  }
  const retryEntries = Object.entries(report.retryRatePerSpec)
    .filter(([, s]) => s.retries > 0)
    .sort((a, b) => b[1].retryRate - a[1].retryRate)
    .slice(0, 20);
  if (retryEntries.length > 0) {
    lines.push(
      '## Specs with retries',
      '',
      '| Spec | Retry rate | Retries / Attempts |',
      '| --- | ---: | ---: |',
    );
    for (const [spec, stats] of retryEntries) {
      lines.push(
        `| ${spec} | ${(stats.retryRate * 100).toFixed(0)}% | ${stats.retries}/${stats.attempts} |`,
      );
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

export function parseArgs(
  argv: string[],
  defaultInput: string = DEFAULT_INPUT_DIR,
): { input: string; markdown: string | null } {
  const opts = { input: defaultInput, markdown: null as string | null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input' && argv[i + 1]) {
      opts.input = resolve(argv[++i]);
    } else if (arg === '--markdown' && argv[i + 1]) {
      opts.markdown = resolve(argv[++i]);
    }
  }
  return opts;
}
