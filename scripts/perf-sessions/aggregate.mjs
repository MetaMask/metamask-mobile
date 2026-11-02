#!/usr/bin/env node
/**
 * Merge perf-session recordings from many testers and surface shared
 * low-performance patterns per flow (POC).
 *
 *   node aggregate.mjs <dir-with-session-json> [--out report]
 *
 * Writes <out>.md (for humans) and <out>.json (for an LLM / bot to reason over).
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { buildReport, renderMarkdown } from './lib/report.mjs';

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: { out: { type: 'string' } },
});
const dir = positionals[0];
if (!dir) {
  console.error('Usage: node aggregate.mjs <session-dir> [--out <path-without-extension>]');
  process.exit(1);
}
const outBase = args.out ?? path.join(dir, 'report');

const sessions = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.startsWith('report'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
  .filter((r) => r.perfSession);

if (!sessions.length) {
  console.error(`No perf-session recordings found in ${dir}`);
  process.exit(1);
}

const report = buildReport(sessions);
fs.writeFileSync(`${outBase}.json`, JSON.stringify(report, null, 2));
fs.writeFileSync(`${outBase}.md`, renderMarkdown(report));
console.log(`Wrote ${outBase}.md and ${outBase}.json`);
