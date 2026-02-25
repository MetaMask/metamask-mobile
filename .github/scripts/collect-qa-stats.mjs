#!/usr/bin/env node
/**
 * collect-qa-stats.mjs
 *
 * Reads pre-aggregated stats artifacts produced by CI merge jobs and writes
 * a qa-stats.json file for consumption by downstream workflows.
 *
 * Output format:
 *   { "component_view_test_number": 87 }
 *
 * To add a new test layer: add one async collector function + one env var
 * + one download step in qa-stats.yml.
 */

import { readFile, writeFile } from 'fs/promises';

// ---------------------------------------------------------------------------
// Collector: Component / View Tests
// ---------------------------------------------------------------------------

/**
 * Reads the pre-aggregated cv-test-stats.json produced by the merge-cv-test-coverage job.
 * @param {string} statsFilePath
 * @returns {Promise<number>}
 */
async function collectCvTestCount(statsFilePath) {
  const raw = await readFile(statsFilePath, 'utf8');
  const data = JSON.parse(raw);
  return data.component_view_test_number ?? 0;
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

async function main() {
  const stats = {};

  const cvStatsPath = process.env.CV_STATS_PATH;
  if (cvStatsPath) {
    stats.component_view_test_number = await collectCvTestCount(cvStatsPath);
  }

  const outputPath = './qa-stats.json';
  await writeFile(outputPath, JSON.stringify(stats, null, 2), 'utf8');
  console.log(`QA stats written to ${outputPath}:`, stats);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
