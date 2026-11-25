/**
 * Duration-weighted shard assignment for Jest `--shard`.
 *
 * Suites with a recorded duration use that duration as their weight. Suites
 * without one (new or renamed files) are weighted by file size, scaled by a
 * calibration factor taken from the same snapshot, so every shard sees the same
 * weights for the same checkout. Kept free of Jest imports so it can be tested
 * directly.
 */

export const SNAPSHOT_RELATIVE_PATH = 'scripts/jest/suite-durations.json';

/**
 * Suites faster than this are not stored in the snapshot. Lower values balance
 * shards more tightly but grow the committed file. At 100ms the unit spread
 * stays near 2% in simulation and the file stays under 0.5 MB.
 */
export const MIN_RECORDED_SUITE_MS = 100;

/**
 * Longest-processing-time greedy bin packing. The heaviest entry goes to the
 * currently lightest shard. Ties break on key, then on input order, so the same
 * entries always produce the same split.
 *
 * @param {{ id: number, key: string, weight: number }[]} entries
 * @param {number} shardCount
 * @returns {number[][]} Entry ids for each shard. Index 0 is shard 1.
 */
export function assignDurationShards(entries, shardCount) {
  if (!Number.isInteger(shardCount) || shardCount < 1) {
    throw new Error(`shardCount must be a positive integer, got ${shardCount}`);
  }

  const ordered = [...entries].sort(
    (a, b) =>
      b.weight - a.weight || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );

  const bins = Array.from({ length: shardCount }, () => ({
    load: 0,
    ids: [],
  }));

  for (const entry of ordered) {
    let target = bins[0];
    for (const bin of bins) {
      if (bin.load < target.load) {
        target = bin;
      }
    }
    target.load += entry.weight;
    target.ids.push(entry.id);
  }

  return bins.map((bin) => bin.ids);
}

/**
 * @typedef {object} SuiteDurationSnapshot
 * @property {number} fallbackMsPerKiB Milliseconds per KiB of source, used for suites missing from `suiteMs`.
 * @property {Record<string, number>} suiteMs Recorded duration by repo-relative suite path.
 */

/**
 * @param {{ key: string, sizeBytes: number }} suite
 * @param {SuiteDurationSnapshot} snapshot
 * @returns {number}
 */
export function estimateSuiteWeight(suite, snapshot) {
  const recorded = snapshot.suiteMs[suite.key];
  if (recorded !== undefined) {
    return recorded;
  }
  return Math.max(1, (suite.sizeBytes / 1024) * snapshot.fallbackMsPerKiB);
}

/**
 * Builds the committed snapshot from per-suite measurements of one CI run.
 *
 * @param {{ key: string, durationMs: number, sizeBytes: number }[]} measurements
 * @returns {SuiteDurationSnapshot}
 */
export function buildSuiteDurationSnapshot(measurements) {
  let totalMs = 0;
  let totalKiB = 0;
  for (const { durationMs, sizeBytes } of measurements) {
    totalMs += durationMs;
    totalKiB += sizeBytes / 1024;
  }

  const suiteMs = {};
  for (const { key, durationMs } of measurements) {
    if (durationMs >= MIN_RECORDED_SUITE_MS) {
      suiteMs[key] = Math.round(durationMs);
    }
  }

  const sortedKeys = Object.keys(suiteMs).sort();
  const sortedSuiteMs = {};
  for (const key of sortedKeys) {
    sortedSuiteMs[key] = suiteMs[key];
  }

  return {
    fallbackMsPerKiB: totalKiB > 0 ? Number((totalMs / totalKiB).toFixed(3)) : 0,
    suiteMs: sortedSuiteMs,
  };
}
