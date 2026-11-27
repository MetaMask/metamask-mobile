/**
 * Shadow mode for selective CI. Every suite still runs. This reports failing
 * suites that the plan would have skipped, which is the miss signal for
 * turning selection on.
 *
 * Usage:
 *   node scripts/jest/report-shadow-misses.mjs \
 *     --plan test-plan.json --results unit-test-results-1.json --project unit
 */
import { appendFileSync, readFileSync } from 'node:fs';

/**
 * @param {{ mode?: string, patterns?: string[] }} project
 * @param {{ testResults?: { name?: string, status?: string }[] }} results
 * @returns {string[]} Absolute or repo paths of failing suites outside the selection.
 */
export function findShadowMisses(project, results) {
  if (!project || project.mode === 'full') {
    return [];
  }
  const patterns = (project.patterns ?? []).map((pattern) => new RegExp(pattern));
  const misses = [];
  for (const suite of results.testResults ?? []) {
    if (suite.status !== 'failed' || !suite.name) {
      continue;
    }
    const name = suite.name.replace(/\\/g, '/');
    if (!patterns.some((pattern) => pattern.test(name))) {
      misses.push(name);
    }
  }
  return misses;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    options[argv[index].replace(/^--/, '')] = argv[index + 1];
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  let plan;
  let results;
  try {
    plan = JSON.parse(readFileSync(options.plan, 'utf8'));
    results = JSON.parse(readFileSync(options.results, 'utf8'));
  } catch (error) {
    console.log(`Shadow miss check skipped: ${error.message}`);
    return;
  }

  const project = plan.projects?.[options.project];
  const misses = findShadowMisses(project, results);
  if (misses.length === 0) {
    console.log(
      `Shadow mode: no failing ${options.project} suites outside the selection.`,
    );
    return;
  }

  console.log(
    `::warning::Shadow mode: ${misses.length} failing ${options.project} suite(s) were outside the selection.`,
  );
  for (const miss of misses) {
    console.log(`shadow miss: ${miss}`);
  }

  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    appendFileSync(
      summary,
      [
        `### Shadow misses (${options.project})`,
        '',
        ...misses.map((miss) => `- \`${miss}\``),
        '',
      ].join('\n'),
    );
  }
}

if (process.argv[1] && process.argv[1].endsWith('report-shadow-misses.mjs')) {
  main();
}
