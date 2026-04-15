import { readdirSync, readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = resolve(__dirname, 'results');

function collectResults() {
  const files = readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'summary.json')
    .map((f) => join(RESULTS_DIR, f));

  return files.map((filePath) => {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  });
}

function buildMarkdownReport(summary) {
  const lines = [
    '# Visual Regression Test Report',
    '',
    `**Date**: ${summary.timestamp}`,
    `**Total**: ${summary.total} | **Passed**: ${summary.passed} | **Failed**: ${summary.failed}`,
    '',
    '| Test | Platform | Mode | Status | Regressions |',
    '|------|----------|------|--------|-------------|',
  ];

  for (const r of summary.results) {
    const status = r.passed ? '✅ Pass' : '❌ Fail';
    const regressions =
      r.regressions.length > 0 ? r.regressions.join('; ') : '—';
    lines.push(
      `| ${r.name} | ${r.platform} | ${r.mode} | ${status} | ${regressions} |`,
    );
  }

  return lines.join('\n');
}

if (!existsSync(RESULTS_DIR)) {
  console.log(
    '[visual-regression] No results directory found — skipping aggregation.',
  );
  process.exit(0);
}

const results = collectResults();

if (results.length === 0) {
  console.log(
    '[visual-regression] No result files found — skipping aggregation.',
  );
  process.exit(0);
}

const summary = {
  total: results.length,
  passed: results.filter((r) => r.passed).length,
  failed: results.filter((r) => !r.passed).length,
  timestamp: new Date().toISOString(),
  results,
};

writeFileSync(
  join(RESULTS_DIR, 'summary.json'),
  JSON.stringify(summary, null, 2),
);
writeFileSync(join(RESULTS_DIR, 'report.md'), buildMarkdownReport(summary));

console.log(`\n[visual-regression] === SUMMARY ===`);
console.log(`  Total:  ${summary.total}`);
console.log(`  Passed: ${summary.passed}`);
console.log(`  Failed: ${summary.failed}`);

if (summary.failed > 0) {
  console.log('  Failed tests:');
  results
    .filter((r) => !r.passed)
    .forEach((r) => console.log(`    - ${r.name} (${r.platform})`));
}

console.log(`  Report: ${join(RESULTS_DIR, 'report.md')}`);
