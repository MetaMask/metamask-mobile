/**
 * Rebuilds `suite-durations.json` from Jest JSON reports of one or more CI shards.
 *
 * Usage (from the repo root):
 *   node scripts/jest/refresh-suite-durations.mjs --root <repo-root-on-ci-runner> <jest-results.json>...
 *
 * `--root` is the checkout path that Jest wrote into each suite's absolute path,
 * so the snapshot keys match repo-relative paths at runtime.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  SNAPSHOT_RELATIVE_PATH,
  buildSuiteDurationSnapshot,
} from './duration-sharding.mjs';

/**
 * @param {string[]} argv
 * @returns {{ root: string, reports: string[] }}
 */
export function parseArgs(argv) {
  const reports = [];
  let root = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root') {
      root = argv[i + 1];
      i += 1;
    } else {
      reports.push(argv[i]);
    }
  }
  if (!root) {
    throw new Error('Missing required --root <repo-root-on-ci-runner>');
  }
  if (reports.length === 0) {
    throw new Error('Pass at least one jest-results.json path');
  }
  return { root: path.resolve(root), reports };
}

/**
 * Averages suite durations across the given reports. A suite that appears in
 * several reports (for example several nightly runs) gets its mean duration.
 *
 * @param {string[]} reportPaths
 * @param {string} root Checkout path that prefixes each suite's absolute path.
 * @param {string} repoDir Local checkout used to read file sizes.
 * @returns {{ key: string, durationMs: number, sizeBytes: number }[]}
 */
export function collectMeasurements(reportPaths, root, repoDir) {
  const totals = new Map();
  for (const reportPath of reportPaths) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    for (const suite of report.testResults ?? []) {
      const key = path.relative(root, suite.name).split(path.sep).join('/');
      if (key.startsWith('..')) {
        continue;
      }
      const entry = totals.get(key) ?? { sumMs: 0, runs: 0 };
      entry.sumMs += suite.endTime - suite.startTime;
      entry.runs += 1;
      totals.set(key, entry);
    }
  }
  return [...totals].map(([key, { sumMs, runs }]) => ({
    key,
    durationMs: sumMs / runs,
    sizeBytes: sizeOf(repoDir, key),
  }));
}

function sizeOf(repoDir, relative) {
  try {
    return fs.statSync(path.join(repoDir, relative)).size;
  } catch {
    return 0;
  }
}

function main() {
  const { root, reports } = parseArgs(process.argv.slice(2));
  const repoDir = process.cwd();
  const snapshotPath = path.join(repoDir, SNAPSHOT_RELATIVE_PATH);
  const measurements = collectMeasurements(reports, root, repoDir).filter(
    (m) => m.sizeBytes > 0,
  );
  const snapshot = buildSuiteDurationSnapshot(measurements);
  fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(
    `Wrote ${Object.keys(snapshot.suiteMs).length} recorded suites (of ${measurements.length} measured) to ${SNAPSHOT_RELATIVE_PATH}; fallbackMsPerKiB=${snapshot.fallbackMsPerKiB}`,
  );
}

if (path.basename(process.argv[1] ?? '') === 'refresh-suite-durations.mjs') {
  main();
}
