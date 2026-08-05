#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
/**
 * Aggregate Appium phase-timing JSON artifacts.
 *
 * Usage:
 *   yarn appium-smoke:aggregate-timings
 *   node .github/scripts/aggregate-appium-timings.mjs [--input <dir>] [--markdown <path>]
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_INPUT_DIR = join(
  repoRoot,
  'tests/test-reports/appium-timings',
);

/**
 * @param {number[]} values
 * @returns {number | null}
 */
export function average(values) {
  if (!values.length) {
    return null;
  }
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

/**
 * @param {number[]} values
 * @param {number} percentile 0-100
 * @returns {number | null}
 */
export function percentile(values, percentileValue) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  );
  return sorted[index];
}

/**
 * @param {unknown} value
 * @returns {value is object}
 */
function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Collect timing suite JSON files from a directory (non-recursive + one level).
 * @param {string} inputPath
 * @returns {string[]}
 */
export function collectTimingFiles(inputPath) {
  const resolved = resolve(inputPath);
  if (!existsSync(resolved)) {
    return [];
  }
  const stats = statSync(resolved);
  if (stats.isFile()) {
    return resolved.endsWith('.json') ? [resolved] : [];
  }
  /** @type {string[]} */
  const files = [];
  for (const name of readdirSync(resolved)) {
    const full = join(resolved, name);
    const st = statSync(full);
    if (st.isFile() && name.endsWith('.json')) {
      files.push(full);
    } else if (st.isDirectory()) {
      for (const nested of readdirSync(full)) {
        if (nested.endsWith('.json')) {
          files.push(join(full, nested));
        }
      }
    }
  }
  return files.sort();
}

/**
 * @typedef {object} TimingTestEntry
 * @property {Record<string, number>} [phases]
 * @property {Record<string, unknown>} [meta]
 * @property {string} [outcome]
 * @property {number} [retry]
 * @property {string} [title]
 * @property {string} [file]
 */

/**
 * @typedef {object} TimingSuiteFile
 * @property {string} [suite]
 * @property {TimingTestEntry[]} [tests]
 * @property {string} [sourcePath]
 */

/**
 * @param {string} filePath
 * @returns {TimingSuiteFile | null}
 */
export function loadTimingFile(filePath) {
  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!isObject(raw) || !Array.isArray(raw.tests)) {
      return null;
    }
    return { ...raw, sourcePath: filePath };
  } catch {
    return null;
  }
}

/**
 * @param {TimingSuiteFile[]} suites
 */
export function aggregateTimingSuites(suites) {
  /** @type {Map<string, number[]>} */
  const phaseByPlatform = new Map();
  /** @type {Map<string, { attempts: number, retries: number }>} */
  const retryBySpec = new Map();
  /** @type {{ suite: string, platform: string, totalMs: number, sourcePath?: string }[]} */
  const shardTotals = [];
  let sessionReuseTrue = 0;
  let sessionReuseKnown = 0;
  let testCount = 0;

  for (const suite of suites) {
    const suiteName = suite.suite || 'unknown';
    /** @type {Map<string, number>} */
    const totalsByPlatform = new Map();

    for (const test of suite.tests ?? []) {
      testCount += 1;
      const platform =
        typeof test.meta?.platform === 'string'
          ? test.meta.platform
          : 'unknown';
      const phases = test.phases ?? {};
      let testPhaseSum = 0;
      for (const [phase, ms] of Object.entries(phases)) {
        if (typeof ms !== 'number' || !Number.isFinite(ms)) {
          continue;
        }
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
      if ((test.retry ?? 0) > 0 || test.outcome === 'timedOut') {
        // Count Playwright retry attempts (retry index > 0).
        if ((test.retry ?? 0) > 0) {
          retryStats.retries += 1;
        }
      }
      retryBySpec.set(specKey, retryStats);

      if (typeof test.meta?.sessionReused === 'boolean') {
        sessionReuseKnown += 1;
        if (test.meta.sessionReused) {
          sessionReuseTrue += 1;
        }
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

  /** @type {Record<string, Record<string, { avg: number | null, p95: number | null, samples: number }>>} */
  const phases = {};
  for (const [key, values] of phaseByPlatform.entries()) {
    const [platform, phase] = key.split('::');
    if (!phases[platform]) {
      phases[platform] = {};
    }
    phases[platform][phase] = {
      avg: average(values),
      p95: percentile(values, 95),
      samples: values.length,
    };
  }

  const slowestShard =
    shardTotals.length === 0
      ? null
      : [...shardTotals].sort((a, b) => b.totalMs - a.totalMs)[0];

  /** @type {Record<string, { attempts: number, retries: number, retryRate: number }>} */
  const retryRatePerSpec = {};
  for (const [spec, stats] of retryBySpec.entries()) {
    retryRatePerSpec[spec] = {
      attempts: stats.attempts,
      retries: stats.retries,
      retryRate: stats.attempts === 0 ? 0 : stats.retries / stats.attempts,
    };
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    testCount,
    suiteCount: suites.length,
    phases,
    slowestShard,
    retryRatePerSpec,
    sessionReuse: {
      known: sessionReuseKnown,
      reused: sessionReuseTrue,
      rate:
        sessionReuseKnown === 0 ? null : sessionReuseTrue / sessionReuseKnown,
    },
  };
}

/**
 * @param {ReturnType<typeof aggregateTimingSuites>} report
 * @returns {string}
 */
export function formatTrendMarkdown(report) {
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
    lines.push(`### ${platform}`, '');
    lines.push('| Phase | Avg | p95 | Samples |');
    lines.push('| --- | ---: | ---: | ---: |');
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
    lines.push('## Specs with retries', '');
    lines.push('| Spec | Retry rate | Retries / Attempts |');
    lines.push('| --- | ---: | ---: |');
    for (const [spec, stats] of retryEntries) {
      lines.push(
        `| ${spec} | ${(stats.retryRate * 100).toFixed(0)}% | ${stats.retries}/${stats.attempts} |`,
      );
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

/**
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  /** @type {{ input: string, markdown: string | null }} */
  const opts = {
    input: DEFAULT_INPUT_DIR,
    markdown: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input' && argv[i + 1]) {
      opts.input = resolve(argv[i + 1]);
      i += 1;
    } else if (arg === '--markdown' && argv[i + 1]) {
      opts.markdown = resolve(argv[i + 1]);
      i += 1;
    }
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const files = collectTimingFiles(opts.input);
  const suites = files
    .map((f) => loadTimingFile(f))
    .filter((s) => s !== null);

  if (suites.length === 0) {
    console.error(
      `No Appium timing JSON found under ${opts.input}. Run smoke tests first or pass --input.`,
    );
    process.exitCode = 1;
    return;
  }

  const report = aggregateTimingSuites(suites);
  const markdown = formatTrendMarkdown(report);
  process.stdout.write(markdown);

  if (opts.markdown) {
    mkdirSync(dirname(opts.markdown), { recursive: true });
    writeFileSync(opts.markdown, markdown, 'utf8');
  }
}

const isDirectRun =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main();
}
