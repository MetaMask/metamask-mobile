#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
/**
 * CLI entry for aggregating Appium phase-timing JSON artifacts.
 *
 * Usage:
 *   yarn appium-smoke:aggregate-timings
 *   yarn tsx .github/scripts/aggregate-appium-timings.ts [--input <dir>] [--markdown <path>]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  aggregateTimingSuites,
  collectTimingFiles,
  DEFAULT_INPUT_DIR,
  formatTrendMarkdown,
  loadTimingFile,
  parseArgs,
  type TimingSuiteFile,
} from '../../tests/framework/telemetry/aggregatePhaseTimings.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

function main(argv: string[] = process.argv.slice(2)): void {
  const opts = parseArgs(argv, resolve(repoRoot, DEFAULT_INPUT_DIR));
  const files = collectTimingFiles(opts.input);
  const suites = files
    .map((f) => loadTimingFile(f))
    .filter((s): s is TimingSuiteFile => s !== null);

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

main();
