/* eslint-disable import-x/no-nodejs-modules */
/**
 * Writes the agent-driven scenario report to the job summary: each
 * scenario's status and, for every step whose cache failed or drifted, the
 * correction the agent made and the cache entry to paste by hand.
 *
 *   yarn tsx .github/scripts/qa-automation/performance-tests/scenario-report.ts \
 *     --artifacts <downloaded artifacts dir>
 */
import fs from 'fs';
import path from 'path';
import {
  OUTCOME_FILE_PREFIX,
  renderCacheReport,
  type ScenarioOutcome,
} from '../../../../tests/framework/scenario-agent/outcome';

function walk(dir: string, found: string[] = []): string[] {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else found.push(full);
  }
  return found;
}

/** Outcomes by scenario; HyperExecute may keep a -HYPL-<task> copy too. */
export function readOutcomes(artifactsDir: string): ScenarioOutcome[] {
  const byScenario = new Map<string, ScenarioOutcome>();
  for (const file of walk(artifactsDir)) {
    const name = path.basename(file);
    if (!name.startsWith(OUTCOME_FILE_PREFIX) || !name.endsWith('.json')) continue;
    try {
      const outcome = JSON.parse(fs.readFileSync(file, 'utf8')) as ScenarioOutcome;
      if (outcome.schema === 1 && outcome.scenarioPath) {
        byScenario.set(outcome.scenarioPath, outcome);
      }
    } catch {
      // A truncated file from a crashed task carries no outcome.
    }
  }
  return [...byScenario.values()].sort((a, b) =>
    a.scenarioPath.localeCompare(b.scenarioPath),
  );
}

export function main(argv = process.argv.slice(2), env = process.env): string {
  const index = argv.indexOf('--artifacts');
  const artifactsDir = index >= 0 ? argv[index + 1] : undefined;
  if (!artifactsDir) {
    throw new Error('Usage: scenario-report.ts --artifacts <dir>');
  }
  const report = renderCacheReport(readOutcomes(artifactsDir));
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, report);
  console.log(report);
  return report;
}

if (require.main === module) {
  main();
}
